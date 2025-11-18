# Contributing to WorkShelf Admin Platform

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Code of Conduct

- Be respectful and inclusive
- Focus on constructive feedback
- Help maintain a welcoming environment

## Getting Started

1. Fork the repository
2. Clone your fork: `git clone https://github.com/YOUR_USERNAME/workshelf.git`
3. Install dependencies: `pnpm install`
4. Create a branch: `git checkout -b feature/your-feature`

## Development Workflow

### Before You Start

1. Check existing issues and pull requests
2. Create an issue to discuss major changes
3. Make sure you understand the project's security requirements

### Making Changes

1. **Write clean, documented code**
   - Follow TypeScript best practices
   - Add JSDoc comments for complex functions
   - Keep functions small and focused

2. **Follow the style guide**
   - Run `pnpm lint` to check for issues
   - Run `pnpm format` to auto-format code
   - Follow existing code patterns

3. **Write tests**
   - Add unit tests for new features
   - Maintain or improve test coverage
   - Run `pnpm test` to verify

4. **Security first**
   - Run `pnpm security:scan` before committing
   - Never commit secrets or credentials
   - Follow OWASP security guidelines

5. **Accessibility matters**
   - Follow WCAG 2.1 AA standards
   - Test with keyboard navigation
   - Test with screen readers

### Commit Messages

Follow conventional commits format:

```
type(scope): subject

body

footer
```

**Types:**
- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

**Examples:**
```
feat(auth): add multi-factor authentication

Implements TOTP-based MFA using authenticator apps.
Adds QR code generation and verification.

Closes #123
```

```
fix(api): resolve CORS issue with credentials

Updates CORS configuration to properly handle
credentials in cross-origin requests.
```

### Pull Request Process

1. **Update documentation** if needed
2. **Run all checks locally:**
   ```bash
   pnpm lint
   pnpm type-check
   pnpm security:scan
   pnpm test
   pnpm build
   ```

3. **Create a pull request** with:
   - Clear description of changes
   - Link to related issues
   - Screenshots for UI changes
   - Test results

4. **Respond to feedback** promptly
5. **Keep PR focused** - one feature/fix per PR

### Review Process

- All PRs require at least one approval
- CI/CD checks must pass
- Security scans must pass
- Code coverage should not decrease

## Project Structure

```
packages/
├── shared/          # Shared types and utilities
├── frontend/        # React + react-admin
├── backend/         # NestJS API
└── infrastructure/  # AWS CDK
```

## Key Technologies

- **TypeScript**: Strict mode enabled everywhere
- **React**: Functional components with hooks
- **NestJS**: Modular architecture with DI
- **AWS CDK**: Infrastructure as Code
- **Tailwind CSS**: Utility-first styling

## Security Guidelines

1. **Never hardcode secrets** - use environment variables
2. **Validate all inputs** - use Zod schemas
3. **Sanitize outputs** - prevent XSS
4. **Use prepared statements** - prevent SQL injection
5. **Follow principle of least privilege**
6. **Log security events** to Sentry

## Testing Guidelines

- Write unit tests for business logic
- Write integration tests for APIs
- Write E2E tests for critical user flows
- Aim for >80% code coverage
- Mock external dependencies

## Documentation

- Update README.md for major features
- Add JSDoc comments for public APIs
- Update TypeScript types
- Include examples for complex features

## Questions?

- Open an issue for general questions
- Email security@yourplatform.com for security issues
- Join our Discord for discussions

## License

By contributing, you agree that your contributions will be licensed under the MIT License.
