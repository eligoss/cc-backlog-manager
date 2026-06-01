/**
 * Discovery Instrumentation Tests
 * Unit tests for discovery engine instrumentation helpers
 */

import { getTelemetry } from '../telemetry-manager';
import {
  recordDiscoveryOperation,
  recordModuleLoad,
  recordCapabilityMapBuild,
} from '../instrumentation/discovery-instrumentation';
import type { DiscoveryEvent } from '../types';

// Mock telemetry manager
jest.mock('../telemetry-manager');

describe('discovery-instrumentation', () => {
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

  describe('recordDiscoveryOperation', () => {
    const validParams = {
      agentId: 'ai-architect',
      moduleId: 'coding',
      capabilitiesRequested: ['design-patterns', 'architecture'],
      skillsDiscovered: [
        { skillId: 'architecture-design', module: 'coding', source: 'module' },
        { skillId: 'design-review', module: 'coding', source: 'registry' },
      ],
      unfulfilledCapabilities: ['advanced-ml'],
      durationMs: 150,
      variant: 'full' as const,
      cacheHit: false,
    };

    it('should record discovery operation with all parameters', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordDiscoveryOperation(
        validParams.agentId,
        validParams.moduleId,
        validParams.capabilitiesRequested,
        validParams.skillsDiscovered,
        validParams.unfulfilledCapabilities,
        validParams.durationMs,
        validParams.variant,
        validParams.cacheHit
      );

      expect(mockTelemetry.isInstrumentationEnabled).toHaveBeenCalledWith('discovery');
      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<DiscoveryEvent>;
      expect(recordedEvent).toMatchObject({
        event_type: 'discovery',
        operation: 'discover_skills',
        agent_id: validParams.agentId,
        module_id: validParams.moduleId,
        variant: validParams.variant,
        capabilities_requested: validParams.capabilitiesRequested,
        skills_discovered: validParams.skillsDiscovered.map(s => ({
          skill_id: s.skillId,
          module: s.module,
          source: s.source,
        })),
        unfulfilled_capabilities: validParams.unfulfilledCapabilities,
        discovery_duration_ms: validParams.durationMs,
        cache_hit: validParams.cacheHit,
        success: true,
        duration_ms: validParams.durationMs,
      });
    });

    it('should record discovery operation without optional parameters', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordDiscoveryOperation(
        validParams.agentId,
        validParams.moduleId,
        validParams.capabilitiesRequested,
        validParams.skillsDiscovered,
        validParams.unfulfilledCapabilities,
        validParams.durationMs
      );

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<DiscoveryEvent>;
      expect(recordedEvent.variant).toBeUndefined();
      expect(recordedEvent.cache_hit).toBeUndefined();
    });

    it('should record discovery operation with cache hit', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordDiscoveryOperation(
        validParams.agentId,
        validParams.moduleId,
        validParams.capabilitiesRequested,
        validParams.skillsDiscovered,
        validParams.unfulfilledCapabilities,
        validParams.durationMs,
        'slim',
        true
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<DiscoveryEvent>;
      expect(recordedEvent.cache_hit).toBe(true);
      expect(recordedEvent.variant).toBe('slim');
    });

    it('should record discovery operation with empty skills discovered', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordDiscoveryOperation(
        validParams.agentId,
        validParams.moduleId,
        ['non-existent-capability'],
        [],
        ['non-existent-capability'],
        validParams.durationMs
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<DiscoveryEvent>;
      expect(recordedEvent.skills_discovered).toEqual([]);
      expect(recordedEvent.unfulfilled_capabilities).toEqual(['non-existent-capability']);
    });

    it('should record discovery operation with multiple skills', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const manySkills = [
        { skillId: 'skill-1', module: 'core', source: 'module' },
        { skillId: 'skill-2', module: 'planning', source: 'registry' },
        { skillId: 'skill-3', module: 'coding', source: 'module' },
      ];

      await recordDiscoveryOperation(
        validParams.agentId,
        validParams.moduleId,
        ['cap-1', 'cap-2', 'cap-3'],
        manySkills,
        [],
        validParams.durationMs
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<DiscoveryEvent>;
      expect(recordedEvent.skills_discovered).toHaveLength(3);
      expect(recordedEvent.unfulfilled_capabilities).toEqual([]);
    });

    it('should not record event when instrumentation is disabled', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(false);

      await recordDiscoveryOperation(
        validParams.agentId,
        validParams.moduleId,
        validParams.capabilitiesRequested,
        validParams.skillsDiscovered,
        validParams.unfulfilledCapabilities,
        validParams.durationMs,
        validParams.variant,
        validParams.cacheHit
      );

      expect(mockTelemetry.isInstrumentationEnabled).toHaveBeenCalledWith('discovery');
      expect(mockTelemetry.recordEvent).not.toHaveBeenCalled();
    });

    it('should properly map skill data structure', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      const skills = [
        { skillId: 'test-skill', module: 'test-module', source: 'test-source' },
      ];

      await recordDiscoveryOperation(
        validParams.agentId,
        validParams.moduleId,
        validParams.capabilitiesRequested,
        skills,
        validParams.unfulfilledCapabilities,
        validParams.durationMs
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<DiscoveryEvent>;
      expect(recordedEvent.skills_discovered).toEqual([
        {
          skill_id: 'test-skill',
          module: 'test-module',
          source: 'test-source',
        },
      ]);
    });

    it('should always set success to true', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordDiscoveryOperation(
        validParams.agentId,
        validParams.moduleId,
        validParams.capabilitiesRequested,
        [],
        validParams.capabilitiesRequested,
        validParams.durationMs
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<DiscoveryEvent>;
      expect(recordedEvent.success).toBe(true);
    });

    it('should set duration_ms equal to discovery_duration_ms', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);
      const duration = 250;

      await recordDiscoveryOperation(
        validParams.agentId,
        validParams.moduleId,
        validParams.capabilitiesRequested,
        validParams.skillsDiscovered,
        validParams.unfulfilledCapabilities,
        duration
      );

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<DiscoveryEvent>;
      expect(recordedEvent.duration_ms).toBe(duration);
      expect(recordedEvent.discovery_duration_ms).toBe(duration);
    });
  });

  describe('recordModuleLoad', () => {
    it('should record module load with default success', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordModuleLoad(5, 100);

      expect(mockTelemetry.isInstrumentationEnabled).toHaveBeenCalledWith('discovery');
      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0];
      expect(recordedEvent).toMatchObject({
        event_type: 'discovery',
        operation: 'load_modules',
        agent_id: 'system',
        module_id: 'core',
        capabilities_requested: [],
        skills_discovered: [],
        unfulfilled_capabilities: [],
        discovery_duration_ms: 100,
        success: true,
        duration_ms: 100,
      });
    });

    it('should record module load with success=true', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordModuleLoad(3, 75, true);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0];
      expect(recordedEvent.success).toBe(true);
    });

    it('should record module load with success=false', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordModuleLoad(2, 50, false);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0];
      expect(recordedEvent.success).toBe(false);
    });

    it('should not record event when instrumentation is disabled', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(false);

      await recordModuleLoad(5, 100);

      expect(mockTelemetry.recordEvent).not.toHaveBeenCalled();
    });

    it('should handle zero modules loaded', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordModuleLoad(0, 10);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0];
      expect(recordedEvent.success).toBe(true);
    });

    it('should always use system agent and core module', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordModuleLoad(10, 200);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0];
      expect(recordedEvent.agent_id).toBe('system');
      expect(recordedEvent.module_id).toBe('core');
    });
  });

  describe('recordCapabilityMapBuild', () => {
    it('should record capability map build operation', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordCapabilityMapBuild(25, 80);

      expect(mockTelemetry.isInstrumentationEnabled).toHaveBeenCalledWith('discovery');
      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0];
      expect(recordedEvent).toMatchObject({
        event_type: 'discovery',
        operation: 'build_capability_map',
        agent_id: 'system',
        module_id: 'core',
        capabilities_requested: [],
        skills_discovered: [],
        unfulfilled_capabilities: [],
        discovery_duration_ms: 80,
        success: true,
        duration_ms: 80,
      });
    });

    it('should handle zero capabilities', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordCapabilityMapBuild(0, 5);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0];
      expect(recordedEvent.success).toBe(true);
      expect(recordedEvent.duration_ms).toBe(5);
    });

    it('should handle large capability counts', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordCapabilityMapBuild(1000, 500);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0];
      expect(recordedEvent.success).toBe(true);
      expect(recordedEvent.duration_ms).toBe(500);
    });

    it('should not record event when instrumentation is disabled', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(false);

      await recordCapabilityMapBuild(25, 80);

      expect(mockTelemetry.recordEvent).not.toHaveBeenCalled();
    });

    it('should always use system agent and core module', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordCapabilityMapBuild(50, 120);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0];
      expect(recordedEvent.agent_id).toBe('system');
      expect(recordedEvent.module_id).toBe('core');
    });

    it('should always set success to true', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordCapabilityMapBuild(15, 60);

      const recordedEvent = mockTelemetry.recordEvent.mock.calls[0][0];
      expect(recordedEvent.success).toBe(true);
    });
  });

  describe('integration scenarios', () => {
    it('should handle multiple discovery operations in sequence', async () => {
      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordDiscoveryOperation(
        'agent-1',
        'module-1',
        ['cap-1'],
        [{ skillId: 'skill-1', module: 'mod-1', source: 'src-1' }],
        [],
        100
      );

      await recordDiscoveryOperation(
        'agent-2',
        'module-2',
        ['cap-2'],
        [{ skillId: 'skill-2', module: 'mod-2', source: 'src-2' }],
        [],
        150
      );

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(2);

      const firstEvent = mockTelemetry.recordEvent.mock.calls[0][0] as Partial<DiscoveryEvent>;
      const secondEvent = mockTelemetry.recordEvent.mock.calls[1][0] as Partial<DiscoveryEvent>;

      expect(firstEvent.agent_id).toBe('agent-1');
      expect(secondEvent.agent_id).toBe('agent-2');
    });

    it('should handle mixed enabled/disabled instrumentation', async () => {
      mockTelemetry.isInstrumentationEnabled
        .mockReturnValueOnce(true)
        .mockReturnValueOnce(false)
        .mockReturnValueOnce(true);

      await recordDiscoveryOperation(
        'agent-1',
        'module-1',
        [],
        [],
        [],
        100
      );

      await recordModuleLoad(5, 50);

      await recordCapabilityMapBuild(10, 30);

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(2);
    });

    it('should handle getTelemetry returning different instances', async () => {
      const mockTelemetry2 = {
        isInstrumentationEnabled: jest.fn().mockReturnValue(true),
        recordEvent: jest.fn().mockResolvedValue(undefined),
      };

      (getTelemetry as jest.Mock)
        .mockReturnValueOnce(mockTelemetry)
        .mockReturnValueOnce(mockTelemetry2);

      mockTelemetry.isInstrumentationEnabled.mockReturnValue(true);

      await recordDiscoveryOperation(
        'agent-1',
        'module-1',
        [],
        [],
        [],
        100
      );

      await recordModuleLoad(5, 50);

      expect(mockTelemetry.recordEvent).toHaveBeenCalledTimes(1);
      expect(mockTelemetry2.recordEvent).toHaveBeenCalledTimes(1);
    });
  });
});
