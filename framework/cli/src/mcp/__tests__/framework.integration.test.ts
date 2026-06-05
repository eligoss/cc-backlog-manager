/**
 * Integration tests for Framework MCP Tools
 *
 * Tests MCP tool definitions for agentic-framework CLI commands.
 * Focuses on read-only, safe tools without side effects.
 *
 * @module mcp/__tests__/framework.integration.test
 */

import { describe, it, expect, jest } from '@jest/globals';
import type { MCPResult, MCPSuccessResult, MCPErrorResult } from '../types.js';

// Helper to check if result is success
function isSuccess(result: MCPResult): result is MCPSuccessResult {
  return result.success === true;
}

// Helper to check if result is error
function isError(result: MCPResult): result is MCPErrorResult {
  return result.success === false;
}

// Mock all command modules to avoid import.meta.url issues
jest.mock('../../lib/module-loader.js', () => ({
  loadModule: jest.fn(),
  getAvailableModules: jest.fn(() => [
    { id: 'core', name: 'Core Framework', description: 'Framework infrastructure' },
    { id: 'coding', name: 'Coding Module', description: 'Development agents' },
    { id: 'backlog', name: 'Backlog Module', description: 'Ticket management' },
  ]),
  getFrameworkRoot: jest.fn(() => '/mock/framework'),
}));

jest.mock('../../lib/registry-generator.js', () => ({
  generateRegistries: jest.fn(),
  regenerateContextRegistry: jest.fn(),
}));

jest.mock('../../lib/manifest-manager.js', () => ({
  ManifestManager: jest.fn().mockImplementation(() => ({
    load: jest.fn(),
    save: jest.fn(),
  })),
}));

jest.mock('../../lib/sync-engine.js', () => ({
  SyncEngine: jest.fn().mockImplementation(() => ({
    sync: jest.fn(),
  })),
}));

jest.mock('../../commands/init.js', () => ({
  initCommand: jest.fn(async () => {
    console.log('Project initialized successfully');
  }),
}));

jest.mock('../../commands/add.js', () => ({
  addCommand: jest.fn(async () => {
    console.log('Module added successfully');
  }),
}));

jest.mock('../../commands/remove.js', () => ({
  removeCommand: jest.fn(async () => {
    console.log('Module removed successfully');
  }),
}));

jest.mock('../../commands/list.js', () => ({
  listCommand: jest.fn(async () => {
    console.log('Available modules:');
    console.log('  - core (Framework infrastructure)');
    console.log('  - coding (Development agents)');
    console.log('  - backlog (Ticket management)');
  }),
}));

jest.mock('../../commands/status.js', () => ({
  statusCommand: jest.fn(async (options) => {
    if (options.path === '/nonexistent/path/xyz') {
      console.error('Project not found');
      process.exit(1);
    }
    console.log('Framework Status:');
    console.log('  Version: 1.2.0');
    console.log('  Modules: 3 installed');
  }),
}));

jest.mock('../../commands/info.js', () => ({
  infoCommand: jest.fn(async (moduleName) => {
    if (moduleName === 'nonexistent-module-xyz') {
      console.error(`Module '${moduleName}' not found`);
      process.exit(1);
    }
    console.log(`Module: ${moduleName}`);
    console.log('  Version: 1.2.0');
    console.log('  Description: Framework infrastructure module');
  }),
}));

jest.mock('../../commands/update.js', () => ({
  updateCommand: jest.fn(async () => {
    console.log('Framework updated successfully');
  }),
}));

jest.mock('../../commands/sync.js', () => ({
  syncCommand: jest.fn(async () => {
    console.log('Framework synced successfully');
  }),
}));


jest.mock('../../commands/dev.js', () => ({
  devCommand: jest.fn(async () => {
    console.log('Dev setup completed');
  }),
}));

const mockBuild = jest.fn();
jest.mock('../../lib/build/build-engine.js', () => ({
  BuildEngine: jest.fn().mockImplementation(() => ({ build: mockBuild })),
}));

jest.mock('../../lib/cli-context.js', () => ({
  CliContext: {
    create: jest.fn(async () => ({ projectRoot: '/mock/project', manifest: null })),
    require: jest.fn(async () => ({ projectRoot: '/mock/project', manifest: null })),
  },
}));

// Import tools after all mocks are set up
import { listTool, statusTool, infoTool, buildTool } from '../tools/framework.js';

describe('Framework MCP Tools - Integration Tests', () => {
  // Increase timeout for integration tests
  const INTEGRATION_TIMEOUT = 30000;

  describe('Tool Metadata', () => {
    it('all framework tools should have agentic_ prefix', () => {
      const tools = [listTool, statusTool, infoTool, buildTool];

      for (const tool of tools) {
        expect(tool.name).toMatch(/^agentic_/);
      }
    });

    it('all framework tools should have descriptions', () => {
      const tools = [listTool, statusTool, infoTool, buildTool];

      for (const tool of tools) {
        expect(tool.description).toBeTruthy();
        expect(tool.description.length).toBeGreaterThan(10);
      }
    });

    it('all framework tools should have valid input schemas', () => {
      const tools = [listTool, statusTool, infoTool, buildTool];

      for (const tool of tools) {
        expect(tool.inputSchema).toBeDefined();
        expect(typeof tool.inputSchema.parse).toBe('function');
      }
    });
  });

  describe('agentic_list', () => {
    it(
      'should return success result',
      async () => {
        const result = await listTool.handler({ verbose: false });

        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.message).toBeTruthy();
          expect(result.output).toBeTruthy();
        }
      },
      INTEGRATION_TIMEOUT
    );

    it(
      'should list modules in output',
      async () => {
        const result = await listTool.handler({ verbose: false });

        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.output).toBeDefined();
          // Output should mention "modules" or "available"
          expect(result.output?.toLowerCase()).toMatch(/module|available/);
        }
      },
      INTEGRATION_TIMEOUT
    );

    it(
      'should support verbose mode',
      async () => {
        const result = await listTool.handler({ verbose: true });

        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.output).toBeTruthy();
        }
      },
      INTEGRATION_TIMEOUT
    );
  });

  describe('agentic_status', () => {
    it(
      'should return success result with framework status',
      async () => {
        const result = await statusTool.handler({
          path: '.',
          verbose: false,
          json: false,
        });

        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.message).toBeTruthy();
          expect(result.output).toBeTruthy();
        }
      },
      INTEGRATION_TIMEOUT
    );

    it(
      'should show status information in output',
      async () => {
        const result = await statusTool.handler({
          path: '.',
          verbose: false,
          json: false,
        });

        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.output).toBeDefined();
          // Status output should mention version or status-related terms
          expect(result.output?.toLowerCase()).toMatch(/status|version|framework/);
        }
      },
      INTEGRATION_TIMEOUT
    );

    it(
      'should support verbose option',
      async () => {
        const result = await statusTool.handler({
          path: '.',
          verbose: true,
          json: false,
        });

        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.output).toBeTruthy();
        }
      },
      INTEGRATION_TIMEOUT
    );

    it(
      'should support json option',
      async () => {
        const result = await statusTool.handler({
          path: '.',
          verbose: false,
          json: true,
        });

        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.output).toBeTruthy();
        }
      },
      INTEGRATION_TIMEOUT
    );

    it(
      'should handle invalid path gracefully',
      async () => {
        const result = await statusTool.handler({
          path: '/nonexistent/path/xyz',
          verbose: false,
          json: false,
        });

        expect(isError(result)).toBe(true);
        if (isError(result)) {
          expect(result.error.code).toBeDefined();
          expect(result.error.message).toBeTruthy();
        }
      },
      INTEGRATION_TIMEOUT
    );
  });

  describe('agentic_info', () => {
    it(
      'should return success result for valid module',
      async () => {
        const result = await infoTool.handler({ moduleName: 'core' });

        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.data?.module).toBe('core');
          expect(result.message).toContain('core');
          expect(result.output).toBeTruthy();
        }
      },
      INTEGRATION_TIMEOUT
    );

    it(
      'should show module information in output',
      async () => {
        const result = await infoTool.handler({ moduleName: 'core' });

        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.output).toBeDefined();
          // Info output should contain module name
          expect(result.output?.toLowerCase()).toContain('core');
        }
      },
      INTEGRATION_TIMEOUT
    );

    it(
      'should return error for invalid module',
      async () => {
        const result = await infoTool.handler({ moduleName: 'nonexistent-module-xyz' });

        expect(isError(result)).toBe(true);
        if (isError(result)) {
          expect(result.error.code).toBeDefined();
          expect(result.error.message).toBeTruthy();
        }
      },
      INTEGRATION_TIMEOUT
    );
  });

  describe('agentic_build', () => {
    beforeEach(() => {
      mockBuild.mockReset();
    });

    it(
      'should return success result with stats when build passes',
      async () => {
        mockBuild.mockResolvedValue({
          success: true,
          errorCount: 0,
          warningCount: 0,
          stats: { filesChecked: 3, agentsChecked: 5, skillsChecked: 12 },
          issues: [],
        });

        const result = await buildTool.handler({
          path: '.',
          quick: false,
          externalLinks: false,
          emitSchemas: false,
          json: false,
          verbose: false,
          ci: false,
        });

        expect(isSuccess(result)).toBe(true);
        if (isSuccess(result)) {
          expect(result.data?.success).toBe(true);
          expect(result.data?.stats).toBeDefined();
        }
      },
      INTEGRATION_TIMEOUT
    );

    it(
      'should return error result when build reports failures',
      async () => {
        mockBuild.mockResolvedValue({
          success: false,
          errorCount: 2,
          warningCount: 1,
          stats: { filesChecked: 3, agentsChecked: 5, skillsChecked: 12 },
          issues: [],
        });

        const result = await buildTool.handler({
          path: '.',
          quick: false,
          externalLinks: false,
          emitSchemas: false,
          json: false,
          verbose: false,
          ci: false,
        });

        expect(isError(result)).toBe(true);
        if (isError(result)) {
          expect(result.error.message).toContain('Build failed');
        }
      },
      INTEGRATION_TIMEOUT
    );

    it(
      'should return error result when the build engine throws',
      async () => {
        mockBuild.mockRejectedValue(new Error('engine exploded'));

        const result = await buildTool.handler({
          path: '.',
          quick: false,
          externalLinks: false,
          emitSchemas: false,
          json: false,
          verbose: false,
          ci: false,
        });

        expect(isError(result)).toBe(true);
        if (isError(result)) {
          expect(result.error.message).toBeTruthy();
        }
      },
      INTEGRATION_TIMEOUT
    );
  });

  describe('Multiple tools in sequence', () => {
    it(
      'should run list and status in sequence',
      async () => {
        // List modules
        const listResult = await listTool.handler({ verbose: false });
        expect(isSuccess(listResult)).toBe(true);

        // Get status
        const statusResult = await statusTool.handler({
          path: '.',
          verbose: false,
          json: false,
        });
        expect(isSuccess(statusResult)).toBe(true);
      },
      INTEGRATION_TIMEOUT
    );
  });

  describe('Output formats', () => {
    it(
      'should return structured output for all tools',
      async () => {
        const tools = [
          { tool: listTool, args: { verbose: false } },
          { tool: statusTool, args: { path: '.', verbose: false, json: false } },
          { tool: infoTool, args: { moduleName: 'core' } },
        ];

        for (const { tool, args } of tools) {
          const result = await tool.handler(args);
          expect(result).toBeDefined();
          expect(typeof result.success).toBe('boolean');

          if (isSuccess(result)) {
            expect(result.message || result.output).toBeTruthy();
          } else if (isError(result)) {
            expect(result.error.code).toBeDefined();
            expect(result.error.message).toBeTruthy();
          }
        }
      },
      INTEGRATION_TIMEOUT
    );
  });

  describe('Schema validation', () => {
    it('should validate input schema for list tool', () => {
      const validInput = { verbose: false };
      expect(() => listTool.inputSchema.parse(validInput)).not.toThrow();

      const validInputWithVerbose = { verbose: true };
      expect(() => listTool.inputSchema.parse(validInputWithVerbose)).not.toThrow();
    });

    it('should validate input schema for status tool', () => {
      const validInput = { path: '.', verbose: false, json: false };
      expect(() => statusTool.inputSchema.parse(validInput)).not.toThrow();
    });

    it('should validate input schema for info tool', () => {
      const validInput = { moduleName: 'core' };
      expect(() => infoTool.inputSchema.parse(validInput)).not.toThrow();
    });
  });
});
