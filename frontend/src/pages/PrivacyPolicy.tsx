/**
 * Privacy Policy Page
 * 
 * IMPORTANT: This is a TEMPLATE that must be reviewed and customized by legal counsel.
 * Update all [PLACEHOLDER] sections with your specific information.
 * Last updated: December 3, 2025
 */
export default function PrivacyPolicy() {
  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      <div className="max-w-4xl mx-auto px-4 py-12">
        {/* Header */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 mb-6">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Privacy Policy
          </h1>
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Last Updated: December 3, 2025
          </p>
          <p className="mt-4 text-gray-700 dark:text-gray-300">
            At Workshelf, we respect your privacy and are committed to protecting your personal data.
            This privacy policy explains how we collect, use, and protect your information.
          </p>
        </div>

        {/* Content */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8 space-y-8">
          
          {/* 1. Information We Collect */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              1. Information We Collect
            </h2>
            
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
              1.1 Information You Provide
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li><strong>Account Information:</strong> Username, email address, display name</li>
              <li><strong>Profile Information:</strong> Avatar, bio, location (optional)</li>
              <li><strong>Content:</strong> Documents, comments, beta reading feedback</li>
              <li><strong>Beta Reader Profile:</strong> Specialties, rates, portfolio links (if you opt-in)</li>
              <li><strong>Payment Information:</strong> Processed securely by Stripe (we do not store credit card numbers)</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3 mt-6">
              1.2 Automatically Collected Information
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li><strong>Usage Data:</strong> Pages visited, features used, time spent</li>
              <li><strong>Device Information:</strong> Browser type, operating system, IP address</li>
              <li><strong>Error Tracking:</strong> Technical errors via Sentry (no personally identifiable information)</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3 mt-6">
              1.3 Cookies and Local Storage
            </h3>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              We use browser local storage (not HTTP cookies) for essential functionality:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li><strong>Authentication Tokens:</strong> To keep you logged in securely</li>
              <li><strong>Matrix Messaging:</strong> For encrypted messaging features</li>
              <li><strong>Preferences:</strong> Theme, accessibility settings, layout preferences</li>
            </ul>
            <p className="text-gray-700 dark:text-gray-300 mt-3">
              These are <strong>essential</strong> for the platform to function and cannot be disabled without
              losing access to core features. We do <strong>not</strong> use third-party tracking cookies or analytics cookies.
            </p>
          </section>

          {/* 2. How We Use Your Information */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              2. How We Use Your Information
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li><strong>Provide Services:</strong> Enable document creation, collaboration, beta reading</li>
              <li><strong>Communication:</strong> Send notifications, updates, and security alerts</li>
              <li><strong>Payments:</strong> Process purchases and creator earnings via Stripe</li>
              <li><strong>Security:</strong> Detect and prevent fraud, abuse, and technical issues</li>
              <li><strong>Improvement:</strong> Analyze usage patterns to improve features (aggregated, non-personal data)</li>
              <li><strong>Legal Compliance:</strong> Comply with legal obligations and enforce our Terms of Service</li>
            </ul>
          </section>

          {/* 3. Information Sharing */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              3. Information Sharing and Disclosure
            </h2>
            
            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3">
              3.1 With Your Consent
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Public profile information (if you choose to make it public)</li>
              <li>Published documents with public visibility</li>
              <li>Group membership (visible to other group members)</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3 mt-6">
              3.2 Third-Party Services
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li><strong>Stripe:</strong> Payment processing (PCI-DSS compliant)</li>
              <li><strong>Anthropic:</strong> AI writing assistance (no personal data shared)</li>
              <li><strong>Sentry:</strong> Error tracking (PII disabled)</li>
              <li><strong>Azure Blob Storage:</strong> File storage (encrypted at rest)</li>
              <li><strong>Matrix (Self-Hosted):</strong> Encrypted messaging</li>
            </ul>

            <h3 className="text-xl font-medium text-gray-800 dark:text-gray-200 mb-3 mt-6">
              3.3 We Will Never
            </h3>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li>Sell your personal data to third parties</li>
              <li>Share your private documents without permission</li>
              <li>Use your content to train AI models without consent</li>
              <li>Send spam or marketing emails (unless you opt-in)</li>
            </ul>
          </section>

          {/* 4. Data Security */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              4. Data Security
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              We implement industry-standard security measures:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li><strong>Encryption:</strong> HTTPS/TLS for all data in transit</li>
              <li><strong>Authentication:</strong> OAuth 2.0 with PKCE via Keycloak</li>
              <li><strong>Database:</strong> PostgreSQL with parameterized queries (SQL injection protection)</li>
              <li><strong>Access Control:</strong> Role-based permissions and multi-tenancy isolation</li>
              <li><strong>File Storage:</strong> Encrypted at rest on Azure Blob Storage</li>
            </ul>
          </section>

          {/* 5. Your Rights */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              5. Your Privacy Rights
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-3">
              Under GDPR, CCPA, and other privacy laws, you have the right to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li><strong>Access:</strong> Request a copy of your personal data</li>
              <li><strong>Correction:</strong> Update inaccurate or incomplete information</li>
              <li><strong>Deletion:</strong> Request deletion of your account and data</li>
              <li><strong>Portability:</strong> Export your data in a machine-readable format</li>
              <li><strong>Objection:</strong> Object to certain processing activities</li>
              <li><strong>Restriction:</strong> Request temporary restriction of processing</li>
            </ul>

            <div className="mt-6 p-4 bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg">
              <h4 className="font-semibold text-blue-900 dark:text-blue-200 mb-2">
                To Exercise Your Rights:
              </h4>
              <ul className="space-y-2 text-blue-800 dark:text-blue-300">
                <li>• <strong>Export Your Data:</strong> Visit <a href="/export" className="underline hover:text-blue-600">Export Center</a> (coming soon)</li>
                <li>• <strong>Delete Account:</strong> Visit <a href="/profile" className="underline hover:text-blue-600">Profile Settings</a> (coming soon)</li>
                <li>• <strong>Other Requests:</strong> Email privacy@workshelf.dev [PLACEHOLDER]</li>
              </ul>
            </div>
          </section>

          {/* 6. Data Retention */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              6. Data Retention
            </h2>
            <ul className="list-disc list-inside space-y-2 text-gray-700 dark:text-gray-300 ml-4">
              <li><strong>Active Accounts:</strong> Data retained while account is active</li>
              <li><strong>Deleted Documents:</strong> Soft-deleted for 30 days, then permanently removed [PLACEHOLDER: Update with actual policy]</li>
              <li><strong>Deleted Accounts:</strong> Personal data deleted within 90 days [PLACEHOLDER: Update with actual policy]</li>
              <li><strong>Legal Requirements:</strong> Some data may be retained longer for legal/regulatory compliance</li>
            </ul>
          </section>

          {/* 7. Children's Privacy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              7. Children's Privacy
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Workshelf is not intended for users under 13 years of age. We do not knowingly collect
              information from children. If you believe a child has provided us with personal information,
              please contact us immediately at privacy@workshelf.dev [PLACEHOLDER].
            </p>
          </section>

          {/* 8. International Data Transfers */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              8. International Data Transfers
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              Your data may be processed in [PLACEHOLDER: List countries/regions]. We ensure appropriate
              safeguards are in place through Standard Contractual Clauses and compliance with
              GDPR requirements for international transfers.
            </p>
          </section>

          {/* 9. Changes to Policy */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              9. Changes to This Privacy Policy
            </h2>
            <p className="text-gray-700 dark:text-gray-300">
              We may update this privacy policy from time to time. We will notify you of significant
              changes via email or a prominent notice on the platform. Continued use of Workshelf
              after changes constitutes acceptance of the updated policy.
            </p>
          </section>

          {/* 10. Contact Us */}
          <section>
            <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-4">
              10. Contact Us
            </h2>
            <p className="text-gray-700 dark:text-gray-300 mb-4">
              If you have questions about this privacy policy or our data practices:
            </p>
            <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded-lg">
              <p className="text-gray-700 dark:text-gray-300">
                <strong>Email:</strong> privacy@workshelf.dev [PLACEHOLDER]<br />
                <strong>Address:</strong> [PLACEHOLDER: Physical address]<br />
                <strong>Data Protection Officer:</strong> [PLACEHOLDER: DPO contact if required]
              </p>
            </div>
          </section>

          {/* Disclaimer */}
          <div className="mt-8 p-6 bg-yellow-50 dark:bg-yellow-900/20 border-2 border-yellow-300 dark:border-yellow-700 rounded-lg">
            <h3 className="text-lg font-semibold text-yellow-900 dark:text-yellow-200 mb-2">
              ⚠️ Legal Disclaimer
            </h3>
            <p className="text-sm text-yellow-800 dark:text-yellow-300">
              This privacy policy is a TEMPLATE and must be reviewed and customized by qualified legal counsel
              before publication. Workshelf, its developers, and contributors are not responsible for any legal
              issues arising from use of this template. You must update all [PLACEHOLDER] sections and ensure
              compliance with applicable laws in your jurisdiction.
            </p>
          </div>
        </div>

        {/* Back to Home */}
        <div className="mt-6 text-center">
          <a 
            href="/" 
            className="text-blue-600 dark:text-blue-400 hover:underline"
          >
            ← Back to Home
          </a>
        </div>
      </div>
    </div>
  )
}
