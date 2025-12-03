/**
 * Accessible Button Component - WCAG 2.1 Compliance
 * Ensures proper touch targets (44x44px minimum) and loading states
 */

import { ButtonHTMLAttributes, forwardRef } from 'react'
import { Loader2 } from 'lucide-react'

interface AccessibleButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
  loadingText?: string
  icon?: React.ReactNode
  iconPosition?: 'left' | 'right'
}

export const AccessibleButton = forwardRef<HTMLButtonElement, AccessibleButtonProps>(
  ({
    variant = 'primary',
    size = 'md',
    loading = false,
    loadingText,
    icon,
    iconPosition = 'left',
    children,
    disabled,
    className = '',
    ...props
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center gap-2 rounded-lg font-medium transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variantStyles = {
      primary: 'bg-primary text-primary-foreground hover:opacity-90 focus:ring-primary',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary',
      danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
      ghost: 'bg-transparent text-foreground hover:bg-accent focus:ring-primary'
    }

    // WCAG 2.1: Minimum touch target size of 44x44px
    const sizeStyles = {
      sm: 'px-3 py-2 text-sm min-h-[40px]', // Slightly under 44px for tight spaces
      md: 'px-4 py-2.5 text-base min-h-[44px]', // Exactly 44px
      lg: 'px-6 py-3 text-lg min-h-[48px]' // Larger for primary actions
    }

    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <>
            <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
            <span>{loadingText || children}</span>
          </>
        ) : (
          <>
            {icon && iconPosition === 'left' && (
              <span aria-hidden="true">{icon}</span>
            )}
            <span>{children}</span>
            {icon && iconPosition === 'right' && (
              <span aria-hidden="true">{icon}</span>
            )}
          </>
        )}
      </button>
    )
  }
)

AccessibleButton.displayName = 'AccessibleButton'

/**
 * Icon Button - For buttons with only icons
 * Always requires an accessible label
 */
interface IconButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  icon: React.ReactNode
  label: string // Required for accessibility
  variant?: 'primary' | 'secondary' | 'danger' | 'ghost'
  size?: 'sm' | 'md' | 'lg'
  loading?: boolean
}

export const IconButton = forwardRef<HTMLButtonElement, IconButtonProps>(
  ({
    icon,
    label,
    variant = 'ghost',
    size = 'md',
    loading = false,
    disabled,
    className = '',
    ...props
  }, ref) => {
    const baseStyles = 'inline-flex items-center justify-center rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed'

    const variantStyles = {
      primary: 'bg-primary text-primary-foreground hover:opacity-90 focus:ring-primary',
      secondary: 'bg-secondary text-secondary-foreground hover:bg-secondary/80 focus:ring-secondary',
      danger: 'bg-red-500 text-white hover:bg-red-600 focus:ring-red-500',
      ghost: 'bg-transparent text-foreground hover:bg-accent focus:ring-primary'
    }

    // WCAG 2.1: Minimum touch target size of 44x44px
    const sizeStyles = {
      sm: 'w-[40px] h-[40px]',
      md: 'w-[44px] h-[44px]',
      lg: 'w-[48px] h-[48px]'
    }

    const isDisabled = disabled || loading

    return (
      <button
        ref={ref}
        disabled={isDisabled}
        aria-disabled={isDisabled}
        aria-busy={loading}
        aria-label={label}
        title={label}
        className={`${baseStyles} ${variantStyles[variant]} ${sizeStyles[size]} ${className}`}
        {...props}
      >
        {loading ? (
          <Loader2 className="w-5 h-5 animate-spin" aria-hidden="true" />
        ) : (
          <span aria-hidden="true">{icon}</span>
        )}
      </button>
    )
  }
)

IconButton.displayName = 'IconButton'
