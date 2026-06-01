/**
 * Sync Instrumentation Tests
 * Unit tests for sync engine instrumentation helpers
 */

import { getTelemetry } from '../telemetry-manager';
import {
  recordSyncOperation,
  recordSkillsSync,
  recordAgentsSync,
  recordSyncAll,
  recordSyncCheck,
} from '../instrumentation/sync-instrumentation';
import type { SyncEvent } from '../types';

// Mock telemetry manager
jest.mock('../telemetry-manager');

describe('sync-instrumentation', () => {
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

  describe('recordSyncOperation', () => {
    it('should record sync operation with all parameters', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncOperation(
        'sync_skills',
        10,
        5,
        3,
        150,
        0,
        true
      );

      expect(mockTelemetry.isInstrumentationEnabled).toHaveBeenCalledWith('sync');
      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent).toMatchObject({
        event_type: 'sync',
        operation: 'sync_skills',
        files_processed: 10,
        changes_detected: 5,
        files_written: 3,
        errors: 0,
        success: true,
        duration_ms: 150,
      });
    });

    it('should record sync_skills operation', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncOperation(
        'sync_skills',
        15,
        8,
        7,
        200
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.operation).toBe('sync_skills');
      expect(recordedEvent.errors).toBe(0);
      expect(recordedEvent.success).toBe(true);
    });

    it('should record sync_agents operation', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncOperation(
        'sync_agents',
        20,
        10,
        9,
        250
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.operation).toBe('sync_agents');
    });

    it('should record sync_all operation', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncOperation(
        'sync_all',
        30,
        15,
        12,
        400
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.operation).toBe('sync_all');
    });

    it('should record check_sync operation', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncOperation(
        'check_sync',
        25,
        5,
        0,
        100
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.operation).toBe('check_sync');
    });

    it('should record operation with errors', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncOperation(
        'sync_skills',
        10,
        5,
        2,
        150,
        3,
        false
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.errors).toBe(3);
      expect(recordedEvent.success).toBe(false);
    });

    it('should use default values for errors and success', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncOperation(
        'sync_skills',
        10,
        5,
        3,
        150
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.errors).toBe(0);
      expect(recordedEvent.success).toBe(true);
    });

    it('should not record event when instrumentation is disabled', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(false);

      await recordSyncOperation(
        'sync_skills',
        10,
        5,
        3,
        150
      );

      expect(mockTelemetry.isInstrumentationEnabled).toHaveBeenCalledWith('sync');
      expect(mockTelemetry.recordEvent).not.toHaveBeenCalled();
    });

    it('should handle zero files processed', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncOperation(
        'sync_skills',
        0,
        0,
        0,
        10
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.files_processed).toBe(0);
      expect(recordedEvent.changes_detected).toBe(0);
      expect(recordedEvent.files_written).toBe(0);
    });

    it('should handle large numbers', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncOperation(
        'sync_all',
        10000,
        5000,
        4500,
        30000
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.files_processed).toBe(10000);
      expect(recordedEvent.duration_ms).toBe(30000);
    });
  });

  describe('recordSkillsSync', () => {
    it('should record skills sync with no errors', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSkillsSync(15, 8, 7, 200);

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent).toMatchObject({
        event_type: 'sync',
        operation: 'sync_skills',
        files_processed: 15,
        changes_detected: 8,
        files_written: 7,
        errors: 0,
        success: true,
        duration_ms: 200,
      });
    });

    it('should record skills sync with errors', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSkillsSync(15, 8, 5, 200, 3);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.errors).toBe(3);
      expect(recordedEvent.success).toBe(false);
    });

    it('should default errors to 0', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSkillsSync(10, 5, 4, 150);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.errors).toBe(0);
      expect(recordedEvent.success).toBe(true);
    });

    it('should not record event when instrumentation is disabled', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(false);

      await recordSkillsSync(15, 8, 7, 200);

      expect(mockTelemetry.recordEvent).not.toHaveBeenCalled();
    });

    it('should handle zero skills processed', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSkillsSync(0, 0, 0, 10);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.files_processed).toBe(0);
      expect(recordedEvent.success).toBe(true);
    });

    it('should set success to false when errors > 0', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSkillsSync(10, 5, 4, 150, 1);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.errors).toBe(1);
      expect(recordedEvent.success).toBe(false);
    });
  });

  describe('recordAgentsSync', () => {
    it('should record agents sync with no errors', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordAgentsSync(20, 10, 9, 250);

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent).toMatchObject({
        event_type: 'sync',
        operation: 'sync_agents',
        files_processed: 20,
        changes_detected: 10,
        files_written: 9,
        errors: 0,
        success: true,
        duration_ms: 250,
      });
    });

    it('should record agents sync with errors', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordAgentsSync(20, 10, 8, 250, 2);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.errors).toBe(2);
      expect(recordedEvent.success).toBe(false);
    });

    it('should default errors to 0', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordAgentsSync(15, 7, 6, 180);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.errors).toBe(0);
      expect(recordedEvent.success).toBe(true);
    });

    it('should not record event when instrumentation is disabled', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(false);

      await recordAgentsSync(20, 10, 9, 250);

      expect(mockTelemetry.recordEvent).not.toHaveBeenCalled();
    });

    it('should handle zero agents processed', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordAgentsSync(0, 0, 0, 5);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.files_processed).toBe(0);
      expect(recordedEvent.success).toBe(true);
    });

    it('should set success to false when errors > 0', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordAgentsSync(15, 7, 5, 180, 2);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.errors).toBe(2);
      expect(recordedEvent.success).toBe(false);
    });
  });

  describe('recordSyncAll', () => {
    it('should record complete sync with no errors', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncAll(30, 15, 12, 400);

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent).toMatchObject({
        event_type: 'sync',
        operation: 'sync_all',
        files_processed: 30,
        changes_detected: 15,
        files_written: 12,
        errors: 0,
        success: true,
        duration_ms: 400,
      });
    });

    it('should record complete sync with errors', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncAll(30, 15, 10, 400, 5);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.errors).toBe(5);
      expect(recordedEvent.success).toBe(false);
    });

    it('should default errors to 0', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncAll(25, 12, 10, 350);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.errors).toBe(0);
      expect(recordedEvent.success).toBe(true);
    });

    it('should not record event when instrumentation is disabled', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(false);

      await recordSyncAll(30, 15, 12, 400);

      expect(mockTelemetry.recordEvent).not.toHaveBeenCalled();
    });

    it('should handle large sync operations', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncAll(1000, 500, 450, 5000);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.files_processed).toBe(1000);
      expect(recordedEvent.changes_detected).toBe(500);
      expect(recordedEvent.files_written).toBe(450);
    });

    it('should set success to false when errors > 0', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncAll(100, 50, 45, 1000, 1);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.errors).toBe(1);
      expect(recordedEvent.success).toBe(false);
    });
  });

  describe('recordSyncCheck', () => {
    it('should record sync check operation', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncCheck(25, 5, 100);

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent).toMatchObject({
        event_type: 'sync',
        operation: 'check_sync',
        files_processed: 25,
        changes_detected: 5,
        files_written: 0,
        errors: 0,
        success: true,
        duration_ms: 100,
      });
    });

    it('should always set files_written to 0', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncCheck(50, 10, 150);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.files_written).toBe(0);
    });

    it('should always set errors to 0', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncCheck(30, 8, 120);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.errors).toBe(0);
    });

    it('should always set success to true', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncCheck(15, 0, 80);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.success).toBe(true);
    });

    it('should not record event when instrumentation is disabled', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(false);

      await recordSyncCheck(25, 5, 100);

      expect(mockTelemetry.recordEvent).not.toHaveBeenCalled();
    });

    it('should handle zero changes detected', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncCheck(20, 0, 50);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.changes_detected).toBe(0);
      expect(recordedEvent.success).toBe(true);
    });

    it('should handle all files needing sync', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSyncCheck(40, 40, 200);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      expect(recordedEvent.files_processed).toBe(40);
      expect(recordedEvent.changes_detected).toBe(40);
      expect(recordedEvent.files_written).toBe(0);
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete sync workflow', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      // First check what needs syncing
      await recordSyncCheck(50, 20, 100);

      // Sync skills
      await recordSkillsSync(15, 12, 10, 250);

      // Sync agents
      await recordAgentsSync(10, 8, 7, 200);

      // Complete sync
      await recordSyncAll(25, 20, 17, 450);

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(4);

      const events = mockTelemetry.recordEvent.mock.calls.map(call => call[0]);
      expect(events[0].operation).toBe('check_sync');
      expect(events[1].operation).toBe('sync_skills');
      expect(events[2].operation).toBe('sync_agents');
      expect(events[3].operation).toBe('sync_all');
    });

    it('should handle sync operations with mixed results', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSkillsSync(10, 5, 5, 150, 0); // Success
      await recordAgentsSync(10, 5, 3, 150, 2); // Has errors
      await recordSyncAll(20, 10, 8, 300, 2); // Has errors

      const events = mockTelemetry.recordEvent.mock.calls.map(call => call[0]) as Partial<SyncEvent>[];
      expect(events[0].success).toBe(true);
      expect(events[1].success).toBe(false);
      expect(events[2].success).toBe(false);
    });

    it('should handle mixed enabled/disabled instrumentation', async () => {
      mockTelemetry.isInstrumentationEnabled
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      await recordSkillsSync(10, 5, 4, 150);
      await recordAgentsSync(10, 5, 4, 150);
      await recordSyncAll(20, 10, 8, 300);

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(2);
    });

    it('should handle rapid sequential sync operations', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const syncPromises = [];
      for (let i = 0; i < 10; i++) {
        syncPromises.push(recordSkillsSync(5, 2, 2, 50));
      }

      await Promise.all(syncPromises);

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(10);
    });

    it('should preserve operation-specific data across calls', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordSkillsSync(15, 8, 7, 200);
      await recordAgentsSync(20, 10, 9, 250);

      const skillsEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<SyncEvent>;
      const agentsEvent = mockTelemetry.recordEvent.mock.calls[1][0] as Partial<SyncEvent>;

      expect(skillsEvent.operation).toBe('sync_skills');
      expect(skillsEvent.files_processed).toBe(15);
      expect(agentsEvent.operation).toBe('sync_agents');
      expect(agentsEvent.files_processed).toBe(20);
    });
  });
});
