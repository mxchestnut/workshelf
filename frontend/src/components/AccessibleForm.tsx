/**
 * Accessible Form Input Component - WCAG 2.1 Compliance
 * Provides proper error messaging and ARIA attributes for form inputs
 */

import { forwardRef, InputHTMLAttributes } from 'react'

interface AccessibleInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string
  error?: string
  helpText?: string
  hideLabel?: boolean
}

export const AccessibleInput = forwardRef<HTMLInputElement, AccessibleInputProps>(
  ({ label, error, helpText, hideLabel, id, required, ...props }, ref) => {
    const inputId = id || `input-${label.toLowerCase().replace(/\s+/g, '-')}`
    const errorId = `${inputId}-error`
    const helpId = `${inputId}-help`

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className={hideLabel ? 'sr-only' : 'block text-sm font-medium mb-2'}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>

        <input
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            [
              error ? errorId : null,
              helpText ? helpId : null
            ].filter(Boolean).join(' ') || undefined
          }
          aria-required={required}
          className={`w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-border focus:border-primary'
          }`}
          {...props}
        />

        {helpText && !error && (
          <p id={helpId} className="mt-1 text-sm text-muted-foreground">
            {helpText}
          </p>
        )}

        {error && (
          <p id={errorId} role="alert" className="mt-1 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    )
  }
)

AccessibleInput.displayName = 'AccessibleInput'

/**
 * Accessible Textarea Component
 */
interface AccessibleTextareaProps extends InputHTMLAttributes<HTMLTextAreaElement> {
  label: string
  error?: string
  helpText?: string
  hideLabel?: boolean
  rows?: number
}

export const AccessibleTextarea = forwardRef<HTMLTextAreaElement, AccessibleTextareaProps>(
  ({ label, error, helpText, hideLabel, id, required, rows = 4, ...props }, ref) => {
    const inputId = id || `textarea-${label.toLowerCase().replace(/\s+/g, '-')}`
    const errorId = `${inputId}-error`
    const helpId = `${inputId}-help`

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className={hideLabel ? 'sr-only' : 'block text-sm font-medium mb-2'}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>

        <textarea
          ref={ref}
          id={inputId}
          rows={rows}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            [
              error ? errorId : null,
              helpText ? helpId : null
            ].filter(Boolean).join(' ') || undefined
          }
          aria-required={required}
          className={`w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary resize-vertical ${
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-border focus:border-primary'
          }`}
          {...(props as any)}
        />

        {helpText && !error && (
          <p id={helpId} className="mt-1 text-sm text-muted-foreground">
            {helpText}
          </p>
        )}

        {error && (
          <p id={errorId} role="alert" className="mt-1 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    )
  }
)

AccessibleTextarea.displayName = 'AccessibleTextarea'

/**
 * Accessible Select Component
 */
interface AccessibleSelectProps extends InputHTMLAttributes<HTMLSelectElement> {
  label: string
  error?: string
  helpText?: string
  hideLabel?: boolean
  options: Array<{ value: string; label: string }>
}

export const AccessibleSelect = forwardRef<HTMLSelectElement, AccessibleSelectProps>(
  ({ label, error, helpText, hideLabel, id, required, options, ...props }, ref) => {
    const inputId = id || `select-${label.toLowerCase().replace(/\s+/g, '-')}`
    const errorId = `${inputId}-error`
    const helpId = `${inputId}-help`

    return (
      <div className="w-full">
        <label
          htmlFor={inputId}
          className={hideLabel ? 'sr-only' : 'block text-sm font-medium mb-2'}
        >
          {label}
          {required && <span className="text-red-500 ml-1" aria-label="required">*</span>}
        </label>

        <select
          ref={ref}
          id={inputId}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={
            [
              error ? errorId : null,
              helpText ? helpId : null
            ].filter(Boolean).join(' ') || undefined
          }
          aria-required={required}
          className={`w-full px-4 py-2 rounded-lg border transition-colors focus:outline-none focus:ring-2 focus:ring-primary ${
            error
              ? 'border-red-500 focus:border-red-500'
              : 'border-border focus:border-primary'
          }`}
          {...(props as any)}
        >
          {options.map(option => (
            <option key={option.value} value={option.value}>
              {option.label}
            </option>
          ))}
        </select>

        {helpText && !error && (
          <p id={helpId} className="mt-1 text-sm text-muted-foreground">
            {helpText}
          </p>
        )}

        {error && (
          <p id={errorId} role="alert" className="mt-1 text-sm text-red-500">
            {error}
          </p>
        )}
      </div>
    )
  }
)

AccessibleSelect.displayName = 'AccessibleSelect'
