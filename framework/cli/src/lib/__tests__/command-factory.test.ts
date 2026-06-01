import { Command } from 'commander';
import {
  createSkillCommand,
  createCreateCommand,
  createValidateCommand,
  createSyncCommand,
  createTransformCommand,
  parseCommandOptions,
  getCommandSkillId,
  getCommandType,
  validateCommandConfig,
  createCommands,
  CommandConfig,
  CommandOption,
} from '../command-factory';

describe('CommandFactory', () => {
  describe('createSkillCommand', () => {
    it('should create command with name and description', () => {
      const config: CommandConfig = {
        name: 'test-command',
        description: 'Test command description',
        type: 'create',
        skill: 'test-skill',
        options: [],
      };

      const command = createSkillCommand(config);

      expect(command.name()).toBe('test-command');
      expect(command.description()).toBe('Test command description');
    });

    it('should add skill metadata to command', () => {
      const config: CommandConfig = {
        name: 'test-command',
        description: 'Test description',
        type: 'create',
        skill: 'test-skill-id',
        options: [],
      };

      const command = createSkillCommand(config);

      expect(getCommandSkillId(command)).toBe('test-skill-id');
      expect(getCommandType(command)).toBe('create');
    });

    it('should add options to command', () => {
      const options: CommandOption[] = [
        { name: 'name', description: 'Name option', required: true },
        { name: 'type', description: 'Type option', default: 'default' },
      ];

      const config: CommandConfig = {
        name: 'test-command',
        description: 'Test description',
        type: 'create',
        skill: 'test-skill',
        options,
      };

      const command = createSkillCommand(config);

      // Check that options were added
      const opts = command.options;
      expect(opts.length).toBeGreaterThan(0);
    });

    it('should handle command with action', () => {
      const mockAction = jest.fn();

      const config: CommandConfig = {
        name: 'test-command',
        description: 'Test description',
        type: 'create',
        skill: 'test-skill',
        options: [],
        action: mockAction,
      };

      const command = createSkillCommand(config);

      expect(command._actionHandler).toBeDefined();
    });

    it('should create command with required option', () => {
      const config: CommandConfig = {
        name: 'test-command',
        description: 'Test description',
        type: 'create',
        skill: 'test-skill',
        options: [
          {
            name: 'name',
            description: 'Required name option',
            required: true,
          },
        ],
      };

      const command = createSkillCommand(config);

      const nameOption = command.options.find((opt) => opt.long === '--name');
      expect(nameOption).toBeDefined();
      expect(nameOption?.required).toBe(true);
    });

    it('should create command with default value', () => {
      const config: CommandConfig = {
        name: 'test-command',
        description: 'Test description',
        type: 'create',
        skill: 'test-skill',
        options: [
          {
            name: 'category',
            description: 'Category option',
            default: 'framework',
          },
        ],
      };

      const command = createSkillCommand(config);

      const categoryOption = command.options.find((opt) => opt.long === '--category');
      expect(categoryOption).toBeDefined();
      expect(categoryOption?.defaultValue).toBe('framework');
    });

    it('should create command with choices', () => {
      const config: CommandConfig = {
        name: 'test-command',
        description: 'Test description',
        type: 'create',
        skill: 'test-skill',
        options: [
          {
            name: 'status',
            description: 'Status option',
            choices: ['active', 'inactive', 'pending'],
          },
        ],
      };

      const command = createSkillCommand(config);

      const statusOption = command.options.find((opt) => opt.long === '--status');
      expect(statusOption).toBeDefined();
      expect(statusOption?.argChoices).toEqual(['active', 'inactive', 'pending']);
    });

    it('should create short flags based on option name', () => {
      const config: CommandConfig = {
        name: 'test-command',
        description: 'Test description',
        type: 'create',
        skill: 'test-skill',
        options: [
          { name: 'name', description: 'Name option' },
          { name: 'type', description: 'Type option' },
        ],
      };

      const command = createSkillCommand(config);

      const nameOption = command.options.find((opt) => opt.long === '--name');
      const typeOption = command.options.find((opt) => opt.long === '--type');

      expect(nameOption?.short).toBe('-n');
      expect(typeOption?.short).toBe('-t');
    });
  });

  describe('createCreateCommand', () => {
    it('should create a create-type command', () => {
      const mockAction = jest.fn();
      const command = createCreateCommand(
        'create-plan',
        'Create a new plan',
        'planning-skill',
        [{ name: 'name', description: 'Plan name', required: true }],
        mockAction
      );

      expect(command.name()).toBe('create-plan');
      expect(command.description()).toBe('Create a new plan');
      expect(getCommandType(command)).toBe('create');
      expect(getCommandSkillId(command)).toBe('planning-skill');
    });
  });

  describe('createValidateCommand', () => {
    it('should create a validate-type command', () => {
      const mockAction = jest.fn();
      const command = createValidateCommand(
        'validate-plan',
        'Validate plan structure',
        'planning-skill',
        [{ name: 'path', description: 'Path to validate' }],
        mockAction
      );

      expect(command.name()).toBe('validate-plan');
      expect(getCommandType(command)).toBe('validate');
    });
  });

  describe('createSyncCommand', () => {
    it('should create a sync-type command', () => {
      const mockAction = jest.fn();
      const command = createSyncCommand(
        'sync-data',
        'Sync data',
        'sync-skill',
        [],
        mockAction
      );

      expect(command.name()).toBe('sync-data');
      expect(getCommandType(command)).toBe('sync');
    });
  });

  describe('createTransformCommand', () => {
    it('should create a transform-type command', () => {
      const mockAction = jest.fn();
      const command = createTransformCommand(
        'transform-file',
        'Transform a file',
        'transform-skill',
        [],
        mockAction
      );

      expect(command.name()).toBe('transform-file');
      expect(getCommandType(command)).toBe('transform');
    });
  });

  describe('parseCommandOptions', () => {
    it('should parse command options from arguments', () => {
      const config: CommandConfig = {
        name: 'test',
        description: 'Test',
        type: 'create',
        skill: 'test-skill',
        options: [
          { name: 'name', description: 'Name option', required: true }, // Add required to ensure it's not a boolean
          { name: 'type', description: 'Type option', default: 'default' },
        ],
      };

      const command = createSkillCommand(config);
      const args = ['--name', 'test-name', '--type', 'custom'];

      const options = parseCommandOptions(command, args);

      expect(options.name).toBe('test-name');
      expect(options.type).toBe('custom');
    });

    it('should use default values when option not provided', () => {
      const config: CommandConfig = {
        name: 'test',
        description: 'Test',
        type: 'create',
        skill: 'test-skill',
        options: [
          { name: 'category', description: 'Category', default: 'framework' },
        ],
      };

      const command = createSkillCommand(config);
      const args: string[] = [];

      const options = parseCommandOptions(command, args);

      expect(options.category).toBe('framework');
    });
  });

  describe('getCommandSkillId', () => {
    it('should return skill ID from command', () => {
      const config: CommandConfig = {
        name: 'test',
        description: 'Test',
        type: 'create',
        skill: 'my-skill-id',
        options: [],
      };

      const command = createSkillCommand(config);

      expect(getCommandSkillId(command)).toBe('my-skill-id');
    });

    it('should return undefined for command without skill ID', () => {
      const command = new Command('test');
      expect(getCommandSkillId(command)).toBeUndefined();
    });
  });

  describe('getCommandType', () => {
    it('should return command type', () => {
      const config: CommandConfig = {
        name: 'test',
        description: 'Test',
        type: 'validate',
        skill: 'test-skill',
        options: [],
      };

      const command = createSkillCommand(config);

      expect(getCommandType(command)).toBe('validate');
    });

    it('should return undefined for command without type', () => {
      const command = new Command('test');
      expect(getCommandType(command)).toBeUndefined();
    });
  });

  describe('validateCommandConfig', () => {
    it('should validate valid command config', () => {
      const config: CommandConfig = {
        name: 'test',
        description: 'Test description',
        type: 'create',
        skill: 'test-skill',
        options: [{ name: 'opt', description: 'Option' }],
      };

      expect(() => validateCommandConfig(config)).not.toThrow();
      expect(validateCommandConfig(config)).toBe(true);
    });

    it('should throw error for missing name', () => {
      const config = {
        description: 'Test',
        type: 'create',
        skill: 'test',
        options: [],
      } as CommandConfig;

      expect(() => validateCommandConfig(config)).toThrow('must have a name');
    });

    it('should throw error for missing description', () => {
      const config = {
        name: 'test',
        type: 'create',
        skill: 'test',
        options: [],
      } as CommandConfig;

      expect(() => validateCommandConfig(config)).toThrow('must have a description');
    });

    it('should throw error for missing type', () => {
      const config = {
        name: 'test',
        description: 'Test',
        skill: 'test',
        options: [],
      } as CommandConfig;

      expect(() => validateCommandConfig(config)).toThrow('must have a type');
    });

    it('should throw error for missing skill', () => {
      const config = {
        name: 'test',
        description: 'Test',
        type: 'create',
        options: [],
      } as CommandConfig;

      expect(() => validateCommandConfig(config)).toThrow('must have a skill');
    });

    it('should throw error for non-array options', () => {
      const config = {
        name: 'test',
        description: 'Test',
        type: 'create',
        skill: 'test',
        options: 'not an array',
      } as any;

      expect(() => validateCommandConfig(config)).toThrow('options must be an array');
    });

    it('should throw error for option without name', () => {
      const config: CommandConfig = {
        name: 'test',
        description: 'Test',
        type: 'create',
        skill: 'test',
        options: [{ description: 'Option' } as CommandOption],
      };

      expect(() => validateCommandConfig(config)).toThrow('option must have a name');
    });

    it('should throw error for option without description', () => {
      const config: CommandConfig = {
        name: 'test',
        description: 'Test',
        type: 'create',
        skill: 'test',
        options: [{ name: 'opt' } as CommandOption],
      };

      expect(() => validateCommandConfig(config)).toThrow('option must have a description');
    });
  });

  describe('createCommands', () => {
    it('should create multiple commands from configs', () => {
      const configs: CommandConfig[] = [
        {
          name: 'cmd1',
          description: 'Command 1',
          type: 'create',
          skill: 'skill1',
          options: [],
        },
        {
          name: 'cmd2',
          description: 'Command 2',
          type: 'validate',
          skill: 'skill2',
          options: [],
        },
      ];

      const commands = createCommands(configs);

      expect(commands).toHaveLength(2);
      expect(commands[0].name()).toBe('cmd1');
      expect(commands[1].name()).toBe('cmd2');
    });

    it('should validate all configs before creating commands', () => {
      const configs: CommandConfig[] = [
        {
          name: 'cmd1',
          description: 'Command 1',
          type: 'create',
          skill: 'skill1',
          options: [],
        },
        {
          name: 'cmd2',
          // missing description
          type: 'validate',
          skill: 'skill2',
          options: [],
        } as CommandConfig,
      ];

      expect(() => createCommands(configs)).toThrow();
    });
  });

  describe('integration: command creation and invocation', () => {
    it('should create and invoke command with action', async () => {
      const mockAction = jest.fn();

      const config: CommandConfig = {
        name: 'create-plan',
        description: 'Create a new plan',
        type: 'create',
        skill: 'planning-skill',
        options: [
          { name: 'name', description: 'Plan name', required: true },
          { name: 'category', description: 'Plan category', default: 'framework' },
        ],
        action: mockAction,
      };

      const command = createSkillCommand(config);

      // Simulate command invocation
      await command.parseAsync(['--name', 'my-plan'], { from: 'user' });

      expect(mockAction).toHaveBeenCalled();
      const callArgs = mockAction.mock.calls[0][0];
      expect(callArgs.name).toBe('my-plan');
      expect(callArgs.category).toBe('framework');
    });

    it('should create planning-discipline style commands', () => {
      const createConfig: CommandConfig = {
        name: 'planning create-plan',
        description: 'Create a new plan with auto-numbering and templates',
        type: 'create',
        skill: 'planning-discipline',
        options: [
          { name: 'name', description: 'Plan name in kebab-case', required: true },
          { name: 'category', description: 'Plan category', default: 'framework' },
          { name: 'dry-run', description: 'Preview without creating files' },
          { name: 'path', description: 'Project root path', default: '.' },
        ],
      };

      const validateConfig: CommandConfig = {
        name: 'planning validate-plan',
        description: 'Validate plan structure and content against schema and best practices',
        type: 'validate',
        skill: 'planning-discipline',
        options: [
          { name: 'path', description: 'Path to plan file or folder', default: '.' },
          { name: 'strict', description: 'Exit with error code on warnings' },
        ],
      };

      const createCmd = createSkillCommand(createConfig);
      const validateCmd = createSkillCommand(validateConfig);

      expect(createCmd.name()).toBe('planning create-plan');
      expect(validateCmd.name()).toBe('planning validate-plan');

      expect(getCommandSkillId(createCmd)).toBe('planning-discipline');
      expect(getCommandSkillId(validateCmd)).toBe('planning-discipline');

      expect(getCommandType(createCmd)).toBe('create');
      expect(getCommandType(validateCmd)).toBe('validate');

      // Check options
      expect(createCmd.options.length).toBeGreaterThan(0);
      expect(validateCmd.options.length).toBeGreaterThan(0);

      const nameOption = createCmd.options.find((opt) => opt.long === '--name');
      expect(nameOption?.required).toBe(true);

      const categoryOption = createCmd.options.find((opt) => opt.long === '--category');
      expect(categoryOption?.defaultValue).toBe('framework');
    });

    it('should handle command with choices validation', () => {
      const config: CommandConfig = {
        name: 'test',
        description: 'Test',
        type: 'create',
        skill: 'test-skill',
        options: [
          {
            name: 'status',
            description: 'Status',
            choices: ['planning', 'in-progress', 'completed'],
          },
        ],
      };

      const command = createSkillCommand(config);
      const statusOption = command.options.find((opt) => opt.long === '--status');

      expect(statusOption?.argChoices).toEqual(['planning', 'in-progress', 'completed']);
    });
  });
});
