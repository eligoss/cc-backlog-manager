/**
 * Unit Tests for Skill Template Engine
 *
 * Tests template rendering, variable substitution, and auto-numbering.
 */

import fs from 'fs-extra';
import fg from 'fast-glob';
import { SkillTemplateEngine, createTemplateEngine } from '../skill-template-engine.js';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock fast-glob
jest.mock('fast-glob');
const mockedFg = fg as jest.MockedFunction<typeof fg>;

describe('SkillTemplateEngine', () => {
  let engine: SkillTemplateEngine;
  const templateDir = '/test/templates';

  beforeEach(() => {
    jest.resetAllMocks();
    engine = new SkillTemplateEngine(templateDir);
  });

  describe('render', () => {
    const baseConfig = {
      templates: {
        'ticket': {
          output: 'tickets/{{name}}.md',
          variables: {
            required: ['name', 'summary'],
            optional: ['description'],
          },
          defaults: {
            description: 'No description provided',
          },
        },
      },
    };

    it('should render template with variables', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(true) // config exists
        .mockResolvedValueOnce(true); // template file exists
      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(baseConfig)) // config content
        .mockResolvedValueOnce('# {{name}}\n\n{{summary}}\n\n{{description}}'); // template content

      const result = await engine.render('ticket', {
        variables: {
          name: 'my-ticket',
          summary: 'Fix the bug',
          description: 'A detailed description',
        },
      });

      expect(result).toContain('# my-ticket');
      expect(result).toContain('Fix the bug');
      expect(result).toContain('A detailed description');
    });

    it('should use defaults for missing optional variables', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(baseConfig))
        .mockResolvedValueOnce('# {{name}}\n\n{{summary}}\n\n{{description}}');

      const result = await engine.render('ticket', {
        variables: {
          name: 'my-ticket',
          summary: 'Fix the bug',
          // description not provided - should use default
        },
      });

      expect(result).toContain('No description provided');
    });

    it('should throw error when required variable is missing', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(baseConfig));

      await expect(
        engine.render('ticket', {
          variables: {
            name: 'my-ticket',
            // summary is missing
          },
        })
      ).rejects.toThrow('Missing required variables: summary');
    });

    it('should skip validation when skipValidation is true', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(baseConfig))
        .mockResolvedValueOnce('# {{name}}');

      // Should not throw even though summary is missing
      const result = await engine.render('ticket', {
        variables: { name: 'test' },
        skipValidation: true,
      });

      expect(result).toContain('# test');
    });

    it('should warn on unknown variables', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(true)
        .mockResolvedValueOnce(true);
      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(baseConfig))
        .mockResolvedValueOnce('# {{name}}\n{{summary}}');

      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      await engine.render('ticket', {
        variables: {
          name: 'test',
          summary: 'test',
          unknownVar: 'value', // Not in config
        },
      });

      expect(consoleSpy).toHaveBeenCalledWith(
        expect.stringContaining('Unknown variables')
      );

      consoleSpy.mockRestore();
    });

    it('should throw error when template not found in config', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(baseConfig));

      await expect(
        engine.render('nonexistent', { variables: {} })
      ).rejects.toThrow('Template "nonexistent" not found');
    });

    it('should throw error when template file does not exist', async () => {
      mockedFs.pathExists
        .mockResolvedValueOnce(true) // config exists
        .mockResolvedValueOnce(false); // template file doesn't exist
      mockedFs.readFile.mockResolvedValue(JSON.stringify(baseConfig));

      await expect(
        engine.render('ticket', {
          variables: { name: 'test', summary: 'test' },
        })
      ).rejects.toThrow('Template file not found');
    });

    it('should throw error when config file does not exist', async () => {
      mockedFs.pathExists.mockResolvedValue(false);

      await expect(
        engine.render('ticket', { variables: {} })
      ).rejects.toThrow('Template configuration not found');
    });
  });

  describe('renderToFile', () => {
    const baseConfig = {
      templates: {
        'ticket': {
          output: 'tickets/{{name}}.md',
          variables: {
            required: ['name'],
            optional: [],
          },
          defaults: {},
        },
      },
    };

    it('should render and write to file', async () => {
      // Need to create a fresh engine for each test to avoid config caching issues
      const freshEngine = new SkillTemplateEngine(templateDir);

      mockedFs.pathExists.mockResolvedValue(true);
      // Config is loaded once and cached, then template file is read
      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(baseConfig)) // config (cached)
        .mockResolvedValueOnce('# {{name}}'); // template file
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      const outputPath = await freshEngine.renderToFile(
        'ticket',
        { variables: { name: 'my-ticket' } },
        '/output/custom-path.md'
      );

      expect(outputPath).toBe('/output/custom-path.md');
      expect(mockedFs.writeFile).toHaveBeenCalledWith(
        '/output/custom-path.md',
        expect.stringContaining('# my-ticket'),
        'utf-8'
      );
    });

    it('should use config output path when not provided', async () => {
      const freshEngine = new SkillTemplateEngine(templateDir);

      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile
        .mockResolvedValueOnce(JSON.stringify(baseConfig)) // config
        .mockResolvedValueOnce('# {{name}}'); // template
      mockedFs.ensureDir.mockResolvedValue(undefined);
      mockedFs.writeFile.mockResolvedValue(undefined);

      const outputPath = await freshEngine.renderToFile('ticket', {
        variables: { name: 'my-ticket' },
      });

      expect(outputPath).toBe('tickets/my-ticket.md');
    });
  });

  describe('getNextNumber', () => {
    const configWithAutoNumbering = {
      templates: {},
      autoNumbering: {
        pattern: 'TICKET-{num}.md',
        padding: 3,
      },
    };

    it('should return 1 when no files exist', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(configWithAutoNumbering));
      mockedFg.mockResolvedValue([]);

      const result = await engine.getNextNumber('/tickets');

      expect(result).toBe(1);
    });

    it('should return next number based on existing files', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(configWithAutoNumbering));
      mockedFg.mockResolvedValue([
        'TICKET-001.md',
        'TICKET-002.md',
        'TICKET-005.md',
      ]);

      const result = await engine.getNextNumber('/tickets');

      expect(result).toBe(6); // 5 + 1
    });

    it('should use custom pattern when provided', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(configWithAutoNumbering));
      mockedFg.mockResolvedValue(['STORY-010.md', 'STORY-020.md']);

      const result = await engine.getNextNumber('/stories', 'STORY-{num}.md');

      expect(result).toBe(21); // 20 + 1
    });

    it('should throw error when no auto-numbering pattern configured', async () => {
      const configNoAutoNumbering = { templates: {} };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(configNoAutoNumbering));

      await expect(engine.getNextNumber('/tickets')).rejects.toThrow(
        'No auto-numbering pattern configured'
      );
    });

    it('should handle files that do not match pattern', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(configWithAutoNumbering));
      mockedFg.mockResolvedValue([
        'README.md',
        'TICKET-abc.md', // Invalid - not a number
        'TICKET-001.md',
      ]);

      const result = await engine.getNextNumber('/tickets');

      expect(result).toBe(2); // Only TICKET-001.md counts
    });
  });

  describe('getAutoNumberingConfig', () => {
    it('should return auto-numbering config when present', async () => {
      const config = {
        templates: {},
        autoNumbering: {
          pattern: 'TICKET-{num}.md',
          padding: 3,
        },
      };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(config));

      const result = await engine.getAutoNumberingConfig();

      expect(result).toBeDefined();
      expect(result!.pattern).toBe('TICKET-{num}.md');
      expect(result!.padding).toBe(3);
    });

    it('should return undefined when no auto-numbering configured', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(JSON.stringify({ templates: {} }));

      const result = await engine.getAutoNumberingConfig();

      expect(result).toBeUndefined();
    });
  });

  describe('listTemplates', () => {
    it('should return list of template names', async () => {
      const config = {
        templates: {
          'ticket': { output: '', variables: { required: [], optional: [] }, defaults: {} },
          'story': { output: '', variables: { required: [], optional: [] }, defaults: {} },
          'epic': { output: '', variables: { required: [], optional: [] }, defaults: {} },
        },
      };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(config));

      const result = await engine.listTemplates();

      expect(result).toHaveLength(3);
      expect(result).toContain('ticket');
      expect(result).toContain('story');
      expect(result).toContain('epic');
    });

    it('should return empty array when no templates', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(JSON.stringify({ templates: {} }));

      const result = await engine.listTemplates();

      expect(result).toEqual([]);
    });
  });

  describe('getInfo', () => {
    it('should return template info', async () => {
      const config = {
        templates: {
          'ticket': {
            output: 'tickets/{{name}}.md',
            variables: { required: ['name'], optional: ['description'] },
            defaults: { description: 'N/A' },
          },
        },
      };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(config));

      const result = await engine.getInfo('ticket');

      expect(result.output).toBe('tickets/{{name}}.md');
      expect(result.variables.required).toContain('name');
      expect(result.variables.optional).toContain('description');
      expect(result.defaults.description).toBe('N/A');
    });

    it('should throw error when template not found', async () => {
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(JSON.stringify({ templates: {} }));

      await expect(engine.getInfo('nonexistent')).rejects.toThrow(
        'Template "nonexistent" not found'
      );
    });
  });

  describe('config caching', () => {
    it('should cache config after first load', async () => {
      const config = {
        templates: {
          'ticket': {
            output: 'tickets/{{name}}.md',
            variables: { required: ['name'], optional: [] },
            defaults: {},
          },
        },
      };
      mockedFs.pathExists.mockResolvedValue(true);
      mockedFs.readFile.mockResolvedValue(JSON.stringify(config));

      // Call listTemplates twice
      await engine.listTemplates();
      await engine.listTemplates();

      // Config should only be loaded once
      expect(mockedFs.readFile).toHaveBeenCalledTimes(1);
    });
  });
});

describe('createTemplateEngine', () => {
  it('should create a new SkillTemplateEngine instance', () => {
    const engine = createTemplateEngine('/test/templates');

    expect(engine).toBeInstanceOf(SkillTemplateEngine);
  });
});
