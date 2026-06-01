/**
 * Console Exporter
 * Exports telemetry events to console with pretty-printed, colorized output
 * Designed for development debugging
 */

import chalk from 'chalk';
import {
  TelemetryEvent,
  TelemetryExporter,
  TelemetryLevel,
  MCPEvent,
  AgentEvent
} from '../types.js';

/**
 * Console exporter configuration
 */
export interface ConsoleExporterConfig {
  /** Enable console exporter */
  enabled: boolean;
  /** Pretty-print events with colors and formatting */
  pretty: boolean;
  /** Log level threshold */
  level: TelemetryLevel;
  /** Enable colors (can be disabled for CI/testing) */
  colors: boolean;
}

/**
 * Event type badges for pretty output
 */
const EVENT_BADGES: Record<string, string> = {
  mcp: 'MCP',
  cli: 'CLI',
  discovery: 'DISC',
  sync: 'SYNC',
  integration: 'INTG',
  validation: 'VALID',
  agent: 'AGENT'
};

/**
 * Console Exporter
 * Exports telemetry events to console with optional pretty-printing
 */
export class ConsoleExporter implements TelemetryExporter {
  private config: ConsoleExporterConfig;

  constructor(config: ConsoleExporterConfig) {
    this.config = config;

    // Disable chalk colors if colors are disabled
    if (!config.colors) {
      chalk.level = 0;
    }
  }

  /**
   * Export a telemetry event to console
   */
  async export(event: TelemetryEvent): Promise<void> {
    try {
      // Skip if level doesn't match threshold
      if (!this.shouldLog(event)) {
        return;
      }

      if (this.config.pretty) {
        this.prettyPrint(event);
      } else {
        console.log(JSON.stringify(event));
      }
    } catch (_error) {
      // Never throw - telemetry failures should not crash the app
      // Silently ignore errors to avoid polluting console
    }
  }

  /**
   * Pretty-print an event with colors and formatting
   */
  private prettyPrint(event: TelemetryEvent): void {
    const timestamp = this.formatTimestamp(event.timestamp);
    const badge = this.getBadge(event.event_type);
    const status = this.getStatus(event);
    const duration = event.duration_ms ? chalk.gray(`${event.duration_ms}ms`) : '';

    // First line: timestamp, badge, operation, status, duration
    const firstLine = `${timestamp}  ${badge}  ${chalk.white(event.operation)} ${status} ${duration}`.trim();
    console.log(firstLine);

    // Event-specific details
    this.printEventDetails(event);

    // Error details if present
    if (event.error) {
      console.log(`  ${chalk.red('Error:')} ${event.error.message}`);
      if (event.error.stack) {
        const stackLines = event.error.stack.split('\n').slice(0, 3);
        stackLines.forEach(line => console.log(chalk.gray(`    ${line}`)));
      }
    }
  }

  /**
   * Print event-specific details
   */
  private printEventDetails(event: TelemetryEvent): void {
    switch (event.event_type) {
      case 'mcp':
        this.printMCPDetails(event);
        break;
      case 'discovery':
        console.log(`  Agent: ${chalk.cyan(event.agent_id)} ${event.variant ? chalk.gray(`(${event.variant})`) : ''}`);
        console.log(`  Skills: ${event.skills_discovered.length} discovered, ${event.unfulfilled_capabilities.length} unfulfilled`);
        break;
      case 'cli': {
        const cmd = event.subcommand ? `${event.command} ${event.subcommand}` : event.command;
        console.log(`  Command: ${chalk.cyan(cmd)}`);
        break;
      }
      case 'integration':
        console.log(`  Type: ${chalk.cyan(event.integration_type)}`);
        if (event.items_processed) console.log(`  Items: ${event.items_processed}`);
        break;
      case 'sync':
        console.log(`  Files: ${event.files_processed} processed, ${event.files_written} written`);
        break;
      case 'validation':
        console.log(`  Validator: ${chalk.cyan(event.validator_type)}`);
        console.log(`  Results: ${event.items_validated} validated, ${event.errors_found} errors, ${event.warnings_found} warnings`);
        break;
      case 'agent':
        this.printAgentDetails(event);
        break;
    }
  }

  /**
   * Print Agent-specific details
   */
  private printAgentDetails(event: AgentEvent): void {
    console.log(`  Type: ${chalk.cyan(event.execution_type)}`);
    console.log(`  Name: ${chalk.cyan(event.name)}`);
    if (event.model) {
      console.log(`  Model: ${chalk.cyan(event.model)}`);
    }
    if (event.parent_agent_id) {
      console.log(`  Parent: ${chalk.gray(event.parent_agent_id)}`);
    }
    if (event.subagent_type) {
      console.log(`  Subagent Type: ${chalk.gray(event.subagent_type)}`);
    }
    if (event.token_usage) {
      const { input_tokens, output_tokens, total_tokens } = event.token_usage;
      console.log(`  Tokens: ${chalk.yellow(total_tokens.toString())} ${chalk.gray(`(in: ${input_tokens}, out: ${output_tokens})`)}`);
    }
    if (event.cost_usd !== undefined) {
      console.log(`  Cost: ${chalk.green(`$${event.cost_usd.toFixed(4)}`)}`);
    }
    if (event.result?.output_summary) {
      console.log(`  Output: ${chalk.gray(event.result.output_summary)}`);
    }
  }

  /**
   * Print MCP-specific details
   */
  private printMCPDetails(event: MCPEvent): void {
    console.log(`  Layer: ${chalk.cyan(event.layer)}`);
    if (event.server_name) {
      console.log(`  Server: ${chalk.cyan(event.server_name)}`);
    }
    if (event.tool_name) {
      console.log(`  Tool: ${chalk.cyan(event.tool_name)}`);
    }
    if (event.token_usage) {
      const { input_tokens, output_tokens, total_tokens } = event.token_usage;
      console.log(`  Tokens: ${chalk.yellow(total_tokens.toString())} ${chalk.gray(`(in: ${input_tokens}, out: ${output_tokens})`)}`);
    }
    if (event.cost_usd !== undefined) {
      console.log(`  Cost: ${chalk.green(`$${event.cost_usd.toFixed(4)}`)}`);
    }
    if (event.result) {
      if (event.result.items_returned !== undefined) {
        console.log(`  Items: ${event.result.items_returned} returned`);
      }
      if (event.result.error_code) {
        console.log(`  Error Code: ${chalk.red(event.result.error_code)}`);
      }
    }
  }

  /**
   * Format timestamp for display
   */
  private formatTimestamp(timestamp: string): string {
    const date = new Date(timestamp);
    return chalk.gray(date.toISOString());
  }

  /**
   * Get colored badge for event type
   */
  private getBadge(eventType: string): string {
    const badge = EVENT_BADGES[eventType] || eventType.toUpperCase();

    // Color badges by event type
    switch (eventType) {
      case 'mcp':
        return chalk.bgMagenta.white.bold(` ${badge} `);
      case 'cli':
        return chalk.bgBlue.white.bold(` ${badge} `);
      case 'discovery':
        return chalk.bgCyan.white.bold(` ${badge} `);
      case 'sync':
        return chalk.bgYellow.black.bold(` ${badge} `);
      case 'integration':
        return chalk.bgGreen.white.bold(` ${badge} `);
      case 'validation':
        return chalk.bgRed.white.bold(` ${badge} `);
      case 'agent':
        return chalk.bgBlue.black.bold(` ${badge} `);
      default:
        return chalk.bgGray.white.bold(` ${badge} `);
    }
  }

  /**
   * Get colored status indicator
   */
  private getStatus(event: TelemetryEvent): string {
    if (event.success === undefined) {
      return '';
    }
    return event.success ? chalk.green('✓') : chalk.red('✗');
  }

  /**
   * Check if event should be logged based on level threshold
   */
  private shouldLog(event: TelemetryEvent): boolean {
    // For now, all events are considered 'info' level
    // Future enhancement: add level field to events
    const levels: TelemetryLevel[] = ['debug', 'info', 'warn', 'error'];
    const eventLevel: TelemetryLevel = event.error ? 'error' : 'info';
    const configLevelIndex = levels.indexOf(this.config.level);
    const eventLevelIndex = levels.indexOf(eventLevel);

    return eventLevelIndex >= configLevelIndex;
  }

  /**
   * Flush (no-op for console exporter)
   */
  async flush(): Promise<void> {
    // Console writes are immediate, no buffering needed
  }

  /**
   * Shutdown (no-op for console exporter)
   */
  async shutdown(): Promise<void> {
    // Nothing to clean up
  }
}
