/**
 * Tests for Skill Schema (Zod)
 *
 * Validates skill frontmatter schema including flexible CLI command formats.
 */

import { describe, it, expect } from '@jest/globals';
import {
  SkillSchema,
  SkillSchemaLoose,
  CliCommandSchema,
  CliCommandsSchema,
} from '../skill.schema.js';

describe('Skill Schema', () => {
  describe('SkillSchema', () => {
    it('should validate a valid skill', () => {
      const skill = {
        id: 'planning-phases',
        name: 'managing-framework-phases',
        description: 'Enforce proper plan creation and lifecycle discipline for planning tasks',
        scope: 'generic',
        'applicable-projects': 'any',
        module: 'planning',
        'capabilities-provided': ['plan-creation', 'commit-discipline'],
      };

      const result = SkillSchema.safeParse(skill);
      expect(result.success).toBe(true);
    });

    it('should require at least one capability', () => {
      const skill = {
        id: 'test-skill',
        name: 'Test Skill',
        description: 'A test skill for validation purposes',
        'capabilities-provided': [], // Empty
      };

      const result = SkillSchema.safeParse(skill);
      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.issues.some(i => i.path.includes('capabilities-provided'))).toBe(true);
      }
    });

    it('should validate id as kebab-case', () => {
      const validIds = [
        'planning-phases',
        'committing-code',
        'syncing-with-jira',
        'a1-test',
      ];

      for (const id of validIds) {
        const skill = {
          id,
          name: 'Test',
          description: 'Test description that is long enough',
          'capabilities-provided': ['test'],
        };
        expect(SkillSchema.safeParse(skill).success).toBe(true);
      }
    });

    it('should reject invalid id formats', () => {
      const invalidIds = [
        'PlanningDiscipline', // CamelCase
        'PLANNING_DISCIPLINE', // SCREAMING_SNAKE
        '123-test', // Starts with number
        'test_skill', // Underscores
        '', // Empty
      ];

      for (const id of invalidIds) {
        const skill = {
          id,
          name: 'Test',
          description: 'Test description that is long enough',
          'capabilities-provided': ['test'],
        };
        expect(SkillSchema.safeParse(skill).success).toBe(false);
      }
    });
  });

  describe('Description validation', () => {
    it('should require minimum description length', () => {
      const skill = {
        id: 'test-skill',
        name: 'Test',
        description: 'Short', // Too short (< 10 chars)
        'capabilities-provided': ['test'],
      };

      const result = SkillSchema.safeParse(skill);
      expect(result.success).toBe(false);
    });

    it('should enforce maximum description length', () => {
      const skill = {
        id: 'test-skill',
        name: 'Test',
        description: 'A'.repeat(501), // Too long (> 500 chars)
        'capabilities-provided': ['test'],
      };

      const result = SkillSchema.safeParse(skill);
      expect(result.success).toBe(false);
    });

    it('should accept description within range', () => {
      const skill = {
        id: 'test-skill',
        name: 'Test',
        description: 'A valid description that is between 10 and 500 characters long',
        'capabilities-provided': ['test'],
      };

      const result = SkillSchema.safeParse(skill);
      expect(result.success).toBe(true);
    });
  });

  describe('CLI Commands validation', () => {
    it('should accept record format cli-commands', () => {
      const skill = {
        id: 'planning-phases',
        name: 'Planning Phases',
        description: 'Enforce proper plan creation and lifecycle',
        'capabilities-provided': ['planning'],
        'cli-commands': {
          create: {
            command: 'planning create-plan',
            description: 'Create a new plan',
            template: 'PLAN.md.template',
          },
          validate: {
            command: 'planning validate-plan',
            description: 'Validate plan structure',
          },
        },
      };

      const result = SkillSchema.safeParse(skill);
      expect(result.success).toBe(true);
    });

    it('should accept array format cli-commands', () => {
      const skill = {
        id: 'committing-code',
        name: 'Committing Code',
        description: 'Manage git operations and workflows',
        'capabilities-provided': ['git-workflow'],
        'cli-commands': [
          {
            name: 'commit',
            description: 'Create a git commit',
          },
          {
            name: 'push',
            description: 'Push to remote',
            options: ['--force', '--dry-run'],
          },
        ],
      };

      const result = SkillSchema.safeParse(skill);
      expect(result.success).toBe(true);
    });

    it('should accept nested/mixed cli-commands', () => {
      const skill = {
        id: 'syncing-with-jira',
        name: 'Syncing With Jira',
        description: 'Sync tickets with Jira using pull/diff/push workflow',
        'capabilities-provided': ['jira-sync'],
        'cli-commands': {
          push: {
            command: 'backlog push',
            description: 'Push local ticket changes to Jira',
            options: ['--dry-run', '--verbose'],
          },
          pull: {
            command: 'backlog pull',
            description: 'Fetch tickets from Jira',
          },
          note: 'Some commands are planned for future',
        },
      };

      const result = SkillSchema.safeParse(skill);
      expect(result.success).toBe(true);
    });

    it('should allow skills without cli-commands', () => {
      const skill = {
        id: 'documentation',
        name: 'Documentation Skill',
        description: 'Provides documentation patterns and guidance',
        'capabilities-provided': ['documentation'],
        // No cli-commands
      };

      const result = SkillSchema.safeParse(skill);
      expect(result.success).toBe(true);
    });
  });

  describe('Scope validation', () => {
    it('should accept various scope values', () => {
      const scopes = ['generic', 'framework', 'project', 'project-specific', 'apmr'];

      for (const scope of scopes) {
        const skill = {
          id: 'test-skill',
          name: 'Test',
          description: 'A test skill for scope validation',
          scope,
          'capabilities-provided': ['test'],
        };
        expect(SkillSchema.safeParse(skill).success).toBe(true);
      }
    });

    it('should allow optional scope', () => {
      const skill = {
        id: 'test-skill',
        name: 'Test',
        description: 'A test skill without scope',
        'capabilities-provided': ['test'],
        // No scope
      };

      const result = SkillSchema.safeParse(skill);
      expect(result.success).toBe(true);
    });
  });

  describe('Optional fields', () => {
    it('should allow optional applicable-projects', () => {
      const skill = {
        id: 'test-skill',
        name: 'Test',
        description: 'A test skill without applicable-projects',
        'capabilities-provided': ['test'],
        // No applicable-projects
      };

      const result = SkillSchema.safeParse(skill);
      expect(result.success).toBe(true);
    });

    it('should allow optional module', () => {
      const skill = {
        id: 'test-skill',
        name: 'Test',
        description: 'A test skill without module',
        'capabilities-provided': ['test'],
        // No module
      };

      const result = SkillSchema.safeParse(skill);
      expect(result.success).toBe(true);
    });
  });

  describe('SkillSchemaLoose', () => {
    it('should accept partial data', () => {
      const partial = {
        id: 'test',
        name: 'Test',
        // Missing required fields
      };

      const result = SkillSchemaLoose.safeParse(partial);
      expect(result.success).toBe(true);
    });

    it('should passthrough unknown fields', () => {
      const data = {
        id: 'test',
        customField: 'allowed',
        nested: { data: true },
      };

      const result = SkillSchemaLoose.safeParse(data);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.customField).toBe('allowed');
      }
    });
  });

  describe('CliCommandSchema', () => {
    it('should validate single command', () => {
      const command = {
        command: 'planning create-plan',
        description: 'Create a new plan',
      };

      const result = CliCommandSchema.safeParse(command);
      expect(result.success).toBe(true);
    });

    it('should require command string', () => {
      const command = {
        description: 'Missing command field',
      };

      const result = CliCommandSchema.safeParse(command);
      expect(result.success).toBe(false);
    });

    it('should require description', () => {
      const command = {
        command: 'planning create-plan',
        // Missing description
      };

      const result = CliCommandSchema.safeParse(command);
      expect(result.success).toBe(false);
    });

    it('should allow optional template and schema', () => {
      const command = {
        command: 'planning create-plan',
        description: 'Create a new plan',
        template: 'PLAN.md.template',
        schema: 'plan.schema.json',
      };

      const result = CliCommandSchema.safeParse(command);
      expect(result.success).toBe(true);
    });
  });

  describe('CliCommandsSchema', () => {
    it('should accept undefined', () => {
      const result = CliCommandsSchema.safeParse(undefined);
      expect(result.success).toBe(true);
    });

    it('should accept empty record', () => {
      const result = CliCommandsSchema.safeParse({});
      expect(result.success).toBe(true);
    });

    it('should accept empty array', () => {
      const result = CliCommandsSchema.safeParse([]);
      expect(result.success).toBe(true);
    });
  });

  describe('Real-world skill examples', () => {
    it('should validate planning-phases skill', () => {
      const skill = {
        id: 'planning-phases',
        module: 'planning',
        name: 'managing-framework-phases',
        description: 'Enforce proper plan creation, structure, and lifecycle discipline for all planning tasks (3+ hours, multiple phases)',
        scope: 'generic',
        'applicable-projects': 'any',
        'capabilities-provided': [
          'plan-creation',
          'commit-discipline',
          'plan-discipline',
          'planning-workflow',
        ],
        'cli-commands': {
          create: {
            command: 'planning create-plan',
            description: 'Create a new plan with auto-numbering and templates',
            template: 'PLAN.md.template',
          },
          validate: {
            command: 'planning validate-plan',
            description: 'Validate plan structure and content',
            schema: 'plan.schema.json',
          },
        },
      };

      const result = SkillSchema.safeParse(skill);
      expect(result.success).toBe(true);
    });

    it('should validate syncing-with-jira skill', () => {
      const skill = {
        id: 'syncing-with-jira',
        module: 'backlog',
        name: 'syncing-with-jira',
        description: 'Sync tickets with Jira using pull/diff/push workflow. Use when pulling tickets from Jira, pushing local changes, or reviewing differences.',
        scope: 'project-specific',
        'applicable-projects': 'agentic-development-framework',
        'capabilities-provided': [
          'jira-sync',
          'backlog-pull',
          'backlog-push',
        ],
      };

      const result = SkillSchema.safeParse(skill);
      expect(result.success).toBe(true);
    });
  });
});
