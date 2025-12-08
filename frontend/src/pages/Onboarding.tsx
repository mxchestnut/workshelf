import React, { useState, useEffect } from 'react';
import { authService } from '../services/auth';

// Use same fallback pattern as auth.ts
const API_URL = import.meta.env.VITE_API_URL || 'https://api.workshelf.dev';

// Default interests if no groups exist yet
const DEFAULT_INTERESTS = [
  'fiction', 'non-fiction', 'poetry', 'sci-fi', 'fantasy', 'romance',
  'mystery', 'thriller', 'horror', 'memoir', 'creative-writing', 'screenwriting'
];

interface OnboardingFormData {
  username: string;
  phoneNumber: string;
  birthYear: string;
  interests: string[];
  newsletterOptIn: boolean;
  smsOptIn: boolean;
  houseRulesAccepted: boolean;
  termsAccepted: boolean;
}

interface FieldError {
  field: string;
  message: string;
}

export default function Onboarding() {
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState<FieldError[]>([]);
  const [availableInterests, setAvailableInterests] = useState<string[]>(DEFAULT_INTERESTS);
  
  console.log('[Onboarding] Component loaded, API_URL:', API_URL);
  
  // Load available interests on mount
  useEffect(() => {
    loadAvailableInterests();
  }, []);

  const loadAvailableInterests = async () => {
    try {
      const response = await fetch(`${API_URL}/api/v1/interests`);
      if (response.ok) {
        const interests = await response.json();
        setAvailableInterests(interests);
      }
      // If fetch fails, we'll use the default interests
    } catch (err) {
      console.error('Failed to load interests:', err);
      // Keep using DEFAULT_INTERESTS
    }
  };
  
  // Manual navigation function (same pattern as rest of app)
  const navigateTo = (path: string) => {
    window.history.pushState({}, '', path);
    window.location.href = path;
  };
  
  const [formData, setFormData] = useState<OnboardingFormData>({
    username: '',
    phoneNumber: '',
    birthYear: '',
    interests: [],
    newsletterOptIn: false,
    smsOptIn: false,
    houseRulesAccepted: false,
    termsAccepted: false,
  });

  // Generate birth year options (18+ only, current year - 18 back to 1900)
  const currentYear = new Date().getFullYear();
  const maxBirthYear = currentYear - 18;
  const birthYearOptions = Array.from(
    { length: maxBirthYear - 1900 + 1 },
    (_, i) => maxBirthYear - i
  );

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value, type } = e.target;
    const checked = (e.target as HTMLInputElement).checked;
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));

    // Clear error for this field
    setErrors(prev => prev.filter(err => err.field !== name));
  };

  const validateStep1 = async () => {
    const newErrors: FieldError[] = [];

    // Username validation
    if (!formData.username.trim()) {
      newErrors.push({ field: 'username', message: 'Username is required' });
    } else if (formData.username.length < 3) {
      newErrors.push({ field: 'username', message: 'Username must be at least 3 characters' });
    } else if (!/^[a-zA-Z0-9_-]+$/.test(formData.username)) {
      newErrors.push({ field: 'username', message: 'Username can only contain letters, numbers, hyphens, and underscores' });
    } else {
      // Check if username is available
      try {
        const response = await fetch(`${API_URL}/v1/auth/check-availability`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('access_token')}`
          },
          credentials: 'include',
          mode: 'cors',
          body: JSON.stringify({ username: formData.username })
        });
        const data = await response.json();
        if (!data.available) {
          newErrors.push({ field: 'username', message: data.message || 'Username is already taken' });
        }
      } catch (error) {
        console.error('Error checking username:', error);
      }
    }

    // Phone number validation (optional now)
    if (formData.phoneNumber.trim()) {
      // Only validate if provided
      if (!/^\+?[1-9]\d{9,14}$/.test(formData.phoneNumber.replace(/[\s()-]/g, ''))) {
  newErrors.push({ field: 'phoneNumber', message: 'Please enter a valid phone number (e.g., +1 555 000 0000)' });
      } else {
        // Check if phone is available
        try {
          const cleanPhone = formData.phoneNumber.replace(/[\s()-]/g, '');
          const response = await fetch(`${API_URL}/v1/auth/check-availability`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${localStorage.getItem('access_token')}`
            },
            credentials: 'include',
            mode: 'cors',
            body: JSON.stringify({ phone_number: cleanPhone })
          });
          const data = await response.json();
          if (!data.available) {
            newErrors.push({ field: 'phoneNumber', message: data.message || 'Phone number is already registered' });
          }
        } catch (error) {
          console.error('Error checking phone:', error);
        }
      }
    }

    // Birth year validation
    if (!formData.birthYear) {
      newErrors.push({ field: 'birthYear', message: 'Birth year is required' });
    } else if (parseInt(formData.birthYear) > maxBirthYear) {
      newErrors.push({ field: 'birthYear', message: 'You must be at least 18 years old to use Work Shelf' });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const validateStep2 = () => {
    const newErrors: FieldError[] = [];

    if (!formData.termsAccepted) {
      newErrors.push({ field: 'termsAccepted', message: 'You must accept the Terms of Service' });
    }

    if (!formData.houseRulesAccepted) {
      newErrors.push({ field: 'houseRulesAccepted', message: 'You must accept the House Rules' });
    }

    setErrors(newErrors);
    return newErrors.length === 0;
  };

  const handleNext = async () => {
    setLoading(true);
    const isValid = await validateStep1();
    setLoading(false);

    if (isValid) {
      setStep(2);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateStep2()) {
      return;
    }
    
    // Step 2 completes the onboarding
    setLoading(true);
    setErrors([]);

    try {
      const token = authService.getToken();
      const cleanPhone = formData.phoneNumber.trim() ? formData.phoneNumber.replace(/[\s()-]/g, '') : null;

      const response = await fetch(`${API_URL}/v1/auth/complete-onboarding`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        credentials: 'include',
        mode: 'cors',
        body: JSON.stringify({
          username: formData.username,
          phone_number: cleanPhone,
          birth_year: parseInt(formData.birthYear),
          interests: formData.interests,
          newsletter_opt_in: formData.newsletterOptIn,
          sms_opt_in: formData.smsOptIn,
          house_rules_accepted: formData.houseRulesAccepted,
        })
      });

      console.log('[Onboarding] Response status:', response.status, response.statusText);

      if (!response.ok) {
        let error;
        try {
          const text = await response.text();
          console.log('[Onboarding] Response text:', text);
          error = text ? JSON.parse(text) : { detail: 'Server error' };
        } catch (parseError) {
          console.error('[Onboarding] Failed to parse error response:', parseError);
          throw new Error(`Server error (${response.status}): Could not parse response`);
        }
        console.error('[Onboarding] API error response:', error);
        
        // Handle validation errors
        if (error.detail && Array.isArray(error.detail)) {
          // Pydantic validation errors - map snake_case to camelCase
          const fieldMapping: Record<string, string> = {
            'phone_number': 'phoneNumber',
            'birth_year': 'birthYear',
            'house_rules_accepted': 'houseRulesAccepted',
            'newsletter_opt_in': 'newsletterOptIn',
            'sms_opt_in': 'smsOptIn'
          };
          
          const validationErrors = error.detail.map((err: any) => {
            const apiField = err.loc ? err.loc[err.loc.length - 1] : 'general';
            const frontendField = fieldMapping[apiField] || apiField;
            return {
              field: frontendField,
              message: err.msg
            };
          });
          setErrors(validationErrors);
          return;
        }
        
        throw new Error(error.detail || 'Failed to complete onboarding');
      }

      // Success! Parse response
      try {
        const text = await response.text();
        console.log('[Onboarding] Success response text:', text);
        if (text) {
          const result = JSON.parse(text);
          console.log('[Onboarding] Parsed response:', result);
        }
      } catch (parseError) {
        console.error('[Onboarding] Failed to parse success response:', parseError);
        // If we got a 200 but can't parse, still consider it success
        console.log('[Onboarding] Got 200 response, proceeding despite parse error');
      }

      // Redirect to personal feed
      navigateTo('/feed');
    } catch (error: any) {
      console.error('Onboarding error:', error);
      setErrors([{ field: 'general', message: error.message || 'Something went wrong. Please try again.' }]);
    } finally {
      setLoading(false);
    }
  };

  const getFieldError = (field: string) => {
    return errors.find(err => err.field === field)?.message;
  };

  const generalError = errors.find(err => err.field === 'general')?.message;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-xl max-w-2xl w-full p-8">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Welcome to Work Shelf! 🎉</h1>
          <p className="text-gray-600">Let's set up your account</p>
          
          {/* Progress indicator */}
          <div className="flex items-center justify-center mt-6 space-x-2">
            <div className={`h-2 w-16 rounded-full ${step >= 1 ? 'bg-[#B34B0C]' : 'bg-gray-200'}`} />
            <div className={`h-2 w-16 rounded-full ${step >= 2 ? 'bg-[#B34B0C]' : 'bg-gray-200'}`} />
          </div>
          <p className="text-sm text-gray-500 mt-2">Step {step} of 2</p>
        </div>

        {/* General Error */}
        {generalError && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg">
            <p className="text-red-800 text-sm">{generalError}</p>
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {/* Step 1: Basic Info */}
          {step === 1 && (
            <div className="space-y-6">
              {/* Username */}
              <div>
                <label htmlFor="username" className="block text-sm font-medium text-gray-700 mb-2">
                  Username *
                </label>
                <input
                  type="text"
                  id="username"
                  name="username"
                  value={formData.username}
                  onChange={handleChange}
                  placeholder="Choose a unique username"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    getFieldError('username') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {getFieldError('username') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('username')}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Letters, numbers, hyphens, and underscores only</p>
              </div>

              {/* Phone Number */}
              <div>
                <label htmlFor="phoneNumber" className="block text-sm font-medium text-gray-700 mb-2">
                  Phone Number (Optional)
                </label>
                <input
                  type="tel"
                  id="phoneNumber"
                  name="phoneNumber"
                  value={formData.phoneNumber}
                  onChange={handleChange}
                  placeholder="+1 (555) 000-0000"
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    getFieldError('phoneNumber') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                />
                {getFieldError('phoneNumber') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('phoneNumber')}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">Must include country code (e.g., +1 for US)</p>
              </div>

              {/* Birth Year */}
              <div>
                <label htmlFor="birthYear" className="block text-sm font-medium text-gray-700 mb-2">
                  Birth Year *
                </label>
                <select
                  id="birthYear"
                  name="birthYear"
                  value={formData.birthYear}
                  onChange={handleChange}
                  className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    getFieldError('birthYear') ? 'border-red-300 bg-red-50' : 'border-gray-300'
                  }`}
                >
                  <option value="">Select your birth year</option>
                  {birthYearOptions.map(year => (
                    <option key={year} value={year}>{year}</option>
                  ))}
                </select>
                {getFieldError('birthYear') && (
                  <p className="mt-1 text-sm text-red-600">{getFieldError('birthYear')}</p>
                )}
                <p className="mt-1 text-xs text-gray-500">You must be 18 or older</p>
              </div>

              {/* Interests */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  What are you interested in? (Optional)
                </label>
                <p className="text-xs text-gray-500 mb-3">
                  Select interests from active groups to find communities you'll love
                </p>
                <div className="grid grid-cols-2 gap-2">
                  {availableInterests.map((interest: string) => (
                    <label key={interest} className="flex items-center p-2 border rounded cursor-pointer hover:bg-gray-50">
                      <input
                        type="checkbox"
                        checked={formData.interests.includes(interest)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormData(prev => ({ ...prev, interests: [...prev.interests, interest] }))
                          } else {
                            setFormData(prev => ({ ...prev, interests: prev.interests.filter(i => i !== interest) }))
                          }
                        }}
                        className="mr-2"
                      />
                      <span className="text-sm capitalize">{interest.replace('-', ' ')}</span>
                    </label>
                  ))}
                </div>
                <p className="mt-1 text-xs text-gray-500">We'll suggest groups based on your interests</p>
              </div>

              <button
                type="button"
                onClick={handleNext}
                disabled={loading}
                className="w-full bg-[#B34B0C] text-white py-3 rounded-lg font-medium hover:bg-[#7C3306] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
              >
                {loading ? 'Checking...' : 'Next →'}
              </button>
            </div>
          )}

          {/* Step 2: Preferences & Legal */}
          {step === 2 && (
            <div className="space-y-6">
              {/* Communication Preferences */}
              <div className="bg-gray-50 p-4 rounded-lg">
                <h3 className="font-medium text-gray-900 mb-3">Communication Preferences</h3>
                
                <div className="space-y-3">
                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      name="newsletterOptIn"
                      checked={formData.newsletterOptIn}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 text-[#B34B0C] rounded focus:ring-[#B34B0C]"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-700">Email Newsletter</span>
                      <p className="text-xs text-gray-500">Receive updates about new features and community highlights</p>
                    </div>
                  </label>

                  <label className="flex items-start cursor-pointer">
                    <input
                      type="checkbox"
                      name="smsOptIn"
                      checked={formData.smsOptIn}
                      onChange={handleChange}
                      className="mt-1 h-4 w-4 text-[#B34B0C] rounded focus:ring-[#B34B0C]"
                    />
                    <div className="ml-3">
                      <span className="text-sm font-medium text-gray-700">SMS Notifications</span>
                      <p className="text-xs text-gray-500">Get text messages for important account updates</p>
                    </div>
                  </label>
                </div>
              </div>

              {/* Legal Agreements */}
              <div className="space-y-3">
                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    name="termsAccepted"
                    checked={formData.termsAccepted}
                    onChange={handleChange}
                    className={`mt-1 h-4 w-4 rounded focus:ring-[#B34B0C] ${
                      getFieldError('termsAccepted') ? 'border-red-300' : 'text-[#B34B0C]'
                    }`}
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-700">
                      I accept the{' '}
                      <a href="/legal/terms" target="_blank" className="text-[#B34B0C] hover:underline">
                        Terms of Service
                      </a>{' '}
                      *
                    </span>
                  </div>
                </label>
                {getFieldError('termsAccepted') && (
                  <p className="ml-7 text-sm text-red-600">{getFieldError('termsAccepted')}</p>
                )}

                <label className="flex items-start cursor-pointer">
                  <input
                    type="checkbox"
                    name="houseRulesAccepted"
                    checked={formData.houseRulesAccepted}
                    onChange={handleChange}
                    className={`mt-1 h-4 w-4 rounded focus:ring-[#B34B0C] ${
                      getFieldError('houseRulesAccepted') ? 'border-red-300' : 'text-[#B34B0C]'
                    }`}
                  />
                  <div className="ml-3">
                    <span className="text-sm font-medium text-gray-700">
                      I accept the{' '}
                      <a href="/legal/rules" target="_blank" className="text-[#B34B0C] hover:underline">
                        House Rules
                      </a>{' '}
                      *
                    </span>
                  </div>
                </label>
                {getFieldError('houseRulesAccepted') && (
                  <p className="ml-7 text-sm text-red-600">{getFieldError('houseRulesAccepted')}</p>
                )}
              </div>

              <div className="flex space-x-4">
                <button
                  type="button"
                  onClick={() => setStep(1)}
                  className="flex-1 bg-gray-200 text-gray-700 py-3 rounded-lg font-medium hover:bg-gray-300 transition-colors"
                >
                  ← Back
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 bg-[#B34B0C] text-white py-3 rounded-lg font-medium hover:bg-[#7C3306] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
                >
                  {loading ? 'Saving...' : 'Complete Setup'}
                </button>
              </div>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
