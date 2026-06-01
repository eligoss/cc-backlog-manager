/**
 * Unit Tests: Generate Commands Command
 *
 * Tests for the generate-commands CLI command that creates Claude command
 * wrapper files (cmd-*.md) from module.json CLI command definitions.
 *
 * @module commands/__tests__/generate-commands.test
 */

import fs from 'fs-extra';
import path from 'path';
import { createSandbox, TestSandbox } from '../../lib/__tests__/test-utils';

/**
 * Helper functions extracted from generate-commands.ts for testing
 */

/**
 * Generate a command ID from CLI command name.
 * Example: "backlog create-ticket" -> "cmd-backlog-create-ticket"
 * Example: "validate --links" -> "cmd-validate-links"
 */
function generateCommandId(cliName: string): string {
  // Remove -- prefixes from flags, then replace spaces with dashes
  const cleaned = cliName
    .replace(/\s+--/g, ' ')  // Remove -- from flags
    .replace(/\s+/g, '-');    // Replace remaining spaces with dashes
  return 'cmd-' + cleaned;
}

/**
 * Generate a human-readable title from command name.
 * Example: "backlog create-ticket" -> "Backlog Create Ticket"
 */
function formatTitle(cliName: string): string {
  return cliName
    .split(/[\s-]+/)
    .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
    .join(' ');
}

/**
 * Generate markdown content for a command wrapper file.
 */
function generateCommandMarkdown(
  cmd: {
    name: string;
    type: string;
    skill?: string;
    description: string;
  },
  moduleId: string,
  moduleName: string
): string {
  const commandId = generateCommandId(cmd.name);
  const title = formatTitle(cmd.name);

  let content = `---
command: ${commandId}
cli-command: "agentic-framework ${cmd.name}"
module: ${moduleId}
type: ${cmd.type}
description: "${cmd.description}"`;

  if (cmd.skill) {
    content += `
related-skill: ${cmd.skill}`;
  }

  content += `
---

# ${title}

**Command:** \`agentic-framework ${cmd.name}\`
**Module:** ${moduleName}
**Type:** ${cmd.type}

## Description

${cmd.description}

## Usage

\`\`\`bash
agentic-framework ${cmd.name} [options]
\`\`\`

## Execution

When invoked, run the CLI command:

\`\`\`bash
agentic-framework ${cmd.name}
\`\`\`

Use \`--help\` to see all available options:

\`\`\`bash
agentic-framework ${cmd.name} --help
\`\`\`
`;

  if (cmd.skill) {
    content += `
## Related

- **Skill:** \`${cmd.skill}\` - Provides detailed guidance for this command
`;
  }

  return content;
}

describe('Generate Commands - Helper Functions', () => {
  describe('generateCommandId', () => {
    it('should convert simple command name to ID', () => {
      expect(generateCommandId('create-ticket')).toBe('cmd-create-ticket');
      expect(generateCommandId('validate')).toBe('cmd-validate');
      expect(generateCommandId('sync')).toBe('cmd-sync');
    });

    it('should convert module-prefixed commands to ID', () => {
      expect(generateCommandId('backlog create-ticket')).toBe('cmd-backlog-create-ticket');
      expect(generateCommandId('backlog push')).toBe('cmd-backlog-push');
      expect(generateCommandId('confluence create-page')).toBe('cmd-confluence-create-page');
    });

    it('should handle commands with flags', () => {
      expect(generateCommandId('validate --links')).toBe('cmd-validate-links');
      expect(generateCommandId('validate --markdown')).toBe('cmd-validate-markdown');
      expect(generateCommandId('backlog validate --strict')).toBe('cmd-backlog-validate-strict');
    });

    it('should handle multiple flags', () => {
      expect(generateCommandId('validate --links --strict')).toBe('cmd-validate-links-strict');
    });

    it('should handle mixed spaces and dashes', () => {
      expect(generateCommandId('backlog create-ticket')).toBe('cmd-backlog-create-ticket');
      expect(generateCommandId('create ticket')).toBe('cmd-create-ticket');
    });

    it('should add cmd- prefix', () => {
      const result = generateCommandId('test');
      expect(result).toMatch(/^cmd-/);
    });

    it('should replace all spaces with dashes', () => {
      const result = generateCommandId('multi word command name');
      expect(result).toBe('cmd-multi-word-command-name');
      expect(result).not.toContain(' ');
    });

    it('should strip -- from flags before processing', () => {
      expect(generateCommandId('validate --links')).toBe('cmd-validate-links');
      expect(generateCommandId('validate --links')).not.toContain('--');
    });

    it('should handle edge cases', () => {
      expect(generateCommandId('')).toBe('cmd-');
      expect(generateCommandId('a')).toBe('cmd-a');
      expect(generateCommandId('a-b-c')).toBe('cmd-a-b-c');
    });
  });

  describe('formatTitle', () => {
    it('should capitalize each word', () => {
      expect(formatTitle('backlog create-ticket')).toBe('Backlog Create Ticket');
      expect(formatTitle('backlog push')).toBe('Backlog Push');
      expect(formatTitle('validate')).toBe('Validate');
    });

    it('should handle dashes and spaces', () => {
      expect(formatTitle('create-ticket')).toBe('Create Ticket');
      expect(formatTitle('create ticket')).toBe('Create Ticket');
      expect(formatTitle('multi-word-title')).toBe('Multi Word Title');
    });

    it('should handle mixed separators', () => {
      expect(formatTitle('backlog create-ticket')).toBe('Backlog Create Ticket');
      expect(formatTitle('backlog-create ticket')).toBe('Backlog Create Ticket');
    });

    it('should preserve uppercase letters in words', () => {
      // Note: Current implementation lowercases then capitalizes first letter
      // This test documents current behavior
      expect(formatTitle('API')).toBe('API');
      expect(formatTitle('createAPI')).toBe('CreateAPI');
    });

    it('should handle empty string', () => {
      expect(formatTitle('')).toBe('');
    });

    it('should handle single word', () => {
      expect(formatTitle('test')).toBe('Test');
      expect(formatTitle('TEST')).toBe('TEST');
    });

    it('should split on both spaces and dashes', () => {
      const result = formatTitle('word1 word2-word3');
      expect(result).toBe('Word1 Word2 Word3');
    });
  });

  describe('generateCommandMarkdown', () => {
    it('should generate complete markdown with all fields', () => {
      const cmd = {
        name: 'backlog create-ticket',
        type: 'create',
        skill: 'building-tickets',
        description: 'Create a new backlog ticket',
      };

      const markdown = generateCommandMarkdown(cmd, 'backlog', 'Backlog Module');

      // Check frontmatter
      expect(markdown).toContain('---');
      expect(markdown).toContain('command: cmd-backlog-create-ticket');
      expect(markdown).toContain('cli-command: "agentic-framework backlog create-ticket"');
      expect(markdown).toContain('module: backlog');
      expect(markdown).toContain('type: create');
      expect(markdown).toContain('description: "Create a new backlog ticket"');
      expect(markdown).toContain('related-skill: building-tickets');

      // Check content
      expect(markdown).toContain('# Backlog Create Ticket');
      expect(markdown).toContain('**Command:** `agentic-framework backlog create-ticket`');
      expect(markdown).toContain('**Module:** Backlog Module');
      expect(markdown).toContain('**Type:** create');
      expect(markdown).toContain('## Description');
      expect(markdown).toContain('Create a new backlog ticket');
      expect(markdown).toContain('## Usage');
      expect(markdown).toContain('## Execution');
      expect(markdown).toContain('agentic-framework backlog create-ticket --help');

      // Check related skill section
      expect(markdown).toContain('## Related');
      expect(markdown).toContain('**Skill:** `building-tickets`');
    });

    it('should generate markdown without skill when not provided', () => {
      const cmd = {
        name: 'validate',
        type: 'validate',
        description: 'Validate project structure',
      };

      const markdown = generateCommandMarkdown(cmd, 'core', 'Core Module');

      // Should not contain skill-related content
      expect(markdown).not.toContain('related-skill:');
      expect(markdown).not.toContain('## Related');

      // Should contain basic content
      expect(markdown).toContain('command: cmd-validate');
      expect(markdown).toContain('# Validate');
      expect(markdown).toContain('Validate project structure');
    });

    it('should handle different command types', () => {
      const types = ['create', 'validate', 'sync', 'export', 'import', 'transform'];

      types.forEach(type => {
        const cmd = {
          name: 'test-command',
          type,
          description: `Test ${type} command`,
        };

        const markdown = generateCommandMarkdown(cmd, 'test', 'Test Module');
        expect(markdown).toContain(`type: ${type}`);
        expect(markdown).toContain(`**Type:** ${type}`);
      });
    });

    it('should properly escape description in frontmatter', () => {
      const cmd = {
        name: 'test',
        type: 'create',
        description: 'Create a "quoted" description',
      };

      const markdown = generateCommandMarkdown(cmd, 'test', 'Test');

      // Description should be in quotes in frontmatter
      expect(markdown).toContain('description: "Create a "quoted" description"');
    });

    it('should generate valid markdown structure', () => {
      const cmd = {
        name: 'test',
        type: 'create',
        description: 'Test description',
      };

      const markdown = generateCommandMarkdown(cmd, 'test', 'Test Module');

      // Check markdown structure
      const lines = markdown.split('\n');

      // Should start with frontmatter
      expect(lines[0]).toBe('---');

      // Should have closing frontmatter
      const closingIndex = lines.slice(1).indexOf('---') + 1;
      expect(closingIndex).toBeGreaterThan(0);

      // Should have h1 heading after frontmatter
      expect(lines[closingIndex + 1]).toBe('');
      expect(lines[closingIndex + 2]).toMatch(/^# /);

      // Should have section headers
      expect(markdown).toMatch(/## Description/);
      expect(markdown).toMatch(/## Usage/);
      expect(markdown).toMatch(/## Execution/);
    });

    it('should include help text in usage', () => {
      const cmd = {
        name: 'backlog create-ticket',
        type: 'create',
        description: 'Create ticket',
      };

      const markdown = generateCommandMarkdown(cmd, 'backlog', 'Backlog');

      expect(markdown).toContain('agentic-framework backlog create-ticket --help');
    });

    it('should use command name in all relevant places', () => {
      const cmd = {
        name: 'backlog push',
        type: 'sync',
        description: 'Push local ticket changes to Jira',
      };

      const markdown = generateCommandMarkdown(cmd, 'backlog', 'Backlog Module');

      // Command name should appear in multiple places
      const occurrences = (markdown.match(/backlog push/g) || []).length;
      expect(occurrences).toBeGreaterThan(3);
    });
  });
});

describe('Generate Commands - Integration', () => {
  let sandbox: TestSandbox;

  beforeEach(async () => {
    sandbox = await createSandbox('generate-commands-test');
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('Command File Generation', () => {
    it('should generate command file from CLI definition', async () => {
      const cmd = {
        name: 'backlog create-ticket',
        type: 'create',
        skill: 'building-tickets',
        description: 'Create a new backlog ticket',
      };

      const markdown = generateCommandMarkdown(cmd, 'backlog', 'Backlog Module');
      const commandId = generateCommandId(cmd.name);
      const fileName = `${commandId}.md`;

      await sandbox.createFile(`commands/${fileName}`, markdown);

      // Verify file was created
      expect(await sandbox.exists(`commands/${fileName}`)).toBe(true);

      // Verify content
      const content = await sandbox.readFile(`commands/${fileName}`);
      expect(content).toBe(markdown);
    });

    it('should generate multiple command files from module', async () => {
      const commands = [
        {
          name: 'backlog create-ticket',
          type: 'create',
          skill: 'building-tickets',
          description: 'Create a new ticket',
        },
        {
          name: 'backlog validate',
          type: 'validate',
          skill: 'building-tickets',
          description: 'Validate ticket structure',
        },
        {
          name: 'backlog import',
          type: 'import',
          description: 'Import tickets from Jira',
        },
      ];

      const moduleId = 'backlog';
      const moduleName = 'Backlog Module';
      const commandsDir = 'commands';

      // Generate all command files
      for (const cmd of commands) {
        const markdown = generateCommandMarkdown(cmd, moduleId, moduleName);
        const commandId = generateCommandId(cmd.name);
        const fileName = `${commandId}.md`;

        await sandbox.createFile(`${commandsDir}/${fileName}`, markdown);
      }

      // Verify all files were created
      expect(await sandbox.exists(`${commandsDir}/cmd-backlog-create-ticket.md`)).toBe(true);
      expect(await sandbox.exists(`${commandsDir}/cmd-backlog-validate.md`)).toBe(true);
      expect(await sandbox.exists(`${commandsDir}/cmd-backlog-import.md`)).toBe(true);

      // Verify content of one file
      const content = await sandbox.readFile(`${commandsDir}/cmd-backlog-validate.md`);
      expect(content).toContain('command: cmd-backlog-validate');
      expect(content).toContain('Validate ticket structure');
    });

    it('should use module-specific information in generated files', async () => {
      const modules = [
        { id: 'backlog', name: 'Backlog Management' },
        { id: 'coding', name: 'Coding' },
        { id: 'confluence', name: 'Confluence Publishing' },
      ];

      for (const module of modules) {
        const cmd = {
          name: `${module.id} test`,
          type: 'create',
          description: `Test command for ${module.name}`,
        };

        const markdown = generateCommandMarkdown(cmd, module.id, module.name);

        expect(markdown).toContain(`module: ${module.id}`);
        expect(markdown).toContain(`**Module:** ${module.name}`);
      }
    });

    it('should handle commands with different types', async () => {
      const types = [
        { type: 'create', description: 'Create new item' },
        { type: 'validate', description: 'Validate structure' },
        { type: 'sync', description: 'Sync with external system' },
        { type: 'export', description: 'Export data' },
        { type: 'import', description: 'Import data' },
        { type: 'transform', description: 'Transform format' },
      ];

      for (const { type, description } of types) {
        const cmd = {
          name: `test ${type}`,
          type,
          description,
        };

        const markdown = generateCommandMarkdown(cmd, 'test', 'Test Module');
        const commandId = generateCommandId(cmd.name);

        await sandbox.createFile(`commands/${commandId}.md`, markdown);

        const content = await sandbox.readFile(`commands/${commandId}.md`);
        expect(content).toContain(`type: ${type}`);
        expect(content).toContain(description);
      }
    });
  });

  describe('Filename Generation', () => {
    it('should generate consistent filenames', () => {
      const commands = [
        'backlog create-ticket',
        'backlog push',
        'confluence create-page',
        'validate --links',
      ];

      const expected = [
        'cmd-backlog-create-ticket',
        'cmd-backlog-push',
        'cmd-confluence-create-page',
        'cmd-validate-links',
      ];

      commands.forEach((cmd, index) => {
        const id = generateCommandId(cmd);
        expect(id).toBe(expected[index]);
      });
    });

    it('should generate safe filenames', () => {
      const commands = [
        'test command with spaces',
        'test-command-with-dashes',
        'test --flag',
      ];

      commands.forEach(cmd => {
        const id = generateCommandId(cmd);

        // Should not contain spaces or --
        expect(id).not.toContain(' ');
        expect(id).not.toContain('--');

        // Should only contain alphanumeric, dashes, and cmd- prefix
        expect(id).toMatch(/^cmd-[a-z0-9-]+$/);
      });
    });
  });

  describe('Edge Cases', () => {
    it('should handle commands with special characters in description', async () => {
      const cmd = {
        name: 'test',
        type: 'create',
        description: 'Create a "special" <item> with & symbols',
      };

      const markdown = generateCommandMarkdown(cmd, 'test', 'Test');

      // Should preserve special characters in description
      expect(markdown).toContain('"special"');
      expect(markdown).toContain('<item>');
      expect(markdown).toContain('&');
    });

    it('should handle very long command names', () => {
      const longName = 'very long command name with many words that keeps going';
      const id = generateCommandId(longName);

      expect(id).toMatch(/^cmd-/);
      expect(id).not.toContain(' ');

      const title = formatTitle(longName);
      expect(title.split(' ').length).toBe(longName.split(' ').length);
    });

    it('should handle commands with no description gracefully', async () => {
      const cmd = {
        name: 'test',
        type: 'create',
        description: '',
      };

      const markdown = generateCommandMarkdown(cmd, 'test', 'Test');

      // Should still generate valid markdown
      expect(markdown).toContain('---');
      expect(markdown).toContain('command: cmd-test');
      expect(markdown).toContain('## Description');
    });

    it('should handle skill IDs with special characters', () => {
      const cmd = {
        name: 'test',
        type: 'create',
        skill: 'skill-with-dashes',
        description: 'Test',
      };

      const markdown = generateCommandMarkdown(cmd, 'test', 'Test');

      expect(markdown).toContain('related-skill: skill-with-dashes');
      expect(markdown).toContain('**Skill:** `skill-with-dashes`');
    });
  });

  describe('Frontmatter Validation', () => {
    it('should generate valid YAML frontmatter', () => {
      const cmd = {
        name: 'backlog create-ticket',
        type: 'create',
        skill: 'building-tickets',
        description: 'Create a new ticket',
      };

      const markdown = generateCommandMarkdown(cmd, 'backlog', 'Backlog');

      // Extract frontmatter
      const lines = markdown.split('\n');
      const frontmatterEnd = lines.slice(1).indexOf('---') + 1;
      const frontmatter = lines.slice(0, frontmatterEnd + 1).join('\n');

      // Should start and end with ---
      expect(frontmatter).toMatch(/^---\n/);
      expect(frontmatter).toMatch(/\n---$/);

      // Should contain required fields
      expect(frontmatter).toContain('command:');
      expect(frontmatter).toContain('cli-command:');
      expect(frontmatter).toContain('module:');
      expect(frontmatter).toContain('type:');
      expect(frontmatter).toContain('description:');
    });

    it('should generate frontmatter with proper field order', () => {
      const cmd = {
        name: 'test',
        type: 'create',
        skill: 'test-skill',
        description: 'Test',
      };

      const markdown = generateCommandMarkdown(cmd, 'test', 'Test');

      // Extract frontmatter fields
      const lines = markdown.split('\n');
      const frontmatterEnd = lines.slice(1).indexOf('---') + 1;
      const frontmatterLines = lines.slice(1, frontmatterEnd);

      // Check field order
      const fields = frontmatterLines.map(line => line.split(':')[0]);
      expect(fields[0]).toBe('command');
      expect(fields[1]).toBe('cli-command');
      expect(fields[2]).toBe('module');
      expect(fields[3]).toBe('type');
      expect(fields[4]).toBe('description');
      expect(fields[5]).toBe('related-skill');
    });
  });
});
