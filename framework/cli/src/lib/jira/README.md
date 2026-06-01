# Jira Library

TypeScript modules for Jira integration, migrated from Python.

## Modules

### acceptance-criteria.ts

Extracts and formats acceptance criteria from markdown for Jira export.

**Features:**
- Extract AC from markdown "## Acceptance Criteria" sections
- Support multiple Verify formats: `**Verify**`, `*Verify*`, `Verify`
- Format as Jira wiki markup
- Format as ADF (Atlassian Document Format)
- Parse existing Jira AC fields

**Usage:**

```typescript
import {
  extractAcceptanceCriteria,
  formatAsJiraWiki,
  formatAsAdf,
  parseJiraAcField,
} from './acceptance-criteria';

// Extract from markdown
const markdown = `## Acceptance Criteria
- **Verify** user can log in
- **Verify** error message displays`;

const criteria = extractAcceptanceCriteria(markdown);
// ['user can log in', 'error message displays']

// Format for Jira wiki
const wiki = formatAsJiraWiki(criteria);
// '* *Verify* user can log in\n* *Verify* error message displays'

// Format as ADF
const adf = formatAsAdf(criteria);
// { version: 1, type: 'doc', content: [...] }

// Parse existing Jira field
const jiraAc = '* *Verify* user can log in';
const parsed = parseJiraAcField(jiraAc);
// ['user can log in']
```

## Testing

Run tests:
```bash
npm test -- acceptance-criteria
```

Run with coverage:
```bash
npm test -- acceptance-criteria --coverage
```

## Migration Status

| Python Module | TypeScript Module | Status |
|--------------|-------------------|---------|
| `export_to_jira.py` (AC handling) | `acceptance-criteria.ts` | ✅ Complete |

## Based On

Python source: `modules/jira/src/jira/export_to_jira.py`
- `MarkdownParser._extract_acceptance_criteria()`
- `JiraClient._build_wiki_bullet_list()`
- `JiraClient.update_acceptance_criteria()`
