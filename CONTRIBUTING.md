# Contributing to Agora Conversational AI Next.js Quickstart

Thank you for your interest in contributing! This document provides guidelines for contributing to this project.

## Getting Started

### Prerequisites

- Node.js 22 or higher (see `engines` in `package.json`)
- pnpm 8.x or higher
- An Agora account with Conversational AI enabled

### Development Setup

1. Clone the repository:

   ```bash
   git clone https://github.com/shravanivarale/Echo-Sphere.git
   cd Echo-Sphere
   ```

2. Install dependencies:

   ```bash
   pnpm install
   ```

3. Set up your environment variables:

   ```bash
   cp env.local.example .env.local
   ```

   Use the Agora CLI to create or select a project, then write its credentials directly to `.env.local`:

   ```bash
   agora login
   agora project create my-first-voice-agent --feature rtc --feature convoai
   agora project use my-first-voice-agent
   agora project env write .env.local
   ```

4. Start the development server:

   ```bash
   pnpm dev
   ```

## Development Workflow

### Making Changes

1. Create a new branch for your feature or fix:

   ```bash
   git switch -c feat/your-feature-name
   ```

2. Make your changes following the coding standards below.

3. Test your changes locally:

   ```bash
   pnpm run verify
   ```

4. Commit your changes with a conventional commit message, such as `feat: add microphone selector`.

5. Push your branch and create a Pull Request.

### Documentation-Only Changes

When updating Markdown documentation:

- Keep instructions clear, concise, and easy for new contributors to follow.
- Verify that commands, file paths, and repository links are correct.
- Preview Markdown files before committing to check headings, lists, links, and code blocks.
- Update related documentation if the same information appears in multiple files.
- Do not include API keys, passwords, tokens, or other sensitive information.
- Use a descriptive commit message, such as `docs: update contribution guidelines`.

### Coding Standards

- **TypeScript:** All new code must be written in TypeScript.
- **Formatting:** Follow the existing code style and keep `pnpm run lint` clean.
- **Linting:** Ensure your code passes ESLint checks (`pnpm run lint`).
- **Comments:** Add comments for non-obvious patterns, especially:
  - StrictMode guards and React lifecycle patterns
  - Agora SDK-specific requirements
  - Security considerations
  - Performance optimizations

### Component Guidelines

- Use functional components with hooks.
- Follow the existing patterns for Agora SDK integration:
  - `isReady` guard for StrictMode safety
  - Hook ownership (do not manually call `client.leave()`, etc.)
  - Proper cleanup in `useEffect` returns
- Keep components focused and single-purpose.
- Use TypeScript interfaces for props.

### API Route Guidelines

- Validate all inputs.
- Use proper HTTP status codes.
- Include clear error messages.
- Log errors with context.
- Never expose sensitive credentials in responses.

## Pull Request Process

1. **Title:** Use a clear, descriptive title.
   - Good: `Add support for Azure OpenAI endpoints`
   - Bad: `Update code`

2. **Description:** Include:
   - What changes you made and why
   - How to test the changes
   - Any breaking changes
   - Screenshots for UI changes

3. **Review:** Wait for maintainer review.
   - Address feedback promptly.
   - Keep discussions focused and professional.

4. **Merge:** Once approved, a maintainer will merge your PR.

## What to Contribute

### Good First Issues

- Documentation improvements
- Error message clarity
- Progressive disclosure documentation improvements
- UI/UX enhancements
- Accessibility improvements

### Feature Contributions

Before starting work on a major feature:

1. Open an issue to discuss the feature.
2. Wait for maintainer feedback.
3. Ensure it aligns with the project's goals.

### Bug Fixes

- Include steps to reproduce the bug.
- Add a test case if possible.
- Explain the root cause in your PR description.

## Documentation

When changing implementation:

- Update relevant sections in `README.md`.
- Update `AGENTS.md` and the relevant `docs/ai/` files if architecture, workflows, conventions, or contracts change.
- Update `docs/ai/RECIPE.md` if recipe extension points, invariants, or stable contracts change.
- Use conventional commits and `type/short-description` branches.
- Keep code comments synchronized with the code.
- Do not mention AI tool names in commit messages or Pull Request descriptions.

## Testing

This project ships with a verification workflow:

```bash
pnpm run doctor
pnpm run verify:api
pnpm run verify
```

Use `pnpm run verify` before opening a Pull Request. `pnpm run verify:api` is the narrower check for server-route contract changes.

## Questions?

- Open an issue for questions about contributing.
- Check existing issues and Pull Requests for similar discussions.
- Review `AGENTS.md` for the project architecture overview.

## Code of Conduct

- Be respectful and professional.
- Welcome newcomers and help them learn.
- Focus on constructive feedback.
- Assume good intentions.

## License

By contributing, you agree that your contributions will be licensed under the MIT License.