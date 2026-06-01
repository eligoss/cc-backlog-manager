# Confluence Publishing Workflow Examples

Complete examples for publishing, updating, and managing Confluence documentation.

## Example 1: Publish New Documentation

**Scenario:** Create new documentation page from scratch

### Step 1: Create Draft

```bash
cat > drafts/api-documentation.md <<EOF
---
confluence-pageId: null
confluence-url: null
confluence-space: "WA"
confluence-parent: "393217"
confluence-page-revision: null
title: "API Documentation"
documentType: confluence-page
pageType: architecture
tags:
  - api
  - documentation
author: "AI Agent"
lastSyncDate: null
---

# API Documentation

## Overview

This document describes the REST API endpoints for our application.

## Endpoints

### GET /api/users

Retrieves all users.

**Response:**
\`\`\`json
{
  "users": [
    {"id": 1, "name": "Alice"},
    {"id": 2, "name": "Bob"}
  ]
}
\`\`\`

### POST /api/users

Creates a new user.

**Request Body:**
\`\`\`json
{
  "name": "Charlie",
  "email": "charlie@example.com"
}
\`\`\`

**Response:**
\`\`\`json
{
  "id": 3,
  "name": "Charlie",
  "email": "charlie@example.com",
  "createdAt": "2025-12-24T10:00:00Z"
}
\`\`\`
EOF
```

### Step 2: Validate

```bash
agentic-framework confluence validate-page drafts/api-documentation.md

# Output:
# ✅ YAML frontmatter valid
# ✅ Required fields present
# ✅ Markdown syntax correct
# ✅ Space "WA" exists
# ✅ Parent page "393217" exists
```

### Step 3: Publish

```bash
agentic-framework confluence create-page drafts/api-documentation.md --space WA

# Output:
# Creating page in Confluence space: WA
# Converting markdown to ADF...
# Calling Confluence REST API...
# ✅ Page created successfully
# Page ID: 456789
# URL: https://{your-org}.atlassian.net/wiki/spaces/WA/pages/456789/API+Documentation
# Version: 1
# Updating YAML frontmatter...
# ✅ Done
```

### Step 4: Verify Updated YAML

```bash
cat drafts/api-documentation.md | head -20

# Output:
# ---
# confluence-pageId: "456789"  # ← Populated
# confluence-url: "https://{your-org}.atlassian.net/wiki/spaces/WA/pages/456789/API+Documentation"  # ← Populated
# confluence-space: "WA"
# confluence-parent: "393217"
# confluence-page-revision: 1  # ← Set to 1
# title: "API Documentation"
# documentType: confluence-page
# pageType: architecture
# tags:
#   - api
#   - documentation
# author: "AI Agent"
# lastSyncDate: "2025-12-24T10:30:00Z"  # ← Timestamp
# ---
```

### Step 5: Move to Published

```bash
mv drafts/api-documentation.md published/api-documentation.md
```

### Step 6: Commit

```bash
git add published/api-documentation.md
git commit -m "docs(confluence): publish API documentation"
```

---

## Example 2: Update Existing Documentation

**Scenario:** Modify published page with local changes

### Step 1: Edit Content

```bash
# Edit published/api-documentation.md
vi published/api-documentation.md

# Add new endpoint:
# ### DELETE /api/users/:id
#
# Deletes a user by ID.
```

### Step 2: Validate

```bash
agentic-framework confluence validate-page published/api-documentation.md

# Output:
# ✅ YAML frontmatter valid
# ✅ Markdown syntax correct
# ✅ Page ID "456789" exists in Confluence
```

### Step 3: Update Page

```bash
agentic-framework confluence create-page published/api-documentation.md --space WA

# Output:
# Updating existing page: 456789
# Fetching current version from Confluence...
# Current version: 1
# Local version: 1
# ✅ Version match - proceeding with update
# Converting markdown to ADF...
# Calling Confluence REST API...
# ✅ Page updated successfully
# Version incremented: 1 → 2
# Updating YAML frontmatter...
# ✅ Done
```

### Step 4: Verify Updated Metadata

```bash
grep "confluence-page-revision" published/api-documentation.md

# Output:
# confluence-page-revision: 2  # ← Incremented from 1
```

### Step 5: Commit

```bash
git add published/api-documentation.md
git commit -m "docs(confluence): add DELETE endpoint to API documentation"
```

---

## Example 3: Fetch Page from Confluence

**Scenario:** Pull latest version from Confluence to local

### Step 1: Fetch Page

```bash
agentic-framework confluence fetch-page 456789 --output published/api-documentation.md

# Output:
# Fetching page ID: 456789
# Downloading ADF content from Confluence...
# Converting ADF to markdown...
# Saving to published/api-documentation.md...
# ✅ Page fetched successfully
# Version: 3
# Last modified: 2025-12-24T12:00:00Z
```

### Step 2: Review Fetched Content

```bash
cat published/api-documentation.md | head -30

# Output shows:
# - Updated YAML metadata (pageId, version, URL)
# - Markdown content converted from ADF
# - All formatting preserved
```

### Step 3: Commit

```bash
git add published/api-documentation.md
git commit -m "docs(confluence): sync API documentation from Confluence (v3)"
```

---

## Example 4: Resolve Version Conflict

**Scenario:** Update fails due to someone else modifying the page

### Step 1: Attempt Update (Fails)

```bash
# Local file has version: 2
# Confluence has version: 4 (someone else updated)

agentic-framework confluence create-page published/api-documentation.md --space WA

# Output:
# Updating existing page: 456789
# Fetching current version from Confluence...
# Current version: 4
# Local version: 2
# ❌ VERSION CONFLICT DETECTED
# Local version (2) != Confluence version (4)
# Someone else modified the page. Fetch latest version first.
# Aborting update to prevent overwriting changes.
```

### Step 2: Fetch Latest Version

```bash
agentic-framework confluence fetch-page 456789 --output temp.md

# Output:
# Fetching page ID: 456789
# ✅ Page fetched successfully
# Version: 4
```

### Step 3: Compare Versions

```bash
diff published/api-documentation.md temp.md

# Output shows differences:
# - New sections added by others
# - Your local changes
```

### Step 4: Merge Changes Manually

```bash
# Open both files and merge
vi published/api-documentation.md temp.md

# Merge changes:
# - Keep your local additions
# - Add their new sections
# - Update version to 4 in YAML
```

### Step 5: Retry Update

```bash
agentic-framework confluence create-page published/api-documentation.md --space WA

# Output:
# Updating existing page: 456789
# Fetching current version from Confluence...
# Current version: 4
# Local version: 4
# ✅ Version match - proceeding with update
# ✅ Page updated successfully
# Version incremented: 4 → 5
```

### Step 6: Clean Up and Commit

```bash
rm temp.md
git add published/api-documentation.md
git commit -m "docs(confluence): merge conflict resolution and update API docs (v5)"
```

---

## Example 5: Organize Page Hierarchy

**Scenario:** Create parent-child page structure

### Step 1: Create Parent Page

```bash
cat > drafts/architecture.md <<EOF
---
confluence-pageId: null
confluence-space: "WA"
confluence-parent: null  # Top-level page
title: "Architecture"
---

# Architecture

Overview of system architecture.
EOF

agentic-framework confluence create-page drafts/architecture.md --space WA

# Output:
# ✅ Page created successfully
# Page ID: 393217
```

### Step 2: Create Child Page

```bash
cat > drafts/system-design.md <<EOF
---
confluence-pageId: null
confluence-space: "WA"
confluence-parent: "393217"  # Parent is Architecture page
title: "System Design"
---

# System Design

Detailed system design documentation.
EOF

agentic-framework confluence create-page drafts/system-design.md --space WA

# Output:
# ✅ Page created successfully
# Page ID: 456789
# Parent: Architecture (393217)
```

### Step 3: Verify Hierarchy in Confluence

Navigate to Confluence and verify:
```
Space: WA
└── Architecture (393217)
    └── System Design (456789)
```

---

## Example 6: Automated Publishing (CI/CD)

**Scenario:** Automate documentation publishing in GitHub Actions

### .github/workflows/confluence-sync.yml

```yaml
name: Sync Confluence Documentation

on:
  push:
    branches:
      - main
    paths:
      - 'docs/published/*.md'

jobs:
  sync-confluence:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Setup Node.js
        uses: actions/setup-node@v3
        with:
          node-version: '18'

      - name: Install framework
        run: npm install -g agentic-framework

      - name: Configure Confluence credentials
        env:
          CONFLUENCE_URL: ${{ secrets.CONFLUENCE_URL }}
          CONFLUENCE_USERNAME: ${{ secrets.CONFLUENCE_USERNAME }}
          CONFLUENCE_API_TOKEN: ${{ secrets.CONFLUENCE_API_TOKEN }}
        run: |
          echo "CONFLUENCE_URL=$CONFLUENCE_URL" >> .env
          echo "CONFLUENCE_USERNAME=$CONFLUENCE_USERNAME" >> .env
          echo "CONFLUENCE_API_TOKEN=$CONFLUENCE_API_TOKEN" >> .env

      - name: Validate pages
        run: |
          for file in docs/published/*.md; do
            agentic-framework confluence validate-page "$file"
          done

      - name: Sync to Confluence
        run: |
          for file in docs/published/*.md; do
            agentic-framework confluence create-page "$file" --space WA
          done

      - name: Commit updated metadata
        run: |
          git config user.name "GitHub Actions"
          git config user.email "actions@github.com"
          git add docs/published/*.md
          git diff --staged --quiet || git commit -m "docs: update Confluence metadata [skip ci]"
          git push
```

**Usage:**
1. Push changes to `docs/published/*.md`
2. GitHub Actions validates and publishes to Confluence
3. Metadata updates committed back to repository

---

## Example 7: Pre-Commit Hook for Validation

**Scenario:** Validate Confluence pages before committing

### .git/hooks/pre-commit

```bash
#!/bin/bash

echo "Validating Confluence pages..."

# Find all changed Confluence pages
CONFLUENCE_FILES=$(git diff --cached --name-only --diff-filter=ACM | grep 'published.*\.md$')

if [ -z "$CONFLUENCE_FILES" ]; then
  echo "No Confluence pages to validate"
  exit 0
fi

# Validate each file
VALIDATION_FAILED=0
for file in $CONFLUENCE_FILES; do
  echo "Validating $file..."
  agentic-framework confluence validate-page "$file"

  if [ $? -ne 0 ]; then
    echo "❌ Validation failed for $file"
    VALIDATION_FAILED=1
  else
    echo "✅ $file validated"
  fi
done

if [ $VALIDATION_FAILED -eq 1 ]; then
  echo ""
  echo "❌ Pre-commit validation failed"
  echo "Fix validation errors before committing"
  exit 1
fi

echo "✅ All Confluence pages validated successfully"
exit 0
```

**Setup:**
```bash
chmod +x .git/hooks/pre-commit
```

**Usage:**
- Automatic validation on `git commit`
- Prevents committing invalid Confluence pages
- Ensures quality gates are met

---

**Note:** These examples demonstrate the complete workflow from draft creation to automated publishing.
