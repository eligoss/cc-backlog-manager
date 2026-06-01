/**
 * Telemetry Manager
 * Core orchestration for telemetry collection and export
 */

import * as api from '@opentelemetry/api';
import path from 'path';
import fs from 'fs-extra';
import {
  TelemetryConfig,
  TelemetryEvent,
  TelemetryExporter,
  TelemetrySpan,
  SpanAttributes,
  SessionContext
} from './types.js';
import { loadTelemetryConfig } from './config.js';
import { JsonFileExporter } from './exporters/json-file-exporter.js';
import { SessionFileExporter } from './exporters/session-file-exporter.js';
import { OtelExporter } from './exporters/otel-exporter.js';
import { ConsoleExporter } from './exporters/console-exporter.js';
import {
  initSession,
  getSessionContext,
  getSessionId,
  hasActiveSession
} from './session-context.js';

/**
 * Find the actual project root for telemetry, rather than using process.cwd()
 *
 * This ensures telemetry is always written to the project root, regardless of
 * where the CLI command was executed from.
 *
 * Detection priority:
 * 1. .agentic-framework.json (framework project)
 * 2. routes.yml + CLAUDE.md (framework project without manifest)
 * 3. .git + CLAUDE.md (git repo with framework)
 * 4. Fallback to process.cwd() if none found
 */
function findProjectRootForTelemetry(startDir: string = process.cwd()): string {
  let currentDir = startDir;
  const root = path.parse(currentDir).root;

  while (currentDir !== root) {
    // Check for .agentic-framework.json (highest priority)
    if (fs.existsSync(path.join(currentDir, '.agentic-framework.json'))) {
      return currentDir;
    }

    // Check for routes.yml + CLAUDE.md
    const hasRoutes = fs.existsSync(path.join(currentDir, 'routes.yml'));
    const hasClaude = fs.existsSync(path.join(currentDir, 'CLAUDE.md'));
    if (hasRoutes && hasClaude) {
      return currentDir;
    }

    // Check for .git + CLAUDE.md (framework development context)
    const hasGit = fs.existsSync(path.join(currentDir, '.git'));
    if (hasGit && hasClaude) {
      return currentDir;
    }

    // Move up one directory
    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) break; // Reached root
    currentDir = parentDir;
  }

  // Fallback to current working directory
  return startDir;
}

/**
 * Telemetry Span implementation
 */
class TelemetrySpanImpl implements TelemetrySpan {
  constructor(
    private otelSpan: api.Span | null,
    private startTime: number
  ) {}

  end(): void {
    if (this.otelSpan) {
      this.otelSpan.end();
    }
  }

  recordException(error: Error): void {
    if (this.otelSpan) {
      this.otelSpan.recordException(error);
      this.otelSpan.setStatus({ code: api.SpanStatusCode.ERROR });
    }
  }

  setAttribute(key: string, value: string | number | boolean): void {
    if (this.otelSpan) {
      this.otelSpan.setAttribute(key, value);
    }
  }

  setAttributes(attributes: SpanAttributes): void {
    if (this.otelSpan) {
      for (const [key, value] of Object.entries(attributes)) {
        if (value !== undefined) {
          this.otelSpan.setAttribute(key, value);
        }
      }
    }
  }

  getDuration(): number {
    return Date.now() - this.startTime;
  }
}

/**
 * Telemetry Manager - Singleton
 * Manages telemetry configuration, exporters, and event emission
 */
export class TelemetryManager {
  private static instance: TelemetryManager | null = null;
  private config: TelemetryConfig;
  private exporters: TelemetryExporter[] = [];
  private initialized = false;
  private tracer: api.Tracer | null = null;
  private sessionContext: SessionContext | null = null;

  private constructor(config: TelemetryConfig, projectPath: string = process.cwd()) {
    this.config = config;

    // Initialize session if enabled
    if (config.enabled && config.session.enabled) {
      this.initializeSession();
    }

    // Initialize exporters if telemetry is enabled
    if (config.enabled) {
      this.initializeExporters(projectPath);
    }
  }

  /**
   * Initialize session context
   */
  private initializeSession(): void {
    try {
      this.sessionContext = initSession({
        includeMachineId: this.config.session.includeMachineId
      });
    } catch (error) {
      console.error('Failed to initialize telemetry session:', error);
    }
  }

  /**
   * Get or create singleton instance
   *
   * @param projectPath - Optional explicit project path. If not provided,
   *                      will auto-detect the project root instead of using process.cwd()
   */
  static getInstance(projectPath?: string): TelemetryManager {
    if (!TelemetryManager.instance) {
      // Auto-detect project root if not explicitly provided
      const resolvedPath = projectPath || findProjectRootForTelemetry();
      const config = loadTelemetryConfig(resolvedPath);

      // Defensive check: ensure config is valid
      if (!config) {
        throw new Error(`Failed to load telemetry config from ${resolvedPath}`);
      }

      TelemetryManager.instance = new TelemetryManager(config, resolvedPath);
    }
    return TelemetryManager.instance;
  }

  /**
   * Reset singleton (for testing)
   */
  static reset(): void {
    if (TelemetryManager.instance) {
      TelemetryManager.instance.shutdown().catch(console.error);
      TelemetryManager.instance = null;
    }
  }

  /**
   * Initialize exporters based on configuration
   */
  private initializeExporters(projectPath: string): void {
    try {
      // Initialize JSON file exporter
      if (this.config.exporters.jsonFile.enabled) {
        const jsonExporter = new JsonFileExporter(
          this.config.exporters.jsonFile,
          projectPath
        );
        this.exporters.push(jsonExporter);
      }

      // Initialize session file exporter
      if (this.config.exporters.sessionFile.enabled && this.config.session.enabled) {
        const sessionExporter = new SessionFileExporter(
          this.config.exporters.sessionFile,
          projectPath
        );
        this.exporters.push(sessionExporter);
      }

      // Initialize OpenTelemetry exporter
      if (this.config.exporters.otel.enabled) {
        const otelExporter = new OtelExporter(this.config.exporters.otel);
        this.exporters.push(otelExporter);

        // Get tracer for span creation
        this.tracer = api.trace.getTracer('agentic-framework', '1.0.0');
      }

      // Initialize console exporter
      if (this.config.exporters.console.enabled) {
        const consoleExporter = new ConsoleExporter(this.config.exporters.console);
        this.exporters.push(consoleExporter);
      }

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize telemetry exporters:', error);
      // Continue without telemetry rather than crashing
    }
  }

  /**
   * Check if telemetry is enabled
   */
  isEnabled(): boolean {
    return this.config.enabled;
  }

  /**
   * Check if a specific instrumentation is enabled
   */
  isInstrumentationEnabled(type: 'discovery' | 'sync' | 'cli' | 'mcp' | 'agent'): boolean {
    if (type === 'mcp') {
      return this.config.enabled && (this.config.instrumentation.mcp ?? true);
    }
    if (type === 'agent') {
      return this.config.enabled && (this.config.instrumentation.agent ?? false);
    }
    return this.config.enabled && this.config.instrumentation[type];
  }

  /**
   * Record a telemetry event
   * @param event - The event to record
   * @param timeoutMs - Max time to wait for export (default 2000ms, 0 = no wait)
   */
  async recordEvent(event: Partial<TelemetryEvent>, timeoutMs: number = 2000): Promise<void> {
    if (!this.config.enabled || !this.initialized) {
      return; // Telemetry disabled
    }

    try {
      // Get current session context
      const sessionContext = getSessionContext();

      // Build full event with timestamp and session context
      const fullEvent: TelemetryEvent = {
        timestamp: new Date().toISOString(),
        // Inject session context if available
        ...(sessionContext && {
          session_id: sessionContext.session_id,
          parent_session_id: sessionContext.parent_session_id,
          correlation_id: sessionContext.correlation_id,
        }),
        // Allow event to override session fields if explicitly provided
        ...event
      } as TelemetryEvent;

      // Export to all exporters in parallel with timeout
      const exportPromise = Promise.all(
        this.exporters.map(exporter =>
          exporter.export(fullEvent).catch(error => {
            if (this.config.level === 'debug') {
              console.error('Exporter failed:', error);
            }
          })
        )
      );

      // If timeout is 0, fire-and-forget
      if (timeoutMs === 0) {
        exportPromise.catch(() => {}); // Ignore errors
        return;
      }

      // Race export against timeout to prevent blocking CLI exit
      const timeoutPromise = new Promise<void>((resolve) => {
        const timer = setTimeout(resolve, timeoutMs);
        timer.unref(); // Don't keep process alive for timeout
      });

      await Promise.race([exportPromise, timeoutPromise]);
    } catch (error) {
      // Never throw from telemetry - failures should not crash the app
      if (this.config.level === 'debug') {
        console.error('Failed to record telemetry event:', error);
      }
    }
  }

  /**
   * Start a telemetry span
   */
  startSpan(name: string, attributes?: SpanAttributes): TelemetrySpan {
    const startTime = Date.now();

    // Return no-op span if telemetry disabled
    if (!this.config.enabled || !this.tracer) {
      return new TelemetrySpanImpl(null, startTime);
    }

    try {
      const otelSpan = this.tracer.startSpan(name);

      // Set attributes if provided
      if (attributes) {
        for (const [key, value] of Object.entries(attributes)) {
          if (value !== undefined) {
            otelSpan.setAttribute(key, value);
          }
        }
      }

      return new TelemetrySpanImpl(otelSpan, startTime);
    } catch (error) {
      console.error('Failed to start span:', error);
      return new TelemetrySpanImpl(null, startTime);
    }
  }

  /**
   * Wrap a function with automatic telemetry
   */
  async withTelemetry<T>(
    name: string,
    fn: () => Promise<T>,
    attributes?: SpanAttributes
  ): Promise<T> {
    const span = this.startSpan(name, attributes);
    const _startTime = Date.now();

    try {
      const result = await fn();
      span.end();
      return result;
    } catch (error) {
      span.recordException(error as Error);
      throw error;
    }
  }

  /**
   * Flush all exporters
   */
  async flush(): Promise<void> {
    await Promise.all(
      this.exporters.map(exporter =>
        exporter.flush?.().catch(error => {
          console.error('Failed to flush exporter:', error);
        })
      )
    );
  }

  /**
   * Shutdown telemetry manager and all exporters
   */
  async shutdown(): Promise<void> {
    await Promise.all(
      this.exporters.map(exporter =>
        exporter.shutdown?.().catch(error => {
          console.error('Failed to shutdown exporter:', error);
        })
      )
    );
    this.initialized = false;
  }

  /**
   * Get current configuration
   */
  getConfig(): TelemetryConfig {
    return this.config;
  }

  /**
   * Get current session ID
   */
  getSessionId(): string | undefined {
    return getSessionId();
  }

  /**
   * Get current session context
   */
  getSessionContext(): SessionContext | undefined {
    return getSessionContext();
  }

  /**
   * Check if session is enabled and active
   */
  isSessionEnabled(): boolean {
    return this.config.session.enabled && hasActiveSession();
  }
}

/**
 * Get default telemetry manager instance
 */
export function getTelemetry(projectPath?: string): TelemetryManager {
  return TelemetryManager.getInstance(projectPath);
}
