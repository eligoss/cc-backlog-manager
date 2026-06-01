/**
 * Telemetry Configuration Loader
 * Loads configuration from file (telemetry.config.json) and environment variables
 */

import fs from 'fs-extra';
import path from 'path';
import { TelemetryConfig } from './types.js';

/**
 * Default telemetry configuration
 */
const DEFAULT_CONFIG: TelemetryConfig = {
  enabled: true,
  level: 'info',
  session: {
    enabled: true,
    includeMachineId: false
  },
  exporters: {
    jsonFile: {
      enabled: true,
      path: '.claude/telemetry/events.jsonl',
      maxSize: '10MB',
      rotation: 'daily'
    },
    sessionFile: {
      enabled: true,
      directory: '.claude/telemetry/sessions',
      maxFiles: 50,
      maxAgeDays: 7
    },
    otel: {
      enabled: false,
      endpoint: 'http://localhost:4318',
      serviceName: 'agentic-framework'
    },
    console: {
      enabled: false,
      pretty: true,
      level: 'info',
      colors: true
    }
  },
  instrumentation: {
    discovery: true,
    sync: true,
    cli: true,
    integrations: true,
    validator: true,
    mcp: true,
    agent: false // Opt-in for privacy (tracks Claude commands/agents/subagents)
  }
};

/**
 * Parse boolean from environment variable
 */
function parseBoolean(value: string | undefined, defaultValue: boolean): boolean {
  if (value === undefined) return defaultValue;
  return value.toLowerCase() === 'true' || value === '1';
}

/**
 * Load telemetry configuration from file and environment variables
 *
 * Priority (highest to lowest):
 * 1. Environment variables
 * 2. telemetry.config.json file
 * 3. Default configuration
 *
 * @param projectPath - Path to the project root (where telemetry.config.json might be)
 * @returns Telemetry configuration
 */
export function loadTelemetryConfig(projectPath: string = process.cwd()): TelemetryConfig {
  let config: TelemetryConfig = { ...DEFAULT_CONFIG };

  // Try to load from telemetry.config.json
  const configPath = path.join(projectPath, 'telemetry.config.json');
  if (fs.existsSync(configPath)) {
    try {
      const fileContent = fs.readFileSync(configPath, 'utf-8');
      const fileConfig = JSON.parse(fileContent);

      // Merge file config with defaults (deep merge)
      if (fileConfig.telemetry) {
        config = {
          enabled: fileConfig.telemetry.enabled ?? config.enabled,
          level: fileConfig.telemetry.level ?? config.level,
          session: {
            ...config.session,
            ...(fileConfig.telemetry.session || {})
          },
          exporters: {
            jsonFile: {
              ...config.exporters.jsonFile,
              ...(fileConfig.telemetry.exporters?.jsonFile || {})
            },
            sessionFile: {
              ...config.exporters.sessionFile,
              ...(fileConfig.telemetry.exporters?.sessionFile || {})
            },
            otel: {
              ...config.exporters.otel,
              ...(fileConfig.telemetry.exporters?.otel || {})
            },
            console: {
              ...config.exporters.console,
              ...(fileConfig.telemetry.exporters?.console || {})
            }
          },
          instrumentation: {
            ...config.instrumentation,
            ...(fileConfig.telemetry.instrumentation || {})
          }
        };
      }
    } catch (error) {
      // Silently ignore file read errors, use defaults
      console.warn(`Warning: Failed to load telemetry.config.json: ${error}`);
    }
  }

  // Override with environment variables (highest priority)
  const env = process.env;

  if (env.TELEMETRY_ENABLED !== undefined) {
    config.enabled = parseBoolean(env.TELEMETRY_ENABLED, config.enabled);
  }

  if (env.TELEMETRY_LEVEL) {
    const level = env.TELEMETRY_LEVEL.toLowerCase();
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      config.level = level as 'debug' | 'info' | 'warn' | 'error';
    }
  }

  if (env.TELEMETRY_JSON_ENABLED !== undefined) {
    config.exporters.jsonFile.enabled = parseBoolean(
      env.TELEMETRY_JSON_ENABLED,
      config.exporters.jsonFile.enabled
    );
  }

  if (env.TELEMETRY_JSON_PATH) {
    config.exporters.jsonFile.path = env.TELEMETRY_JSON_PATH;
  }

  if (env.TELEMETRY_OTEL_ENABLED !== undefined) {
    config.exporters.otel.enabled = parseBoolean(
      env.TELEMETRY_OTEL_ENABLED,
      config.exporters.otel.enabled
    );
  }

  if (env.TELEMETRY_OTEL_ENDPOINT) {
    config.exporters.otel.endpoint = env.TELEMETRY_OTEL_ENDPOINT;
  }

  if (env.TELEMETRY_OTEL_SERVICE_NAME) {
    config.exporters.otel.serviceName = env.TELEMETRY_OTEL_SERVICE_NAME;
  }

  // Instrumentation overrides
  if (env.TELEMETRY_INSTR_DISCOVERY !== undefined) {
    config.instrumentation.discovery = parseBoolean(
      env.TELEMETRY_INSTR_DISCOVERY,
      config.instrumentation.discovery
    );
  }

  if (env.TELEMETRY_INSTR_SYNC !== undefined) {
    config.instrumentation.sync = parseBoolean(
      env.TELEMETRY_INSTR_SYNC,
      config.instrumentation.sync
    );
  }

  if (env.TELEMETRY_INSTR_CLI !== undefined) {
    config.instrumentation.cli = parseBoolean(
      env.TELEMETRY_INSTR_CLI,
      config.instrumentation.cli
    );
  }

  if (env.TELEMETRY_INSTR_MCP !== undefined) {
    config.instrumentation.mcp = parseBoolean(
      env.TELEMETRY_INSTR_MCP,
      config.instrumentation.mcp ?? true
    );
  }

  if (env.TELEMETRY_INSTR_AGENT !== undefined) {
    config.instrumentation.agent = parseBoolean(
      env.TELEMETRY_INSTR_AGENT,
      config.instrumentation.agent ?? false
    );
  }

  // Console exporter overrides
  if (env.TELEMETRY_CONSOLE_ENABLED !== undefined) {
    config.exporters.console.enabled = parseBoolean(
      env.TELEMETRY_CONSOLE_ENABLED,
      config.exporters.console.enabled
    );
  }

  if (env.TELEMETRY_CONSOLE_PRETTY !== undefined) {
    config.exporters.console.pretty = parseBoolean(
      env.TELEMETRY_CONSOLE_PRETTY,
      config.exporters.console.pretty
    );
  }

  if (env.TELEMETRY_CONSOLE_COLORS !== undefined) {
    config.exporters.console.colors = parseBoolean(
      env.TELEMETRY_CONSOLE_COLORS,
      config.exporters.console.colors
    );
  }

  if (env.TELEMETRY_CONSOLE_LEVEL) {
    const level = env.TELEMETRY_CONSOLE_LEVEL.toLowerCase();
    if (['debug', 'info', 'warn', 'error'].includes(level)) {
      config.exporters.console.level = level as 'debug' | 'info' | 'warn' | 'error';
    }
  }

  // Session overrides
  if (env.TELEMETRY_SESSION_ENABLED !== undefined) {
    config.session.enabled = parseBoolean(
      env.TELEMETRY_SESSION_ENABLED,
      config.session.enabled
    );
  }

  if (env.TELEMETRY_SESSION_MACHINE_ID !== undefined) {
    config.session.includeMachineId = parseBoolean(
      env.TELEMETRY_SESSION_MACHINE_ID,
      config.session.includeMachineId
    );
  }

  // Session file exporter overrides
  if (env.TELEMETRY_SESSION_FILE_ENABLED !== undefined) {
    config.exporters.sessionFile.enabled = parseBoolean(
      env.TELEMETRY_SESSION_FILE_ENABLED,
      config.exporters.sessionFile.enabled
    );
  }

  if (env.TELEMETRY_SESSION_FILE_DIR) {
    config.exporters.sessionFile.directory = env.TELEMETRY_SESSION_FILE_DIR;
  }

  if (env.TELEMETRY_SESSION_FILE_MAX_FILES) {
    const maxFiles = parseInt(env.TELEMETRY_SESSION_FILE_MAX_FILES, 10);
    if (!isNaN(maxFiles) && maxFiles > 0) {
      config.exporters.sessionFile.maxFiles = maxFiles;
    }
  }

  if (env.TELEMETRY_SESSION_FILE_MAX_AGE_DAYS) {
    const maxAgeDays = parseInt(env.TELEMETRY_SESSION_FILE_MAX_AGE_DAYS, 10);
    if (!isNaN(maxAgeDays) && maxAgeDays > 0) {
      config.exporters.sessionFile.maxAgeDays = maxAgeDays;
    }
  }

  return config;
}

/**
 * Get default configuration
 */
export function getDefaultConfig(): TelemetryConfig {
  return { ...DEFAULT_CONFIG };
}
