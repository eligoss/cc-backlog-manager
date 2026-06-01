import { Command, Option } from "commander";

/**
 * Command type - determines the command's behavior
 */
export type CommandType = "create" | "validate" | "sync" | "transform";

/**
 * Command option configuration
 */
export interface CommandOption {
  name: string;
  description: string;
  required?: boolean;
  default?: string;
  choices?: string[];
}

/**
 * Parsed command options from Commander.js
 */
export interface ParsedCommandOptions {
  [key: string]: string | boolean | string[] | undefined;
}

/**
 * Command configuration for factory
 */
export interface CommandConfig {
  name: string;
  description: string;
  type: CommandType;
  skill: string;
  options: CommandOption[];
  action?: (
    options: ParsedCommandOptions,
    command: Command,
  ) => void | Promise<void>;
}

/**
 * Create a Commander.js command from configuration
 * @param config - Command configuration
 * @returns Commander.js Command instance
 */
export function createSkillCommand(config: CommandConfig): Command {
  const command = new Command(config.name);

  // Set description
  command.description(config.description);

  // Add metadata for skill tracking
  command.setOptionValue("_skillId", config.skill);
  command.setOptionValue("_commandType", config.type);

  // Add options
  for (const opt of config.options) {
    addCommandOption(command, opt);
  }

  // Add action if provided
  if (config.action) {
    command.action(config.action);
  }

  return command;
}

/**
 * Add an option to a command
 */
function addCommandOption(command: Command, opt: CommandOption): void {
  // Build option flags
  let flags: string;

  // Add short flag if it makes sense (first letter of option name)
  const shortFlag = opt.name.charAt(0);
  flags = `-${shortFlag}, --${opt.name}`;

  // Add value placeholder if not a boolean
  if (opt.required !== undefined || opt.default !== undefined) {
    flags += ` <${opt.name}>`;
  }

  // Create option
  const option = new Option(flags, opt.description);

  // Add default value if provided
  if (opt.default !== undefined) {
    option.default(opt.default);
  }

  // Add choices if provided
  if (opt.choices && opt.choices.length > 0) {
    option.choices(opt.choices);
  }

  // Make required if specified
  if (opt.required) {
    option.makeOptionMandatory();
  }

  command.addOption(option);
}

/**
 * Create a 'create' command (for generating files from templates)
 */
export function createCreateCommand(
  name: string,
  description: string,
  skill: string,
  options: CommandOption[],
  action: (
    options: ParsedCommandOptions,
    command: Command,
  ) => void | Promise<void>,
): Command {
  return createSkillCommand({
    name,
    description,
    type: "create",
    skill,
    options,
    action,
  });
}

/**
 * Create a 'validate' command (for validating files)
 */
export function createValidateCommand(
  name: string,
  description: string,
  skill: string,
  options: CommandOption[],
  action: (
    options: ParsedCommandOptions,
    command: Command,
  ) => void | Promise<void>,
): Command {
  return createSkillCommand({
    name,
    description,
    type: "validate",
    skill,
    options,
    action,
  });
}

/**
 * Create a 'sync' command (for synchronizing data)
 */
export function createSyncCommand(
  name: string,
  description: string,
  skill: string,
  options: CommandOption[],
  action: (
    options: ParsedCommandOptions,
    command: Command,
  ) => void | Promise<void>,
): Command {
  return createSkillCommand({
    name,
    description,
    type: "sync",
    skill,
    options,
    action,
  });
}

/**
 * Create a 'transform' command (for transforming files)
 */
export function createTransformCommand(
  name: string,
  description: string,
  skill: string,
  options: CommandOption[],
  action: (
    options: ParsedCommandOptions,
    command: Command,
  ) => void | Promise<void>,
): Command {
  return createSkillCommand({
    name,
    description,
    type: "transform",
    skill,
    options,
    action,
  });
}

/**
 * Parse command options from CLI arguments
 * Useful for testing and programmatic command execution
 */
export function parseCommandOptions(
  command: Command,
  args: string[],
): ParsedCommandOptions {
  // Parse arguments
  command.parse(args, { from: "user" });

  // Return parsed options
  return command.opts();
}

/**
 * Get skill ID from a command
 */
export function getCommandSkillId(command: Command): string | undefined {
  return command.getOptionValue("_skillId");
}

/**
 * Get command type from a command
 */
export function getCommandType(command: Command): CommandType | undefined {
  return command.getOptionValue("_commandType");
}

/**
 * Validate command configuration
 */
export function validateCommandConfig(config: CommandConfig): boolean {
  if (!config.name) {
    throw new Error("Command configuration must have a name");
  }

  if (!config.description) {
    throw new Error("Command configuration must have a description");
  }

  if (!config.type) {
    throw new Error("Command configuration must have a type");
  }

  if (!config.skill) {
    throw new Error("Command configuration must have a skill");
  }

  if (!Array.isArray(config.options)) {
    throw new Error("Command configuration options must be an array");
  }

  // Validate each option
  for (const opt of config.options) {
    if (!opt.name) {
      throw new Error("Command option must have a name");
    }
    if (!opt.description) {
      throw new Error("Command option must have a description");
    }
  }

  return true;
}

/**
 * Create multiple commands from configurations
 */
export function createCommands(configs: CommandConfig[]): Command[] {
  return configs.map((config) => {
    validateCommandConfig(config);
    return createSkillCommand(config);
  });
}
