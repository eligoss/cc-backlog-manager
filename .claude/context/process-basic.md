---
context-level: basic
context-category: process
token-target: 500
---

# Process Context - Basic

## Development Workflow

Standard feature development follows this pattern:

1. **Branch Creation** - Create feature branch from `main`
2. **Implementation** - Write code with TypeScript type safety
3. **Testing** - Add tests to maintain >64% coverage
4. **Pull Request** - Submit PR for review
5. **Code Review** - Address feedback from maintainers
6. **Merge** - Merge to main after approval

## Quality Standards

All code must meet:

- **Type Safety** - Full TypeScript typing, no `any` types
- **Linting** - Pass ESLint validation
- **Test Coverage** - Minimum 64% coverage threshold
- **Pre-commit Hooks** - Automated validation before commits

## Contributing Basics

To contribute to the framework:

1. Fork the repository
2. Create a feature branch with descriptive name
3. Write implementation with tests
4. Submit pull request with clear description
5. Respond to review feedback

## Pre-commit Validation

Before every commit, automated hooks validate:

- Routes consistency
- Link validity
- Registry synchronization
- Agent/skill registration
- Version consistency

Commits are rejected if validation fails.

## Communication Channels

- **GitHub Issues** - Bug reports and feature requests
- **Pull Requests** - Code changes and technical discussion
- **Code Comments** - Implementation-specific questions
- **Commit Messages** - Change rationale and context

## Branch Strategy

- `main` - Stable release branch
- `feature/*` - New features and enhancements
- `fix/*` - Bug fixes
- `docs/*` - Documentation updates

## CLI Command Usage

Framework operations use TypeScript CLI:

```bash
agentic-framework <command>
```

Available commands: `init`, `add`, `remove`, `list`, `info`, `validate`, `routes sync`, `bump-version`, `status`

**Never perform manually what CLI can automate.**
