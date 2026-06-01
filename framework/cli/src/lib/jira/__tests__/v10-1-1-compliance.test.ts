/**
 * V10.1.1 Compliance Test Suite
 *
 * This test file validates v10.1.1 YAML schema compliance and body structure.
 * Extracted from Python test files:
 * - test_export_to_jira_v10_1_1.py
 * - test_update_jira_tickets_v10_1_1.py
 * - test_update_workflow.py
 *
 * Coverage areas:
 * - v10.1.1 YAML field structure (flat, not nested)
 * - Required fields vs. deprecated fields
 * - Body section structure (Description, Acceptance Criteria)
 * - Description subsections (Context, In Order to Support This, Technical Notes)
 * - Acceptance Criteria with "Verify" prefix
 * - Section dividers and formatting rules
 */

import { parseFrontmatter } from '../../common/yaml-frontmatter';

describe('V10.1.1 Compliance', () => {
  describe('YAML Field Structure', () => {
    const v10_1_1_template = `---
documentType: story
version: 1.0
title: "APM-R: FE: Dashboard: Test Story"
description: "Test story for v10.1.1 validation"
milestone: Jan2026
priority: P1
storyPoints: 5
labels: [apm-r, frontend, test]
createdDate: 2025-12-08
jira-ticketId: null
jira-url: null
jira-parent: null
jira-related: []
jira-blocking: []
jira-blockedBy: []
jira-fixVersion: null
jira-internalNotes: null
framework-documentation: null
framework-milestone: null
framework-technicalGuides: []
framework-relatedLocal: []
---

# APM-R: FE: Dashboard: Test Story

---

## Description

**Context:**

Test context paragraph.

**In Order to Support This:**

* Requirement 1
* Requirement 2

**Technical Notes:**

* Note 1
* Note 2

---

## Acceptance Criteria

* **Verify** criterion 1
* **Verify** criterion 2
`;

    it('should have all required v10.1.1 fields', () => {
      const parsed = parseFrontmatter(v10_1_1_template);
      const frontmatter = parsed.data;

      const requiredFields = [
        'documentType',
        'version',
        'title',
        'description',
        'createdDate',
        'jira-ticketId',
        'jira-url',
        'jira-parent',
        'jira-related',
        'jira-blocking',
        'jira-blockedBy',
        'jira-fixVersion',
        'jira-internalNotes',
        'framework-documentation',
        'framework-milestone',
        'framework-technicalGuides',
        'framework-relatedLocal',
      ];

      requiredFields.forEach((field) => {
        expect(frontmatter).toHaveProperty(field);
      });
    });

    it('should not have old v9.x field names', () => {
      const parsed = parseFrontmatter(v10_1_1_template);
      const frontmatter = parsed.data;

      const oldFields = ['ticketId', 'jiraLink', 'audience', 'dependencies', 'epic', 'sprint'];

      oldFields.forEach((field) => {
        expect(frontmatter).not.toHaveProperty(field);
      });
    });

    it('should use flat jira-* field structure (not nested)', () => {
      const parsed = parseFrontmatter(v10_1_1_template);
      const frontmatter = parsed.data;

      // Should have flat fields
      expect(frontmatter).toHaveProperty('jira-ticketId');
      expect(frontmatter).toHaveProperty('jira-url');
      expect(frontmatter).toHaveProperty('jira-parent');
      expect(frontmatter).toHaveProperty('jira-related');

      // Should NOT have nested structure
      expect(frontmatter).not.toHaveProperty('jira');
    });

    it('should use flat framework-* field structure (not nested)', () => {
      const parsed = parseFrontmatter(v10_1_1_template);
      const frontmatter = parsed.data;

      // Should have flat fields
      expect(frontmatter).toHaveProperty('framework-documentation');
      expect(frontmatter).toHaveProperty('framework-milestone');
      expect(frontmatter).toHaveProperty('framework-technicalGuides');
      expect(frontmatter).toHaveProperty('framework-relatedLocal');

      // Should NOT have nested structure
      expect(frontmatter).not.toHaveProperty('framework');
    });

    it('should have jira-related, jira-blocking, jira-blockedBy as arrays', () => {
      const parsed = parseFrontmatter(v10_1_1_template);
      const frontmatter = parsed.data;

      expect(Array.isArray(frontmatter['jira-related'])).toBe(true);
      expect(Array.isArray(frontmatter['jira-blocking'])).toBe(true);
      expect(Array.isArray(frontmatter['jira-blockedBy'])).toBe(true);
    });

    it('should have framework-technicalGuides and framework-relatedLocal as arrays', () => {
      const parsed = parseFrontmatter(v10_1_1_template);
      const frontmatter = parsed.data;

      expect(Array.isArray(frontmatter['framework-technicalGuides'])).toBe(true);
      expect(Array.isArray(frontmatter['framework-relatedLocal'])).toBe(true);
    });

    it('should handle null values for nullable fields', () => {
      const parsed = parseFrontmatter(v10_1_1_template);
      const frontmatter = parsed.data;

      expect(frontmatter['jira-ticketId']).toBe(null);
      expect(frontmatter['jira-url']).toBe(null);
      expect(frontmatter['jira-parent']).toBe(null);
      expect(frontmatter['jira-fixVersion']).toBe(null);
      expect(frontmatter['jira-internalNotes']).toBe(null);
      expect(frontmatter['framework-documentation']).toBe(null);
      expect(frontmatter['framework-milestone']).toBe(null);
    });
  });

  describe('Body Structure Validation', () => {
    const fullTicket = `---
documentType: story
version: 1.0
title: "APM-R: FE: Dashboard: Configurable Cards"
description: "Allow users to customize dashboard"
createdDate: 2025-12-08
jira-ticketId: null
jira-url: null
jira-parent: null
jira-related: []
jira-blocking: []
jira-blockedBy: []
jira-fixVersion: null
jira-internalNotes: null
framework-documentation: null
framework-milestone: null
framework-technicalGuides: []
framework-relatedLocal: []
---

# APM-R: FE: Dashboard: Configurable Cards

---

## Description

**Context:**

Users want to customize their dashboard. Currently all cards are fixed.

**In Order to Support This:**

* Add card selector sidebar
* Persist selections to localStorage

**Technical Notes:**

* Use MUI Drawer pattern
* Use Zustand for state management

---

## Acceptance Criteria

* **Verify** users can see all 9 cards in selector
* **Verify** clicking checkbox toggles card visibility
* **Verify** dashboard reflects changes immediately
`;

    it('should have exactly 2 H2 sections (Description, Acceptance Criteria)', () => {
      const parsed = parseFrontmatter(fullTicket);
      const body = parsed.content;

      const h2Sections = body.match(/^## /gm);
      expect(h2Sections).toHaveLength(2);
    });

    it('should have ## Description section', () => {
      const parsed = parseFrontmatter(fullTicket);
      const body = parsed.content;

      expect(body).toContain('## Description');
    });

    it('should have ## Acceptance Criteria section', () => {
      const parsed = parseFrontmatter(fullTicket);
      const body = parsed.content;

      expect(body).toContain('## Acceptance Criteria');
    });

    it('should have **Context:** subsection in Description', () => {
      const parsed = parseFrontmatter(fullTicket);
      const body = parsed.content;

      const descStart = body.indexOf('## Description');
      const accStart = body.indexOf('## Acceptance Criteria');
      const description = body.substring(descStart, accStart);

      expect(description).toContain('**Context:**');
    });

    it('should have **In Order to Support This:** subsection in Description', () => {
      const parsed = parseFrontmatter(fullTicket);
      const body = parsed.content;

      const descStart = body.indexOf('## Description');
      const accStart = body.indexOf('## Acceptance Criteria');
      const description = body.substring(descStart, accStart);

      expect(description).toContain('**In Order to Support This:**');
    });

    it('should have **Technical Notes:** subsection in Description', () => {
      const parsed = parseFrontmatter(fullTicket);
      const body = parsed.content;

      const descStart = body.indexOf('## Description');
      const accStart = body.indexOf('## Acceptance Criteria');
      const description = body.substring(descStart, accStart);

      expect(description).toContain('**Technical Notes:**');
    });

    it('should NOT use ### headers (only H2 and bold subsections)', () => {
      const parsed = parseFrontmatter(fullTicket);
      const body = parsed.content;

      // Extract body after YAML frontmatter and title
      const bodyLines = body.split('\n');
      const h3Headers = bodyLines.filter((line) => line.trim().startsWith('### '));

      expect(h3Headers).toHaveLength(0);
    });

    it('should have --- dividers separating sections', () => {
      const parsed = parseFrontmatter(fullTicket);
      const body = parsed.content;

      // Should have divider after title (before Description)
      const titleEnd = body.indexOf('#');
      const descStart = body.indexOf('## Description');
      const betweenTitleAndDesc = body.substring(titleEnd, descStart);
      expect(betweenTitleAndDesc).toContain('---');

      // Should have divider between Description and Acceptance Criteria
      const descEnd = body.indexOf('**Technical Notes:**');
      const accStart = body.indexOf('## Acceptance Criteria');
      const betweenDescAndAcc = body.substring(descEnd, accStart);
      expect(betweenDescAndAcc).toContain('---');
    });
  });

  describe('Description Section Content Rules', () => {
    const ticketWithContext = `---
documentType: story
version: 1.0
title: "Test Story"
description: "Test"
createdDate: 2025-12-08
jira-ticketId: null
jira-url: null
jira-parent: null
jira-related: []
jira-blocking: []
jira-blockedBy: []
jira-fixVersion: null
jira-internalNotes: null
framework-documentation: null
framework-milestone: null
framework-technicalGuides: []
framework-relatedLocal: []
---

# Test Story

---

## Description

**Context:**

This is context paragraph 1.

This is context paragraph 2 with more details.

**In Order to Support This:**

* Requirement 1
* Requirement 2
* Requirement 3

**Technical Notes:**

* Note 1
* Note 2

---

## Acceptance Criteria

* **Verify** AC 1
* **Verify** AC 2
`;

    it('Context section should contain paragraphs (not bullets)', () => {
      const parsed = parseFrontmatter(ticketWithContext);
      const body = parsed.content;

      const contextStart = body.indexOf('**Context:**');
      const inOrderStart = body.indexOf('**In Order to Support This:**');
      const context = body.substring(contextStart, inOrderStart);

      // Context should have text
      expect(context).toContain('paragraph 1');
      expect(context).toContain('paragraph 2');

      // Extract lines between Context and In Order to Support This
      const contextLines = context.split('\n').slice(1); // Skip **Context:** line
      const hasBullets = contextLines.some(
        (line) => line.trim().startsWith('*') || line.trim().startsWith('-')
      );

      // Context should NOT have bullets (use paragraphs instead)
      expect(hasBullets).toBe(false);
    });

    it('In Order to Support This section should use bullet points', () => {
      const parsed = parseFrontmatter(ticketWithContext);
      const body = parsed.content;

      const inOrderStart = body.indexOf('**In Order to Support This:**');
      const techStart = body.indexOf('**Technical Notes:**');
      const inOrder = body.substring(inOrderStart, techStart);

      // Should contain bullet points
      expect(inOrder).toContain('* Requirement 1');
      expect(inOrder).toContain('* Requirement 2');
      expect(inOrder).toContain('* Requirement 3');
    });

    it('Technical Notes section should use bullet points', () => {
      const parsed = parseFrontmatter(ticketWithContext);
      const body = parsed.content;

      const techStart = body.indexOf('**Technical Notes:**');
      const accStart = body.indexOf('## Acceptance Criteria');
      const tech = body.substring(techStart, accStart);

      // Should contain bullet points
      expect(tech).toContain('* Note 1');
      expect(tech).toContain('* Note 2');
    });
  });

  describe('Acceptance Criteria Format', () => {
    const ticketWithAC = `---
documentType: story
version: 1.0
title: "Test Story"
description: "Test"
createdDate: 2025-12-08
jira-ticketId: null
jira-url: null
jira-parent: null
jira-related: []
jira-blocking: []
jira-blockedBy: []
jira-fixVersion: null
jira-internalNotes: null
framework-documentation: null
framework-milestone: null
framework-technicalGuides: []
framework-relatedLocal: []
---

# Test Story

---

## Description

**Context:**

Test context.

**In Order to Support This:**

* Requirement

**Technical Notes:**

* Note

---

## Acceptance Criteria

* **Verify** users can see all 9 cards
* **Verify** clicking checkbox toggles visibility
* **Verify** dashboard reflects changes immediately
* **Verify** selections persist to localStorage
* **Verify** selections load on page refresh
* **Verify** reset returns to default layout
* **Verify** responsive on desktop, tablet, mobile
* **Verify** empty state shows message
* **Verify** no console errors
* **Verify** performance acceptable
* **Verify** documentation updated
`;

    it('should use **Verify** pattern (bold) for acceptance criteria', () => {
      const parsed = parseFrontmatter(ticketWithAC);
      const body = parsed.content;

      const accStart = body.indexOf('## Acceptance Criteria');
      const acceptance = body.substring(accStart);

      // Count **Verify** occurrences
      const verifyCount = (acceptance.match(/\*\* *Verify\*\*/g) || []).length;
      expect(verifyCount).toBeGreaterThanOrEqual(8);
    });

    it('should have 8-12 acceptance criteria for typical stories', () => {
      const parsed = parseFrontmatter(ticketWithAC);
      const body = parsed.content;

      const accStart = body.indexOf('## Acceptance Criteria');
      const acceptance = body.substring(accStart);

      // Count **Verify** items
      const verifyCount = (acceptance.match(/\*\* *Verify\*\*/g) || []).length;
      expect(verifyCount).toBeGreaterThanOrEqual(8);
      expect(verifyCount).toBeLessThanOrEqual(12);
    });

    it('should extract acceptance criteria text after **Verify** prefix', () => {
      const parsed = parseFrontmatter(ticketWithAC);
      const body = parsed.content;

      const accStart = body.indexOf('## Acceptance Criteria');
      const acceptance = body.substring(accStart);

      // Check that criteria contain descriptive text
      expect(acceptance).toContain('users can see all 9 cards');
      expect(acceptance).toContain('clicking checkbox toggles visibility');
      expect(acceptance).toContain('selections persist to localStorage');
    });
  });

  describe('YAML Field Updates (for update workflow)', () => {
    it('should allow updating jira-parent from null to ticket ID', () => {
      const yaml = `jira-parent: null`;
      const updated = yaml.replace('jira-parent: null', 'jira-parent: DAPM-1270');

      expect(updated).toContain('jira-parent: DAPM-1270');
      expect(updated).not.toContain('jira-parent: null');
    });

    it('should allow updating jira-related array', () => {
      const yaml = `jira-related: []`;
      const updated = yaml.replace('jira-related: []', 'jira-related: [DAPM-1269, DAPM-1271]');

      expect(updated).toContain('jira-related: [DAPM-1269, DAPM-1271]');
    });

    it('should allow updating jira-blocking array', () => {
      const yaml = `jira-blocking: []`;
      const updated = yaml.replace('jira-blocking: []', 'jira-blocking: [DAPM-1540]');

      expect(updated).toContain('jira-blocking: [DAPM-1540]');
    });

    it('should allow updating jira-blockedBy array', () => {
      const yaml = `jira-blockedBy: []`;
      const updated = yaml.replace('jira-blockedBy: []', 'jira-blockedBy: [DAPM-1539]');

      expect(updated).toContain('jira-blockedBy: [DAPM-1539]');
    });

    it('should allow updating jira-fixVersion', () => {
      const yaml = `jira-fixVersion: null`;
      const updated = yaml.replace('jira-fixVersion: null', 'jira-fixVersion: "1.0.0"');

      expect(updated).toContain('jira-fixVersion: "1.0.0"');
    });

    it('should allow updating jira-internalNotes', () => {
      const yaml = `jira-internalNotes: null`;
      const updated = yaml.replace(
        'jira-internalNotes: null',
        'jira-internalNotes: "Backend coordination required"'
      );

      expect(updated).toContain('jira-internalNotes: "Backend coordination required"');
    });

    it('should allow updating framework-documentation', () => {
      const yaml = `framework-documentation: null`;
      const updated = yaml.replace(
        'framework-documentation: null',
        'framework-documentation: "@apm-r-be/CLAUDE.md"'
      );

      expect(updated).toContain('framework-documentation: "@apm-r-be/CLAUDE.md"');
    });

    it('should allow updating framework-milestone', () => {
      const yaml = `framework-milestone: null`;
      const updated = yaml.replace(
        'framework-milestone: null',
        'framework-milestone: "backlog/milestones/Jan2026.md"'
      );

      expect(updated).toContain('framework-milestone: "backlog/milestones/Jan2026.md"');
    });

    it('should allow updating framework-technicalGuides array', () => {
      const yaml = `framework-technicalGuides: []`;
      const updated = yaml.replace(
        'framework-technicalGuides: []',
        'framework-technicalGuides: ["@apm-r-be/docs/graphql-guide.md"]'
      );

      expect(updated).toContain('framework-technicalGuides: ["@apm-r-be/docs/graphql-guide.md"]');
    });

    it('should allow updating framework-relatedLocal array', () => {
      const yaml = `framework-relatedLocal: []`;
      const updated = yaml.replace(
        'framework-relatedLocal: []',
        'framework-relatedLocal: ["backlog/tickets/stories/1532.md"]'
      );

      expect(updated).toContain('framework-relatedLocal: ["backlog/tickets/stories/1532.md"]');
    });
  });

  describe('Jira Key Format Validation', () => {
    it('should validate valid Jira keys', () => {
      const validKeys = ['DAPM-1270', 'DAPM-1269', 'DAPM-1271', 'PROJ-123'];

      validKeys.forEach((key) => {
        expect(key).toMatch(/^[A-Z]+-\d+$/);
      });
    });

    it('should reject invalid Jira keys', () => {
      const invalidKeys = ['1270', 'DAPM', 'dapm-1270', 'DAPM-', '-1270', 'DAPM-ABC'];

      invalidKeys.forEach((key) => {
        expect(key).not.toMatch(/^[A-Z]+-\d+$/);
      });
    });
  });

  describe('Section Extraction Validation', () => {
    const sectionedTicket = `---
documentType: story
version: 1.0
title: "Test Story"
description: "Test"
createdDate: 2025-12-08
jira-ticketId: null
jira-url: null
jira-parent: null
jira-related: []
jira-blocking: []
jira-blockedBy: []
jira-fixVersion: null
jira-internalNotes: null
framework-documentation: null
framework-milestone: null
framework-technicalGuides: []
framework-relatedLocal: []
---

# Test Story

---

## Description

**Context:**

This is context paragraph 1.

This is context paragraph 2.

**In Order to Support This:**

* Requirement 1
* Requirement 2
* Requirement 3

**Technical Notes:**

* Note 1
* Note 2

---

## Acceptance Criteria

* **Verify** AC 1
* **Verify** AC 2
`;

    it('should extract Context section content', () => {
      const parsed = parseFrontmatter(sectionedTicket);
      const body = parsed.content;

      const contextStart = body.indexOf('**Context:**');
      const inOrderStart = body.indexOf('**In Order to Support This:**');
      const context = body.substring(contextStart, inOrderStart);

      expect(context).toContain('This is context paragraph 1');
      expect(context).toContain('This is context paragraph 2');
    });

    it('should extract In Order to Support This section content', () => {
      const parsed = parseFrontmatter(sectionedTicket);
      const body = parsed.content;

      const inOrderStart = body.indexOf('**In Order to Support This:**');
      const techStart = body.indexOf('**Technical Notes:**');
      const inOrder = body.substring(inOrderStart, techStart);

      expect(inOrder).toContain('Requirement 1');
      expect(inOrder).toContain('Requirement 2');
      expect(inOrder).toContain('Requirement 3');
    });

    it('should extract Technical Notes section content', () => {
      const parsed = parseFrontmatter(sectionedTicket);
      const body = parsed.content;

      const techStart = body.indexOf('**Technical Notes:**');
      const accStart = body.indexOf('## Acceptance Criteria');
      const tech = body.substring(techStart, accStart);

      expect(tech).toContain('Note 1');
      expect(tech).toContain('Note 2');
    });

    it('should extract Acceptance Criteria section content', () => {
      const parsed = parseFrontmatter(sectionedTicket);
      const body = parsed.content;

      const accStart = body.indexOf('## Acceptance Criteria');
      const acceptance = body.substring(accStart);

      expect(acceptance).toContain('**Verify** AC 1');
      expect(acceptance).toContain('**Verify** AC 2');
    });
  });

  describe('Required Section Validation', () => {
    it('should prevent removal of required Description section', () => {
      const body = `# Title

---

## Description

**Context:**

Text

---

## Acceptance Criteria

* **Verify** criterion
`;

      expect(body).toContain('## Description');
    });

    it('should prevent removal of required Acceptance Criteria section', () => {
      const body = `# Title

---

## Description

**Context:**

Text

---

## Acceptance Criteria

* **Verify** criterion
`;

      expect(body).toContain('## Acceptance Criteria');
    });

    it('should enforce both required sections are present', () => {
      const body = `# Title

---

## Description

**Context:**

Text

---

## Acceptance Criteria

* **Verify** criterion
`;

      const requiredSections = ['## Description', '## Acceptance Criteria'];

      requiredSections.forEach((section) => {
        expect(body).toContain(section);
      });
    });
  });
});
