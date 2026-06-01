/**
 * Unit Tests for Skill CLI Parser
 *
 * Tests parsing of CLI commands from skill frontmatter.
 */

import fs from 'fs-extra';
import fg from 'fast-glob';
import {
  parseSkillCli,
  parseSkillMetadata,
  getAllSkillsWithCli,
  getAllSkills,
  findSkillById,
  findSkillsByModule,
  validateCliCommand,
  getCliCommand,
} from '../skill-cli-parser.js';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

// Mock fast-glob
jest.mock('fast-glob');
const mockedFg = fg as jest.MockedFunction<typeof fg>;

describe('parseSkillCli', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should parse skill with CLI commands', async () => {
    mockedFs.readFile.mockResolvedValue(`---
id: building-tickets
module: backlog
cli-commands:
  create:
    command: backlog create-ticket
    description: Create a new ticket
    options:
      - --type
      - --name
    template: TICKET.md.template
  validate:
    command: backlog validate
    description: Validate tickets
    options:
      - --verbose
---
# Building Tickets
` as any);

    const result = await parseSkillCli('/path/to/SKILL.md');

    expect(result.id).toBe('building-tickets');
    expect(result.module).toBe('backlog');
    expect(result.cliCommands).toBeDefined();
    expect(result.cliCommands!.create.command).toBe('backlog create-ticket');
    expect(result.cliCommands!.validate.command).toBe('backlog validate');
  });

  it('should parse skill without CLI commands', async () => {
    mockedFs.readFile.mockResolvedValue(`---
id: simple-skill
module: core
---
# Simple Skill
` as any);

    const result = await parseSkillCli('/path/to/SKILL.md');

    expect(result.id).toBe('simple-skill');
    expect(result.module).toBe('core');
    expect(result.cliCommands).toBeUndefined();
  });

  it('should throw error when id is missing', async () => {
    mockedFs.readFile.mockResolvedValue(`---
module: core
---
# Missing ID
` as any);

    await expect(parseSkillCli('/path/to/SKILL.md')).rejects.toThrow(
      'missing required field: id'
    );
  });

  it('should throw error when module is missing', async () => {
    mockedFs.readFile.mockResolvedValue(`---
id: test-skill
---
# Missing Module
` as any);

    await expect(parseSkillCli('/path/to/SKILL.md')).rejects.toThrow(
      'missing required field: module'
    );
  });
});

describe('parseSkillMetadata', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should parse full skill metadata', async () => {
    mockedFs.readFile.mockResolvedValue(`---
id: test-skill
module: core
name: Test Skill
description: A test skill for unit testing
cli-commands:
  test:
    command: test command
    description: Test command
    options: []
---
# Test Skill
` as any);

    const result = await parseSkillMetadata('/path/to/SKILL.md');

    expect(result.id).toBe('test-skill');
    expect(result.module).toBe('core');
    expect(result.name).toBe('Test Skill');
    expect(result.description).toBe('A test skill for unit testing');
    expect(result.filePath).toBe('/path/to/SKILL.md');
    expect(result.cliCommands).toBeDefined();
  });

  it('should include filePath', async () => {
    mockedFs.readFile.mockResolvedValue(`---
id: path-test
module: core
---
# Path Test
` as any);

    const result = await parseSkillMetadata('/custom/path/SKILL.md');

    expect(result.filePath).toBe('/custom/path/SKILL.md');
  });

  it('should throw error when id is missing', async () => {
    mockedFs.readFile.mockResolvedValue(`---
module: core
---
# Missing ID
` as any);

    await expect(parseSkillMetadata('/path/to/SKILL.md')).rejects.toThrow(
      'missing required field: id'
    );
  });
});

describe('getAllSkillsWithCli', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return skills with CLI commands only', async () => {
    mockedFg.mockResolvedValue([
      '/framework/modules/core/skills/skill1/SKILL.md',
      '/framework/modules/core/skills/skill2/SKILL.md',
    ]);

    mockedFs.readFile
      .mockResolvedValueOnce(`---
id: skill-with-cli
module: core
cli-commands:
  test:
    command: test
    description: Test
    options: []
---
` as any)
      .mockResolvedValueOnce(`---
id: skill-without-cli
module: core
---
` as any);

    const result = await getAllSkillsWithCli('/framework');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('skill-with-cli');
  });

  it('should return empty array when no skills have CLI commands', async () => {
    mockedFg.mockResolvedValue(['/framework/modules/core/skills/skill1/SKILL.md']);

    mockedFs.readFile.mockResolvedValue(`---
id: no-cli-skill
module: core
---
` as any);

    const result = await getAllSkillsWithCli('/framework');

    expect(result).toEqual([]);
  });

  it('should continue processing when a skill fails to parse', async () => {
    mockedFg.mockResolvedValue([
      '/framework/modules/core/skills/good/SKILL.md',
      '/framework/modules/core/skills/bad/SKILL.md',
    ]);

    const consoleSpy = jest.spyOn(console, 'warn').mockImplementation();

    mockedFs.readFile
      .mockResolvedValueOnce(`---
id: good-skill
module: core
cli-commands:
  test:
    command: test
    description: Test
    options: []
---
` as any)
      .mockRejectedValueOnce(new Error('Parse error'));

    const result = await getAllSkillsWithCli('/framework');

    expect(result).toHaveLength(1);
    expect(result[0].id).toBe('good-skill');
    expect(consoleSpy).toHaveBeenCalled();

    consoleSpy.mockRestore();
  });
});

describe('getAllSkills', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should return all skills', async () => {
    // findSkillFiles calls fg twice (once for each pattern)
    mockedFg
      .mockResolvedValueOnce(['/framework/modules/core/skills/skill1/SKILL.md'])
      .mockResolvedValueOnce(['/framework/modules/backlog/skills/skill2/SKILL.md']);

    mockedFs.readFile
      .mockResolvedValueOnce(`---
id: skill1
module: core
---
` as any)
      .mockResolvedValueOnce(`---
id: skill2
module: backlog
---
` as any);

    const result = await getAllSkills('/framework');

    expect(result).toHaveLength(2);
    expect(result.map(s => s.id)).toContain('skill1');
    expect(result.map(s => s.id)).toContain('skill2');
  });

  it('should return empty array when no skills found', async () => {
    // findSkillFiles calls fg twice (once for each pattern)
    mockedFg
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await getAllSkills('/framework');

    expect(result).toEqual([]);
  });
});

describe('findSkillById', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should find skill by ID', async () => {
    // findSkillFiles calls fg twice (once for each pattern)
    mockedFg
      .mockResolvedValueOnce(['/framework/modules/core/skills/target/SKILL.md'])
      .mockResolvedValueOnce([]);

    mockedFs.readFile.mockResolvedValueOnce(`---
id: target-skill
module: core
---
` as any);

    const result = await findSkillById('/framework', 'target-skill');

    expect(result).not.toBeNull();
    expect(result!.id).toBe('target-skill');
  });

  it('should return null when skill not found', async () => {
    // findSkillFiles calls fg twice (once for each pattern)
    mockedFg
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([]);

    const result = await findSkillById('/framework', 'nonexistent');

    expect(result).toBeNull();
  });
});

describe('findSkillsByModule', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should find skills by module', async () => {
    // findSkillFiles calls fg twice (once for each pattern)
    mockedFg
      .mockResolvedValueOnce(['/framework/modules/core/skills/s1/SKILL.md'])
      .mockResolvedValueOnce([
        '/framework/modules/backlog/skills/s2/SKILL.md',
        '/framework/modules/core/skills/s3/SKILL.md',
      ]);

    mockedFs.readFile
      .mockResolvedValueOnce(`---
id: s1
module: core
---
` as any)
      .mockResolvedValueOnce(`---
id: s2
module: backlog
---
` as any)
      .mockResolvedValueOnce(`---
id: s3
module: core
---
` as any);

    const result = await findSkillsByModule('/framework', 'core');

    expect(result).toHaveLength(2);
    expect(result.map(s => s.id)).toContain('s1');
    expect(result.map(s => s.id)).toContain('s3');
  });

  it('should return empty array when no skills match module', async () => {
    // findSkillFiles calls fg twice (once for each pattern)
    mockedFg
      .mockResolvedValueOnce(['/framework/modules/core/skills/s1/SKILL.md'])
      .mockResolvedValueOnce([]);

    mockedFs.readFile.mockResolvedValueOnce(`---
id: s1
module: core
---
` as any);

    const result = await findSkillsByModule('/framework', 'nonexistent');

    expect(result).toEqual([]);
  });
});

describe('validateCliCommand', () => {
  it('should validate valid CLI command', () => {
    const config = {
      command: 'test command',
      description: 'Test description',
      options: ['--verbose'],
    };

    expect(validateCliCommand(config)).toBe(true);
  });

  it('should throw error when command is missing', () => {
    const config = {
      command: '',
      description: 'Test',
      options: [],
    };

    expect(() => validateCliCommand(config)).toThrow('missing required field: command');
  });

  it('should throw error when description is missing', () => {
    const config = {
      command: 'test',
      description: '',
      options: [],
    };

    expect(() => validateCliCommand(config)).toThrow('missing required field: description');
  });

  it('should throw error when options is not an array', () => {
    const config = {
      command: 'test',
      description: 'Test',
      options: 'not-an-array' as any,
    };

    expect(() => validateCliCommand(config)).toThrow('options must be an array');
  });
});

describe('getCliCommand', () => {
  beforeEach(() => {
    jest.resetAllMocks();
  });

  it('should get CLI command by name', async () => {
    mockedFs.readFile.mockResolvedValue(`---
id: test-skill
module: core
cli-commands:
  create:
    command: test create
    description: Create something
    options:
      - --name
  validate:
    command: test validate
    description: Validate something
    options: []
---
` as any);

    const result = await getCliCommand('/path/to/SKILL.md', 'create');

    expect(result).not.toBeNull();
    expect(result!.command).toBe('test create');
    expect(result!.description).toBe('Create something');
  });

  it('should return null when command not found', async () => {
    mockedFs.readFile.mockResolvedValue(`---
id: test-skill
module: core
cli-commands:
  create:
    command: test create
    description: Create
    options: []
---
` as any);

    const result = await getCliCommand('/path/to/SKILL.md', 'nonexistent');

    expect(result).toBeNull();
  });

  it('should return null when skill has no CLI commands', async () => {
    mockedFs.readFile.mockResolvedValue(`---
id: test-skill
module: core
---
` as any);

    const result = await getCliCommand('/path/to/SKILL.md', 'any');

    expect(result).toBeNull();
  });
});
