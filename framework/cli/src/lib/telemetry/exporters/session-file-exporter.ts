/**
 * Session File Exporter
 * Writes telemetry events to session-specific JSONL files
 *
 * Each Claude session gets its own log file, making it easy to:
 * - Distinguish parallel agent runs
 * - Query all events from a specific session
 * - Clean up old session logs automatically
 */

import fs from 'fs-extra';
import path from 'path';
import {
  TelemetryEvent,
  TelemetryExporter,
  SessionFileExporterConfig
} from '../types.js';
import { getSessionId } from '../session-context.js';

/**
 * Session File Exporter
 * Creates one JSONL file per session in the configured directory
 */
export class SessionFileExporter implements TelemetryExporter {
  private config: SessionFileExporterConfig;
  private projectPath: string;
  private currentSessionFile: string | null = null;
  private buffer: TelemetryEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 50;
  private readonly FLUSH_INTERVAL_MS = 500;
  private cleanupScheduled = false;

  constructor(config: SessionFileExporterConfig, projectPath: string = process.cwd()) {
    this.config = config;
    this.projectPath = projectPath;

    // Ensure sessions directory exists
    const sessionsDir = this.getSessionsDirectory();
    fs.ensureDirSync(sessionsDir);

    // Start flush timer
    this.startFlushTimer();

    // Schedule cleanup of old session files
    this.scheduleCleanup();
  }

  /**
   * Get the sessions directory path
   */
  private getSessionsDirectory(): string {
    return path.isAbsolute(this.config.directory)
      ? this.config.directory
      : path.join(this.projectPath, this.config.directory);
  }

  /**
   * Get or create the session file path for the current session
   */
  private getSessionFilePath(): string | null {
    const sessionId = getSessionId();
    if (!sessionId) {
      return null;
    }

    // Cache the file path for the current session
    if (!this.currentSessionFile) {
      const sessionsDir = this.getSessionsDirectory();
      const timestamp = new Date().toISOString().slice(0, 10); // YYYY-MM-DD
      this.currentSessionFile = path.join(
        sessionsDir,
        `${sessionId}_${timestamp}.jsonl`
      );
    }

    return this.currentSessionFile;
  }

  /**
   * Export a telemetry event to the session file
   */
  async export(event: TelemetryEvent): Promise<void> {
    try {
      // Add to buffer
      this.buffer.push(event);

      // Flush if buffer is full
      if (this.buffer.length >= this.BUFFER_SIZE) {
        await this.flush();
      }
    } catch (error) {
      // Never throw - telemetry failures should not crash the app
      console.error('Failed to export session telemetry event:', error);
    }
  }

  /**
   * Flush buffered events to the session file
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    const sessionFile = this.getSessionFilePath();
    if (!sessionFile) {
      // No session active, clear buffer and return
      this.buffer = [];
      return;
    }

    try {
      // Ensure directory exists
      await fs.ensureDir(path.dirname(sessionFile));

      // Write all buffered events as JSONL
      const lines = this.buffer.map(event => JSON.stringify(event)).join('\n') + '\n';

      // Append to session file
      await fs.appendFile(sessionFile, lines, 'utf-8');

      // Clear buffer
      this.buffer = [];
    } catch (error) {
      console.error('Failed to flush session telemetry events:', error);
      // Keep buffer to try again later
    }
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        console.error('Failed to auto-flush session telemetry:', error);
      });
    }, this.FLUSH_INTERVAL_MS);
  }

  /**
   * Schedule cleanup of old session files
   */
  private scheduleCleanup(): void {
    if (this.cleanupScheduled) return;

    this.cleanupScheduled = true;

    // Run cleanup after a short delay to not block initialization
    setTimeout(() => {
      this.cleanupOldSessions().catch(error => {
        console.error('Failed to cleanup old session files:', error);
      });
    }, 5000);
  }

  /**
   * Clean up old session files based on configuration
   */
  private async cleanupOldSessions(): Promise<void> {
    try {
      const sessionsDir = this.getSessionsDirectory();

      if (!await fs.pathExists(sessionsDir)) {
        return;
      }

      const files = await fs.readdir(sessionsDir);
      const sessionFiles = files.filter(f => f.endsWith('.jsonl'));

      if (sessionFiles.length === 0) {
        return;
      }

      // Get file stats
      const filesWithStats = await Promise.all(
        sessionFiles.map(async f => {
          const filePath = path.join(sessionsDir, f);
          try {
            const stat = await fs.stat(filePath);
            return { name: f, path: filePath, stat };
          } catch {
            return null;
          }
        })
      );

      const validFiles = filesWithStats.filter((f): f is NonNullable<typeof f> => f !== null);

      // Sort by modification time (oldest first)
      validFiles.sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs);

      const now = Date.now();
      const maxAgeMs = this.config.maxAgeDays * 24 * 60 * 60 * 1000;
      const filesToDelete: string[] = [];

      // Mark files for deletion based on age
      for (const file of validFiles) {
        const fileAge = now - file.stat.mtimeMs;
        if (fileAge > maxAgeMs) {
          filesToDelete.push(file.path);
        }
      }

      // Also delete if we have too many files (keep newest)
      const remainingFiles = validFiles.filter(f => !filesToDelete.includes(f.path));
      if (remainingFiles.length > this.config.maxFiles) {
        const excessCount = remainingFiles.length - this.config.maxFiles;
        // remainingFiles is already sorted oldest first
        for (let i = 0; i < excessCount; i++) {
          filesToDelete.push(remainingFiles[i].path);
        }
      }

      // Delete marked files
      for (const filePath of filesToDelete) {
        try {
          await fs.unlink(filePath);
        } catch (error) {
          console.error(`Failed to delete old session file ${filePath}:`, error);
        }
      }

      if (filesToDelete.length > 0) {
        console.debug(`Cleaned up ${filesToDelete.length} old session files`);
      }
    } catch (error) {
      console.error('Error during session file cleanup:', error);
    }
  }

  /**
   * Shutdown the exporter
   */
  async shutdown(): Promise<void> {
    // Stop flush timer
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Flush remaining events
    await this.flush();
  }

  /**
   * Get the current session file path (for debugging/testing)
   */
  getCurrentSessionFile(): string | null {
    return this.currentSessionFile;
  }

  /**
   * List all session files in the sessions directory
   */
  async listSessionFiles(): Promise<string[]> {
    const sessionsDir = this.getSessionsDirectory();
    if (!await fs.pathExists(sessionsDir)) {
      return [];
    }
    const files = await fs.readdir(sessionsDir);
    return files.filter(f => f.endsWith('.jsonl')).map(f => path.join(sessionsDir, f));
  }
}
