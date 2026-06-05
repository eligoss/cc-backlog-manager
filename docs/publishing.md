# Publishing to GitHub Packages

> **Note (v1.0.0):** The `bump-version` CLI command referenced below was removed in v1.0.0. Version numbers are now edited directly in `package.json` / `module.json`, and releases are driven by CI auto-versioning on merge to `main` (see CLAUDE.md → CI/CD Auto-Release Integration). Treat the `bump-version` steps in this document as historical.

This document describes how to publish the `@eligoss/agentic-framework` package to GitHub Packages.

## Overview

The framework is published to GitHub Packages as a private npm package. This provides:

- **Stable versioning**: Semantic versioning with automatic release notes
- **Private distribution**: Access controlled via GitHub authentication
- **CI/CD integration**: Automated publishing on release creation
- **Auto-versioning**: Integration with existing `bump-version` command

## Package Information

| Property | Value |
|----------|-------|
| Package Name | `@eligoss/agentic-framework` |
| Registry | `https://npm.pkg.github.com` |
| Scope | `@eligoss` |

## Release Workflow

### Creating a Release

1. Go to **Actions** > **Create Release** workflow
2. Click **Run workflow**
3. Select version bump type:
   - `patch` - Bug fixes, small changes (1.5.0 → 1.5.1)
   - `minor` - New features, backward compatible (1.5.0 → 1.6.0)
   - `major` - Breaking changes (1.5.0 → 2.0.0)
4. Optionally enable **Auto-detect affected modules** for independent module versioning
5. Click **Run workflow**

### What Happens

1. **Version Bump**: CLI's `bump-version` command updates all version files
2. **Commit**: Version changes committed with message `chore: bump version to vX.Y.Z`
3. **Tag**: Git tag `vX.Y.Z` created
4. **Release**: GitHub Release created with auto-generated notes
5. **Publish**: Release triggers `publish.yml` workflow
6. **Package**: Package built, tested, and published to GitHub Packages

## Consumer Installation

### Prerequisites

1. GitHub account with read access to the repository
2. Personal Access Token (PAT) with `read:packages` scope

### Authentication Setup

Create or update `~/.npmrc`:

```
@eligoss:registry=https://npm.pkg.github.com
//npm.pkg.github.com/:_authToken=YOUR_GITHUB_PAT
```

**Security Note**: Never commit your PAT to version control.

### Installation

```bash
# Global installation
npm install -g @eligoss/agentic-framework

# Project dependency
npm install @eligoss/agentic-framework
```

### In package.json

```json
{
  "dependencies": {
    "@eligoss/agentic-framework": "^1.5.0"
  }
}
```

## CI/CD Integration

### GitHub Actions

```yaml
- name: Setup Node.js
  uses: actions/setup-node@v4
  with:
    node-version: '22'
    registry-url: 'https://npm.pkg.github.com'
    scope: '@eligoss'

- name: Install dependencies
  run: npm install
  env:
    NODE_AUTH_TOKEN: ${{ secrets.GITHUB_TOKEN }}
```

### Other CI Systems

Set the `NODE_AUTH_TOKEN` environment variable to a PAT with `read:packages` scope.

## Version Management

### Automatic Module Detection

The `bump-version` command can auto-detect which modules changed:

```bash
# Bump only affected modules
agentic-framework bump-version --auto --type patch

# Bump specific module
agentic-framework bump-version --module core --type minor

# Bump all modules (legacy mode)
agentic-framework bump-version --type patch
```

### Version Files Updated

- `framework/cli/package.json` - CLI version
- `framework/modules/*/module.json` - Individual module versions
- `.agentic-framework.json` - Framework manifest

## Workflows

### `.github/workflows/release.yml`

Manual trigger workflow that:
- Bumps version using `bump-version` command
- Commits and pushes changes
- Creates GitHub Release with tag

### `.github/workflows/publish.yml`

Automated workflow triggered by release:
- Runs lint and tests
- Builds CLI
- Validates framework
- Publishes to GitHub Packages

### `.github/workflows/build.yml`

CI workflow for PRs and main branch:
- Skips on version tags (publish handles those)
- Runs lint, build, tests, validation

## Troubleshooting

### Authentication Errors

```
npm ERR! 401 Unauthorized
```

- Verify PAT has `read:packages` scope
- Check `.npmrc` has correct registry URL
- Ensure PAT hasn't expired

### Package Not Found

```
npm ERR! 404 Not Found
```

- Verify package has been published at least once
- Check you have access to the repository
- Verify scope matches (`@eligoss`)

### Version Already Exists

```
npm ERR! 403 Cannot publish over existing version
```

- Bump version before publishing
- Use the release workflow (handles versioning automatically)

## Local Development

For local development without publishing:

```bash
# In framework/cli directory
npm run build
npm link

# In consumer project
npm link @eligoss/agentic-framework
```

After setup is complete, use published packages instead of `npm link`.
