/**
 * E2E Test: CLI Command Registration and Help Output
 *
 * Tests that all CLI commands are properly registered and respond to --help
 */

import { Command } from 'commander';
import { createImportJiraCommand } from '../../commands/backlog/import-jira.js';
import { createUpdateFieldsCommand } from '../../commands/backlog/update-fields.js';
import { createValidateCommand } from '../../commands/backlog/validate.js';
import { createMigrateMilestonesCommand } from '../../commands/backlog/migrate-milestones.js';
import { createCreatePageCommand } from '../../commands/confluence/create-page.js';
import { createFetchPageCommand } from '../../commands/confluence/fetch-page.js';
import { createImportReportsCommand } from '../../commands/confluence/import-reports.js';
import { createCreatePlanCommand } from '../../commands/planning/create-plan.js';

describe('E2E: CLI Commands', () => {
  describe('Command Registration', () => {
    it('should register backlog:import command', () => {
      const command = createImportJiraCommand();
      expect(command).toBeInstanceOf(Command);
      expect(command.name()).toBe('import');
    });

    it('should register backlog:update-fields command', () => {
      const command = createUpdateFieldsCommand();
      expect(command).toBeInstanceOf(Command);
      expect(command.name()).toBe('update-fields');
    });

    it('should register backlog:validate command', () => {
      const command = createValidateCommand();
      expect(command).toBeInstanceOf(Command);
      expect(command.name()).toBe('validate');
    });

    it('should register backlog:migrate-milestones command', () => {
      const command = createMigrateMilestonesCommand();
      expect(command).toBeInstanceOf(Command);
      expect(command.name()).toBe('migrate-milestones');
    });

    it('should register confluence:create-page command', () => {
      const command = createCreatePageCommand();
      expect(command).toBeInstanceOf(Command);
      expect(command.name()).toBe('create-page');
    });

    it('should register confluence:fetch-page command', () => {
      const command = createFetchPageCommand();
      expect(command).toBeInstanceOf(Command);
      expect(command.name()).toBe('fetch-page');
    });

    it('should register confluence:import-reports command', () => {
      const command = createImportReportsCommand();
      expect(command).toBeInstanceOf(Command);
      expect(command.name()).toBe('import-reports');
    });

    it('should register planning:create-plan command', () => {
      const command = createCreatePlanCommand();
      expect(command).toBeInstanceOf(Command);
      expect(command.name()).toBe('create-plan');
    });
  });

  describe('Command Help Output', () => {
    it('should display help for backlog:import command', () => {
      const command = createImportJiraCommand();
      const helpOutput = command.helpInformation();
      expect(helpOutput).toContain('import');
      expect(helpOutput).toContain('Import Jira tickets');
    });

    it('should display help for confluence:create-page command', () => {
      const command = createCreatePageCommand();
      const helpOutput = command.helpInformation();
      expect(helpOutput).toContain('create-page');
    });

    it('should display help for planning:create-plan command', () => {
      const command = createCreatePlanCommand();
      const helpOutput = command.helpInformation();
      expect(helpOutput).toContain('create-plan');
      expect(helpOutput).toContain('--name');
    });
  });

  describe('Command Options', () => {
    it('should have required options for backlog:import', () => {
      const command = createImportJiraCommand();
      const options = command.options;

      const skipOption = options.find(opt => opt.long === '--skip');
      const dryRunOption = options.find(opt => opt.long === '--dry-run');
      const verboseOption = options.find(opt => opt.long === '--verbose');
      const pathOption = options.find(opt => opt.long === '--path');

      expect(skipOption).toBeDefined();
      expect(dryRunOption).toBeDefined();
      expect(verboseOption).toBeDefined();
      expect(pathOption).toBeDefined();
    });

    it('should have required options for planning:create-plan', () => {
      const command = createCreatePlanCommand();
      const options = command.options;

      const nameOption = options.find(opt => opt.long === '--name');
      const categoryOption = options.find(opt => opt.long === '--category');
      const dryRunOption = options.find(opt => opt.long === '--dry-run');

      expect(nameOption).toBeDefined();
      expect(categoryOption).toBeDefined();
      expect(dryRunOption).toBeDefined();
    });

    it('should have required options for confluence:create-page', () => {
      const command = createCreatePageCommand();
      const options = command.options;

      const fileOption = options.find(opt => opt.long === '--file');
      const spaceOption = options.find(opt => opt.long === '--space');

      expect(fileOption).toBeDefined();
      expect(spaceOption).toBeDefined();
    });
  });

  describe('Error Handling', () => {
    it('should handle missing required arguments gracefully', async () => {
      const command = createImportJiraCommand();

      // Commander will throw when required arguments are missing
      // We test that the command structure is set up correctly
      expect(command.registeredArguments).toHaveLength(1);
      expect(command.registeredArguments[0].required).toBe(true);
      expect(command.registeredArguments[0].name()).toBe('csv-file');
    });

    it('should validate command argument types', () => {
      const importCommand = createImportJiraCommand();
      expect(importCommand.registeredArguments[0].name()).toBe('csv-file');

      const createPlanCommand = createCreatePlanCommand();
      expect(createPlanCommand.registeredArguments).toHaveLength(0); // Uses options instead
    });
  });
});
