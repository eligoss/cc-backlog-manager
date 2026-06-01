/**
 * Tests for Jira prompts module
 *
 * Tests interactive prompts for Jira operations including:
 * - Sprint selection
 * - Milestone selection
 * - Confirmation dialogs
 * - Input validation
 * - Non-interactive mode handling
 */

import {
  promptForJiraSprintId,
  promptForMilestoneId,
  confirmSmartLookup,
  suggestMilestoneIdFromName,
  isInteractive,
} from '../jira-prompts';
import * as promptUtils from '../prompt-utils';

// Mock prompt-utils
jest.mock('../prompt-utils');

// Mock chalk to avoid color codes in tests
jest.mock('chalk');

describe('JiraPrompts', () => {
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(() => {
    jest.clearAllMocks();
    // Reset environment
    delete process.env.CI;
    // Suppress expected console.error calls from informational messages
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(() => {
    consoleErrorSpy.mockRestore();
  });

  describe('isInteractive', () => {
    it('should return false in CI environment', () => {
      process.env.CI = 'true';
      expect(isInteractive()).toBe(false);
    });

    it('should return true when TTY is available and not in CI', () => {
      delete process.env.CI;
      const originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = true;

      expect(isInteractive()).toBe(true);

      process.stdin.isTTY = originalIsTTY;
    });

    it('should return false when TTY is unavailable', () => {
      const originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = false;

      expect(isInteractive()).toBe(false);

      process.stdin.isTTY = originalIsTTY;
    });
  });

  describe('suggestMilestoneIdFromName', () => {
    it('should extract milestone ID from "Month Year" format', () => {
      expect(suggestMilestoneIdFromName('January 2026')).toBe('Jan2026');
      expect(suggestMilestoneIdFromName('November 2025')).toBe('Nov2025');
      expect(suggestMilestoneIdFromName('March 2024')).toBe('Mar2024');
    });

    it('should handle milestone names with parentheses', () => {
      expect(suggestMilestoneIdFromName('January 2026 (W51, W1, W3)')).toBe('Jan2026');
      expect(suggestMilestoneIdFromName('February 2025 (W5, W6)')).toBe('Feb2025');
    });

    it('should handle case-insensitive month names', () => {
      expect(suggestMilestoneIdFromName('JANUARY 2026')).toBe('Jan2026');
      expect(suggestMilestoneIdFromName('january 2026')).toBe('Jan2026');
    });

    it('should handle all month names', () => {
      expect(suggestMilestoneIdFromName('January 2026')).toBe('Jan2026');
      expect(suggestMilestoneIdFromName('February 2026')).toBe('Feb2026');
      expect(suggestMilestoneIdFromName('March 2026')).toBe('Mar2026');
      expect(suggestMilestoneIdFromName('April 2026')).toBe('Apr2026');
      expect(suggestMilestoneIdFromName('May 2026')).toBe('May2026');
      expect(suggestMilestoneIdFromName('June 2026')).toBe('Jun2026');
      expect(suggestMilestoneIdFromName('July 2026')).toBe('Jul2026');
      expect(suggestMilestoneIdFromName('August 2026')).toBe('Aug2026');
      expect(suggestMilestoneIdFromName('September 2026')).toBe('Sep2026');
      expect(suggestMilestoneIdFromName('October 2026')).toBe('Oct2026');
      expect(suggestMilestoneIdFromName('November 2026')).toBe('Nov2026');
      expect(suggestMilestoneIdFromName('December 2026')).toBe('Dec2026');
    });

    it('should return null for empty string', () => {
      expect(suggestMilestoneIdFromName('')).toBeNull();
    });

    it('should return null for invalid format', () => {
      expect(suggestMilestoneIdFromName('InvalidFormat')).toBeNull();
      expect(suggestMilestoneIdFromName('2026')).toBeNull();
      expect(suggestMilestoneIdFromName('UC2')).toBeNull();
    });

    it('should return null when month or year is missing', () => {
      expect(suggestMilestoneIdFromName('January')).toBeNull();
      expect(suggestMilestoneIdFromName('2026')).toBeNull();
    });
  });

  describe('promptForJiraSprintId', () => {
    it('should prompt for sprint ID and return user input', async () => {
      const originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = true;
      const mockPrompt = jest.mocked(promptUtils.prompt);
      mockPrompt.mockResolvedValue({ sprintId: '16786' });

      const result = await promptForJiraSprintId('APM-APP-2026-W1');

      expect(result).toBe('16786');
      expect(mockPrompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'input',
            name: 'sprintId',
            message: expect.stringContaining('APM-APP-2026-W1'),
          }),
        ])
      );

      process.stdin.isTTY = originalIsTTY;
    });

    it('should validate numeric sprint ID', async () => {
      const originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = true;
      let validator: ((input: string) => boolean | string) | undefined;
      const mockPrompt = jest.mocked(promptUtils.prompt);

      mockPrompt.mockImplementation((questions: any) => {
        validator = questions[0].validate;
        return Promise.resolve({ sprintId: '16786' });
      });

      await promptForJiraSprintId('APM-APP-2026-W1');

      expect(validator).toBeDefined();
      expect(validator!('16786')).toBe(true);
      expect(validator!('abc')).toMatch(/numeric/i);
      expect(validator!('')).toBe(true); // Empty is valid (skip)

      process.stdin.isTTY = originalIsTTY;
    });

    it('should return null when user skips (empty input)', async () => {
      const originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = true;
      const mockPrompt = jest.mocked(promptUtils.prompt);
      mockPrompt.mockResolvedValue({ sprintId: '' });

      const result = await promptForJiraSprintId('APM-APP-2026-W1');

      expect(result).toBeNull();

      process.stdin.isTTY = originalIsTTY;
    });

    it('should return null in dry-run mode', async () => {
      const mockPrompt = jest.mocked(promptUtils.prompt);
      const result = await promptForJiraSprintId('APM-APP-2026-W1', true);

      expect(result).toBeNull();
      expect(mockPrompt).not.toHaveBeenCalled();
    });

    it('should return null in non-interactive mode', async () => {
      const originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = false;
      const mockPrompt = jest.mocked(promptUtils.prompt);

      const result = await promptForJiraSprintId('APM-APP-2026-W1');

      expect(result).toBeNull();
      expect(mockPrompt).not.toHaveBeenCalled();

      process.stdin.isTTY = originalIsTTY;
    });
  });

  describe('promptForMilestoneId', () => {
    it('should prompt for milestone ID and return user input', async () => {
      const originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = true;
      const mockPrompt = jest.mocked(promptUtils.prompt);
      mockPrompt.mockResolvedValue({ milestoneId: 'Jan2026' });

      const result = await promptForMilestoneId('January 2026');

      expect(result).toBe('Jan2026');
      expect(mockPrompt).toHaveBeenCalled();

      process.stdin.isTTY = originalIsTTY;
    });

    it('should show suggestion in prompt when available', async () => {
      const originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = true;
      const mockPrompt = jest.mocked(promptUtils.prompt);
      mockPrompt.mockResolvedValue({ milestoneId: 'Jan2026' });

      await promptForMilestoneId('January 2026');

      expect(mockPrompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            message: expect.stringContaining('Jan2026'),
            default: 'Jan2026',
          }),
        ])
      );

      process.stdin.isTTY = originalIsTTY;
    });

    it('should return suggested value when user accepts default', async () => {
      const mockPrompt = jest.mocked(promptUtils.prompt);
      mockPrompt.mockResolvedValue({ milestoneId: '' });

      const result = await promptForMilestoneId('January 2026');

      // Empty input with suggestion should use suggestion
      expect(result).toBe('Jan2026');
    });

    it('should validate alphanumeric milestone ID', async () => {
      const originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = true;
      let validator: ((input: string) => boolean | string) | undefined;
      const mockPrompt = jest.mocked(promptUtils.prompt);

      mockPrompt.mockImplementation((questions: any) => {
        validator = questions[0].validate;
        return Promise.resolve({ milestoneId: 'Jan2026' });
      });

      await promptForMilestoneId('January 2026');

      expect(validator).toBeDefined();
      expect(validator!('Jan2026')).toBe(true);
      expect(validator!('UC2')).toBe(true);
      expect(validator!('Post-UC2')).toBe(true);
      expect(validator!('Post_UC2')).toBe(true);
      expect(validator!('invalid@id')).toMatch(/alphanumeric/i);
      expect(validator!('invalid id')).toMatch(/alphanumeric/i);
      expect(validator!('')).toBe(true); // Empty is valid with suggestion

      process.stdin.isTTY = originalIsTTY;
    });

    it('should return null when user skips (no suggestion)', async () => {
      const mockPrompt = jest.mocked(promptUtils.prompt);
      mockPrompt.mockResolvedValue({ milestoneId: '' });

      const result = await promptForMilestoneId('UC2');

      expect(result).toBeNull();
    });

    it('should return null in dry-run mode', async () => {
      const mockPrompt = jest.mocked(promptUtils.prompt);
      const result = await promptForMilestoneId('January 2026', true);

      expect(result).toBeNull();
      expect(mockPrompt).not.toHaveBeenCalled();
    });

    it('should return suggested value in dry-run mode', async () => {
      const mockPrompt = jest.mocked(promptUtils.prompt);
      const result = await promptForMilestoneId('January 2026', true);

      expect(result).toBeNull(); // Dry-run always returns null
    });

    it('should return suggestion in non-interactive mode if available', async () => {
      const originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = false;
      const mockPrompt = jest.mocked(promptUtils.prompt);

      const result = await promptForMilestoneId('January 2026');

      expect(result).toBe('Jan2026');
      expect(mockPrompt).not.toHaveBeenCalled();

      process.stdin.isTTY = originalIsTTY;
    });

    it('should return null in non-interactive mode without suggestion', async () => {
      const originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = false;
      const mockPrompt = jest.mocked(promptUtils.prompt);

      const result = await promptForMilestoneId('UC2');

      expect(result).toBeNull();
      expect(mockPrompt).not.toHaveBeenCalled();

      process.stdin.isTTY = originalIsTTY;
    });
  });

  describe('confirmSmartLookup', () => {
    it('should return true when user confirms', async () => {
      const originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = true;
      const mockPrompt = jest.mocked(promptUtils.prompt);
      mockPrompt.mockResolvedValue({ confirm: true });

      const result = await confirmSmartLookup(
        'sprint',
        'APM-APP-2026-W1',
        'APM-APP Sprint W1',
        'APM-APP-2026-W1'
      );

      expect(result).toBe(true);

      process.stdin.isTTY = originalIsTTY;
    });

    it('should return false when user declines', async () => {
      const originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = true;
      const mockPrompt = jest.mocked(promptUtils.prompt);
      mockPrompt.mockResolvedValue({ confirm: false });

      const result = await confirmSmartLookup(
        'sprint',
        'APM-APP-2026-W1',
        'APM-APP Sprint W1',
        'APM-APP-2026-W1-Renamed'
      );

      expect(result).toBe(false);

      process.stdin.isTTY = originalIsTTY;
    });

    it('should display lookup details in prompt', async () => {
      const originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = true;
      const mockPrompt = jest.mocked(promptUtils.prompt);
      mockPrompt.mockResolvedValue({ confirm: true });

      await confirmSmartLookup(
        'sprint',
        'APM-APP-2026-W1',
        'Old Name',
        'New Name'
      );

      expect(mockPrompt).toHaveBeenCalledWith(
        expect.arrayContaining([
          expect.objectContaining({
            type: 'confirm',
            name: 'confirm',
            message: expect.stringContaining('Old Name'),
          }),
        ])
      );

      process.stdin.isTTY = originalIsTTY;
    });

    it('should return true in dry-run mode', async () => {
      const mockPrompt = jest.mocked(promptUtils.prompt);
      const result = await confirmSmartLookup(
        'sprint',
        'APM-APP-2026-W1',
        'Old Name',
        'New Name',
        true
      );

      expect(result).toBe(true);
      expect(mockPrompt).not.toHaveBeenCalled();
    });

    it('should return false in non-interactive mode', async () => {
      const originalIsTTY = process.stdin.isTTY;
      process.stdin.isTTY = false;
      const mockPrompt = jest.mocked(promptUtils.prompt);

      const result = await confirmSmartLookup(
        'sprint',
        'APM-APP-2026-W1',
        'Old Name',
        'New Name'
      );

      expect(result).toBe(false);
      expect(mockPrompt).not.toHaveBeenCalled();

      process.stdin.isTTY = originalIsTTY;
    });
  });
});
