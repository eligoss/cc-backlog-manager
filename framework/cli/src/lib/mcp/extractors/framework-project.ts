/**
 * Framework Project Extractor
 *
 * Extracts knowledge from Agentic Framework projects.
 */

import path from 'path';
import fs from 'fs-extra';
import {
  KnowledgeExtractor,
  ExtractedKnowledge,
  KnowledgeEpisode,
  SerenaMemory,
} from './index.js';

// Constants for extraction limits
const MAX_README_SECTIONS = 3;
const MAX_CLI_LIBS_DISPLAY = 10;

/**
 * Check if a project is an Agentic Framework project
 */
export async function isFrameworkProject(projectPath: string): Promise<boolean> {
  const manifestPath = path.join(projectPath, '.agentic-framework.json');
  return fs.pathExists(manifestPath);
}

/**
 * Framework-specific knowledge extractor
 */
export class FrameworkProjectExtractor implements KnowledgeExtractor {
  constructor(
    private projectPath: string,
    private projectName: string
  ) {}

  async extract(): Promise<ExtractedKnowledge> {
    const episodes: KnowledgeEpisode[] = [];
    const serenaMemories: SerenaMemory[] = [];

    // Extract from CLAUDE.md
    const claudeMdEpisode = await this.extractClaudeMd();
    if (claudeMdEpisode) episodes.push(claudeMdEpisode);

    // Extract from README.md
    const readmeEpisode = await this.extractReadme();
    if (readmeEpisode) episodes.push(readmeEpisode);

    // Extract module catalog
    const moduleEpisodes = await this.extractModuleCatalog();
    episodes.push(...moduleEpisodes);

    // Extract agent registry
    const agentEpisode = await this.extractAgentRegistry();
    if (agentEpisode) episodes.push(agentEpisode);

    // Extract skill registry
    const skillEpisode = await this.extractSkillRegistry();
    if (skillEpisode) episodes.push(skillEpisode);

    // Extract context summaries
    const contextEpisodes = await this.extractContextSummaries();
    episodes.push(...contextEpisodes);

    // Generate Serena memories
    serenaMemories.push(await this.generateProjectOverview());
    serenaMemories.push(await this.generateArchitecturePatterns());
    serenaMemories.push(await this.generateCliStructure());

    return {
      projectName: this.projectName,
      projectType: 'framework',
      episodes,
      serenaMemories,
    };
  }

  private async extractClaudeMd(): Promise<KnowledgeEpisode | null> {
    const claudeMdPath = path.join(this.projectPath, 'CLAUDE.md');
    if (!(await fs.pathExists(claudeMdPath))) return null;

    const content = await fs.readFile(claudeMdPath, 'utf-8');

    // Extract key sections
    const sections: string[] = [];

    // Project name and description
    const titleMatch = content.match(/^#\s+(.+)$/m);
    if (titleMatch) {
      sections.push(`Project: ${titleMatch[1]}`);
    }

    // Framework version
    const versionMatch = content.match(/Framework Version:\s*\*\*([^*]+)\*\*/);
    if (versionMatch) {
      sections.push(`Framework Version: ${versionMatch[1]}`);
    }

    // Architecture
    const archMatch = content.match(/Architecture:\s*\*\*([^*]+)\*\*/);
    if (archMatch) {
      sections.push(`Architecture: ${archMatch[1]}`);
    }

    // Quick navigation section
    const navMatch = content.match(/## Quick Navigation\s*```[\s\S]*?```/);
    if (navMatch) {
      sections.push('Directory Structure:\n' + navMatch[0].replace('## Quick Navigation', '').trim());
    }

    return {
      name: 'Project Entry Point (CLAUDE.md)',
      body: sections.join('\n\n'),
      source: 'CLAUDE.md',
      sourceType: 'file',
    };
  }

  private async extractReadme(): Promise<KnowledgeEpisode | null> {
    const readmePath = path.join(this.projectPath, 'README.md');
    if (!(await fs.pathExists(readmePath))) return null;

    const content = await fs.readFile(readmePath, 'utf-8');

    // Extract first few sections (title, description, getting started)
    const lines = content.split('\n');
    const extracted: string[] = [];
    let sectionCount = 0;

    for (const line of lines) {
      if (line.startsWith('## ')) {
        sectionCount++;
        if (sectionCount > MAX_README_SECTIONS) break;
      }
      extracted.push(line);
    }

    return {
      name: 'Project README',
      body: extracted.join('\n').trim(),
      source: 'README.md',
      sourceType: 'file',
    };
  }

  private async extractModuleCatalog(): Promise<KnowledgeEpisode[]> {
    const episodes: KnowledgeEpisode[] = [];
    const manifestPath = path.join(this.projectPath, '.agentic-framework.json');

    if (!(await fs.pathExists(manifestPath))) return episodes;

    try {
      const manifest = await fs.readJson(manifestPath);
      const modules = manifest.modules || {};

      const moduleDescriptions: string[] = [];
      for (const [moduleId, moduleInfo] of Object.entries(modules)) {
        const info = moduleInfo as { name?: string; version?: string };
        moduleDescriptions.push(`- ${moduleId}: ${info.name || 'Unknown'} (v${info.version || 'unknown'})`);
      }

      if (moduleDescriptions.length > 0) {
        episodes.push({
          name: 'Installed Modules',
          body: `The project has ${moduleDescriptions.length} modules installed:\n\n${moduleDescriptions.join('\n')}`,
          source: '.agentic-framework.json',
          sourceType: 'file',
        });
      }
    } catch (error) {
      // Log parse error but continue
      console.warn(`Warning: Failed to parse ${manifestPath}: ${(error as Error).message}`);
    }

    return episodes;
  }

  private async extractAgentRegistry(): Promise<KnowledgeEpisode | null> {
    const agentsPath = path.join(this.projectPath, '.claude', 'registries', 'agents.json');
    if (!(await fs.pathExists(agentsPath))) return null;

    try {
      const agents = await fs.readJson(agentsPath);
      const agentList = Array.isArray(agents) ? agents : agents.agents || [];

      if (agentList.length === 0) return null;

      const descriptions = agentList.map((agent: { id: string; name?: string; description?: string }) => {
        return `- /${agent.id}: ${agent.description || agent.name || 'No description'}`;
      });

      return {
        name: 'Available Agents',
        body: `The project has ${agentList.length} agents available as slash commands:\n\n${descriptions.join('\n')}`,
        source: '.claude/registries/agents.json',
        sourceType: 'file',
      };
    } catch (error) {
      // Log parse error but continue
      console.warn(`Warning: Failed to parse agents.json: ${(error as Error).message}`);
      return null;
    }
  }

  private async extractSkillRegistry(): Promise<KnowledgeEpisode | null> {
    const skillsPath = path.join(this.projectPath, '.claude', 'registries', 'skills.json');
    if (!(await fs.pathExists(skillsPath))) return null;

    try {
      const skills = await fs.readJson(skillsPath);
      const skillList = Array.isArray(skills) ? skills : skills.skills || [];

      if (skillList.length === 0) return null;

      const descriptions = skillList.map((skill: { id: string; name?: string; description?: string }) => {
        return `- ${skill.id}: ${skill.description || skill.name || 'No description'}`;
      });

      return {
        name: 'Available Skills',
        body: `The project has ${skillList.length} skills available:\n\n${descriptions.join('\n')}`,
        source: '.claude/registries/skills.json',
        sourceType: 'file',
      };
    } catch (error) {
      // Log parse error but continue
      console.warn(`Warning: Failed to parse skills.json: ${(error as Error).message}`);
      return null;
    }
  }

  private async extractContextSummaries(): Promise<KnowledgeEpisode[]> {
    const episodes: KnowledgeEpisode[] = [];
    const contextDir = path.join(this.projectPath, '.claude', 'context');

    if (!(await fs.pathExists(contextDir))) return episodes;

    try {
      const files = await fs.readdir(contextDir);
      const basicFiles = files.filter(f => f.endsWith('-basic.md'));

      for (const file of basicFiles) {
        const content = await fs.readFile(path.join(contextDir, file), 'utf-8');

        // Skip template files
        if (content.includes('<!-- TEMPLATE:')) continue;

        // Extract category from filename (e.g., "business-basic.md" -> "business")
        const category = file.replace('-basic.md', '');

        episodes.push({
          name: `Context: ${category}`,
          body: content.trim(),
          source: `.claude/context/${file}`,
          sourceType: 'file',
        });
      }
    } catch {
      // Ignore errors
    }

    return episodes;
  }

  private async generateProjectOverview(): Promise<SerenaMemory> {
    const sections: string[] = [];
    sections.push(`# Project Overview: ${this.projectName}`);
    sections.push('');

    // Read manifest for module info
    const manifestPath = path.join(this.projectPath, '.agentic-framework.json');
    if (await fs.pathExists(manifestPath)) {
      try {
        const manifest = await fs.readJson(manifestPath);
        sections.push('## Framework');
        sections.push(`- Version: ${manifest.framework?.version || 'unknown'}`);
        sections.push(`- CLI Version: ${manifest.framework?.cliVersion || 'unknown'}`);
        sections.push('');

        const modules = Object.keys(manifest.modules || {});
        if (modules.length > 0) {
          sections.push('## Installed Modules');
          modules.forEach(m => sections.push(`- ${m}`));
          sections.push('');
        }
      } catch {
        // Ignore
      }
    }

    // Scan key directories
    const dirs = [
      { path: '.claude/commands', name: 'Agent Commands' },
      { path: '.claude/skills', name: 'Skills' },
      { path: 'src', name: 'Source Code' },
      { path: 'framework', name: 'Framework Source' },
    ];

    for (const dir of dirs) {
      const dirPath = path.join(this.projectPath, dir.path);
      if (await fs.pathExists(dirPath)) {
        try {
          const files = await fs.readdir(dirPath);
          sections.push(`## ${dir.name}`);
          sections.push(`Location: ${dir.path}/`);
          sections.push(`Files: ${files.length}`);
          sections.push('');
        } catch {
          // Ignore
        }
      }
    }

    return {
      name: 'project-overview',
      content: sections.join('\n'),
      category: 'overview',
    };
  }

  private async generateArchitecturePatterns(): Promise<SerenaMemory> {
    const sections: string[] = [];
    sections.push('# Architecture Patterns');
    sections.push('');

    // Framework-specific patterns
    sections.push('## Module System');
    sections.push('- Each module provides agents, skills, and CLI commands');
    sections.push('- Modules are registered in .agentic-framework.json');
    sections.push('- Module artifacts are synced to .claude/ directories');
    sections.push('');

    sections.push('## Discovery Engine');
    sections.push('- Three-tier skill loading: Essential, Role-based, Available');
    sections.push('- Registries provide metadata for discovery');
    sections.push('- Context files loaded by category and level');
    sections.push('');

    sections.push('## Agent Architecture');
    sections.push('- Full agents: orchestrators with delegation capability');
    sections.push('- Slim agents: focused single-task workers');
    sections.push('- Agents available as slash commands');
    sections.push('');

    // Detect patterns from package.json if available
    const packagePath = path.join(this.projectPath, 'package.json');
    if (await fs.pathExists(packagePath)) {
      try {
        const pkg = await fs.readJson(packagePath);
        sections.push('## Tech Stack');
        if (pkg.dependencies?.typescript || pkg.devDependencies?.typescript) {
          sections.push('- TypeScript');
        }
        if (pkg.dependencies?.commander) {
          sections.push('- Commander.js (CLI framework)');
        }
        if (pkg.dependencies?.inquirer) {
          sections.push('- Inquirer.js (interactive prompts)');
        }
        if (pkg.devDependencies?.jest) {
          sections.push('- Jest (testing)');
        }
        sections.push('');
      } catch {
        // Ignore
      }
    }

    return {
      name: 'architecture-patterns',
      content: sections.join('\n'),
      category: 'patterns',
    };
  }

  private async generateCliStructure(): Promise<SerenaMemory> {
    const sections: string[] = [];
    sections.push('# CLI Structure');
    sections.push('');

    const cliDir = path.join(this.projectPath, 'framework', 'cli', 'src');
    if (!(await fs.pathExists(cliDir))) {
      sections.push('No CLI source found at framework/cli/src');
      return {
        name: 'cli-structure',
        content: sections.join('\n'),
        category: 'structure',
      };
    }

    // Scan commands directory
    const commandsDir = path.join(cliDir, 'commands');
    if (await fs.pathExists(commandsDir)) {
      sections.push('## Commands');
      sections.push(`Location: framework/cli/src/commands/`);
      sections.push('');

      try {
        const entries = await fs.readdir(commandsDir, { withFileTypes: true });
        const commands = entries.filter(e => e.name.endsWith('.ts') && !e.name.includes('.test.'));
        const groups = entries.filter(e => e.isDirectory());

        if (commands.length > 0) {
          sections.push('### Top-level Commands');
          commands.forEach(c => sections.push(`- ${c.name.replace('.ts', '')}`));
          sections.push('');
        }

        if (groups.length > 0) {
          sections.push('### Command Groups');
          groups.forEach(g => sections.push(`- ${g.name}/`));
          sections.push('');
        }
      } catch {
        // Ignore
      }
    }

    // Scan lib directory
    const libDir = path.join(cliDir, 'lib');
    if (await fs.pathExists(libDir)) {
      sections.push('## Libraries');
      sections.push(`Location: framework/cli/src/lib/`);
      sections.push('');

      try {
        const entries = await fs.readdir(libDir, { withFileTypes: true });
        const libs = entries.filter(e => e.name.endsWith('.ts') && !e.name.includes('.test.'));
        const subdirs = entries.filter(e => e.isDirectory() && !e.name.startsWith('__'));

        if (libs.length > 0) {
          sections.push('### Core Libraries');
          libs.slice(0, MAX_CLI_LIBS_DISPLAY).forEach(l => sections.push(`- ${l.name.replace('.ts', '')}`));
          if (libs.length > MAX_CLI_LIBS_DISPLAY) sections.push(`- ... and ${libs.length - MAX_CLI_LIBS_DISPLAY} more`);
          sections.push('');
        }

        if (subdirs.length > 0) {
          sections.push('### Library Modules');
          subdirs.forEach(d => sections.push(`- ${d.name}/`));
          sections.push('');
        }
      } catch {
        // Ignore
      }
    }

    return {
      name: 'cli-structure',
      content: sections.join('\n'),
      category: 'structure',
    };
  }
}
