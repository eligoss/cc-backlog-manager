/**
 * OpenTelemetry Exporter
 * Exports telemetry events to OpenTelemetry collector via OTLP HTTP
 */

import { NodeSDK } from '@opentelemetry/sdk-node';
import { resourceFromAttributes } from '@opentelemetry/resources';
import { ATTR_SERVICE_NAME, ATTR_SERVICE_VERSION } from '@opentelemetry/semantic-conventions';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { OTLPMetricExporter } from '@opentelemetry/exporter-metrics-otlp-http';
import {
  PeriodicExportingMetricReader,
} from '@opentelemetry/sdk-metrics';
import { BatchSpanProcessor } from '@opentelemetry/sdk-trace-node';
import * as api from '@opentelemetry/api';
import {
  TelemetryEvent,
  TelemetryExporter,
  OtelExporterConfig
} from '../types.js';

/**
 * OpenTelemetry Exporter
 * Integrates with OpenTelemetry ecosystem via OTLP protocol
 */
export class OtelExporter implements TelemetryExporter {
  private config: OtelExporterConfig;
  private sdk: NodeSDK | null = null;
  private tracer: api.Tracer | null = null;
  private meter: api.Meter | null = null;
  private initialized = false;

  // Metrics
  private eventCounter: api.Counter | null = null;
  private durationHistogram: api.Histogram | null = null;

  constructor(config: OtelExporterConfig) {
    this.config = config;
  }

  /**
   * Initialize OpenTelemetry SDK
   */
  private async initialize(): Promise<void> {
    if (this.initialized) return;

    try {
      // Create resource with service information (OpenTelemetry v2)
      const resource = resourceFromAttributes({
        [ATTR_SERVICE_NAME]: this.config.serviceName,
        [ATTR_SERVICE_VERSION]: '1.0.0' // TODO: Get from package.json
      });

      // Create trace exporter
      const traceExporter = new OTLPTraceExporter({
        url: `${this.config.endpoint}/v1/traces`,
        headers: this.config.headers || {}
      });

      // Create metric exporter
      const metricExporter = new OTLPMetricExporter({
        url: `${this.config.endpoint}/v1/metrics`,
        headers: this.config.headers || {}
      });

      // Create metric reader
      const metricReader = new PeriodicExportingMetricReader({
        exporter: metricExporter,
        exportIntervalMillis: 60000 // Export every 60 seconds
      });

      // Initialize SDK
      // Type casting needed due to OpenTelemetry package version conflicts
      this.sdk = new NodeSDK({
        resource,
        traceExporter,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        spanProcessor: new BatchSpanProcessor(traceExporter) as any,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        metricReader: metricReader as any
      });

      await this.sdk.start();

      // Get tracer and meter
      this.tracer = api.trace.getTracer('agentic-framework', '1.0.0');
      this.meter = api.metrics.getMeter('agentic-framework', '1.0.0');

      // Create metrics
      this.eventCounter = this.meter.createCounter('framework.events', {
        description: 'Total number of telemetry events'
      });

      this.durationHistogram = this.meter.createHistogram('framework.operation.duration', {
        description: 'Operation duration in milliseconds',
        unit: 'ms'
      });

      this.initialized = true;
    } catch (error) {
      console.error('Failed to initialize OpenTelemetry:', error);
      throw error;
    }
  }

  /**
   * Export a telemetry event
   */
  async export(event: TelemetryEvent): Promise<void> {
    try {
      // Lazy initialization
      if (!this.initialized) {
        await this.initialize();
      }

      // Create span for the event
      await this.createSpan(event);

      // Record metrics
      this.recordMetrics(event);
    } catch (error) {
      // Never throw - telemetry failures should not crash the app
      console.error('Failed to export event to OpenTelemetry:', error);
    }
  }

  /**
   * Create a span for the telemetry event
   */
  private async createSpan(event: TelemetryEvent): Promise<void> {
    if (!this.tracer) return;

    const spanName = `${event.event_type}.${event.operation}`;
    const startTime = new Date(event.timestamp).getTime();
    const endTime = event.duration_ms ? startTime + event.duration_ms : Date.now();

    // Create span
    const span = this.tracer.startSpan(spanName, {
      startTime
    });

    try {
      // Set common attributes
      span.setAttribute('gen_ai.operation.name', event.operation);
      span.setAttribute('framework.event_type', event.event_type);

      if (event.success !== undefined) {
        span.setAttribute('framework.success', event.success);
      }

      if (event.duration_ms !== undefined) {
        span.setAttribute('framework.duration_ms', event.duration_ms);
      }

      // Set event-specific attributes
      this.setEventSpecificAttributes(span, event);

      // Record exception if error present
      if (event.error) {
        span.recordException(new Error(event.error.message));
        span.setStatus({ code: api.SpanStatusCode.ERROR });
      } else {
        span.setStatus({ code: api.SpanStatusCode.OK });
      }

      // End span
      span.end(endTime);
    } catch (error) {
      span.recordException(error as Error);
      span.end(endTime);
      throw error;
    }
  }

  /**
   * Set event-specific attributes on span
   */
  private setEventSpecificAttributes(span: api.Span, event: TelemetryEvent): void {
    switch (event.event_type) {
      case 'discovery':
        // OpenTelemetry GenAI Semantic Conventions
        span.setAttribute('gen_ai.system', 'agentic-framework');
        span.setAttribute('gen_ai.agent.id', event.agent_id);
        if (event.variant) {
          span.setAttribute('gen_ai.agent.variant', event.variant);
        }

        // Framework-specific attributes
        span.setAttribute('framework.module', event.module_id);
        span.setAttribute('framework.capabilities_requested', event.capabilities_requested.length);
        span.setAttribute('framework.skills_discovered', event.skills_discovered.length);
        span.setAttribute('framework.unfulfilled_capabilities', event.unfulfilled_capabilities.length);
        if (event.cache_hit !== undefined) {
          span.setAttribute('framework.cache_hit', event.cache_hit);
        }
        break;

      case 'mcp':
        // OpenTelemetry GenAI Semantic Conventions
        span.setAttribute('gen_ai.system', 'mcp');

        // MCP-specific attributes
        span.setAttribute('mcp.layer', event.layer);
        span.setAttribute('mcp.operation.type', event.operation_type);
        if (event.server_name) {
          span.setAttribute('mcp.server.name', event.server_name);
        }
        if (event.tool_name) {
          span.setAttribute('mcp.tool.name', event.tool_name);
        }

        // Token usage (GenAI semantic conventions)
        if (event.token_usage) {
          span.setAttribute('gen_ai.usage.input_tokens', event.token_usage.input_tokens);
          span.setAttribute('gen_ai.usage.output_tokens', event.token_usage.output_tokens);
          span.setAttribute('gen_ai.usage.total_tokens', event.token_usage.total_tokens);
        }

        // Cost tracking
        if (event.cost_usd !== undefined) {
          span.setAttribute('gen_ai.cost_usd', event.cost_usd);
        }

        // Result metadata
        if (event.result) {
          if (event.result.items_returned !== undefined) {
            span.setAttribute('mcp.result.items_returned', event.result.items_returned);
          }
          if (event.result.error_code) {
            span.setAttribute('mcp.result.error_code', event.result.error_code);
          }
        }
        break;

      case 'sync':
        span.setAttribute('framework.files_processed', event.files_processed);
        span.setAttribute('framework.changes_detected', event.changes_detected);
        span.setAttribute('framework.files_written', event.files_written);
        span.setAttribute('framework.errors', event.errors);
        break;

      case 'cli':
        span.setAttribute('cli.command', event.command);
        if (event.subcommand) {
          span.setAttribute('cli.subcommand', event.subcommand);
        }
        break;

      case 'integration':
        span.setAttribute('integration.type', event.integration_type);
        if (event.items_processed !== undefined) {
          span.setAttribute('integration.items_processed', event.items_processed);
        }
        if (event.api_calls !== undefined) {
          span.setAttribute('integration.api_calls', event.api_calls);
        }
        if (event.retries !== undefined) {
          span.setAttribute('integration.retries', event.retries);
        }
        break;

      case 'validation':
        span.setAttribute('framework.validator_type', event.validator_type);
        span.setAttribute('framework.items_validated', event.items_validated);
        span.setAttribute('framework.errors_found', event.errors_found);
        span.setAttribute('framework.warnings_found', event.warnings_found);
        break;

      case 'agent':
        // OpenTelemetry GenAI Semantic Conventions
        span.setAttribute('gen_ai.system', 'claude');
        span.setAttribute('gen_ai.operation.name', event.execution_type);

        // Agent attributes
        span.setAttribute('agent.execution_type', event.execution_type);
        span.setAttribute('agent.name', event.name);
        if (event.model) {
          span.setAttribute('gen_ai.request.model', event.model);
        }
        if (event.parent_agent_id) {
          span.setAttribute('agent.parent_id', event.parent_agent_id);
        }
        if (event.subagent_type) {
          span.setAttribute('agent.subagent_type', event.subagent_type);
        }

        // Token usage (GenAI semantic conventions)
        if (event.token_usage) {
          span.setAttribute('gen_ai.usage.input_tokens', event.token_usage.input_tokens);
          span.setAttribute('gen_ai.usage.output_tokens', event.token_usage.output_tokens);
          span.setAttribute('gen_ai.usage.total_tokens', event.token_usage.total_tokens);
        }

        // Cost tracking
        if (event.cost_usd !== undefined) {
          span.setAttribute('gen_ai.cost_usd', event.cost_usd);
        }
        break;
    }
  }

  /**
   * Record metrics for the event
   */
  private recordMetrics(event: TelemetryEvent): void {
    if (!this.eventCounter || !this.durationHistogram) return;

    // Count events by type
    this.eventCounter.add(1, {
      event_type: event.event_type,
      operation: event.operation,
      success: event.success !== undefined ? String(event.success) : 'unknown'
    });

    // Record duration if present
    if (event.duration_ms !== undefined) {
      this.durationHistogram.record(event.duration_ms, {
        event_type: event.event_type,
        operation: event.operation
      });
    }
  }

  /**
   * Flush pending telemetry data
   */
  async flush(): Promise<void> {
    if (!this.sdk) return;
    // SDK handles flushing automatically
  }

  /**
   * Shutdown the exporter
   */
  async shutdown(): Promise<void> {
    if (this.sdk) {
      await this.sdk.shutdown();
      this.sdk = null;
      this.tracer = null;
      this.meter = null;
      this.initialized = false;
    }
  }
}
