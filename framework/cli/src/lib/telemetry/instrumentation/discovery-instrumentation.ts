/**
 * Discovery Engine Instrumentation Helpers
 * Helper functions for instrumenting discovery engine operations
 */

import { getTelemetry } from '../telemetry-manager.js';
import type { DiscoveryEvent } from '../types.js';

/**
 * Record a discovery operation
 */
export async function recordDiscoveryOperation(
  agentId: string,
  moduleId: string,
  capabilitiesRequested: string[],
  skillsDiscovered: Array<{ skillId: string; module: string; source: string }>,
  unfulfilledCapabilities: string[],
  durationMs: number,
  variant?: 'full' | 'slim',
  cacheHit?: boolean
): Promise<void> {
  const telemetry = getTelemetry();

  if (!telemetry.isInstrumentationEnabled('discovery')) {
    return;
  }

  const event: Partial<DiscoveryEvent> = {
    event_type: 'discovery',
    operation: 'discover_skills',
    agent_id: agentId,
    module_id: moduleId,
    variant,
    capabilities_requested: capabilitiesRequested,
    skills_discovered: skillsDiscovered.map(s => ({
      skill_id: s.skillId,
      module: s.module,
      source: s.source
    })),
    unfulfilled_capabilities: unfulfilledCapabilities,
    discovery_duration_ms: durationMs,
    cache_hit: cacheHit,
    success: true,
    duration_ms: durationMs
  };

  await telemetry.recordEvent(event);
}

/**
 * Record a module loading operation
 */
export async function recordModuleLoad(
  moduleCount: number,
  durationMs: number,
  success: boolean = true
): Promise<void> {
  const telemetry = getTelemetry();

  if (!telemetry.isInstrumentationEnabled('discovery')) {
    return;
  }

  const event = {
    event_type: 'discovery' as const,
    operation: 'load_modules',
    agent_id: 'system',
    module_id: 'core',
    capabilities_requested: [],
    skills_discovered: [],
    unfulfilled_capabilities: [],
    discovery_duration_ms: durationMs,
    success,
    duration_ms: durationMs
  };

  await telemetry.recordEvent(event);
}

/**
 * Record capability map building
 */
export async function recordCapabilityMapBuild(
  capabilityCount: number,
  durationMs: number
): Promise<void> {
  const telemetry = getTelemetry();

  if (!telemetry.isInstrumentationEnabled('discovery')) {
    return;
  }

  const event = {
    event_type: 'discovery' as const,
    operation: 'build_capability_map',
    agent_id: 'system',
    module_id: 'core',
    capabilities_requested: [],
    skills_discovered: [],
    unfulfilled_capabilities: [],
    discovery_duration_ms: durationMs,
    success: true,
    duration_ms: durationMs
  };

  await telemetry.recordEvent(event);
}
