import path from 'path';
import fs from 'fs-extra';
import { createSandbox, TestSandbox } from './test-utils';
import { SkillTemplateEngine, createTemplateEngine } from '../skill-template-engine';

describe('SkillTemplateEngine', () => {
  let sandbox: TestSandbox;
  let testDir: string;
  let templateDir: string;
  let engine: SkillTemplateEngine;

  beforeEach(async () => {
    sandbox = await createSandbox('skill-template-test');
    testDir = sandbox.path;
    templateDir = path.join(testDir, 'templates');
    await fs.ensureDir(templateDir);

    // Create basic template configuration
    await fs.writeJson(path.join(templateDir, 'template.config.json'), {
      templates: {
        basic: {
          output: '{{name}}.md',
          variables: {
            required: ['name', 'title'],
            optional: ['description'],
          },
          defaults: {
            description: 'No description provided',
          },
        },
        plan: {
          output: 'ai/plans/{{category}}/{{number}}-{{name}}/PLAN.md',
          variables: {
            required: ['name', 'category', 'number'],
            optional: ['author'],
          },
          defaults: {
            author: 'Unknown',
          },
        },
      },
      autoNumbering: {
        pattern: 'TICKET-{num}.md',
        padding: 3,
      },
    });

    // Create template files
    await fs.writeFile(
      path.join(templateDir, 'basic.md'),
      '# {{title}}\n\n{{description}}\n\nCreated: {{name}}'
    );

    await fs.writeFile(
      path.join(templateDir, 'plan.md'),
      '# Plan: {{name}}\n\nCategory: {{category}}\nNumber: {{number}}\nAuthor: {{author}}'
    );

    engine = new SkillTemplateEngine(templateDir);
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('render', () => {
    it('should replace single variable in template', async () => {
      const result = await engine.render('basic', {
        variables: {
          name: 'test-doc',
          title: 'Test Document',
        },
      });

      expect(result).toContain('# Test Document');
      expect(result).toContain('Created: test-doc');
    });

    it('should replace multiple variables in same template', async () => {
      const result = await engine.render('plan', {
        variables: {
          name: 'feature-auth',
          category: 'backend',
          number: '001',
        },
      });

      expect(result).toContain('# Plan: feature-auth');
      expect(result).toContain('Category: backend');
      expect(result).toContain('Number: 001');
      expect(result).toContain('Author: Unknown'); // default value
    });

    it('should throw error for missing required variable', async () => {
      await expect(
        engine.render('basic', {
          variables: {
            name: 'test-doc',
            // missing 'title'
          },
        })
      ).rejects.toThrow('Missing required variables: title');
    });

    it('should use default value for optional variable', async () => {
      const result = await engine.render('basic', {
        variables: {
          name: 'test-doc',
          title: 'Test Document',
          // 'description' is optional with default
        },
      });

      expect(result).toContain('No description provided');
    });

    it('should override default value when optional variable provided', async () => {
      const result = await engine.render('basic', {
        variables: {
          name: 'test-doc',
          title: 'Test Document',
          description: 'Custom description',
        },
      });

      expect(result).toContain('Custom description');
      expect(result).not.toContain('No description provided');
    });

    it('should handle multiple occurrences of same variable', async () => {
      await fs.writeFile(
        path.join(templateDir, 'repeated.md'),
        '{{name}} is a {{name}} template with {{name}}'
      );

      // Add to config
      const config = await fs.readJson(path.join(templateDir, 'template.config.json'));
      config.templates.repeated = {
        output: '{{name}}.md',
        variables: {
          required: ['name'],
          optional: [],
        },
        defaults: {},
      };
      await fs.writeJson(path.join(templateDir, 'template.config.json'), config);

      const result = await engine.render('repeated', {
        variables: { name: 'test' },
      });

      expect(result).toBe('test is a test template with test');
    });

    it('should warn about unknown variables', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await engine.render('basic', {
        variables: {
          name: 'test-doc',
          title: 'Test Document',
          unknownVar: 'value',
        },
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown variables provided: unknownVar')
      );

      consoleSpy.mockRestore();
    });

    it('should skip validation when skipValidation is true', async () => {
      const result = await engine.render('basic', {
        variables: {
          name: 'test-doc',
          // missing 'title' but validation is skipped
        },
        skipValidation: true,
      });

      expect(result).toBeDefined();
      expect(result).toContain('{{title}}'); // Not replaced
    });

    it('should handle escaping special characters in variable values', async () => {
      const result = await engine.render('basic', {
        variables: {
          name: 'test-$pecial-ch@rs',
          title: 'Test & "Special" Characters',
        },
      });

      expect(result).toContain('Test & "Special" Characters');
      expect(result).toContain('test-$pecial-ch@rs');
    });

    it('should throw error for non-existent template', async () => {
      await expect(
        engine.render('non-existent', {
          variables: {},
        })
      ).rejects.toThrow('Template "non-existent" not found');
    });
  });

  describe('renderToFile', () => {
    it('should render template and write to file', async () => {
      const customOutputPath = path.join(testDir, 'test-doc.md');
      const outputPath = await engine.renderToFile(
        'basic',
        {
          variables: {
            name: 'test-doc',
            title: 'Test Document',
          },
        },
        customOutputPath
      );

      expect(await fs.pathExists(outputPath)).toBe(true);
      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('# Test Document');
    });

    it('should use custom output path when provided', async () => {
      const customPath = path.join(testDir, 'custom', 'output.md');

      const outputPath = await engine.renderToFile(
        'basic',
        {
          variables: {
            name: 'test-doc',
            title: 'Test Document',
          },
        },
        customPath
      );

      expect(outputPath).toBe(customPath);
      expect(await fs.pathExists(customPath)).toBe(true);
    });

    it('should create output directories if they do not exist', async () => {
      const customOutputPath = path.join(testDir, 'ai/plans/backend/001-feature-auth/PLAN.md');
      const outputPath = await engine.renderToFile(
        'plan',
        {
          variables: {
            name: 'feature-auth',
            category: 'backend',
            number: '001',
          },
        },
        customOutputPath
      );

      const expectedPath = path.join(testDir, 'ai/plans/backend/001-feature-auth/PLAN.md');
      expect(outputPath).toBe(expectedPath);
      expect(await fs.pathExists(outputPath)).toBe(true);
    });
  });

  describe('getNextNumber', () => {
    it('should return 1 when no files exist', async () => {
      const ticketDir = path.join(testDir, 'tickets');
      await fs.ensureDir(ticketDir);

      const nextNum = await engine.getNextNumber(ticketDir);
      expect(nextNum).toBe(1);
    });

    it('should find highest number and return next', async () => {
      const ticketDir = path.join(testDir, 'tickets');
      await fs.ensureDir(ticketDir);

      // Create some numbered files
      await fs.writeFile(path.join(ticketDir, 'TICKET-001.md'), 'content');
      await fs.writeFile(path.join(ticketDir, 'TICKET-002.md'), 'content');
      await fs.writeFile(path.join(ticketDir, 'TICKET-005.md'), 'content');

      const nextNum = await engine.getNextNumber(ticketDir);
      expect(nextNum).toBe(6);
    });

    it('should handle gaps in numbering', async () => {
      const ticketDir = path.join(testDir, 'tickets');
      await fs.ensureDir(ticketDir);

      await fs.writeFile(path.join(ticketDir, 'TICKET-001.md'), 'content');
      await fs.writeFile(path.join(ticketDir, 'TICKET-010.md'), 'content');

      const nextNum = await engine.getNextNumber(ticketDir);
      expect(nextNum).toBe(11);
    });

    it('should work with custom pattern', async () => {
      const planDir = path.join(testDir, 'plans');
      await fs.ensureDir(planDir);

      await fs.writeFile(path.join(planDir, 'PLAN-001-feature.md'), 'content');
      await fs.writeFile(path.join(planDir, 'PLAN-002-bugfix.md'), 'content');

      // Pattern needs to match the full filename structure
      const nextNum = await engine.getNextNumber(planDir, 'PLAN-{num}-feature.md');
      expect(nextNum).toBe(2); // Files are 001 and 002, but only 001 matches the pattern
    });

    it('should throw error when no auto-numbering configured and no pattern provided', async () => {
      const noAutoEngine = new SkillTemplateEngine(templateDir);

      // Create config without autoNumbering
      await fs.writeJson(path.join(templateDir, 'template.config.json'), {
        templates: {
          basic: {
            output: '{{name}}.md',
            variables: { required: ['name'], optional: [] },
            defaults: {},
          },
        },
      });

      const ticketDir = path.join(testDir, 'tickets');
      await fs.ensureDir(ticketDir);

      await expect(noAutoEngine.getNextNumber(ticketDir)).rejects.toThrow(
        'No auto-numbering pattern configured'
      );
    });
  });

  describe('listTemplates', () => {
    it('should return list of available templates', async () => {
      const templates = await engine.listTemplates();
      expect(templates).toContain('basic');
      expect(templates).toContain('plan');
      expect(templates).toHaveLength(2);
    });
  });

  describe('getInfo', () => {
    it('should return template information', async () => {
      const info = await engine.getInfo('basic');

      expect(info.output).toBe('{{name}}.md');
      expect(info.variables.required).toEqual(['name', 'title']);
      expect(info.variables.optional).toEqual(['description']);
      expect(info.defaults.description).toBe('No description provided');
    });

    it('should throw error for non-existent template', async () => {
      await expect(engine.getInfo('non-existent')).rejects.toThrow(
        'Template "non-existent" not found'
      );
    });
  });

  describe('getAutoNumberingConfig', () => {
    it('should return auto-numbering configuration', async () => {
      const config = await engine.getAutoNumberingConfig();

      expect(config).toBeDefined();
      expect(config?.pattern).toBe('TICKET-{num}.md');
      expect(config?.padding).toBe(3);
    });

    it('should return undefined when no auto-numbering configured', async () => {
      await fs.writeJson(path.join(templateDir, 'template.config.json'), {
        templates: {
          basic: {
            output: '{{name}}.md',
            variables: { required: ['name'], optional: [] },
            defaults: {},
          },
        },
      });

      const config = await engine.getAutoNumberingConfig();
      expect(config).toBeUndefined();
    });
  });

  describe('createTemplateEngine', () => {
    it('should create a template engine instance', () => {
      const newEngine = createTemplateEngine(templateDir);
      expect(newEngine).toBeInstanceOf(SkillTemplateEngine);
    });
  });

  describe('integration tests', () => {
    it('should handle complete workflow: load config, render, write file', async () => {
      // Render a plan template with all features
      const customOutputPath = path.join(testDir, 'ai/plans/backend/042-auth-refactor/PLAN.md');
      const outputPath = await engine.renderToFile(
        'plan',
        {
          variables: {
            name: 'auth-refactor',
            category: 'backend',
            number: '042',
            author: 'Test Author',
          },
        },
        customOutputPath
      );

      // Verify file was created
      expect(await fs.pathExists(outputPath)).toBe(true);

      // Verify content
      const content = await fs.readFile(outputPath, 'utf-8');
      expect(content).toContain('# Plan: auth-refactor');
      expect(content).toContain('Category: backend');
      expect(content).toContain('Number: 042');
      expect(content).toContain('Author: Test Author');

      // Verify path structure
      expect(outputPath).toBe(customOutputPath);
    });

    it('should handle real-world template with complex variables', async () => {
      // Create a more realistic template
      await fs.writeFile(
        path.join(templateDir, 'story.md'),
        `---
title: {{title}}
type: {{type}}
priority: {{priority}}
assignee: {{assignee}}
---

# Story: {{title}}

## Description

{{description}}

## Acceptance Criteria

{{criteria}}

## Technical Notes

{{notes}}
`
      );

      // Add to config
      const config = await fs.readJson(path.join(templateDir, 'template.config.json'));
      config.templates.story = {
        output: 'stories/{{type}}/{{title}}.md',
        variables: {
          required: ['title', 'type', 'description'],
          optional: ['priority', 'assignee', 'criteria', 'notes'],
        },
        defaults: {
          priority: 'medium',
          assignee: 'unassigned',
          criteria: 'TBD',
          notes: 'None',
        },
      };
      await fs.writeJson(path.join(templateDir, 'template.config.json'), config);

      const result = await engine.render('story', {
        variables: {
          title: 'user-authentication',
          type: 'feature',
          description: 'Implement user authentication',
          criteria: '- Users can log in\n- Users can log out',
        },
      });

      expect(result).toContain('title: user-authentication');
      expect(result).toContain('type: feature');
      expect(result).toContain('priority: medium');
      expect(result).toContain('assignee: unassigned');
      expect(result).toContain('# Story: user-authentication');
      expect(result).toContain('Implement user authentication');
      expect(result).toContain('- Users can log in');
      expect(result).toContain('Technical Notes\n\nNone');
    });
  });
});
