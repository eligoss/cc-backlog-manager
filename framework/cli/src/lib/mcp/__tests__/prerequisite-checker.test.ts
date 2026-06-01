/**
 * Unit tests for MCP Prerequisite Checker
 *
 * Tests prerequisite detection for Docker, Graphiti, and Serena.
 * Mocks exec calls to simulate various system states.
 *
 * @module lib/mcp/__tests__/prerequisite-checker.test
 */

import { exec } from 'child_process';
import { promisify } from 'util';
import {
  checkDocker,
  checkGraphiti,
  checkSerena,
  checkAllPrerequisites,
  isGraphitiReady,
  isSerenaReady,
  isAnyMcpReady,
  getMissingPrerequisites,
  type DockerStatus,
  type GraphitiStatus,
  type SerenaStatus,
  type McpPrerequisites,
} from '../prerequisite-checker.js';

// Mock child_process exec
jest.mock('child_process', () => ({
  exec: jest.fn(),
}));

// Mock promisify to return our mocked exec
jest.mock('util', () => ({
  promisify: jest.fn((fn) => fn),
}));

const mockExec = exec as jest.MockedFunction<typeof exec>;

describe('MCP Prerequisite Checker', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('checkDocker', () => {
    it('should detect Docker installed and running', async () => {
      mockExec
        .mockResolvedValueOnce({
          stdout: 'Docker version 24.0.5, build ced0996',
          stderr: '',
        } as never)
        .mockResolvedValueOnce({
          stdout: 'Docker info output',
          stderr: '',
        } as never);

      const result = await checkDocker();

      expect(result).toEqual({
        available: true,
        running: true,
        version: '24.0.5',
      });
      expect(mockExec).toHaveBeenCalledTimes(2);
      expect(mockExec).toHaveBeenCalledWith('docker --version', { timeout: 5000 });
      expect(mockExec).toHaveBeenCalledWith('docker info', { timeout: 10000 });
    });

    it('should detect Docker installed but not running', async () => {
      mockExec
        .mockResolvedValueOnce({
          stdout: 'Docker version 24.0.5, build ced0996',
          stderr: '',
        } as never)
        .mockRejectedValueOnce(new Error('Cannot connect to Docker daemon') as never);

      const result = await checkDocker();

      expect(result).toEqual({
        available: true,
        running: false,
        version: '24.0.5',
        error: 'Docker is installed but the daemon is not running',
      });
    });

    it('should detect Docker not installed', async () => {
      mockExec.mockRejectedValueOnce(new Error('docker: command not found') as never);

      const result = await checkDocker();

      expect(result).toEqual({
        available: false,
        running: false,
        error: 'Docker is not installed or not in PATH',
      });
    });

    it('should handle version string without version number', async () => {
      mockExec
        .mockResolvedValueOnce({
          stdout: 'Docker version unknown',
          stderr: '',
        } as never)
        .mockResolvedValueOnce({
          stdout: 'Docker info',
          stderr: '',
        } as never);

      const result = await checkDocker();

      expect(result).toEqual({
        available: true,
        running: true,
        version: undefined,
      });
    });

    it('should respect timeout for docker --version', async () => {
      mockExec.mockRejectedValueOnce(
        Object.assign(new Error('Timeout'), { killed: true, code: 'ETIMEDOUT' }) as never
      );

      const result = await checkDocker();

      expect(result.available).toBe(false);
      expect(mockExec).toHaveBeenCalledWith('docker --version', { timeout: 5000 });
    });

    it('should respect timeout for docker info', async () => {
      mockExec
        .mockResolvedValueOnce({
          stdout: 'Docker version 24.0.5, build ced0996',
          stderr: '',
        } as never)
        .mockRejectedValueOnce(
          Object.assign(new Error('Timeout'), { killed: true, code: 'ETIMEDOUT' }) as never
        );

      const result = await checkDocker();

      expect(result.running).toBe(false);
      expect(mockExec).toHaveBeenCalledWith('docker info', { timeout: 10000 });
    });
  });

  describe('checkGraphiti', () => {
    it('should detect Graphiti containers running', async () => {
      mockExec.mockResolvedValueOnce({
        stdout: 'graphiti-server:Up 2 hours\nfalkordb:Up 2 hours\n',
        stderr: '',
      } as never);

      const result = await checkGraphiti();

      expect(result).toEqual({
        containerExists: true,
        containerRunning: true,
        containerNames: ['graphiti-server', 'falkordb'],
        endpoint: 'http://localhost:8000',
      });
    });

    it('should detect Graphiti containers exist but not running', async () => {
      mockExec.mockResolvedValueOnce({
        stdout: 'graphiti-server:Exited (0) 5 minutes ago\nfalkordb:Exited (0) 5 minutes ago\n',
        stderr: '',
      } as never);

      const result = await checkGraphiti();

      expect(result).toEqual({
        containerExists: true,
        containerRunning: false,
        containerNames: ['graphiti-server', 'falkordb'],
        endpoint: undefined,
      });
    });

    it('should detect no Graphiti containers', async () => {
      mockExec.mockResolvedValueOnce({
        stdout: '',
        stderr: '',
      } as never);

      const result = await checkGraphiti();

      expect(result).toEqual({
        containerExists: false,
        containerRunning: false,
        containerNames: [],
        error: 'No Graphiti-related containers found',
      });
    });

    it('should handle Docker not running', async () => {
      mockExec.mockRejectedValueOnce(
        new Error('Cannot connect to Docker daemon') as never
      );

      const result = await checkGraphiti();

      expect(result).toEqual({
        containerExists: false,
        containerRunning: false,
        containerNames: [],
        error: 'Could not check Graphiti containers (Docker may not be running)',
      });
    });

    it('should detect Neo4j containers as Graphiti-related', async () => {
      mockExec.mockResolvedValueOnce({
        stdout: 'neo4j:Up 1 hour\n',
        stderr: '',
      } as never);

      const result = await checkGraphiti();

      expect(result.containerExists).toBe(true);
      expect(result.containerNames).toContain('neo4j');
    });

    it('should handle mixed running/stopped containers', async () => {
      mockExec.mockResolvedValueOnce({
        stdout: 'graphiti-server:Up 1 hour\nfalkordb:Exited (0) 5 minutes ago\n',
        stderr: '',
      } as never);

      const result = await checkGraphiti();

      expect(result.containerExists).toBe(true);
      expect(result.containerRunning).toBe(true); // At least one is running
      expect(result.endpoint).toBe('http://localhost:8000');
    });

    it('should respect timeout', async () => {
      mockExec.mockRejectedValueOnce(
        Object.assign(new Error('Timeout'), { killed: true, code: 'ETIMEDOUT' }) as never
      );

      const result = await checkGraphiti();

      expect(result.containerRunning).toBe(false);
      expect(mockExec).toHaveBeenCalledWith(
        expect.stringContaining('docker ps'),
        { timeout: 10000 }
      );
    });
  });

  describe('checkSerena', () => {
    it('should detect uvx and Serena available', async () => {
      mockExec
        .mockResolvedValueOnce({
          stdout: 'uvx 0.1.0\n',
          stderr: '',
        } as never)
        .mockResolvedValueOnce({
          stdout: 'serena 1.2.3\n',
          stderr: '',
        } as never);

      const result = await checkSerena();

      expect(result).toEqual({
        uvxAvailable: true,
        uvxVersion: '0.1.0',
        serenaAvailable: true,
        serenaVersion: '1.2.3',
        error: undefined,
      });
    });

    it('should detect uvx available but Serena not cached', async () => {
      mockExec
        .mockResolvedValueOnce({
          stdout: 'uvx 0.1.0\n',
          stderr: '',
        } as never)
        .mockResolvedValueOnce({
          stdout: 'not-cached\n',
          stderr: '',
        } as never);

      const result = await checkSerena();

      expect(result).toEqual({
        uvxAvailable: true,
        uvxVersion: '0.1.0',
        serenaAvailable: false,
        serenaVersion: undefined,
        error: undefined,
      });
    });

    it('should detect uvx not installed', async () => {
      mockExec.mockRejectedValueOnce(new Error('uvx: command not found') as never);

      const result = await checkSerena();

      expect(result).toEqual({
        uvxAvailable: false,
        uvxVersion: undefined,
        serenaAvailable: false,
        serenaVersion: undefined,
        error: 'uvx is not installed (required for Serena)',
      });
    });

    it('should detect pipx as fallback when uvx not found', async () => {
      mockExec
        .mockRejectedValueOnce(new Error('uvx: command not found') as never)
        .mockResolvedValueOnce({
          stdout: '1.4.0\n',
          stderr: '',
        } as never);

      const result = await checkSerena();

      expect(result.uvxAvailable).toBe(false);
      expect(result.error).toContain('pipx is available');
      expect(result.error).toContain('uvx is recommended');
    });

    it('should handle Serena version check timeout', async () => {
      mockExec
        .mockResolvedValueOnce({
          stdout: 'uvx 0.1.0\n',
          stderr: '',
        } as never)
        .mockRejectedValueOnce(
          Object.assign(new Error('Timeout'), { killed: true, code: 'ETIMEDOUT' }) as never
        );

      const result = await checkSerena();

      expect(result.uvxAvailable).toBe(true);
      expect(result.serenaAvailable).toBe(false);
      expect(result.error).toContain('timed out');
    });

    it('should handle uvx version without version number', async () => {
      mockExec
        .mockResolvedValueOnce({
          stdout: 'uvx version unknown\n',
          stderr: '',
        } as never)
        .mockResolvedValueOnce({
          stdout: 'serena version unknown\n',
          stderr: '',
        } as never);

      const result = await checkSerena();

      expect(result.uvxAvailable).toBe(true);
      expect(result.uvxVersion).toBe('uvx version unknown');
    });

    it('should handle Serena check error (not timeout)', async () => {
      mockExec
        .mockResolvedValueOnce({
          stdout: 'uvx 0.1.0\n',
          stderr: '',
        } as never)
        .mockRejectedValueOnce(new Error('Permission denied') as never);

      const result = await checkSerena();

      expect(result.uvxAvailable).toBe(true);
      expect(result.serenaAvailable).toBe(false);
    });

    it('should respect timeout for uvx check', async () => {
      mockExec.mockRejectedValueOnce(
        Object.assign(new Error('Timeout'), { killed: true, code: 'ETIMEDOUT' }) as never
      );

      await checkSerena();

      expect(mockExec).toHaveBeenCalledWith('uvx --version', { timeout: 5000 });
    });

    it('should respect timeout for Serena check', async () => {
      mockExec
        .mockResolvedValueOnce({
          stdout: 'uvx 0.1.0\n',
          stderr: '',
        } as never)
        .mockRejectedValueOnce(
          Object.assign(new Error('Timeout'), { killed: true, code: 'ETIMEDOUT' }) as never
        );

      await checkSerena();

      expect(mockExec).toHaveBeenNthCalledWith(
        2,
        expect.stringContaining('uvx serena --version'),
        { timeout: 15000 }
      );
    });
  });

  describe('checkAllPrerequisites', () => {
    it('should check all prerequisites in parallel', async () => {
      // Mock Docker
      mockExec
        .mockResolvedValueOnce({
          stdout: 'Docker version 24.0.5, build ced0996',
          stderr: '',
        } as never)
        .mockResolvedValueOnce({
          stdout: 'Docker info',
          stderr: '',
        } as never);

      // Mock Graphiti
      mockExec.mockResolvedValueOnce({
        stdout: 'graphiti-server:Up 1 hour\n',
        stderr: '',
      } as never);

      // Mock Serena
      mockExec
        .mockResolvedValueOnce({
          stdout: 'uvx 0.1.0\n',
          stderr: '',
        } as never)
        .mockResolvedValueOnce({
          stdout: 'serena 1.2.3\n',
          stderr: '',
        } as never);

      const result = await checkAllPrerequisites();

      expect(result.docker.available).toBe(true);
      expect(result.graphiti.containerExists).toBe(true);
      expect(result.serena.uvxAvailable).toBe(true);
      expect(result.timestamp).toBeDefined();
      expect(new Date(result.timestamp)).toBeInstanceOf(Date);
    });

    it('should return valid timestamp', async () => {
      mockExec.mockResolvedValue({
        stdout: '',
        stderr: '',
      } as never);

      const before = new Date();
      const result = await checkAllPrerequisites();
      const after = new Date();

      const timestamp = new Date(result.timestamp);
      expect(timestamp.getTime()).toBeGreaterThanOrEqual(before.getTime());
      expect(timestamp.getTime()).toBeLessThanOrEqual(after.getTime());
    });
  });

  describe('isGraphitiReady', () => {
    it('should return true when Docker and Graphiti are ready', () => {
      const prereqs: McpPrerequisites = {
        docker: { available: true, running: true, version: '24.0.5' },
        graphiti: {
          containerExists: true,
          containerRunning: true,
          containerNames: ['graphiti'],
          endpoint: 'http://localhost:8000',
        },
        serena: { uvxAvailable: false, serenaAvailable: false },
        timestamp: new Date().toISOString(),
      };

      expect(isGraphitiReady(prereqs)).toBe(true);
    });

    it('should return false when Docker is not running', () => {
      const prereqs: McpPrerequisites = {
        docker: {
          available: true,
          running: false,
          error: 'Docker daemon not running',
        },
        graphiti: {
          containerExists: true,
          containerRunning: true,
          containerNames: ['graphiti'],
        },
        serena: { uvxAvailable: false, serenaAvailable: false },
        timestamp: new Date().toISOString(),
      };

      expect(isGraphitiReady(prereqs)).toBe(false);
    });

    it('should return false when Graphiti containers are not running', () => {
      const prereqs: McpPrerequisites = {
        docker: { available: true, running: true, version: '24.0.5' },
        graphiti: {
          containerExists: true,
          containerRunning: false,
          containerNames: ['graphiti'],
        },
        serena: { uvxAvailable: false, serenaAvailable: false },
        timestamp: new Date().toISOString(),
      };

      expect(isGraphitiReady(prereqs)).toBe(false);
    });
  });

  describe('isSerenaReady', () => {
    it('should return true when uvx is available', () => {
      const prereqs: McpPrerequisites = {
        docker: { available: false, running: false },
        graphiti: {
          containerExists: false,
          containerRunning: false,
          containerNames: [],
        },
        serena: {
          uvxAvailable: true,
          uvxVersion: '0.1.0',
          serenaAvailable: true,
          serenaVersion: '1.2.3',
        },
        timestamp: new Date().toISOString(),
      };

      expect(isSerenaReady(prereqs)).toBe(true);
    });

    it('should return false when uvx is not available', () => {
      const prereqs: McpPrerequisites = {
        docker: { available: false, running: false },
        graphiti: {
          containerExists: false,
          containerRunning: false,
          containerNames: [],
        },
        serena: {
          uvxAvailable: false,
          serenaAvailable: false,
          error: 'uvx not installed',
        },
        timestamp: new Date().toISOString(),
      };

      expect(isSerenaReady(prereqs)).toBe(false);
    });
  });

  describe('isAnyMcpReady', () => {
    it('should return true when Graphiti is ready', () => {
      const prereqs: McpPrerequisites = {
        docker: { available: true, running: true },
        graphiti: {
          containerExists: true,
          containerRunning: true,
          containerNames: ['graphiti'],
        },
        serena: { uvxAvailable: false, serenaAvailable: false },
        timestamp: new Date().toISOString(),
      };

      expect(isAnyMcpReady(prereqs)).toBe(true);
    });

    it('should return true when Serena is ready', () => {
      const prereqs: McpPrerequisites = {
        docker: { available: false, running: false },
        graphiti: {
          containerExists: false,
          containerRunning: false,
          containerNames: [],
        },
        serena: { uvxAvailable: true, serenaAvailable: true },
        timestamp: new Date().toISOString(),
      };

      expect(isAnyMcpReady(prereqs)).toBe(true);
    });

    it('should return true when both are ready', () => {
      const prereqs: McpPrerequisites = {
        docker: { available: true, running: true },
        graphiti: {
          containerExists: true,
          containerRunning: true,
          containerNames: ['graphiti'],
        },
        serena: { uvxAvailable: true, serenaAvailable: true },
        timestamp: new Date().toISOString(),
      };

      expect(isAnyMcpReady(prereqs)).toBe(true);
    });

    it('should return false when neither is ready', () => {
      const prereqs: McpPrerequisites = {
        docker: { available: false, running: false },
        graphiti: {
          containerExists: false,
          containerRunning: false,
          containerNames: [],
        },
        serena: { uvxAvailable: false, serenaAvailable: false },
        timestamp: new Date().toISOString(),
      };

      expect(isAnyMcpReady(prereqs)).toBe(false);
    });
  });

  describe('getMissingPrerequisites', () => {
    it('should return empty array when all prerequisites are met', () => {
      const prereqs: McpPrerequisites = {
        docker: { available: true, running: true, version: '24.0.5' },
        graphiti: {
          containerExists: true,
          containerRunning: true,
          containerNames: ['graphiti'],
        },
        serena: { uvxAvailable: true, serenaAvailable: true },
        timestamp: new Date().toISOString(),
      };

      expect(getMissingPrerequisites(prereqs)).toEqual([]);
    });

    it('should detect Docker not installed', () => {
      const prereqs: McpPrerequisites = {
        docker: { available: false, running: false },
        graphiti: {
          containerExists: false,
          containerRunning: false,
          containerNames: [],
        },
        serena: { uvxAvailable: true, serenaAvailable: true },
        timestamp: new Date().toISOString(),
      };

      const missing = getMissingPrerequisites(prereqs);
      expect(missing).toContain('Docker is not installed');
    });

    it('should detect Docker daemon not running', () => {
      const prereqs: McpPrerequisites = {
        docker: { available: true, running: false },
        graphiti: {
          containerExists: true,
          containerRunning: false,
          containerNames: ['graphiti'],
        },
        serena: { uvxAvailable: true, serenaAvailable: true },
        timestamp: new Date().toISOString(),
      };

      const missing = getMissingPrerequisites(prereqs);
      expect(missing).toContain('Docker daemon is not running');
    });

    it('should detect Graphiti containers not set up', () => {
      const prereqs: McpPrerequisites = {
        docker: { available: true, running: true },
        graphiti: {
          containerExists: false,
          containerRunning: false,
          containerNames: [],
        },
        serena: { uvxAvailable: true, serenaAvailable: true },
        timestamp: new Date().toISOString(),
      };

      const missing = getMissingPrerequisites(prereqs);
      expect(missing).toContain('Graphiti containers are not set up');
    });

    it('should detect Graphiti containers not running', () => {
      const prereqs: McpPrerequisites = {
        docker: { available: true, running: true },
        graphiti: {
          containerExists: true,
          containerRunning: false,
          containerNames: ['graphiti'],
        },
        serena: { uvxAvailable: true, serenaAvailable: true },
        timestamp: new Date().toISOString(),
      };

      const missing = getMissingPrerequisites(prereqs);
      expect(missing).toContain('Graphiti containers are not running');
    });

    it('should detect uvx not installed', () => {
      const prereqs: McpPrerequisites = {
        docker: { available: true, running: true },
        graphiti: {
          containerExists: true,
          containerRunning: true,
          containerNames: ['graphiti'],
        },
        serena: { uvxAvailable: false, serenaAvailable: false },
        timestamp: new Date().toISOString(),
      };

      const missing = getMissingPrerequisites(prereqs);
      expect(missing).toContain('uvx is not installed (required for Serena)');
    });

    it('should detect multiple missing prerequisites', () => {
      const prereqs: McpPrerequisites = {
        docker: { available: false, running: false },
        graphiti: {
          containerExists: false,
          containerRunning: false,
          containerNames: [],
        },
        serena: { uvxAvailable: false, serenaAvailable: false },
        timestamp: new Date().toISOString(),
      };

      const missing = getMissingPrerequisites(prereqs);
      expect(missing).toHaveLength(3);
      expect(missing).toContain('Docker is not installed');
      expect(missing).toContain('Graphiti containers are not set up');
      expect(missing).toContain('uvx is not installed (required for Serena)');
    });
  });
});
