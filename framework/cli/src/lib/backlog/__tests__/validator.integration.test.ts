import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import {
  validateTicket,
  validateBacklog,
  ValidationReport,
  TicketValidationError,
} from '../validator';
import fs from 'fs-extra';
import path from 'path';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils';

describe('validator', () => {
  let sandbox: TestSandbox;
  let tempDir: string;

  beforeEach(async () => {
    sandbox = await createSandbox('validator-test');
    tempDir = sandbox.path;
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('validateTicket', () => {
    it('should pass valid story ticket', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
title: Test Story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.valid).toBe(1);
      // Will have warnings about missing Jira and Framework fields
      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.errors).toHaveLength(0);
    });

    it('should pass valid task ticket', async () => {
      const ticketPath = path.join(tempDir, 'TASK-test.md');
      const content = `---
documentType: task
title: Test Task
description: A test description
version: 1.0.0
createdDate: 2025-01-01
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.valid).toBe(1);
      // Will have warnings about missing Jira and Framework fields
      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.errors).toHaveLength(0);
    });

    it('should pass valid epic ticket', async () => {
      const ticketPath = path.join(tempDir, 'EPIC-test.md');
      const content = `---
documentType: epic
title: Test Epic
description: A test description
version: 1.0.0
createdDate: 2025-01-01
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.valid).toBe(1);
      // Will have warnings about missing Jira and Framework fields
      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.errors).toHaveLength(0);
    });

    it('should fail on missing required field documentType', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
title: Test Story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.valid).toBe(0);
      expect(report.errors.length).toBeGreaterThan(0);
      expect(report.errors[0]).toContain('documentType');
    });

    it('should fail on missing required field title', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.valid).toBe(0);
      expect(report.errors.length).toBeGreaterThan(0);
      expect(report.errors[0]).toContain('title');
    });

    it('should pass without description field (description is optional)', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
title: Test Story
version: 1.0.0
createdDate: 2025-01-01
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.valid).toBe(1);
      expect(report.errors).toHaveLength(0);
    });

    it('should pass without description and without version (both optional)', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
title: Test Story
createdDate: 2025-01-01
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.valid).toBe(1);
      expect(report.errors).toHaveLength(0);
    });

    it('should fail on missing required field createdDate', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
title: Test Story
description: A test description
version: 1.0.0
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.valid).toBe(0);
      expect(report.errors.length).toBeGreaterThan(0);
      expect(report.errors[0]).toContain('createdDate');
    });

    it('should warn on missing Jira integration fields', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
title: Test Story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.warnings.some(w => w.includes('jira-'))).toBe(true);
    });

    it('should warn on missing Framework integration fields', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
title: Test Story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.warnings.length).toBeGreaterThan(0);
      expect(report.warnings.some(w => w.includes('framework-'))).toBe(true);
    });

    it('should validate exported tickets have jira-url', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
title: Test Story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
jira-ticketId: DAPM-123
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.warnings.some(w => w.includes('jira-url'))).toBe(true);
    });

    it('should validate exported tickets have exportedDate', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
title: Test Story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
jira-ticketId: DAPM-123
jira-url: https://jira.example.com/browse/DAPM-123
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.warnings.some(w => w.includes('exportedDate'))).toBe(true);
    });

    it('should warn on unknown milestone', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
title: Test Story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
milestone: Unknown2025
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.warnings.some(w => w.includes('milestone'))).toBe(true);
    });

    it('should validate known milestones', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
title: Test Story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
milestone: Nov2025
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      // Should not warn about the milestone itself
      expect(report.warnings.some(w => w.includes('Unknown milestone'))).toBe(false);
    });

    it('should warn on invalid jira-parent format', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
title: Test Story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
jira-parent: INVALID
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.warnings.some(w => w.includes('jira-parent'))).toBe(true);
    });

    it('should validate proper jira-parent format', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
title: Test Story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
jira-parent: DAPM-123
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.warnings.some(w => w.includes('Invalid jira-parent'))).toBe(false);
    });

    it('should warn if jira-related is not an array', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
title: Test Story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
jira-related: DAPM-123
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.warnings.some(w => w.includes('jira-related') && w.includes('array'))).toBe(true);
    });

    it('should warn if jira-blocking is not an array', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
title: Test Story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
jira-blocking: DAPM-123
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.warnings.some(w => w.includes('jira-blocking') && w.includes('array'))).toBe(true);
    });

    it('should warn if jira-blockedBy is not an array', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
title: Test Story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
jira-blockedBy: DAPM-123
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.warnings.some(w => w.includes('jira-blockedBy') && w.includes('array'))).toBe(true);
    });

    it('should validate arrays are properly formatted', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
title: Test Story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
jira-related:
  - DAPM-123
  - DAPM-124
jira-blocking:
  - DAPM-125
jira-blockedBy:
  - DAPM-126
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.warnings.some(w => w.includes('array'))).toBe(false);
    });

    it('should warn on improper file naming', async () => {
      const ticketPath = path.join(tempDir, 'test.md');
      const content = `---
documentType: story
title: Test Story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.warnings.some(w => w.includes('File should be named'))).toBe(true);
    });

    it('should pass on proper file naming', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test-story.md');
      const content = `---
documentType: story
title: Test Story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.warnings.some(w => w.includes('File should be named'))).toBe(false);
    });

    it('should fail on invalid YAML frontmatter', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `---
documentType: story
title: Test Story
description: A test description
version: 1.0.0
createdDate: 2025-01-01
invalid yaml here!!!
---

# Content here`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.errors.length).toBeGreaterThan(0);
      expect(report.errors[0]).toContain('parse');
    });

    it('should fail on missing frontmatter', async () => {
      const ticketPath = path.join(tempDir, 'STORY-test.md');
      const content = `# Just content, no frontmatter`;
      await fs.writeFile(ticketPath, content, 'utf-8');

      const report = new ValidationReport();
      await validateTicket(ticketPath, report);

      expect(report.errors.length).toBeGreaterThan(0);
      expect(report.errors[0]).toContain('parse');
    });
  });

  describe('validateBacklog', () => {
    it('should validate all tickets in backlog directory', async () => {
      // Create backlog structure (flat tickets/ directory)
      const backlogDir = path.join(tempDir, 'backlog');
      const ticketsDir = path.join(backlogDir, 'tickets');
      await fs.mkdirp(ticketsDir);

      // Create valid stories
      const story1 = `---
documentType: story
title: Story 1
description: Description 1
version: 1.0.0
createdDate: 2025-01-01
---
Content`;
      const story2 = `---
documentType: story
title: Story 2
description: Description 2
version: 1.0.0
createdDate: 2025-01-01
---
Content`;

      await fs.writeFile(path.join(ticketsDir, 'STORY-1.md'), story1, 'utf-8');
      await fs.writeFile(path.join(ticketsDir, 'STORY-2.md'), story2, 'utf-8');

      const report = await validateBacklog(backlogDir);

      expect(report.valid).toBe(2);
      expect(report.errors).toHaveLength(0);
    });

    it('should validate all ticket types', async () => {
      // Create backlog structure (flat tickets/ directory + epics/)
      const backlogDir = path.join(tempDir, 'backlog');
      await fs.mkdirp(path.join(backlogDir, 'tickets'));
      await fs.mkdirp(path.join(backlogDir, 'epics'));

      const makeContent = (type: string) => `---
documentType: ${type}
title: Test ${type}
description: Description
version: 1.0.0
createdDate: 2025-01-01
---
Content`;

      await fs.writeFile(path.join(backlogDir, 'tickets', 'STORY-1.md'), makeContent('story'), 'utf-8');
      await fs.writeFile(path.join(backlogDir, 'tickets', 'TASK-1.md'), makeContent('task'), 'utf-8');
      await fs.writeFile(path.join(backlogDir, 'tickets', 'BUG-1.md'), makeContent('bug'), 'utf-8');
      await fs.writeFile(path.join(backlogDir, 'tickets', 'SPIKE-1.md'), makeContent('spike'), 'utf-8');
      await fs.writeFile(path.join(backlogDir, 'epics', 'EPIC-1.md'), makeContent('epic'), 'utf-8');

      const report = await validateBacklog(backlogDir);

      expect(report.valid).toBe(5);
    });

    it('should skip README files', async () => {
      const backlogDir = path.join(tempDir, 'backlog');
      const ticketsDir = path.join(backlogDir, 'tickets');
      await fs.mkdirp(ticketsDir);

      await fs.writeFile(path.join(ticketsDir, 'README.md'), '# README', 'utf-8');

      const report = await validateBacklog(backlogDir);

      expect(report.valid).toBe(0);
      expect(report.errors).toHaveLength(0);
      expect(report.warnings).toHaveLength(0);
    });

    it('should validate workflow tickets', async () => {
      const backlogDir = path.join(tempDir, 'backlog');
      const draftDir = path.join(backlogDir, '_workflow', 'Draft');
      await fs.mkdirp(draftDir);

      const content = `---
documentType: story
title: Draft Story
description: Description
version: 1.0.0
createdDate: 2025-01-01
---
Content`;

      await fs.writeFile(path.join(draftDir, 'STORY-draft.md'), content, 'utf-8');

      const report = await validateBacklog(backlogDir);

      expect(report.valid).toBe(1);
    });

    it('should report all errors from multiple tickets', async () => {
      const backlogDir = path.join(tempDir, 'backlog');
      const ticketsDir = path.join(backlogDir, 'tickets');
      await fs.mkdirp(ticketsDir);

      // Create invalid story (missing title)
      const invalid1 = `---
documentType: story
description: Description 1
createdDate: 2025-01-01
---
Content`;

      // Create invalid story (missing documentType)
      const invalid2 = `---
title: Story 2
createdDate: 2025-01-01
---
Content`;

      await fs.writeFile(path.join(ticketsDir, 'STORY-1.md'), invalid1, 'utf-8');
      await fs.writeFile(path.join(ticketsDir, 'STORY-2.md'), invalid2, 'utf-8');

      const report = await validateBacklog(backlogDir);

      expect(report.errors.length).toBeGreaterThanOrEqual(2);
    });

    it('should return error if backlog directory does not exist', async () => {
      const nonExistentDir = path.join(tempDir, 'nonexistent');

      await expect(validateBacklog(nonExistentDir)).rejects.toThrow();
    });
  });

  describe('ValidationReport', () => {
    it('should track validation results', () => {
      const report = new ValidationReport();

      report.addValid();
      report.addWarning('file1.md', 'Warning 1');
      report.addError('file2.md', 'Error 1');

      expect(report.valid).toBe(1);
      expect(report.warnings).toHaveLength(1);
      expect(report.errors).toHaveLength(1);
    });

    it('should format summary correctly', () => {
      const report = new ValidationReport();

      report.addValid();
      report.addValid();
      report.addWarning('file1.md', 'Warning 1');
      report.addError('file2.md', 'Error 1');

      const summary = report.getSummary();

      expect(summary).toContain('2');
      expect(summary).toContain('1');
      expect(summary).toContain('Warning');
      expect(summary).toContain('Error');
    });

    it('should include file paths in warnings and errors', () => {
      const report = new ValidationReport();

      report.addWarning('path/to/file.md', 'Warning message');
      report.addError('path/to/other.md', 'Error message');

      expect(report.warnings[0]).toContain('path/to/file.md');
      expect(report.warnings[0]).toContain('Warning message');
      expect(report.errors[0]).toContain('path/to/other.md');
      expect(report.errors[0]).toContain('Error message');
    });
  });

  describe('TicketValidationError', () => {
    it('should be throwable', () => {
      expect(() => {
        throw new TicketValidationError('Test error');
      }).toThrow('Test error');
    });

    it('should be instanceof Error', () => {
      const error = new TicketValidationError('Test');
      expect(error).toBeInstanceOf(Error);
    });
  });
});
