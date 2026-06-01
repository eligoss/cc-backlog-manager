/**
 * MCP Installation Instructions
 *
 * Provides user-friendly installation guidance for MCP prerequisites.
 */

import chalk from 'chalk';
import { McpPrerequisites } from './prerequisite-checker.js';

/**
 * Get Docker installation instructions
 */
export function getDockerInstructions(): string {
  return `
${chalk.bold('Docker Installation')}

Docker is required for Graphiti (knowledge graph memory).

${chalk.yellow('macOS:')}
  brew install --cask docker
  # Or download from: https://www.docker.com/products/docker-desktop

${chalk.yellow('Linux:')}
  curl -fsSL https://get.docker.com | sh
  sudo systemctl start docker
  sudo usermod -aG docker $USER

${chalk.yellow('Windows:')}
  Download Docker Desktop from: https://www.docker.com/products/docker-desktop

After installation, start Docker Desktop and ensure it's running.
`;
}

/**
 * Get Graphiti setup instructions
 */
export function getGraphitiInstructions(): string {
  return `
${chalk.bold('Graphiti Setup')}

Graphiti provides persistent knowledge graph memory for AI sessions.

${chalk.yellow('Quick Start (recommended):')}
  # Create Graphiti directory
  mkdir -p ~/.graphiti

  # Download docker-compose.yml
  curl -o ~/.graphiti/docker-compose.yml \\
    https://raw.githubusercontent.com/getzep/graphiti/main/docker-compose.yml

  # Start containers
  cd ~/.graphiti && docker compose up -d

${chalk.yellow('Verify installation:')}
  curl http://localhost:8000/health

${chalk.dim('Graphiti uses FalkorDB for graph storage and provides a REST API.')}
${chalk.dim('Default endpoint: http://localhost:8000')}

${chalk.yellow('Documentation:')}
  https://github.com/getzep/graphiti
`;
}

/**
 * Get uvx installation instructions
 */
export function getUvxInstructions(): string {
  return `
${chalk.bold('uvx Installation')}

uvx is required for running Serena (semantic code navigation).

${chalk.yellow('macOS/Linux:')}
  curl -LsSf https://astral.sh/uv/install.sh | sh

${chalk.yellow('Windows:')}
  powershell -ExecutionPolicy ByPass -c "irm https://astral.sh/uv/install.ps1 | iex"

${chalk.yellow('Alternative (via pip):')}
  pip install uv

${chalk.yellow('Verify installation:')}
  uvx --version

${chalk.dim('uvx is part of the uv package manager and runs Python tools in isolated environments.')}
${chalk.dim('Serena will be automatically installed on first use via uvx.')}

${chalk.yellow('Documentation:')}
  https://docs.astral.sh/uv/
`;
}

/**
 * Get Serena setup instructions (after uvx is installed)
 */
export function getSerenaInstructions(projectName: string): string {
  return `
${chalk.bold('Serena Configuration')}

Serena provides semantic code navigation and analysis.

${chalk.yellow('First-time setup:')}
  # Serena is automatically run via uvx
  # Configure your project in .serena/project.yml

${chalk.yellow('Project configuration (.serena/project.yml):')}
  name: "${projectName}"
  language: typescript  # or python, go, etc.

  # Index directories (adjust for your project)
  include:
    - src/
    - framework/

  exclude:
    - node_modules/
    - dist/
    - build/

${chalk.yellow('Activate project in Claude session:')}
  activate_project("${projectName}")

${chalk.dim('Serena builds a semantic index of your codebase for intelligent navigation.')}
${chalk.dim('Use get_symbols_overview and find_symbol instead of reading full files.')}

${chalk.yellow('Documentation:')}
  https://github.com/serena-ai/serena
`;
}

/**
 * Get instructions based on missing prerequisites
 */
export function getInstructionsForMissing(prereqs: McpPrerequisites): string {
  const sections: string[] = [];

  if (!prereqs.docker.available) {
    sections.push(getDockerInstructions());
  } else if (!prereqs.docker.running) {
    sections.push(`
${chalk.bold('Docker Daemon Not Running')}

Start Docker Desktop or run:
  ${chalk.yellow('sudo systemctl start docker')}  # Linux
  ${chalk.yellow('open -a Docker')}               # macOS
`);
  }

  if (prereqs.docker.running && !prereqs.graphiti.containerRunning) {
    if (!prereqs.graphiti.containerExists) {
      sections.push(getGraphitiInstructions());
    } else {
      sections.push(`
${chalk.bold('Graphiti Containers Stopped')}

Start Graphiti containers:
  ${chalk.yellow('cd ~/.graphiti && docker compose up -d')}

Or if using a different location:
  ${chalk.yellow('docker start graphiti falkordb')}
`);
    }
  }

  if (!prereqs.serena.uvxAvailable) {
    sections.push(getUvxInstructions());
  }

  return sections.join('\n' + chalk.dim('─'.repeat(60)) + '\n');
}

/**
 * Get post-init instructions for MCP setup
 */
export function getPostInitInstructions(
  graphitiEnabled: boolean,
  serenaEnabled: boolean,
  projectName: string,
  prereqs: McpPrerequisites
): string {
  const sections: string[] = [];

  sections.push(chalk.bold('\n📋 MCP Post-Setup Instructions\n'));

  if (graphitiEnabled) {
    if (!prereqs.graphiti.containerRunning) {
      sections.push(chalk.yellow('Graphiti (Knowledge Graph Memory):'));
      sections.push('  Run these commands to set up Graphiti:\n');
      sections.push(chalk.dim('  # Create Graphiti directory'));
      sections.push('  mkdir -p ~/.graphiti\n');
      sections.push(chalk.dim('  # Download docker-compose.yml'));
      sections.push('  curl -o ~/.graphiti/docker-compose.yml \\');
      sections.push('    https://raw.githubusercontent.com/getzep/graphiti/main/docker-compose.yml\n');
      sections.push(chalk.dim('  # Start containers'));
      sections.push('  cd ~/.graphiti && docker compose up -d\n');
    } else {
      sections.push(chalk.green('✓ Graphiti is running'));
      sections.push(chalk.dim(`  Endpoint: ${prereqs.graphiti.endpoint || 'http://localhost:8000'}`));
    }
  }

  if (serenaEnabled) {
    sections.push('');
    if (!prereqs.serena.uvxAvailable) {
      sections.push(chalk.yellow('Serena (Semantic Code Navigation):'));
      sections.push('  Install uvx first:\n');
      sections.push('  curl -LsSf https://astral.sh/uv/install.sh | sh\n');
    } else {
      sections.push(chalk.green('✓ uvx is available for Serena'));
    }
    sections.push(chalk.dim(`  Activate in Claude: activate_project("${projectName}")`));
  }

  if (graphitiEnabled || serenaEnabled) {
    sections.push('');
    sections.push(chalk.bold('Seed knowledge bases (after prerequisites are met):'));
    sections.push(chalk.cyan(`  agentic-framework mcp seed`));
    sections.push('');
    sections.push(chalk.dim('Or use the Claude slash command:'));
    sections.push(chalk.cyan('  /cmd-mcp-seed'));
  }

  return sections.join('\n');
}

/**
 * Format prerequisite status for display
 */
export function formatPrerequisiteStatus(prereqs: McpPrerequisites): string {
  const lines: string[] = [];

  lines.push(chalk.bold('MCP Prerequisites Status\n'));

  // Docker
  if (prereqs.docker.available && prereqs.docker.running) {
    lines.push(`  ${chalk.green('✓')} Docker ${prereqs.docker.version ? `v${prereqs.docker.version}` : ''}`);
  } else if (prereqs.docker.available) {
    lines.push(`  ${chalk.yellow('!')} Docker installed but not running`);
  } else {
    lines.push(`  ${chalk.red('✗')} Docker not installed`);
  }

  // Graphiti
  if (prereqs.graphiti.containerRunning) {
    lines.push(`  ${chalk.green('✓')} Graphiti containers running`);
    lines.push(chalk.dim(`      ${prereqs.graphiti.containerNames.join(', ')}`));
  } else if (prereqs.graphiti.containerExists) {
    lines.push(`  ${chalk.yellow('!')} Graphiti containers exist but not running`);
  } else {
    lines.push(`  ${chalk.red('✗')} Graphiti containers not found`);
  }

  // Serena/uvx
  if (prereqs.serena.uvxAvailable) {
    lines.push(`  ${chalk.green('✓')} uvx ${prereqs.serena.uvxVersion ? `v${prereqs.serena.uvxVersion}` : 'available'}`);
    if (prereqs.serena.serenaAvailable) {
      lines.push(`  ${chalk.green('✓')} Serena ${prereqs.serena.serenaVersion ? `v${prereqs.serena.serenaVersion}` : 'cached'}`);
    } else {
      lines.push(chalk.dim('      Serena will be installed on first use'));
    }
  } else {
    lines.push(`  ${chalk.red('✗')} uvx not installed`);
    if (prereqs.serena.error) {
      lines.push(chalk.dim(`      ${prereqs.serena.error}`));
    }
  }

  return lines.join('\n');
}

/**
 * Format prerequisite status with verbose details
 */
export function formatPrerequisiteStatusVerbose(prereqs: McpPrerequisites): string {
  const lines: string[] = [];

  lines.push(chalk.bold('MCP Prerequisites Status (Verbose)\n'));

  // Docker section
  lines.push(chalk.bold.blue('Docker'));
  if (prereqs.docker.available && prereqs.docker.running) {
    lines.push(`  ${chalk.green('✓')} Status: Running`);
    lines.push(`  ${chalk.dim('Version:')} ${prereqs.docker.version || 'unknown'}`);
  } else if (prereqs.docker.available) {
    lines.push(`  ${chalk.yellow('!')} Status: Installed but not running`);
    lines.push(`  ${chalk.dim('Version:')} ${prereqs.docker.version || 'unknown'}`);
    lines.push(`  ${chalk.dim('Error:')} ${prereqs.docker.error || 'Daemon not running'}`);
  } else {
    lines.push(`  ${chalk.red('✗')} Status: Not installed`);
    lines.push(`  ${chalk.dim('Error:')} ${prereqs.docker.error || 'Docker not found in PATH'}`);
  }
  lines.push('');

  // Graphiti section
  lines.push(chalk.bold.blue('Graphiti'));
  if (prereqs.graphiti.containerRunning) {
    lines.push(`  ${chalk.green('✓')} Status: Running`);
    lines.push(`  ${chalk.dim('Containers:')} ${prereqs.graphiti.containerNames.join(', ')}`);
    lines.push(`  ${chalk.dim('Endpoint:')} ${prereqs.graphiti.endpoint || 'http://localhost:8000'}`);
  } else if (prereqs.graphiti.containerExists) {
    lines.push(`  ${chalk.yellow('!')} Status: Containers exist but stopped`);
    lines.push(`  ${chalk.dim('Containers:')} ${prereqs.graphiti.containerNames.join(', ')}`);
    lines.push(`  ${chalk.dim('Hint:')} Run 'docker start ${prereqs.graphiti.containerNames[0]}' to start`);
  } else {
    lines.push(`  ${chalk.red('✗')} Status: Not configured`);
    lines.push(`  ${chalk.dim('Error:')} ${prereqs.graphiti.error || 'No Graphiti containers found'}`);
    lines.push(`  ${chalk.dim('Hint:')} See https://github.com/getzep/graphiti for setup`);
  }
  lines.push('');

  // Serena section
  lines.push(chalk.bold.blue('Serena'));
  if (prereqs.serena.uvxAvailable) {
    lines.push(`  ${chalk.green('✓')} uvx: Available`);
    lines.push(`  ${chalk.dim('uvx Version:')} ${prereqs.serena.uvxVersion || 'unknown'}`);
    if (prereqs.serena.serenaAvailable) {
      lines.push(`  ${chalk.green('✓')} Serena: Cached`);
      lines.push(`  ${chalk.dim('Serena Version:')} ${prereqs.serena.serenaVersion || 'unknown'}`);
    } else {
      lines.push(`  ${chalk.dim('○')} Serena: Not cached (will install on first use)`);
    }
  } else {
    lines.push(`  ${chalk.red('✗')} uvx: Not installed`);
    lines.push(`  ${chalk.dim('Error:')} ${prereqs.serena.error || 'uvx not found in PATH'}`);
    lines.push(`  ${chalk.dim('Hint:')} Install with: curl -LsSf https://astral.sh/uv/install.sh | sh`);
  }
  lines.push('');

  // Timestamp
  lines.push(chalk.dim(`Checked at: ${prereqs.timestamp}`));

  return lines.join('\n');
}
