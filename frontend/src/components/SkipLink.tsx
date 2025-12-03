/**
 * Skip Link Component - WCAG 2.1 Compliance
 * Allows keyboard users to skip navigation and jump to main content
 */

interface SkipLinkProps {
  href?: string
  text?: string
}

export function SkipLink({ href = '#main-content', text = 'Skip to main content' }: SkipLinkProps) {
  return (
    <a
      href={href}
      className="sr-only focus:not-sr-only focus:absolute focus:top-4 focus:left-4 focus:z-[9999] focus:px-4 focus:py-2 focus:rounded-lg focus:font-medium focus:shadow-lg transition-colors"
      style={{
        backgroundColor: '#EDAC53',
        color: '#2E2A27'
      }}
    >
      {text}
    </a>
  )
}
