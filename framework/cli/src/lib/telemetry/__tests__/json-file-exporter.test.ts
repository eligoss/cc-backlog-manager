/**
 * JsonFileExporter Tests
 * Comprehensive unit tests for JSON file exporter with mocked fs operations
 */

import fs from 'fs-extra';
import path from 'path';
import { JsonFileExporter } from '../exporters/json-file-exporter';
import { TelemetryEvent, JsonFileExporterConfig } from '../types';

// Mock fs-extra
jest.mock('fs-extra');

describe('JsonFileExporter', () => {
  const mockFs = fs as jest.Mocked<typeof fs>;
  let consoleErrorSpy: jest.SpyInstance;

  // Sample config
  const baseConfig: JsonFileExporterConfig = {
    enabled: true,
    path: 'telemetry/events.jsonl',
    maxSize: '10MB',
    rotation: 'size',
  };

  // Sample event
  const sampleEvent: TelemetryEvent = {
    timestamp: '2025-01-15T10:00:00.000Z',
    event_type: 'cli',
    operation: 'test-operation',
    command: 'test',
    success: true,
    duration_ms: 100,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    jest.useFakeTimers();
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();

    // Default mock implementations
    mockFs.ensureDirSync.mockImplementation();
    mockFs.pathExists.mockResolvedValue(false);
    mockFs.appendFile.mockResolvedValue();
    mockFs.stat.mockResolvedValue({ size: 0, mtimeMs: Date.now() } as any);
    mockFs.readdir.mockResolvedValue([]);
    mockFs.rename.mockResolvedValue();
    mockFs.unlink.mockResolvedValue();
  });

  afterEach(() => {
    jest.useRealTimers();
    consoleErrorSpy.mockRestore();
  });

  describe('constructor', () => {
    it('should create directory for absolute path', () => {
      const absolutePath = '/absolute/path/events.jsonl';
      const config = { ...baseConfig, path: absolutePath };

      new JsonFileExporter(config);

      expect(mockFs.ensureDirSync).toHaveBeenCalledWith('/absolute/path');
    });

    it('should create directory for relative path', () => {
      const projectPath = '/project/root';
      const config = { ...baseConfig, path: 'telemetry/events.jsonl' };

      new JsonFileExporter(config, projectPath);

      expect(mockFs.ensureDirSync).toHaveBeenCalledWith(
        path.join(projectPath, 'telemetry')
      );
    });

    it('should use process.cwd() as default project path', () => {
      const cwd = process.cwd();
      const config = { ...baseConfig, path: 'telemetry/events.jsonl' };

      new JsonFileExporter(config);

      expect(mockFs.ensureDirSync).toHaveBeenCalledWith(
        path.join(cwd, 'telemetry')
      );
    });

    it('should start flush timer', () => {
      const setIntervalSpy = jest.spyOn(global, 'setInterval');

      new JsonFileExporter(baseConfig);

      expect(setIntervalSpy).toHaveBeenCalledWith(expect.any(Function), 1000);
    });
  });

  describe('export()', () => {
    it('should add event to buffer', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      await exporter.export(sampleEvent);

      // Verify buffer is not flushed yet (file operation not called)
      expect(mockFs.appendFile).not.toHaveBeenCalled();
    });

    it('should add multiple events to buffer', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      await exporter.export(sampleEvent);
      await exporter.export({ ...sampleEvent, operation: 'test-2' });
      await exporter.export({ ...sampleEvent, operation: 'test-3' });

      // Buffer should contain 3 events
      expect(mockFs.appendFile).not.toHaveBeenCalled();
    });

    it('should auto-flush when buffer reaches 100 events', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      // Add 100 events
      for (let i = 0; i < 100; i++) {
        await exporter.export({ ...sampleEvent, operation: `test-${i}` });
      }

      // Should have flushed
      expect(mockFs.appendFile).toHaveBeenCalledTimes(1);
    });

    it('should not throw error on export failure', async () => {
      const exporter = new JsonFileExporter(baseConfig);
      mockFs.appendFile.mockRejectedValueOnce(new Error('Write failed'));

      // Add 100 events to trigger flush
      for (let i = 0; i < 100; i++) {
        await exporter.export({ ...sampleEvent, operation: `test-${i}` });
      }

      // Should not throw, but should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to flush telemetry events'),
        expect.any(Error)
      );
    });

    it('should catch and log errors without throwing', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      // This should not throw even though we're catching internally
      await expect(exporter.export(sampleEvent)).resolves.not.toThrow();
    });
  });

  describe('flush()', () => {
    it('should write buffered events to file as JSONL', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      await exporter.export(sampleEvent);
      await exporter.export({ ...sampleEvent, operation: 'test-2' });
      await exporter.flush();

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('events.jsonl'),
        `${JSON.stringify(sampleEvent)}\n${JSON.stringify({ ...sampleEvent, operation: 'test-2' })}\n`,
        'utf-8'
      );
    });

    it('should clear buffer after flushing', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      await exporter.export(sampleEvent);
      await exporter.flush();

      // Reset mock
      mockFs.appendFile.mockClear();

      // Second flush should not write anything
      await exporter.flush();
      expect(mockFs.appendFile).not.toHaveBeenCalled();
    });

    it('should do nothing if buffer is empty', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      await exporter.flush();

      expect(mockFs.appendFile).not.toHaveBeenCalled();
    });

    it('should keep buffer on flush failure', async () => {
      const exporter = new JsonFileExporter(baseConfig);
      mockFs.appendFile.mockRejectedValueOnce(new Error('Write failed'));

      await exporter.export(sampleEvent);
      await exporter.flush();

      // Should log error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to flush telemetry events'),
        expect.any(Error)
      );

      // Clear error and retry
      consoleErrorSpy.mockClear();
      mockFs.appendFile.mockResolvedValueOnce();
      await exporter.flush();

      // Should succeed on retry with same buffer
      expect(mockFs.appendFile).toHaveBeenCalled();
    });

    it('should check rotation before flushing', async () => {
      const exporter = new JsonFileExporter(baseConfig);
      mockFs.pathExists.mockResolvedValue(true);
      mockFs.stat.mockResolvedValue({ size: 11 * 1024 * 1024, mtimeMs: Date.now() } as any);

      await exporter.export(sampleEvent);
      await exporter.flush();

      // Should rename file (rotation)
      expect(mockFs.rename).toHaveBeenCalled();
    });
  });

  describe('timer-based flush', () => {
    it('should auto-flush after 1 second', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      await exporter.export(sampleEvent);

      // Fast-forward 1 second and run all timers
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockFs.appendFile).toHaveBeenCalled();
    });

    it('should flush multiple times on timer', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      // First event
      await exporter.export(sampleEvent);
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockFs.appendFile).toHaveBeenCalledTimes(1);

      // Second event
      await exporter.export({ ...sampleEvent, operation: 'test-2' });
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockFs.appendFile).toHaveBeenCalledTimes(2);
    });

    it('should not flush empty buffer on timer', async () => {
      new JsonFileExporter(baseConfig);

      await jest.advanceTimersByTimeAsync(1000);

      expect(mockFs.appendFile).not.toHaveBeenCalled();
    });

    it('should handle flush errors on timer without crashing', async () => {
      const exporter = new JsonFileExporter(baseConfig);
      mockFs.appendFile.mockRejectedValue(new Error('Timer flush failed'));

      await exporter.export(sampleEvent);
      await jest.advanceTimersByTimeAsync(1000);

      // flush() catches and logs the error, not the timer callback
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to flush telemetry events'),
        expect.any(Error)
      );
    });

    it('should handle timer callback error if flush throws unexpectedly', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      // Replace flush with a version that throws
      const originalFlush = exporter.flush.bind(exporter);
      exporter.flush = jest.fn().mockRejectedValue(new Error('Unexpected flush error'));

      await exporter.export(sampleEvent);
      await jest.advanceTimersByTimeAsync(1000);

      // Timer callback should catch and log the error
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to auto-flush telemetry'),
        expect.any(Error)
      );
    });
  });

  describe('file rotation - size based', () => {
    beforeEach(() => {
      mockFs.pathExists.mockResolvedValue(true);
    });

    it('should rotate file when size exceeds maxSize', async () => {
      const config = { ...baseConfig, maxSize: '10MB', rotation: 'size' as const };
      const exporter = new JsonFileExporter(config);

      // Mock file size > 10MB
      mockFs.stat.mockResolvedValue({ size: 11 * 1024 * 1024, mtimeMs: Date.now() } as any);

      await exporter.export(sampleEvent);
      await exporter.flush();

      expect(mockFs.rename).toHaveBeenCalled();
    });

    it('should not rotate file when size is below maxSize', async () => {
      const config = { ...baseConfig, maxSize: '10MB', rotation: 'size' as const };
      const exporter = new JsonFileExporter(config);

      // Mock file size < 10MB
      mockFs.stat.mockResolvedValue({ size: 5 * 1024 * 1024, mtimeMs: Date.now() } as any);

      await exporter.export(sampleEvent);
      await exporter.flush();

      expect(mockFs.rename).not.toHaveBeenCalled();
    });

    it('should handle KB size format', async () => {
      const config = { ...baseConfig, maxSize: '1024KB', rotation: 'size' as const };
      const exporter = new JsonFileExporter(config);

      // Mock file size > 1024KB
      mockFs.stat.mockResolvedValue({ size: 2 * 1024 * 1024, mtimeMs: Date.now() } as any);

      await exporter.export(sampleEvent);
      await exporter.flush();

      expect(mockFs.rename).toHaveBeenCalled();
    });

    it('should handle GB size format', async () => {
      const config = { ...baseConfig, maxSize: '1GB', rotation: 'size' as const };
      const exporter = new JsonFileExporter(config);

      // Mock file size > 1GB
      mockFs.stat.mockResolvedValue({ size: 2 * 1024 * 1024 * 1024, mtimeMs: Date.now() } as any);

      await exporter.export(sampleEvent);
      await exporter.flush();

      expect(mockFs.rename).toHaveBeenCalled();
    });

    it('should handle bytes format (no unit)', async () => {
      const config = { ...baseConfig, maxSize: '1024', rotation: 'size' as const };
      const exporter = new JsonFileExporter(config);

      // Mock file size > 1024 bytes
      mockFs.stat.mockResolvedValue({ size: 2048, mtimeMs: Date.now() } as any);

      await exporter.export(sampleEvent);
      await exporter.flush();

      expect(mockFs.rename).toHaveBeenCalled();
    });

    it('should create rotated file with timestamp', async () => {
      const config = { ...baseConfig, path: '/test/events.jsonl', maxSize: '10MB', rotation: 'size' as const };
      const exporter = new JsonFileExporter(config);

      mockFs.stat.mockResolvedValue({ size: 11 * 1024 * 1024, mtimeMs: Date.now() } as any);

      await exporter.export(sampleEvent);
      await exporter.flush();

      expect(mockFs.rename).toHaveBeenCalledWith(
        '/test/events.jsonl',
        expect.stringMatching(/\/test\/events\.\d{4}-\d{2}-\d{2}T\d{2}-\d{2}-\d{2}-\d{3}Z\.jsonl/)
      );
    });

    it('should not rotate if file does not exist', async () => {
      const exporter = new JsonFileExporter(baseConfig);
      mockFs.pathExists.mockResolvedValue(false);

      await exporter.export(sampleEvent);
      await exporter.flush();

      expect(mockFs.rename).not.toHaveBeenCalled();
    });

    it('should handle rotation errors gracefully', async () => {
      const exporter = new JsonFileExporter(baseConfig);
      mockFs.stat.mockResolvedValue({ size: 11 * 1024 * 1024, mtimeMs: Date.now() } as any);
      mockFs.rename.mockRejectedValueOnce(new Error('Rename failed'));

      await exporter.export(sampleEvent);
      await exporter.flush();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to rotate telemetry file'),
        expect.any(Error)
      );
    });
  });

  describe('file rotation - daily', () => {
    beforeEach(() => {
      mockFs.pathExists.mockResolvedValue(true);
    });

    it('should rotate file when date changes', async () => {
      const config = { ...baseConfig, rotation: 'daily' as const };

      // Mock current date
      const originalDate = Date;
      let mockDate = new Date('2025-01-15T10:00:00.000Z');

      global.Date = jest.fn((arg?: any) => {
        if (arg !== undefined) return new originalDate(arg);
        return mockDate;
      }) as any;
      global.Date.now = jest.fn(() => mockDate.getTime());

      const exporter = new JsonFileExporter(config);

      await exporter.export(sampleEvent);
      await exporter.flush();

      expect(mockFs.rename).not.toHaveBeenCalled();

      // Change date to next day
      mockDate = new Date('2025-01-16T10:00:00.000Z');

      await exporter.export(sampleEvent);
      await exporter.flush();

      expect(mockFs.rename).toHaveBeenCalled();

      // Restore Date
      global.Date = originalDate;
    });

    it('should not rotate file on same day', async () => {
      const config = { ...baseConfig, rotation: 'daily' as const };
      const exporter = new JsonFileExporter(config);

      await exporter.export(sampleEvent);
      await exporter.flush();

      await exporter.export({ ...sampleEvent, operation: 'test-2' });
      await exporter.flush();

      expect(mockFs.rename).not.toHaveBeenCalled();
    });
  });

  describe('file rotation - none', () => {
    it('should not rotate file when rotation is none', async () => {
      const config = { ...baseConfig, rotation: 'none' as const };
      const exporter = new JsonFileExporter(config);

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.stat.mockResolvedValue({ size: 1000 * 1024 * 1024, mtimeMs: Date.now() } as any);

      await exporter.export(sampleEvent);
      await exporter.flush();

      expect(mockFs.rename).not.toHaveBeenCalled();
    });
  });

  describe('cleanup old files', () => {
    beforeEach(() => {
      mockFs.pathExists.mockResolvedValue(true);
    });

    it('should keep last 7 rotated files', async () => {
      const config = { ...baseConfig, path: '/test/events.jsonl', maxSize: '1KB', rotation: 'size' as const };
      const exporter = new JsonFileExporter(config);

      // Mock 10 rotated files
      const rotatedFiles = Array.from({ length: 10 }, (_, i) => `events.2025-01-${String(i + 1).padStart(2, '0')}T10-00-00-000Z.jsonl`);
      mockFs.readdir.mockResolvedValue(rotatedFiles as any);

      // Mock stats for each file
      mockFs.stat.mockImplementation(async (filePath: any) => {
        const filename = path.basename(filePath as string);
        if (filename === 'events.jsonl') {
          return { size: 2 * 1024, mtimeMs: Date.now() } as any;
        }
        const index = rotatedFiles.indexOf(filename);
        return { size: 1024, mtimeMs: Date.now() - (10 - index) * 86400000 } as any;
      });

      await exporter.export(sampleEvent);
      await exporter.flush();

      // Should delete oldest 3 files (10 - 7 = 3)
      expect(mockFs.unlink).toHaveBeenCalledTimes(3);
    });

    it('should not delete files if count is 7 or less', async () => {
      const config = { ...baseConfig, path: '/test/events.jsonl', maxSize: '1KB', rotation: 'size' as const };
      const exporter = new JsonFileExporter(config);

      // Mock 5 rotated files
      const rotatedFiles = Array.from({ length: 5 }, (_, i) => `events.2025-01-${String(i + 1).padStart(2, '0')}T10-00-00-000Z.jsonl`);
      mockFs.readdir.mockResolvedValue(rotatedFiles as any);

      mockFs.stat.mockImplementation(async (filePath: any) => {
        const filename = path.basename(filePath as string);
        if (filename === 'events.jsonl') {
          return { size: 2 * 1024, mtimeMs: Date.now() } as any;
        }
        return { size: 1024, mtimeMs: Date.now() } as any;
      });

      await exporter.export(sampleEvent);
      await exporter.flush();

      expect(mockFs.unlink).not.toHaveBeenCalled();
    });

    it('should delete oldest files first', async () => {
      const config = { ...baseConfig, path: '/test/events.jsonl', maxSize: '1KB', rotation: 'size' as const };
      const exporter = new JsonFileExporter(config);

      const rotatedFiles = [
        'events.2025-01-01T10-00-00-000Z.jsonl',
        'events.2025-01-02T10-00-00-000Z.jsonl',
        'events.2025-01-03T10-00-00-000Z.jsonl',
        'events.2025-01-04T10-00-00-000Z.jsonl',
        'events.2025-01-05T10-00-00-000Z.jsonl',
        'events.2025-01-06T10-00-00-000Z.jsonl',
        'events.2025-01-07T10-00-00-000Z.jsonl',
        'events.2025-01-08T10-00-00-000Z.jsonl',
      ];
      mockFs.readdir.mockResolvedValue(rotatedFiles as any);

      mockFs.stat.mockImplementation(async (filePath: any) => {
        const filename = path.basename(filePath as string);
        if (filename === 'events.jsonl') {
          return { size: 2 * 1024, mtimeMs: Date.now() } as any;
        }
        const dateMatch = filename.match(/2025-01-(\d{2})/);
        const day = dateMatch ? parseInt(dateMatch[1]) : 1;
        return { size: 1024, mtimeMs: Date.now() - (8 - day) * 86400000 } as any;
      });

      await exporter.export(sampleEvent);
      await exporter.flush();

      // Should delete the oldest file
      expect(mockFs.unlink).toHaveBeenCalledWith('/test/events.2025-01-01T10-00-00-000Z.jsonl');
    });

    it('should handle cleanup errors gracefully', async () => {
      const config = { ...baseConfig, path: '/test/events.jsonl', maxSize: '1KB', rotation: 'size' as const };
      const exporter = new JsonFileExporter(config);

      mockFs.readdir.mockRejectedValueOnce(new Error('Readdir failed'));
      mockFs.stat.mockResolvedValue({ size: 2 * 1024, mtimeMs: Date.now() } as any);

      await exporter.export(sampleEvent);
      await exporter.flush();

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to cleanup old telemetry files'),
        expect.any(Error)
      );
    });

    it('should only clean up files matching the base name', async () => {
      const config = { ...baseConfig, path: '/test/events.jsonl', maxSize: '1KB', rotation: 'size' as const };
      const exporter = new JsonFileExporter(config);

      const files = [
        'events.2025-01-01T10-00-00-000Z.jsonl',
        'events.2025-01-02T10-00-00-000Z.jsonl',
        'other.2025-01-01T10-00-00-000Z.jsonl', // Different base name
        'events.jsonl', // Current file (should be excluded)
      ];
      mockFs.readdir.mockResolvedValue(files as any);

      mockFs.stat.mockImplementation(async (filePath: any) => {
        const filename = path.basename(filePath as string);
        if (filename === 'events.jsonl') {
          return { size: 2 * 1024, mtimeMs: Date.now() } as any;
        }
        return { size: 1024, mtimeMs: Date.now() } as any;
      });

      await exporter.export(sampleEvent);
      await exporter.flush();

      // Should not delete other.jsonl files
      const unlinkCalls = (mockFs.unlink as jest.Mock).mock.calls;
      expect(unlinkCalls.every(call => call[0].includes('events.'))).toBe(true);
      expect(unlinkCalls.every(call => !call[0].includes('other.'))).toBe(true);
    });
  });

  describe('shutdown()', () => {
    it('should flush remaining events', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      await exporter.export(sampleEvent);
      await exporter.shutdown();

      expect(mockFs.appendFile).toHaveBeenCalled();
    });

    it('should clear flush timer', async () => {
      const clearIntervalSpy = jest.spyOn(global, 'clearInterval');
      const exporter = new JsonFileExporter(baseConfig);

      await exporter.shutdown();

      expect(clearIntervalSpy).toHaveBeenCalled();
    });

    it('should not flush if buffer is empty', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      await exporter.shutdown();

      expect(mockFs.appendFile).not.toHaveBeenCalled();
    });

    it('should handle multiple shutdown calls', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      await exporter.export(sampleEvent);
      await exporter.shutdown();
      await exporter.shutdown();

      // Should only flush once
      expect(mockFs.appendFile).toHaveBeenCalledTimes(1);
    });

    it('should stop timer from triggering after shutdown', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      await exporter.export(sampleEvent);
      await exporter.shutdown();

      mockFs.appendFile.mockClear();

      // Advance timer - should not trigger flush
      await jest.advanceTimersByTimeAsync(1000);

      expect(mockFs.appendFile).not.toHaveBeenCalled();
    });
  });

  describe('edge cases and error handling', () => {
    it('should handle error for invalid size format during rotation', async () => {
      const config = { ...baseConfig, maxSize: 'invalid-size', rotation: 'size' as const };
      const exporter = new JsonFileExporter(config);

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.stat.mockResolvedValue({ size: 1000, mtimeMs: Date.now() } as any);

      await exporter.export(sampleEvent);

      // Flush will trigger rotation which will call parseSize with invalid format
      await exporter.flush();

      // Should log error but not crash
      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to flush telemetry events'),
        expect.any(Error)
      );
    });

    it('should handle export error when adding to buffer fails', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      // Force an error by making buffer.push throw
      Object.defineProperty(exporter, 'buffer', {
        get() {
          throw new Error('Buffer operation failed');
        }
      });

      await exporter.export(sampleEvent);

      expect(consoleErrorSpy).toHaveBeenCalledWith(
        expect.stringContaining('Failed to export telemetry event'),
        expect.any(Error)
      );
    });

    it('should handle events with complex nested objects', async () => {
      const complexEvent: TelemetryEvent = {
        timestamp: '2025-01-15T10:00:00.000Z',
        event_type: 'discovery',
        operation: 'agent-discovery',
        agent_id: 'ai-test',
        module_id: 'test-module',
        capabilities_requested: ['cap1', 'cap2'],
        skills_discovered: [
          { skill_id: 'skill1', module: 'mod1', source: 'local' },
        ],
        unfulfilled_capabilities: [],
        discovery_duration_ms: 100,
        success: true,
      };

      const exporter = new JsonFileExporter(baseConfig);
      await exporter.export(complexEvent);
      await exporter.flush();

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        expect.any(String),
        expect.stringContaining(JSON.stringify(complexEvent)),
        'utf-8'
      );
    });

    it('should handle events with special characters', async () => {
      const specialEvent: TelemetryEvent = {
        ...sampleEvent,
        operation: 'test-with-special-chars: "quotes", \\backslash\\, \nnewline',
      };

      const exporter = new JsonFileExporter(baseConfig);
      await exporter.export(specialEvent);
      await exporter.flush();

      expect(mockFs.appendFile).toHaveBeenCalled();
    });

    it('should handle concurrent export calls', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      const promises = Array.from({ length: 10 }, (_, i) =>
        exporter.export({ ...sampleEvent, operation: `test-${i}` })
      );

      await Promise.all(promises);
      await exporter.flush();

      expect(mockFs.appendFile).toHaveBeenCalled();
    });

    it('should handle very large events', async () => {
      const largeEvent: TelemetryEvent = {
        ...sampleEvent,
        operation: 'x'.repeat(100000),
      };

      const exporter = new JsonFileExporter(baseConfig);
      await exporter.export(largeEvent);
      await exporter.flush();

      expect(mockFs.appendFile).toHaveBeenCalled();
    });

    it('should handle file path with special characters', async () => {
      const config = {
        ...baseConfig,
        path: '/test/path with spaces/events-[special].jsonl',
      };

      const exporter = new JsonFileExporter(config);
      await exporter.export(sampleEvent);
      await exporter.flush();

      expect(mockFs.appendFile).toHaveBeenCalledWith(
        '/test/path with spaces/events-[special].jsonl',
        expect.any(String),
        'utf-8'
      );
    });

    it('should handle readdir returning non-array values', async () => {
      const config = { ...baseConfig, path: '/test/events.jsonl', maxSize: '1KB', rotation: 'size' as const };
      const exporter = new JsonFileExporter(config);

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.stat.mockResolvedValue({ size: 2 * 1024, mtimeMs: Date.now() } as any);
      mockFs.readdir.mockResolvedValue(null as any);

      await exporter.export(sampleEvent);

      // Should handle gracefully
      await expect(exporter.flush()).resolves.not.toThrow();
    });
  });

  describe('integration scenarios', () => {
    it('should handle complete lifecycle: export, flush, rotate, cleanup', async () => {
      const config = { ...baseConfig, path: '/test/events.jsonl', maxSize: '1KB', rotation: 'size' as const };
      const exporter = new JsonFileExporter(config);

      // Mock 8 existing rotated files
      const rotatedFiles = Array.from({ length: 8 }, (_, i) =>
        `events.2025-01-${String(i + 1).padStart(2, '0')}T10-00-00-000Z.jsonl`
      );
      mockFs.readdir.mockResolvedValue(rotatedFiles as any);

      mockFs.pathExists.mockResolvedValue(true);
      mockFs.stat.mockImplementation(async (filePath: any) => {
        const filename = path.basename(filePath as string);
        if (filename === 'events.jsonl') {
          return { size: 2 * 1024, mtimeMs: Date.now() } as any;
        }
        const index = rotatedFiles.indexOf(filename);
        return { size: 1024, mtimeMs: Date.now() - (8 - index) * 86400000 } as any;
      });

      // Export and flush
      await exporter.export(sampleEvent);
      await exporter.flush();

      // Verify rotation happened
      expect(mockFs.rename).toHaveBeenCalled();
      // Verify cleanup happened (should delete 2 oldest: 8 existing + 1 new - 7 to keep = 2 to delete)
      expect(mockFs.unlink).toHaveBeenCalled();
      // Verify write happened
      expect(mockFs.appendFile).toHaveBeenCalled();

      await exporter.shutdown();
    });

    it('should handle buffer overflow and timer flush together', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      // Add 99 events
      for (let i = 0; i < 99; i++) {
        await exporter.export({ ...sampleEvent, operation: `test-${i}` });
      }

      // Should not have flushed yet
      expect(mockFs.appendFile).not.toHaveBeenCalled();

      // Advance timer
      await jest.advanceTimersByTimeAsync(1000);

      // Should flush via timer
      expect(mockFs.appendFile).toHaveBeenCalledTimes(1);

      // Add one more event (would be 100 total in new buffer)
      await exporter.export({ ...sampleEvent, operation: 'test-99' });

      // Should not auto-flush (buffer restarted at 1)
      expect(mockFs.appendFile).toHaveBeenCalledTimes(1);
    });

    it('should maintain buffer integrity across flush failures', async () => {
      const exporter = new JsonFileExporter(baseConfig);

      await exporter.export({ ...sampleEvent, operation: 'event-1' });
      await exporter.export({ ...sampleEvent, operation: 'event-2' });

      // First flush fails
      mockFs.appendFile.mockRejectedValueOnce(new Error('Disk full'));
      await exporter.flush();

      // Buffer should still contain both events
      mockFs.appendFile.mockResolvedValueOnce();
      await exporter.flush();

      expect(mockFs.appendFile).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.stringContaining('event-1'),
        'utf-8'
      );
      expect(mockFs.appendFile).toHaveBeenLastCalledWith(
        expect.any(String),
        expect.stringContaining('event-2'),
        'utf-8'
      );
    });
  });
});
