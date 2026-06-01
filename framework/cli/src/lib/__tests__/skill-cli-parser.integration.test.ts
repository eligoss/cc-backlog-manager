import path from 'path';
import fs from 'fs-extra';
import { createSandbox, TestSandbox } from './test-utils';
import {
  parseSkillCli,
  parseSkillMetadata,
  getAllSkillsWithCli,
  getAllSkills,
  findSkillById,
  findSkillsByModule,
  validateCliCommand,
  getCliCommand,
  CliCommandConfig,
} from '../skill-cli-parser';

describe('SkillCliParser', () => {
  let sandbox: TestSandbox;
  let testDir: string;
  let frameworkRoot: string;

  beforeEach(async () => {
    sandbox = await createSandbox('skill-cli-parser-test');
    testDir = sandbox.path;
    frameworkRoot = testDir;
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('parseSkillCli', () => {
    it('should parse skill with CLI commands', async () => {
      const skillPath = path.join(testDir, 'test-skill.md');
      await fs.writeFile(
        skillPath,
        `---
id: test-skill
module: test-module
name: Test Skill
cli-commands:
  create:
    command: "test create"
    description: "Create a test"
    options:
      - "--name <name>: Name of the test"
      - "--type <type>: Type of test"
---

# Test Skill
`
      );

      const metadata = await parseSkillCli(skillPath);

      expect(metadata.id).toBe('test-skill');
      expect(metadata.module).toBe('test-module');
      expect(metadata.cliCommands).toBeDefined();
      expect(metadata.cliCommands?.create).toBeDefined();
      expect(metadata.cliCommands?.create.command).toBe('test create');
      expect(metadata.cliCommands?.create.description).toBe('Create a test');
      expect(metadata.cliCommands?.create.options).toHaveLength(2);
    });

    it('should parse skill without CLI commands', async () => {
      const skillPath = path.join(testDir, 'test-skill.md');
      await fs.writeFile(
        skillPath,
        `---
id: test-skill
module: test-module
name: Test Skill
---

# Test Skill
`
      );

      const metadata = await parseSkillCli(skillPath);

      expect(metadata.id).toBe('test-skill');
      expect(metadata.module).toBe('test-module');
      expect(metadata.cliCommands).toBeUndefined();
    });

    it('should throw error if skill is missing id', async () => {
      const skillPath = path.join(testDir, 'test-skill.md');
      await fs.writeFile(
        skillPath,
        `---
module: test-module
---

# Test Skill
`
      );

      await expect(parseSkillCli(skillPath)).rejects.toThrow('missing required field: id');
    });

    it('should throw error if skill is missing module', async () => {
      const skillPath = path.join(testDir, 'test-skill.md');
      await fs.writeFile(
        skillPath,
        `---
id: test-skill
---

# Test Skill
`
      );

      await expect(parseSkillCli(skillPath)).rejects.toThrow('missing required field: module');
    });

    it('should extract command with template and schema', async () => {
      const skillPath = path.join(testDir, 'test-skill.md');
      await fs.writeFile(
        skillPath,
        `---
id: planning-skill
module: planning
cli-commands:
  create:
    command: "planning create"
    description: "Create a plan"
    options:
      - "--name <name>: Plan name"
    template: "PLAN.md.template"
    schema: "plan.schema.json"
    rules: "plan-rules.ts"
---

# Planning Skill
`
      );

      const metadata = await parseSkillCli(skillPath);

      expect(metadata.cliCommands?.create.template).toBe('PLAN.md.template');
      expect(metadata.cliCommands?.create.schema).toBe('plan.schema.json');
      expect(metadata.cliCommands?.create.rules).toBe('plan-rules.ts');
    });
  });

  describe('parseSkillMetadata', () => {
    it('should parse full skill metadata', async () => {
      const skillPath = path.join(testDir, 'test-skill.md');
      await fs.writeFile(
        skillPath,
        `---
id: test-skill
module: test-module
name: Test Skill Name
description: A test skill for testing
cli-commands:
  validate:
    command: "test validate"
    description: "Validate a test"
    options:
      - "--path <path>: Path to validate"
---

# Test Skill
`
      );

      const metadata = await parseSkillMetadata(skillPath);

      expect(metadata.id).toBe('test-skill');
      expect(metadata.module).toBe('test-module');
      expect(metadata.name).toBe('Test Skill Name');
      expect(metadata.description).toBe('A test skill for testing');
      expect(metadata.filePath).toBe(skillPath);
      expect(metadata.cliCommands?.validate).toBeDefined();
    });

    it('should handle skill without optional fields', async () => {
      const skillPath = path.join(testDir, 'test-skill.md');
      await fs.writeFile(
        skillPath,
        `---
id: test-skill
module: test-module
---

# Test Skill
`
      );

      const metadata = await parseSkillMetadata(skillPath);

      expect(metadata.id).toBe('test-skill');
      expect(metadata.module).toBe('test-module');
      expect(metadata.name).toBeUndefined();
      expect(metadata.description).toBeUndefined();
      expect(metadata.cliCommands).toBeUndefined();
    });
  });

  describe('getAllSkillsWithCli', () => {
    it('should find all skills with CLI commands', async () => {
      // Create framework structure
      const coreSkillsDir = path.join(frameworkRoot, 'framework/core/skills/shared');
      await fs.ensureDir(coreSkillsDir);

      // Skill with CLI commands
      await fs.writeFile(
        path.join(coreSkillsDir, 'SKILL.md'),
        `---
id: shared-skill
module: core
cli-commands:
  test:
    command: "test cmd"
    description: "Test command"
    options: []
---
`
      );

      const modulesSkillsDir = path.join(
        frameworkRoot,
        'framework/modules/planning/skills/planning'
      );
      await fs.ensureDir(modulesSkillsDir);

      // Another skill with CLI commands
      await fs.writeFile(
        path.join(modulesSkillsDir, 'SKILL.md'),
        `---
id: planning-skill
module: planning
cli-commands:
  create:
    command: "planning create"
    description: "Create plan"
    options: []
---
`
      );

      const skills = await getAllSkillsWithCli(frameworkRoot);

      expect(skills).toHaveLength(2);
      expect(skills.map((s) => s.id)).toContain('shared-skill');
      expect(skills.map((s) => s.id)).toContain('planning-skill');
    });

    it('should exclude skills without CLI commands', async () => {
      const coreSkillsDir = path.join(frameworkRoot, 'framework/core/skills/shared');
      await fs.ensureDir(coreSkillsDir);

      // Skill with CLI commands
      await fs.writeFile(
        path.join(coreSkillsDir, 'SKILL.md'),
        `---
id: skill-with-cli
module: core
cli-commands:
  test:
    command: "test"
    description: "Test"
    options: []
---
`
      );

      const modulesSkillsDir = path.join(
        frameworkRoot,
        'framework/modules/planning/skills/planning'
      );
      await fs.ensureDir(modulesSkillsDir);

      // Skill without CLI commands
      await fs.writeFile(
        path.join(modulesSkillsDir, 'SKILL.md'),
        `---
id: skill-without-cli
module: planning
---
`
      );

      const skills = await getAllSkillsWithCli(frameworkRoot);

      expect(skills).toHaveLength(1);
      expect(skills[0].id).toBe('skill-with-cli');
    });

    it('should return empty array when no skills with CLI exist', async () => {
      const skills = await getAllSkillsWithCli(frameworkRoot);
      expect(skills).toHaveLength(0);
    });

    it('should handle invalid skills gracefully', async () => {
      const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

      const skillsDir = path.join(frameworkRoot, 'framework/core/skills/shared');
      await fs.ensureDir(skillsDir);

      // Invalid skill (missing id)
      await fs.writeFile(
        path.join(skillsDir, 'SKILL.md'),
        `---
module: core
---
`
      );

      const skills = await getAllSkillsWithCli(frameworkRoot);

      expect(skills).toHaveLength(0);
      expect(consoleSpy).toHaveBeenCalled();

      consoleSpy.mockRestore();
    });
  });

  describe('getAllSkills', () => {
    it('should return all skills including those without CLI commands', async () => {
      const coreSkillsDir = path.join(frameworkRoot, 'framework/core/skills/shared');
      await fs.ensureDir(coreSkillsDir);

      await fs.writeFile(
        path.join(coreSkillsDir, 'SKILL.md'),
        `---
id: skill-with-cli
module: core
cli-commands:
  test:
    command: "test"
    description: "Test"
    options: []
---
`
      );

      const modulesSkillsDir = path.join(
        frameworkRoot,
        'framework/modules/planning/skills/planning'
      );
      await fs.ensureDir(modulesSkillsDir);

      await fs.writeFile(
        path.join(modulesSkillsDir, 'SKILL.md'),
        `---
id: skill-without-cli
module: planning
---
`
      );

      const skills = await getAllSkills(frameworkRoot);

      expect(skills).toHaveLength(2);
      expect(skills.map((s) => s.id)).toContain('skill-with-cli');
      expect(skills.map((s) => s.id)).toContain('skill-without-cli');
    });
  });

  describe('findSkillById', () => {
    it('should find skill by ID', async () => {
      const skillsDir = path.join(frameworkRoot, 'framework/core/skills/shared');
      await fs.ensureDir(skillsDir);

      await fs.writeFile(
        path.join(skillsDir, 'SKILL.md'),
        `---
id: target-skill
module: core
name: Target Skill
---
`
      );

      const skill = await findSkillById(frameworkRoot, 'target-skill');

      expect(skill).not.toBeNull();
      expect(skill?.id).toBe('target-skill');
      expect(skill?.name).toBe('Target Skill');
    });

    it('should return null for non-existent skill', async () => {
      const skill = await findSkillById(frameworkRoot, 'non-existent');
      expect(skill).toBeNull();
    });
  });

  describe('findSkillsByModule', () => {
    it('should find skills by module name', async () => {
      const coreSkillsDir = path.join(frameworkRoot, 'framework/core/skills/shared');
      await fs.ensureDir(coreSkillsDir);

      await fs.writeFile(
        path.join(coreSkillsDir, 'SKILL.md'),
        `---
id: core-skill
module: core
---
`
      );

      const planningSkillsDir = path.join(
        frameworkRoot,
        'framework/modules/planning/skills/planning'
      );
      await fs.ensureDir(planningSkillsDir);

      await fs.writeFile(
        path.join(planningSkillsDir, 'SKILL.md'),
        `---
id: planning-skill-1
module: planning
---
`
      );

      const skills = await findSkillsByModule(frameworkRoot, 'planning');

      expect(skills).toHaveLength(1);
      expect(skills[0].id).toBe('planning-skill-1');
      expect(skills[0].module).toBe('planning');
    });

    it('should return empty array for module with no skills', async () => {
      const skills = await findSkillsByModule(frameworkRoot, 'non-existent-module');
      expect(skills).toHaveLength(0);
    });
  });

  describe('validateCliCommand', () => {
    it('should validate valid CLI command', () => {
      const command: CliCommandConfig = {
        command: 'test create',
        description: 'Create a test',
        options: ['--name <name>: Name option'],
      };

      expect(() => validateCliCommand(command)).not.toThrow();
      expect(validateCliCommand(command)).toBe(true);
    });

    it('should throw error for missing command', () => {
      const command = {
        description: 'Test description',
        options: [],
      } as CliCommandConfig;

      expect(() => validateCliCommand(command)).toThrow('missing required field: command');
    });

    it('should throw error for missing description', () => {
      const command = {
        command: 'test',
        options: [],
      } as CliCommandConfig;

      expect(() => validateCliCommand(command)).toThrow('missing required field: description');
    });

    it('should throw error for non-array options', () => {
      const command = {
        command: 'test',
        description: 'Test',
        options: 'not an array',
      } as any;

      expect(() => validateCliCommand(command)).toThrow('options must be an array');
    });

    it('should accept empty options array', () => {
      const command: CliCommandConfig = {
        command: 'test',
        description: 'Test description',
        options: [],
      };

      expect(() => validateCliCommand(command)).not.toThrow();
    });
  });

  describe('getCliCommand', () => {
    it('should get specific CLI command by name', async () => {
      const skillPath = path.join(testDir, 'test-skill.md');
      await fs.writeFile(
        skillPath,
        `---
id: test-skill
module: test
cli-commands:
  create:
    command: "test create"
    description: "Create command"
    options: []
  validate:
    command: "test validate"
    description: "Validate command"
    options: []
---
`
      );

      const command = await getCliCommand(skillPath, 'create');

      expect(command).not.toBeNull();
      expect(command?.command).toBe('test create');
      expect(command?.description).toBe('Create command');
    });

    it('should return null for non-existent command', async () => {
      const skillPath = path.join(testDir, 'test-skill.md');
      await fs.writeFile(
        skillPath,
        `---
id: test-skill
module: test
cli-commands:
  create:
    command: "test create"
    description: "Create command"
    options: []
---
`
      );

      const command = await getCliCommand(skillPath, 'non-existent');
      expect(command).toBeNull();
    });

    it('should return null for skill without CLI commands', async () => {
      const skillPath = path.join(testDir, 'test-skill.md');
      await fs.writeFile(
        skillPath,
        `---
id: test-skill
module: test
---
`
      );

      const command = await getCliCommand(skillPath, 'create');
      expect(command).toBeNull();
    });
  });

  describe('integration with real skill format', () => {
    it('should parse planning-phases skill format', async () => {
      const skillPath = path.join(testDir, 'planning-phases.md');
      await fs.writeFile(
        skillPath,
        `---
id: planning-phases
module: planning
name: managing-framework-phases
description: Enforce proper plan creation, structure, and lifecycle discipline for all planning tasks (3+ hours, multiple phases)
scope: generic
applicable-projects: any
capabilities-provided:
  - plan-creation
  - commit-discipline
  - plan-discipline
  - planning-workflow
cli-commands:
  create:
    command: "planning create-plan"
    description: "Create a new plan with auto-numbering and templates"
    options:
      - "--name <name>: Plan name in kebab-case (required)"
      - "--category <category>: Plan category (default: framework)"
      - "--dry-run: Preview without creating files"
      - "--path <path>: Project root path (default: current directory)"
    template: "PLAN.md.template"
    examples:
      - "agentic-framework planning create-plan --name my-feature --category backend"
      - "agentic-framework planning create-plan --name auth-refactor --dry-run"
  validate:
    command: "planning validate-plan"
    description: "Validate plan structure and content against schema and best practices"
    options:
      - "--path <path>: Path to plan file or folder (default: current directory)"
      - "--strict: Exit with error code on warnings (not just errors)"
    schema: "plan.schema.json"
    rules: "plan-rules.ts"
    examples:
      - "agentic-framework planning validate-plan --path ./ai/plans/framework/001-my-plan"
      - "agentic-framework planning validate-plan --path ./ai/plans --strict"
---

# Skill: Plan Discipline

Content here...
`
      );

      const metadata = await parseSkillMetadata(skillPath);

      expect(metadata.id).toBe('planning-phases');
      expect(metadata.module).toBe('planning');
      expect(metadata.name).toBe('managing-framework-phases');
      expect(metadata.cliCommands).toBeDefined();

      const createCmd = metadata.cliCommands?.create;
      expect(createCmd).toBeDefined();
      expect(createCmd?.command).toBe('planning create-plan');
      expect(createCmd?.options).toHaveLength(4);
      expect(createCmd?.template).toBe('PLAN.md.template');

      const validateCmd = metadata.cliCommands?.validate;
      expect(validateCmd).toBeDefined();
      expect(validateCmd?.command).toBe('planning validate-plan');
      expect(validateCmd?.schema).toBe('plan.schema.json');
      expect(validateCmd?.rules).toBe('plan-rules.ts');
    });
  });
});
