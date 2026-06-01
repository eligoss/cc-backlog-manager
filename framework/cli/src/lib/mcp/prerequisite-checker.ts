/**
 * MCP Prerequisite Checker
 *
 * Detects availability of MCP prerequisites:
 * - Docker (for Graphiti)
 * - Graphiti containers
 * - uvx/Serena
 */

import { exec } from 'child_process';
import { promisify } from 'util';

const execAsync = promisify(exec);

/**
 * Docker status
 */
export interface DockerStatus {
  available: boolean;
  running: boolean;
  version?: string;
  error?: string;
}

/**
 * Graphiti container status
 */
export interface GraphitiStatus {
  containerExists: boolean;
  containerRunning: boolean;
  containerNames: string[];
  endpoint?: string;
  error?: string;
}

/**
 * Serena status
 */
export interface SerenaStatus {
  uvxAvailable: boolean;
  uvxVersion?: string;
  serenaAvailable: boolean;
  serenaVersion?: string;
  error?: string;
}

/**
 * Combined MCP prerequisites status
 */
export interface McpPrerequisites {
  docker: DockerStatus;
  graphiti: GraphitiStatus;
  serena: SerenaStatus;
  timestamp: string;
}

/**
 * Check if Docker is installed and running
 */
export async function checkDocker(): Promise<DockerStatus> {
  try {
    // Check if docker command exists
    const { stdout: versionOutput } = await execAsync('docker --version', {
      timeout: 5000,
    });

    const versionMatch = versionOutput.match(/Docker version ([\d.]+)/);
    const version = versionMatch ? versionMatch[1] : undefined;

    // Check if Docker daemon is running
    try {
      await execAsync('docker info', { timeout: 10000 });
      return {
        available: true,
        running: true,
        version,
      };
    } catch {
      return {
        available: true,
        running: false,
        version,
        error: 'Docker is installed but the daemon is not running',
      };
    }
  } catch (_error) {
    return {
      available: false,
      running: false,
      error: 'Docker is not installed or not in PATH',
    };
  }
}

/**
 * Check if Graphiti containers exist and are running
 */
export async function checkGraphiti(): Promise<GraphitiStatus> {
  try {
    // Look for graphiti-related containers
    const { stdout } = await execAsync(
      'docker ps -a --filter "name=graphiti" --filter "name=falkordb" --filter "name=neo4j" --format "{{.Names}}:{{.Status}}"',
      { timeout: 10000 }
    );

    const containers = stdout
      .trim()
      .split('\n')
      .filter((line) => line.length > 0);

    if (containers.length === 0) {
      return {
        containerExists: false,
        containerRunning: false,
        containerNames: [],
        error: 'No Graphiti-related containers found',
      };
    }

    const containerNames: string[] = [];
    let anyRunning = false;

    for (const container of containers) {
      const [name, status] = container.split(':');
      containerNames.push(name);
      if (status && status.toLowerCase().includes('up')) {
        anyRunning = true;
      }
    }

    return {
      containerExists: true,
      containerRunning: anyRunning,
      containerNames,
      endpoint: anyRunning ? 'http://localhost:8000' : undefined,
    };
  } catch (_error) {
    // Docker might not be running
    return {
      containerExists: false,
      containerRunning: false,
      containerNames: [],
      error: 'Could not check Graphiti containers (Docker may not be running)',
    };
  }
}

/**
 * Check if uvx and Serena are available
 */
export async function checkSerena(): Promise<SerenaStatus> {
  let uvxAvailable = false;
  let uvxVersion: string | undefined;
  let serenaAvailable = false;
  let serenaVersion: string | undefined;
  let error: string | undefined;

  // Check for uvx
  try {
    const { stdout } = await execAsync('uvx --version', { timeout: 5000 });
    uvxAvailable = true;
    const versionMatch = stdout.match(/uvx ([\d.]+)/);
    uvxVersion = versionMatch ? versionMatch[1] : stdout.trim();
  } catch {
    // uvx not available, check for pipx as fallback
    try {
      const { stdout } = await execAsync('pipx --version', { timeout: 5000 });
      // pipx is available but uvx is preferred
      error = `uvx not found. pipx is available (${stdout.trim()}), but uvx is recommended for Serena`;
    } catch {
      error = 'uvx is not installed (required for Serena)';
    }
  }

  // Check for Serena if uvx is available
  if (uvxAvailable) {
    try {
      // Check if serena is in uvx cache or can be run
      const { stdout } = await execAsync('uvx serena --version 2>/dev/null || echo "not-cached"', {
        timeout: 15000,
      });

      if (!stdout.includes('not-cached')) {
        serenaAvailable = true;
        const versionMatch = stdout.match(/serena ([\d.]+)/i);
        serenaVersion = versionMatch ? versionMatch[1] : stdout.trim();
      }
    } catch (err) {
      // Distinguish timeout from other errors
      const execError = err as NodeJS.ErrnoException & { killed?: boolean };
      if (execError.killed || execError.code === 'ETIMEDOUT') {
        error = 'Serena version check timed out (may be available but slow to respond)';
        serenaAvailable = false; // Conservative: treat timeout as unavailable
      } else {
        // Serena will be installed on first use with uvx
        serenaAvailable = false;
      }
    }
  }

  return {
    uvxAvailable,
    uvxVersion,
    serenaAvailable,
    serenaVersion,
    error,
  };
}

/**
 * Check all MCP prerequisites
 */
export async function checkAllPrerequisites(): Promise<McpPrerequisites> {
  const [docker, graphiti, serena] = await Promise.all([
    checkDocker(),
    checkGraphiti(),
    checkSerena(),
  ]);

  return {
    docker,
    graphiti,
    serena,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Check if Graphiti prerequisites are met
 */
export function isGraphitiReady(prereqs: McpPrerequisites): boolean {
  return prereqs.docker.running && prereqs.graphiti.containerRunning;
}

/**
 * Check if Serena prerequisites are met
 */
export function isSerenaReady(prereqs: McpPrerequisites): boolean {
  return prereqs.serena.uvxAvailable;
}

/**
 * Check if any MCP is ready
 */
export function isAnyMcpReady(prereqs: McpPrerequisites): boolean {
  return isGraphitiReady(prereqs) || isSerenaReady(prereqs);
}

/**
 * Get a summary of missing prerequisites
 */
export function getMissingPrerequisites(prereqs: McpPrerequisites): string[] {
  const missing: string[] = [];

  if (!prereqs.docker.available) {
    missing.push('Docker is not installed');
  } else if (!prereqs.docker.running) {
    missing.push('Docker daemon is not running');
  }

  if (!prereqs.graphiti.containerRunning) {
    if (!prereqs.graphiti.containerExists) {
      missing.push('Graphiti containers are not set up');
    } else {
      missing.push('Graphiti containers are not running');
    }
  }

  if (!prereqs.serena.uvxAvailable) {
    missing.push('uvx is not installed (required for Serena)');
  }

  return missing;
}
