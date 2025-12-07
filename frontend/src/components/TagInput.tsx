import React, { useState, useEffect, useRef } from 'react';
import { authService } from '../services/auth';

interface Tag {
  id: number;
  name: string;
  slug: string;
  description?: string;
  usage_count: number;
}

interface TagInputProps {
  selectedTags: Tag[];
  onTagsChange: (tags: Tag[]) => void;
  placeholder?: string;
  maxTags?: number;
}

const TagInput: React.FC<TagInputProps> = ({
  selectedTags,
  onTagsChange,
  placeholder = "Add tags...",
  maxTags = 20
}) => {
  const [inputValue, setInputValue] = useState('');
  const [suggestions, setSuggestions] = useState<Tag[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Debounced search
  useEffect(() => {
    if (!inputValue.trim()) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await fetch(
          `${import.meta.env.VITE_API_URL}/api/v1/content-tags/search?q=${encodeURIComponent(inputValue)}&limit=10&sort=popular`,
          {
            headers: {
              'Authorization': `Bearer ${token}`,
              'Content-Type': 'application/json'
            }
          }
        );
        if (!response.ok) throw new Error('Failed to search tags');
        const data = await response.json();
        
        // Filter out already selected tags
        const filtered = data.filter(
          (tag: Tag) => !selectedTags.some(selected => selected.id === tag.id)
        );
        
        setSuggestions(filtered);
        setIsOpen(filtered.length > 0 || inputValue.length >= 2);
      } catch (error) {
        console.error('Failed to search tags:', error);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [inputValue, selectedTags]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node) &&
        inputRef.current &&
        !inputRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleAddTag = (tag: Tag) => {
    if (selectedTags.length < maxTags) {
      onTagsChange([...selectedTags, tag]);
      setInputValue('');
      setSuggestions([]);
      setIsOpen(false);
      inputRef.current?.focus();
    }
  };

  const handleRemoveTag = (tagId: number) => {
    onTagsChange(selectedTags.filter(tag => tag.id !== tagId));
  };

  const handleCreateNewTag = async () => {
    const trimmedValue = inputValue.trim();
    if (!trimmedValue || trimmedValue.length < 2) return;

    setIsCreating(true);
    try {
      const token = localStorage.getItem('access_token');
      const response = await fetch(
        `${import.meta.env.VITE_API_URL}/api/v1/content-tags/`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            name: trimmedValue,
            description: null
          })
        }
      );
      
      if (!response.ok) {
        const errorData = await response.json();
        if (response.status === 400 && errorData.detail?.includes('already exists')) {
          // Tag already exists, try to find it in suggestions
          const existingTag = suggestions.find(
            tag => tag.name.toLowerCase() === trimmedValue.toLowerCase()
          );
          if (existingTag) {
            handleAddTag(existingTag);
          }
          return;
        }
        throw new Error('Failed to create tag');
      }
      
      const newTag = await response.json();
      handleAddTag(newTag);
    } catch (error: any) {
      console.error('Failed to create tag:', error);
      alert('Failed to create tag. Please try again.');
    } finally {
      setIsCreating(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (suggestions.length > 0) {
        handleAddTag(suggestions[0]);
      } else if (inputValue.trim().length >= 2) {
        handleCreateNewTag();
      }
    } else if (e.key === 'Backspace' && !inputValue && selectedTags.length > 0) {
      // Remove last tag on backspace if input is empty
      handleRemoveTag(selectedTags[selectedTags.length - 1].id);
    }
  };

  return (
    <div className="w-full">
      {/* Selected Tags */}
      {selectedTags.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {selectedTags.map(tag => (
            <div
              key={tag.id}
              className="inline-flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm"
            >
              <span>{tag.name}</span>
              <button
                type="button"
                onClick={() => handleRemoveTag(tag.id)}
                className="hover:text-blue-600 focus:outline-none"
                aria-label={`Remove ${tag.name}`}
              >
                ×
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Input Field */}
      <div className="relative">
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onFocus={() => inputValue && setIsOpen(true)}
          placeholder={selectedTags.length >= maxTags ? 'Maximum tags reached' : placeholder}
          disabled={selectedTags.length >= maxTags}
          className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent disabled:bg-gray-100 disabled:cursor-not-allowed"
        />

        {/* Suggestions Dropdown */}
        {isOpen && (
          <div
            ref={dropdownRef}
            className="absolute z-10 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto"
          >
            {suggestions.length > 0 ? (
              <ul className="py-1">
                {suggestions.map(tag => (
                  <li key={tag.id}>
                    <button
                      type="button"
                      onClick={() => handleAddTag(tag)}
                      className="w-full px-4 py-2 text-left hover:bg-gray-100 focus:bg-gray-100 focus:outline-none"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{tag.name}</span>
                        <span className="text-xs text-gray-500">{tag.usage_count} uses</span>
                      </div>
                      {tag.description && (
                        <p className="text-sm text-gray-600 mt-1">{tag.description}</p>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            ) : inputValue.trim().length >= 2 ? (
              <div className="px-4 py-3">
                <button
                  type="button"
                  onClick={handleCreateNewTag}
                  disabled={isCreating}
                  className="w-full text-left text-blue-600 hover:text-blue-800 disabled:opacity-50"
                >
                  {isCreating ? (
                    'Creating...'
                  ) : (
                    <>
                      Create new tag: <strong>"{inputValue}"</strong>
                    </>
                  )}
                </button>
                <p className="text-xs text-gray-500 mt-1">
                  Press Enter to create this tag
                </p>
              </div>
            ) : null}
          </div>
        )}
      </div>

      {/* Helper Text */}
      <p className="text-sm text-gray-600 mt-2">
        {selectedTags.length}/{maxTags} tags • Type to search or create new tags
      </p>
    </div>
  );
};

export default TagInput;
