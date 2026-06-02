/**
 * CLI Instrumentation Tests
 * Unit tests for CLI command instrumentation helpers
 */

import { getTelemetry } from '../telemetry-manager';
import {
  recordCLICommand,
  withCLITelemetry,
  recordSyncCommand,
  recordValidateCommand,
  recordInitCommand,
} from '../instrumentation/cli-instrumentation';
import type { CLIEvent } from '../types';

// Mock telemetry manager
jest.mock('../telemetry-manager');

describe('cli-instrumentation', () => {
  let mockTelemetry: {
    isInstrumentationEnabled: jest.Mock;
    recordEvent: jest.Mock;
  };

  beforeEach(() => {
    jest.clearAllMocks();

    mockTelemetry = {
      isInstrumentationEnabled: jest.fn(),
      recordEvent: jest.fn().mockResolvedValue(undefined),
    };

    (getTelemetry as jest.Mock).mockReturnValue(mockTelemetry);
  });

  describe('recordCLICommand', () => {
    it('should record CLI command with all parameters', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordCLICommand(
        'sync',
        'skills',
        { force: true, verbose: false },
        { skills_synced: 10, errors: 0 },
        150,
        true
      );

      expect(mockTelemetry.isInstrumentationEnabled).toHaveBeenCalledWith('cli');
      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent).toMatchObject({
        event_type: 'cli',
        operation: 'sync_skills',
        command: 'sync',
        subcommand: 'skills',
        options: { force: true, verbose: false },
        result: { skills_synced: 10, errors: 0 },
        success: true,
        duration_ms: 150,
      });
    });

    it('should record command without subcommand', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordCLICommand(
        'validate',
        undefined,
        { strict: true },
        { valid: true },
        100,
        true
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.operation).toBe('validate');
      expect(recordedEvent.command).toBe('validate');
      expect(recordedEvent.subcommand).toBeUndefined();
    });

    it('should record command with subcommand', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordCLICommand(
        'agent',
        'list',
        {},
        {},
        80,
        true
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.operation).toBe('agent_list');
      expect(recordedEvent.command).toBe('agent');
      expect(recordedEvent.subcommand).toBe('list');
    });

    it('should record command with error', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const testError = new Error('Test error');
      testError.stack = 'Error stack trace';

      await recordCLICommand(
        'sync',
        undefined,
        {},
        undefined,
        50,
        false,
        testError
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.success).toBe(false);
      expect(recordedEvent.error).toEqual({
        message: 'Test error',
        stack: 'Error stack trace',
      });
    });

    it('should record command with error and stack trace', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const testError = new Error('Simple error');

      await recordCLICommand(
        'validate',
        undefined,
        {},
        undefined,
        30,
        false,
        testError
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.error?.message).toBe('Simple error');
      expect(recordedEvent.error?.stack).toBeDefined();
      expect(recordedEvent.success).toBe(false);
    });

    it('should not record event when instrumentation is disabled', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(false);

      await recordCLICommand(
        'sync',
        undefined,
        {},
        {},
        100,
        true
      );

      expect(mockTelemetry.isInstrumentationEnabled).toHaveBeenCalledWith('cli');
      expect(mockTelemetry.recordEvent).not.toHaveBeenCalled();
    });

    it('should handle empty options', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordCLICommand(
        'init',
        undefined,
        {},
        { success: true },
        200,
        true
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.options).toEqual({});
    });

    it('should handle undefined result', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordCLICommand(
        'validate',
        undefined,
        { strict: true },
        undefined,
        100,
        true
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.result).toBeUndefined();
    });

    it('should handle complex options', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordCLICommand(
        'init',
        undefined,
        {
          project: 'test-project',
          modules: ['core', 'planning'],
          force: true,
          verbose: 2,
        },
        {},
        300,
        true
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.options).toEqual({
        project: 'test-project',
        modules: ['core', 'planning'],
        force: true,
        verbose: 2,
      });
    });

    it('should handle complex result data', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordCLICommand(
        'sync',
        undefined,
        {},
        {
          skills_synced: 15,
          agents_synced: 10,
          errors: 2,
          warnings: ['Warning 1', 'Warning 2'],
        },
        250,
        false
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.result).toEqual({
        skills_synced: 15,
        agents_synced: 10,
        errors: 2,
        warnings: ['Warning 1', 'Warning 2'],
      });
    });
  });

  describe('withCLITelemetry', () => {
    it('should execute function and record success', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const mockFn = jest.fn().mockResolvedValue({ data: 'success' });

      const result = await withCLITelemetry(
        'sync',
        undefined,
        { force: true },
        mockFn
      );

      expect(result).toEqual({ data: 'success' });
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);
      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.success).toBe(true);
      expect(recordedEvent.result).toEqual({ data: 'success' });
    });

    it('should execute function and record error', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const testError = new Error('Function failed');
      const mockFn = jest.fn().mockRejectedValue(testError);

      await expect(
        withCLITelemetry(
          'validate',
          undefined,
          {},
          mockFn
        )
      ).rejects.toThrow('Function failed');

      expect(mockFn).toHaveBeenCalledTimes(1);

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);
      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.success).toBe(false);
      expect(recordedEvent.error).toEqual({
        message: 'Function failed',
        stack: testError.stack,
      });
    });

    it('should calculate duration correctly', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const mockFn = jest.fn().mockImplementation(async () => {
        await new Promise(resolve => setTimeout(resolve, 100));
        return { done: true };
      });

      await withCLITelemetry(
        'sync',
        undefined,
        {},
        mockFn
      );

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      // Allow small tolerance for timer variability
      expect(recordedEvent.duration_ms).toBeGreaterThanOrEqual(95);
    });

    it('should handle function returning undefined', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const mockFn = jest.fn().mockResolvedValue(undefined);

      const result = await withCLITelemetry(
        'validate',
        undefined,
        {},
        mockFn
      );

      expect(result).toBeUndefined();

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.result).toBeUndefined();
    });

    it('should handle function returning primitive values', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const mockFn = jest.fn().mockResolvedValue('string result');

      const result = await withCLITelemetry(
        'validate',
        undefined,
        {},
        mockFn
      );

      expect(result).toBe('string result');

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.result).toBeUndefined();
    });

    it('should handle function returning number', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const mockFn = jest.fn().mockResolvedValue(42);

      const result = await withCLITelemetry(
        'validate',
        undefined,
        {},
        mockFn
      );

      expect(result).toBe(42);

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.result).toBeUndefined();
    });

    it('should handle function returning array', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const mockFn = jest.fn().mockResolvedValue(['item1', 'item2']);

      const result = await withCLITelemetry(
        'validate',
        undefined,
        {},
        mockFn
      );

      expect(result).toEqual(['item1', 'item2']);

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      // Arrays are objects, so should be recorded
      expect(recordedEvent.result).toEqual(['item1', 'item2']);
    });

    it('should silently handle telemetry recording errors', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);
      mockTelemetry.recordEvent.mockRejectedValue(new Error('Telemetry failed'));

      const mockFn = jest.fn().mockResolvedValue({ data: 'success' });

      // Should not throw even if telemetry fails
      const result = await withCLITelemetry(
        'sync',
        undefined,
        {},
        mockFn
      );

      expect(result).toEqual({ data: 'success' });

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      expect(mockTelemetry.recordEvent).toHaveBeenCalled();
    });

    it('should work with instrumentation disabled', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(false);

      const mockFn = jest.fn().mockResolvedValue({ data: 'success' });

      const result = await withCLITelemetry(
        'sync',
        undefined,
        {},
        mockFn
      );

      expect(result).toEqual({ data: 'success' });
      expect(mockFn).toHaveBeenCalledTimes(1);

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      // Should still attempt to record, recordCLICommand handles disabled check
      expect(mockTelemetry.recordEvent).not.toHaveBeenCalled();
    });
  });

  describe('recordSyncCommand', () => {
    it('should record sync command with results', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncCommand(
        { force: true, dry: false },
        15,
        10,
        0,
        250
      );

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent).toMatchObject({
        event_type: 'cli',
        operation: 'sync',
        command: 'sync',
        subcommand: undefined,
        options: { force: true, dry: false },
        result: {
          skills_synced: 15,
          agents_synced: 10,
          errors: 0,
        },
        success: true,
        duration_ms: 250,
      });
    });

    it('should record sync command with errors', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncCommand(
        { force: false },
        10,
        8,
        3,
        300
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.result).toEqual({
        skills_synced: 10,
        agents_synced: 8,
        errors: 3,
      });
      expect(recordedEvent.success).toBe(false);
    });

    it('should set success based on errors count', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncCommand({}, 5, 5, 1, 100);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.success).toBe(false);
    });

    it('should not record event when instrumentation is disabled', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(false);

      await recordSyncCommand({}, 10, 5, 0, 200);

      expect(mockTelemetry.recordEvent).not.toHaveBeenCalled();
    });
  });

  describe('recordValidateCommand', () => {
    it('should record validate command with success', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordValidateCommand(
        { strict: true },
        { valid: true, errors: [], warnings: [] },
        150,
        true
      );

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent).toMatchObject({
        event_type: 'cli',
        operation: 'validate',
        command: 'validate',
        subcommand: undefined,
        options: { strict: true },
        result: { valid: true, errors: [], warnings: [] },
        success: true,
        duration_ms: 150,
      });
    });

    it('should record validate command with failure', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordValidateCommand(
        { strict: false },
        {
          valid: false,
          errors: ['Error 1', 'Error 2'],
          warnings: ['Warning 1'],
        },
        100,
        false
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.success).toBe(false);
      expect(recordedEvent.result).toEqual({
        valid: false,
        errors: ['Error 1', 'Error 2'],
        warnings: ['Warning 1'],
      });
    });

    it('should not record event when instrumentation is disabled', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(false);

      await recordValidateCommand({}, { valid: true }, 100, true);

      expect(mockTelemetry.recordEvent).not.toHaveBeenCalled();
    });

    it('should handle complex validation results', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const validationResults = {
        valid: true,
        errors: [],
        warnings: [],
        files_checked: 50,
        issues_found: 0,
      };

      await recordValidateCommand(
        { verbose: true },
        validationResults,
        200,
        true
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.result).toEqual(validationResults);
    });
  });

  describe('recordInitCommand', () => {
    it('should record init command with success', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordInitCommand(
        'my-project',
        ['core', 'planning', 'coding'],
        500,
        true
      );

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent).toMatchObject({
        event_type: 'cli',
        operation: 'init',
        command: 'init',
        subcommand: undefined,
        options: {
          project: 'my-project',
          modules: ['core', 'planning', 'coding'],
        },
        result: {
          modules_installed: 3,
        },
        success: true,
        duration_ms: 500,
      });
    });

    it('should record init command with failure', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordInitCommand(
        'failed-project',
        ['core'],
        100,
        false
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.success).toBe(false);
      expect(recordedEvent.options).toEqual({
        project: 'failed-project',
        modules: ['core'],
      });
    });

    it('should handle init with no modules', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordInitCommand(
        'minimal-project',
        [],
        50,
        true
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.result).toEqual({
        modules_installed: 0,
      });
    });

    it('should not record event when instrumentation is disabled', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(false);

      await recordInitCommand('test-project', ['core'], 200, true);

      expect(mockTelemetry.recordEvent).not.toHaveBeenCalled();
    });

    it('should count modules correctly', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordInitCommand(
        'large-project',
        ['core', 'planning', 'coding', 'jira', 'confluence', 'backlog'],
        1000,
        true
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<CLIEvent>;
      expect(recordedEvent.result).toEqual({
        modules_installed: 6,
      });
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete CLI workflow', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordInitCommand('test-project', ['core', 'coding'], 300, true);
      await recordValidateCommand({}, { valid: true }, 100, true);
      await recordSyncCommand({}, 10, 5, 0, 200);

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(3);

      const events = mockTelemetry.recordEvent.mock.calls.map(call => call[0]);
      expect(events[0].command).toBe('init');
      expect(events[1].command).toBe('validate');
      expect(events[2].command).toBe('sync');
    });

    it('should handle withCLITelemetry wrapper with multiple calls', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const mockFn1 = jest.fn().mockResolvedValue({ done: true });
      const mockFn2 = jest.fn().mockResolvedValue({ done: true });

      await withCLITelemetry('sync', undefined, {}, mockFn1);
      await withCLITelemetry('validate', undefined, {}, mockFn2);

      // Wait for async telemetry recording
      await new Promise(resolve => setImmediate(resolve));

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(2);
    });

    it('should handle mixed success and failure operations', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncCommand({}, 10, 5, 0, 200); // Success
      await recordValidateCommand({}, { valid: false }, 100, false); // Failure
      await recordInitCommand('project', ['core'], 300, true); // Success

      const events = mockTelemetry.recordEvent.mock.calls.map(call => call[0]) as Partial<CLIEvent>[];
      expect(events[0].success).toBe(true);
      expect(events[1].success).toBe(false);
      expect(events[2].success).toBe(true);
    });
  });
});
