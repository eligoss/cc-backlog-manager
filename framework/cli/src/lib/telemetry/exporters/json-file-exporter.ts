/**
 * JSON File Exporter
 * Writes telemetry events to JSONL (JSON Lines) files with rotation support
 */

import fs from 'fs-extra';
import path from 'path';
import {
  TelemetryEvent,
  TelemetryExporter,
  JsonFileExporterConfig
} from '../types.js';

/**
 * Parse size string (e.g., "10MB") to bytes
 */
function parseSize(sizeStr: string): number {
  const match = sizeStr.match(/^(\d+)(KB|MB|GB)?$/i);
  if (!match) {
    throw new Error(`Invalid size format: ${sizeStr}`);
  }

  const value = parseInt(match[1], 10);
  const unit = (match[2] || '').toUpperCase();

  switch (unit) {
    case 'KB':
      return value * 1024;
    case 'MB':
      return value * 1024 * 1024;
    case 'GB':
      return value * 1024 * 1024 * 1024;
    default:
      return value;
  }
}

/**
 * Get current date string for rotation (YYYY-MM-DD)
 */
function getCurrentDateStr(): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * JSON File Exporter
 * Exports telemetry events to JSONL files with rotation
 */
export class JsonFileExporter implements TelemetryExporter {
  private config: JsonFileExporterConfig;
  private currentFile: string;
  private currentDate: string;
  private buffer: TelemetryEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly BUFFER_SIZE = 100;
  private readonly FLUSH_INTERVAL_MS = 1000;

  constructor(config: JsonFileExporterConfig, projectPath: string = process.cwd()) {
    this.config = config;
    this.currentDate = getCurrentDateStr();

    // Resolve file path relative to project
    const filePath = path.isAbsolute(config.path)
      ? config.path
      : path.join(projectPath, config.path);

    this.currentFile = filePath;

    // Ensure directory exists
    const dir = path.dirname(this.currentFile);
    fs.ensureDirSync(dir);

    // Start flush timer
    this.startFlushTimer();
  }

  /**
   * Export a telemetry event
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
      console.error('Failed to export telemetry event:', error);
    }
  }

  /**
   * Flush buffered events to file
   */
  async flush(): Promise<void> {
    if (this.buffer.length === 0) return;

    try {
      // Check if rotation is needed
      await this.rotateIfNeeded();

      // Write all buffered events as JSONL
      const lines = this.buffer.map(event => JSON.stringify(event)).join('\n') + '\n';

      // Append to file (create if doesn't exist)
      await fs.appendFile(this.currentFile, lines, 'utf-8');

      // Clear buffer
      this.buffer = [];
    } catch (error) {
      console.error('Failed to flush telemetry events:', error);
      // Keep buffer to try again later
    }
  }

  /**
   * Rotate file if needed based on configuration
   */
  private async rotateIfNeeded(): Promise<void> {
    // Check if file exists
    if (!await fs.pathExists(this.currentFile)) {
      return; // No rotation needed for new file
    }

    let shouldRotate = false;

    // Check rotation strategy
    if (this.config.rotation === 'daily') {
      const currentDate = getCurrentDateStr();
      if (currentDate !== this.currentDate) {
        shouldRotate = true;
        this.currentDate = currentDate;
      }
    } else if (this.config.rotation === 'size') {
      const stats = await fs.stat(this.currentFile);
      const maxSize = parseSize(this.config.maxSize);
      if (stats.size >= maxSize) {
        shouldRotate = true;
      }
    }

    // Perform rotation if needed
    if (shouldRotate) {
      await this.rotateFile();
    }
  }

  /**
   * Rotate the current file
   */
  private async rotateFile(): Promise<void> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const ext = path.extname(this.currentFile);
      const base = this.currentFile.slice(0, -ext.length);
      const rotatedFile = `${base}.${timestamp}${ext}`;

      // Rename current file
      await fs.rename(this.currentFile, rotatedFile);

      // Optionally compress rotated files (future enhancement)
      // await this.compressFile(rotatedFile);

      // Clean up old files (keep last 7 days)
      await this.cleanupOldFiles();
    } catch (error) {
      console.error('Failed to rotate telemetry file:', error);
    }
  }

  /**
   * Clean up old rotated files (keep last 7 days)
   */
  private async cleanupOldFiles(): Promise<void> {
    try {
      const dir = path.dirname(this.currentFile);
      const filename = path.basename(this.currentFile);
      const ext = path.extname(filename);
      const base = filename.slice(0, -ext.length);

      // Find all rotated files
      const files = await fs.readdir(dir);
      const rotatedFiles = files.filter(f => f.startsWith(base) && f !== filename);

      // Sort by modification time (oldest first)
      const filesWithStats = await Promise.all(
        rotatedFiles.map(async f => ({
          name: f,
          stat: await fs.stat(path.join(dir, f))
        }))
      );

      filesWithStats.sort((a, b) => a.stat.mtimeMs - b.stat.mtimeMs);

      // Keep only last 7 files
      const toDelete = filesWithStats.slice(0, -7);
      for (const file of toDelete) {
        await fs.unlink(path.join(dir, file.name));
      }
    } catch (error) {
      console.error('Failed to cleanup old telemetry files:', error);
    }
  }

  /**
   * Start automatic flush timer
   */
  private startFlushTimer(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch(error => {
        console.error('Failed to auto-flush telemetry:', error);
      });
    }, this.FLUSH_INTERVAL_MS);
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
}
