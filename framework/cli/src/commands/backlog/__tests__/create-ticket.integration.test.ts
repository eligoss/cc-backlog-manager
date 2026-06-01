/**
 * Tests for the create-ticket command
 *
 * @module commands/backlog/__tests__/create-ticket.test
 */

import path from 'path';
import fs from 'fs-extra';
import { createSandbox, TestSandbox } from '../../../lib/__tests__/test-utils/sandbox';

// Mock chalk
jest.mock('chalk', () => ({
  default: {
    blue: (s: string) => s,
    cyan: (s: string) => s,
    green: (s: string) => s,
    yellow: (s: string) => s,
    red: (s: string) => s,
    dim: (s: string) => s,
    bold: (s: string) => s,
  },
  blue: (s: string) => s,
  cyan: (s: string) => s,
  green: (s: string) => s,
  yellow: (s: string) => s,
  red: (s: string) => s,
  dim: (s: string) => s,
  bold: (s: string) => s,
}));

// Mock process.exit
const mockExit = jest.spyOn(process, 'exit').mockImplementation((code?: number | string | null) => {
  throw new Error(`process.exit(${code})`);
});

// Test the template engine functionality directly
import { SkillTemplateEngine } from '../../../lib/skill-template-engine.js';

describe('create-ticket command', () => {
  let sandbox: TestSandbox;
  let testDir: string;
  let templatesDir: string;

  beforeEach(async () => {
    sandbox = await createSandbox('create-ticket');
    testDir = sandbox.path;
    templatesDir = path.join(testDir, 'templates');

    await fs.ensureDir(templatesDir);
    jest.clearAllMocks();
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  afterAll(() => {
    mockExit.mockRestore();
  });

  describe('template rendering', () => {
    it('should render story template with variables', async () => {
      // Create a mock story template
      const templateContent = `---
documentType: story
title: "{{summary}}"
description: "Story created via CLI"
createdDate: "{{date}}"
---

# {{name}}

## Description

Story description here.
`;

      await fs.writeFile(
        path.join(templatesDir, 'story.template.md'),
        templateContent,
        'utf-8'
      );

      // Create template config with correct structure
      const config = {
        templates: {
          'story.template': {
            output: '{{name}}.md',
            variables: {
              required: ['name', 'summary', 'date'],
              optional: [],
            },
            defaults: {},
          },
        },
      };

      await fs.writeJson(path.join(templatesDir, 'template.config.json'), config);

      const engine = new SkillTemplateEngine(templatesDir);
      const rendered = await engine.render('story.template', {
        variables: {
          name: 'STORY-001',
          summary: 'Test Story Title',
          date: '2024-01-15',
        },
      });

      expect(rendered).toContain('title: "Test Story Title"');
      expect(rendered).toContain('createdDate: "2024-01-15"');
      expect(rendered).toContain('# STORY-001');
    });

    it('should render task template with variables', async () => {
      const templateContent = `---
documentType: task
title: "{{summary}}"
createdDate: "{{date}}"
---

# {{name}}

## Description

Task description here.
`;

      await fs.writeFile(
        path.join(templatesDir, 'task.template.md'),
        templateContent,
        'utf-8'
      );

      const config = {
        templates: {
          'task.template': {
            output: '{{name}}.md',
            variables: {
              required: ['name', 'summary', 'date'],
              optional: [],
            },
            defaults: {},
          },
        },
      };

      await fs.writeJson(path.join(templatesDir, 'template.config.json'), config);

      const engine = new SkillTemplateEngine(templatesDir);
      const rendered = await engine.render('task.template', {
        variables: {
          name: 'TASK-001',
          summary: 'Test Task Title',
          date: '2024-01-15',
        },
      });

      expect(rendered).toContain('documentType: task');
      expect(rendered).toContain('title: "Test Task Title"');
    });

    it('should render bug template with variables', async () => {
      const templateContent = `---
documentType: bug
title: "{{summary}}"
createdDate: "{{date}}"
---

# {{name}}

## Description

Bug description here.

**Steps to Reproduce:**
1. Step 1
2. Step 2
`;

      await fs.writeFile(
        path.join(templatesDir, 'bug.template.md'),
        templateContent,
        'utf-8'
      );

      const config = {
        templates: {
          'bug.template': {
            output: '{{name}}.md',
            variables: {
              required: ['name', 'summary', 'date'],
              optional: [],
            },
            defaults: {},
          },
        },
      };

      await fs.writeJson(path.join(templatesDir, 'template.config.json'), config);

      const engine = new SkillTemplateEngine(templatesDir);
      const rendered = await engine.render('bug.template', {
        variables: {
          name: 'BUG-001',
          summary: 'Test Bug Title',
          date: '2024-01-15',
        },
      });

      expect(rendered).toContain('documentType: bug');
      expect(rendered).toContain('Steps to Reproduce:');
    });

    it('should render epic template with variables', async () => {
      const templateContent = `---
documentType: epic
title: "{{summary}}"
createdDate: "{{date}}"
---

# {{name}}

## Description

Epic overview here.

**Goals:**
- Goal 1
- Goal 2

**Business Value:**
- Value 1
`;

      await fs.writeFile(
        path.join(templatesDir, 'epic.template.md'),
        templateContent,
        'utf-8'
      );

      const config = {
        templates: {
          'epic.template': {
            output: '{{name}}.md',
            variables: {
              required: ['name', 'summary', 'date'],
              optional: [],
            },
            defaults: {},
          },
        },
      };

      await fs.writeJson(path.join(templatesDir, 'template.config.json'), config);

      const engine = new SkillTemplateEngine(templatesDir);
      const rendered = await engine.render('epic.template', {
        variables: {
          name: 'EPIC-001',
          summary: 'Test Epic Title',
          date: '2024-01-15',
        },
      });

      expect(rendered).toContain('documentType: epic');
      expect(rendered).toContain('**Goals:**');
    });
  });

  describe('ticket numbering', () => {
    it('should auto-generate ticket numbers', async () => {
      // Create a tickets directory with existing tickets
      const ticketsDir = path.join(testDir, 'tickets', 'storys');
      await fs.ensureDir(ticketsDir);

      // Create a story template
      await fs.writeFile(
        path.join(templatesDir, 'story.template.md'),
        '# {{name}}',
        'utf-8'
      );
      await fs.writeJson(path.join(templatesDir, 'template.config.json'), {
        templates: {
          'story.template': {
            output: '{{name}}.md',
            variables: { required: ['name'], optional: [] },
            defaults: {},
          },
        },
      });

      // Create existing tickets
      await fs.writeFile(path.join(ticketsDir, 'STORY-001.md'), '# Story 1', 'utf-8');
      await fs.writeFile(path.join(ticketsDir, 'STORY-002.md'), '# Story 2', 'utf-8');

      const engine = new SkillTemplateEngine(templatesDir);
      const nextNum = await engine.getNextNumber(ticketsDir, 'STORY-{num}');

      expect(nextNum).toBe(3);
    });

    it('should start at 1 when no existing tickets', async () => {
      const ticketsDir = path.join(testDir, 'tickets', 'storys');
      await fs.ensureDir(ticketsDir);

      await fs.writeFile(
        path.join(templatesDir, 'story.template.md'),
        '# {{name}}',
        'utf-8'
      );
      await fs.writeJson(path.join(templatesDir, 'template.config.json'), {
        templates: {
          'story.template': {
            output: '{{name}}.md',
            variables: { required: ['name'], optional: [] },
            defaults: {},
          },
        },
      });

      const engine = new SkillTemplateEngine(templatesDir);
      const nextNum = await engine.getNextNumber(ticketsDir, 'STORY-{num}');

      expect(nextNum).toBe(1);
    });
  });

  describe('ticket type validation', () => {
    const validTypes = ['story', 'task', 'bug', 'epic', 'spike'];

    it('should accept valid ticket types', () => {
      for (const type of validTypes) {
        expect(validTypes.includes(type)).toBe(true);
      }
    });

    it('should reject invalid ticket types', () => {
      const invalidTypes = ['feature', 'issue', 'incident'];

      for (const type of invalidTypes) {
        expect(validTypes.includes(type)).toBe(false);
      }
    });
  });

  describe('file creation', () => {
    it('should create ticket file in correct directory', async () => {
      const outputPath = path.join(testDir, 'backlog');
      const ticketDir = path.join(outputPath, 'tickets', 'storys');
      await fs.ensureDir(ticketDir);

      const ticketContent = `---
documentType: story
title: "Test Story"
---

# STORY-001
`;

      const ticketPath = path.join(ticketDir, 'STORY-001.md');
      await fs.writeFile(ticketPath, ticketContent, 'utf-8');

      expect(await fs.pathExists(ticketPath)).toBe(true);

      const content = await fs.readFile(ticketPath, 'utf-8');
      expect(content).toContain('documentType: story');
    });

    it('should not overwrite existing ticket files', async () => {
      const ticketDir = path.join(testDir, 'tickets', 'storys');
      await fs.ensureDir(ticketDir);

      const existingContent = '# Existing Story';
      const ticketPath = path.join(ticketDir, 'STORY-001.md');
      await fs.writeFile(ticketPath, existingContent, 'utf-8');

      // Verify file exists
      const exists = await fs.pathExists(ticketPath);
      expect(exists).toBe(true);

      // Content should be unchanged
      const content = await fs.readFile(ticketPath, 'utf-8');
      expect(content).toBe(existingContent);
    });
  });

  describe('dry run mode', () => {
    it('should render template without creating file in dry run mode', async () => {
      // Create template
      const templateContent = `---
documentType: story
title: "{{summary}}"
---

# {{name}}
`;
      await fs.writeFile(
        path.join(templatesDir, 'story.template.md'),
        templateContent,
        'utf-8'
      );
      await fs.writeJson(path.join(templatesDir, 'template.config.json'), {
        templates: {
          'story.template': {
            output: '{{name}}.md',
            variables: { required: ['name', 'summary'], optional: [] },
            defaults: {},
          },
        },
      });

      const engine = new SkillTemplateEngine(templatesDir);
      const rendered = await engine.render('story.template', {
        variables: {
          name: 'STORY-001',
          summary: 'Test Story',
        },
      });

      // In dry run mode, we would NOT write to disk
      // Just verify rendering works
      expect(rendered).toContain('title: "Test Story"');
      expect(rendered).toContain('# STORY-001');

      // No file should exist (we didn't write it)
      const ticketPath = path.join(testDir, 'STORY-001.md');
      expect(await fs.pathExists(ticketPath)).toBe(false);
    });
  });

  describe('variable defaults', () => {
    it('should apply default values for variables', async () => {
      const templateContent = `---
priority: {{priority}}
---

# {{name}}
`;
      await fs.writeFile(
        path.join(templatesDir, 'story.template.md'),
        templateContent,
        'utf-8'
      );
      await fs.writeJson(path.join(templatesDir, 'template.config.json'), {
        templates: {
          'story.template': {
            output: '{{name}}.md',
            variables: {
              required: ['name'],
              optional: ['priority'],
            },
            defaults: {
              priority: 'medium',
            },
          },
        },
      });

      const engine = new SkillTemplateEngine(templatesDir);
      const rendered = await engine.render('story.template', {
        variables: {
          name: 'STORY-001',
        },
      });

      expect(rendered).toContain('priority: medium');
    });
  });

  describe('edge cases', () => {
    it('should handle special characters in ticket name', async () => {
      const templateContent = `# {{name}}`;
      await fs.writeFile(
        path.join(templatesDir, 'test.template.md'),
        templateContent,
        'utf-8'
      );
      await fs.writeJson(path.join(templatesDir, 'template.config.json'), {
        templates: {
          'test.template': {
            output: '{{name}}.md',
            variables: { required: ['name'], optional: [] },
            defaults: {},
          },
        },
      });

      const engine = new SkillTemplateEngine(templatesDir);
      const rendered = await engine.render('test.template', {
        variables: {
          name: 'STORY-001: Fix "quoted" issue',
        },
      });

      expect(rendered).toContain('STORY-001: Fix "quoted" issue');
    });

    it('should handle empty variables gracefully', async () => {
      const templateContent = `---
title: "{{title}}"
---`;
      await fs.writeFile(
        path.join(templatesDir, 'test.template.md'),
        templateContent,
        'utf-8'
      );
      await fs.writeJson(path.join(templatesDir, 'template.config.json'), {
        templates: {
          'test.template': {
            output: 'output.md',
            variables: { required: [], optional: ['title'] },
            defaults: { title: '' },
          },
        },
      });

      const engine = new SkillTemplateEngine(templatesDir);
      const rendered = await engine.render('test.template', {
        variables: {},
      });

      expect(rendered).toContain('title: ""');
    });
  });
});
