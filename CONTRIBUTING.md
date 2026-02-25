# Contributing to Next.js + Tailwind CSS + shadcn/ui Template

Thank you for considering contributing to this template! This document provides guidelines for contributing to the project.

## Getting Started

1. Fork the repository
2. Clone your fork locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/nextjs-tailwind-shadcn.git
   cd nextjs-tailwind-shadcn
   ```
3. Install dependencies:
   ```bash
   pnpm install
   ```
4. Create a new branch for your changes:
   ```bash
   git checkout -b feat/your-feature-name
   ```

## Development Workflow

### Running the Development Server

```bash
pnpm dev
```

The app will be available at [http://localhost:3000](http://localhost:3000).

### Building

Test that your changes build successfully:

```bash
pnpm build
```

### Linting

Run ESLint to check for code quality issues:

```bash
pnpm lint
```

## Commit Guidelines

We use [Conventional Commits](https://www.conventionalcommits.org/) for commit messages. This helps maintain a clean and semantic commit history.

### Commit Message Format

```
<type>(<scope>): <subject>

<body>

<footer>
```

### Types

- **feat**: A new feature
- **fix**: A bug fix
- **docs**: Documentation only changes
- **style**: Changes that don't affect code meaning (formatting, missing semicolons, etc.)
- **refactor**: Code change that neither fixes a bug nor adds a feature
- **perf**: Performance improvements
- **test**: Adding or updating tests
- **chore**: Changes to build process or auxiliary tools
- **ci**: Changes to CI configuration files and scripts

### Examples

```bash
feat: add button component from shadcn/ui
fix: resolve dark mode toggle issue
docs: update installation instructions
chore: update dependencies
```

For multi-line commits:

```bash
git commit -m "feat: add authentication system

- Implement login/logout functionality
- Add JWT token management
- Create protected route middleware"
```

## Pull Request Process

1. **Update Documentation**: If you've added features, update the README.md
2. **Test Your Changes**: Ensure your code builds and runs without errors
3. **Commit Using Conventional Commits**: Follow the commit guidelines above
4. **Create a Pull Request**:
   - Provide a clear title and description
   - Reference any related issues
   - Explain what changes you've made and why
5. **Wait for Review**: A maintainer will review your PR and may request changes

## What to Contribute

### Good First Issues

- Fixing typos in documentation
- Improving README clarity
- Adding commonly used shadcn/ui components
- Updating dependencies

### Feature Additions

Before working on major features:
1. Open an issue to discuss the feature
2. Wait for maintainer feedback
3. Proceed with implementation after approval

### Bug Fixes

1. Check if an issue already exists
2. If not, create one describing the bug
3. Submit a PR with the fix

## Code Style

- **TypeScript**: Use TypeScript for all code
- **Formatting**: Follow the existing code style
- **Components**: Use functional components with TypeScript
- **Naming**: Use PascalCase for components, camelCase for functions/variables
- **Imports**: Group imports (React, libraries, local files)

Example:

```tsx
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'

export function MyComponent() {
  const [isOpen, setIsOpen] = useState(false)

  return (
    <div className={cn("container", isOpen && "open")}>
      <Button onClick={() => setIsOpen(!isOpen)}>
        Toggle
      </Button>
    </div>
  )
}
```

## Project Structure Guidelines

- **app/**: Next.js App Router pages and layouts
- **components/ui/**: shadcn/ui components (auto-generated)
- **components/**: Custom React components
- **lib/**: Utility functions and helpers
- **public/**: Static assets

## Dependencies

### Adding Dependencies

Only add dependencies that are:
- Actively maintained
- Well-documented
- Widely used in the community
- Necessary for the template's core functionality

Before adding a dependency, discuss it in an issue.

### Updating Dependencies

When updating dependencies:
1. Test thoroughly after updating
2. Update relevant documentation
3. Note any breaking changes in the PR description

## Questions?

If you have questions:
- Open an issue with the `question` label
- Check existing issues and discussions
- Review the [README.md](README.md)

## License

By contributing, you agree that your contributions will be licensed under the MIT License.

## Thank You!

Every contribution, no matter how small, is appreciated. Thank you for helping improve this template!
