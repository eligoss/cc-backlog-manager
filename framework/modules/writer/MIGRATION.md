# Migrating to the Build System

## For Existing Book Projects

If you have an existing book project created with the writer module before the build system was added, follow these steps to enable build functionality.

### Step 1: Add Build Dependencies

Add to your `package.json`:

```json
{
  "scripts": {
    "build": "agentic-framework writer build",
    "build:watch": "agentic-framework writer build --watch",
    "analyze": "agentic-framework writer analyze",
    "export": "agentic-framework writer export",
    "export:md": "agentic-framework writer export --format md",
    "export:html": "agentic-framework writer export --format html"
  },
  "devDependencies": {
    "@types/node": "^20.10.0",
    "tsx": "^4.7.0",
    "vite": "^5.0.0",
    "yaml": "^2.3.4",
    "ajv": "^8.12.0",
    "ajv-formats": "^2.1.1"
  }
}
```

### Step 2: Install Dependencies

```bash
npm install
```

### Step 3: Create Token Budget Configuration (Optional)

Create `token-budgets.json` in your project root:

```json
{
  "budgets": {
    "world": 3000,
    "characters": 2000,
    "story": 1500,
    "baseline": 1000
  }
}
```

If you don't create this file, default budgets will be used.

### Step 4: Verify Structure

Ensure your project has the required structure:

```
your-book-project/
├── book.json                    # Required
├── baseline.json                # Required
├── token-budgets.json           # Optional (uses defaults if missing)
├── world/                       # Required
│   └── {category}/
│       ├── _manifest.json
│       └── *.md
├── manuscript/                  # Required
│   └── {part}/
│       └── {chapter}/
│           └── *.md
└── characters/                  # Required
    └── *.md
```

### Step 5: Run Your First Build

```bash
npm run build
```

This will:
1. Validate your book structure
2. Generate context files in `build/context/`
3. Create analysis outputs in `build/analysis/`
4. Export manuscript to `build/export/`

### Step 6: Review Validation Report

Check `build/validation/validation-report.json` for any errors or warnings.

Common issues:
- Missing YAML frontmatter in scenes
- Invalid fact IDs
- Missing manifest files
- Schema validation failures

Fix any errors before proceeding.

## Updating Existing World Facts

### Adding Hashes for Immutability

If you have immutable world facts without hashes, you'll need to generate them.

Run the validation command to get current hashes:

```bash
npm run build
```

The validation report will show expected vs. actual hashes. Update your `_manifest.json` files with the reported hashes.

### Updating Manifests

For each world category directory (`world/{category}/`):

1. Open `_manifest.json`
2. Ensure each fact entry has:
   - `fact-id`
   - `hash` (for immutable facts)
   - `summary`
   - `token-estimate`
   - `summary-token-estimate`

Example manifest entry:

```json
{
  "file": "magic-system.md",
  "fact-id": "world-magic-rune-system",
  "hash": "a1b2c3d4e5f6...",
  "established": "2024-01-15",
  "version": "1.0.0",
  "immutable": true,
  "summary": "Rune-based magic system requiring inscriptions",
  "token-estimate": 450,
  "summary-token-estimate": 50,
  "category": "magic"
}
```

## Updating Character Files

Ensure character markdown files have proper frontmatter:

```yaml
---
character-id: char-protagonist
name: Aria Stormwind
role: protagonist
relationships:
  - character: char-mentor
    type: mentor-student
    strength: 3
  - character: char-antagonist
    type: enemies
    strength: 5
---

# Aria Stormwind

Character description...
```

## Updating Scene Files

Ensure scene markdown files have proper frontmatter:

```yaml
---
scene-id: scene-01-01-01
title: The Beginning
pov: Aria Stormwind
location: world-geo-capital-city
time: morning
---

Scene content...
```

## Watch Mode for Writing

While writing, use watch mode to get continuous feedback:

```bash
npm run build:watch
```

This will rebuild automatically when you:
- Add new scenes
- Update world facts
- Modify characters
- Change any book content

## Analyzing Your Book

Get statistics and insights:

```bash
npm run analyze
```

Outputs:
- Character relationship graph
- Historical timeline
- Word count statistics
- Cross-reference map

## Exporting Your Manuscript

Export to different formats:

```bash
# Markdown only
npm run export:md

# HTML only
npm run export:html

# Both formats
npm run export
```

Outputs in `build/export/`:
- `manuscript.md` - Single concatenated file
- `manuscript.html` - Rendered with styles

## Troubleshooting

### "Not a valid book project" Error

Ensure you have:
- `book.json` at project root
- `baseline.json` at project root
- `world/`, `manuscript/`, `characters/` directories

### Validation Errors

Check the validation report for specific errors:

```bash
cat build/validation/validation-report.json
```

### Build Hangs

If build appears to hang, check for:
- Large files (>1MB) in manuscript
- Circular dependencies in world facts
- Corrupted JSON in manifests

Use `--verbose` for detailed output:

```bash
npm run build -- --verbose
```

### Context Files Too Large

Reduce token budgets in `token-budgets.json`:

```json
{
  "budgets": {
    "world": 2000,      // Reduced from 3000
    "characters": 1500, // Reduced from 2000
    "story": 1000,      // Reduced from 1500
    "baseline": 500     // Reduced from 1000
  }
}
```

### Missing Dependencies

If you get module not found errors:

```bash
npm install
```

Ensure all devDependencies are installed.

## Best Practices

### During Writing

1. Run watch mode: `npm run build:watch`
2. Keep validation report open
3. Fix errors as they appear
4. Generate context before AI writing sessions

### Before Sharing

1. Run full build: `npm run build`
2. Review validation report
3. Export to both formats
4. Share exports from `build/export/`

### Regular Maintenance

1. Weekly: Run analysis to track progress
2. Monthly: Review character graphs for consistency
3. Per chapter: Validate immutability hashes
4. Before major edits: Export backup

## Getting Help

If you encounter issues:

1. Check validation report
2. Review build system documentation
3. Run with `--verbose` flag
4. Check GitHub issues
5. Ask in community forums

## What's Next?

Once migrated:
- Use context files for AI writing sessions
- Track progress with word count analysis
- Visualize character relationships
- Export professional-looking manuscripts
- Maintain consistency with validation

Happy writing!
