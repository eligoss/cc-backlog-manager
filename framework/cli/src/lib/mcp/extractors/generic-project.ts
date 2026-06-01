/**
 * Generic Project Extractor
 *
 * Extracts knowledge from non-framework projects.
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
const MAX_README_LENGTH = 2000;
const MAX_DEPS_DISPLAY = 15;
const MAX_PYTHON_DEPS_DISPLAY = 10;
const MAX_SOURCE_FILES_DISPLAY = 10;
const MAX_SUBDIRS_DISPLAY = 10;

/**
 * Generic project knowledge extractor
 */
export class GenericProjectExtractor implements KnowledgeExtractor {
  constructor(
    private projectPath: string,
    private projectName: string
  ) {}

  async extract(): Promise<ExtractedKnowledge> {
    const episodes: KnowledgeEpisode[] = [];
    const serenaMemories: SerenaMemory[] = [];

    // Extract from README.md
    const readmeEpisode = await this.extractReadme();
    if (readmeEpisode) episodes.push(readmeEpisode);

    // Extract from CLAUDE.md if exists
    const claudeMdEpisode = await this.extractClaudeMd();
    if (claudeMdEpisode) episodes.push(claudeMdEpisode);

    // Extract from package.json
    const packageEpisode = await this.extractPackageJson();
    if (packageEpisode) episodes.push(packageEpisode);

    // Extract from pyproject.toml
    const pyprojectEpisode = await this.extractPyproject();
    if (pyprojectEpisode) episodes.push(pyprojectEpisode);

    // Extract directory structure
    const structureEpisode = await this.extractStructure();
    if (structureEpisode) episodes.push(structureEpisode);

    // Generate Serena memories
    serenaMemories.push(await this.generateProjectOverview());
    serenaMemories.push(await this.generateStructureMemory());

    return {
      projectName: this.projectName,
      projectType: 'generic',
      episodes,
      serenaMemories,
    };
  }

  private async extractReadme(): Promise<KnowledgeEpisode | null> {
    const readmePath = path.join(this.projectPath, 'README.md');
    if (!(await fs.pathExists(readmePath))) return null;

    const content = await fs.readFile(readmePath, 'utf-8');

    // Truncate long READMEs to avoid overwhelming knowledge base
    const truncated = content.length > MAX_README_LENGTH
      ? content.slice(0, MAX_README_LENGTH) + '...'
      : content;

    return {
      name: 'Project README',
      body: truncated,
      source: 'README.md',
      sourceType: 'file',
    };
  }

  private async extractClaudeMd(): Promise<KnowledgeEpisode | null> {
    const claudeMdPath = path.join(this.projectPath, 'CLAUDE.md');
    if (!(await fs.pathExists(claudeMdPath))) return null;

    const content = await fs.readFile(claudeMdPath, 'utf-8');

    return {
      name: 'Claude Instructions (CLAUDE.md)',
      body: content,
      source: 'CLAUDE.md',
      sourceType: 'file',
    };
  }

  private async extractPackageJson(): Promise<KnowledgeEpisode | null> {
    const packagePath = path.join(this.projectPath, 'package.json');
    if (!(await fs.pathExists(packagePath))) return null;

    try {
      const pkg = await fs.readJson(packagePath);

      const sections: string[] = [];
      sections.push(`# ${pkg.name || this.projectName}`);
      if (pkg.description) sections.push(`\n${pkg.description}`);
      if (pkg.version) sections.push(`\nVersion: ${pkg.version}`);

      // Extract key dependencies
      const deps = Object.keys(pkg.dependencies || {});
      if (deps.length > 0) {
        sections.push('\n## Dependencies');
        deps.slice(0, MAX_DEPS_DISPLAY).forEach(d => sections.push(`- ${d}`));
        if (deps.length > MAX_DEPS_DISPLAY) sections.push(`- ... and ${deps.length - MAX_DEPS_DISPLAY} more`);
      }

      // Extract scripts
      const scripts = Object.keys(pkg.scripts || {});
      if (scripts.length > 0) {
        sections.push('\n## Scripts');
        scripts.forEach(s => sections.push(`- npm run ${s}`));
      }

      return {
        name: 'Package Configuration',
        body: sections.join('\n'),
        source: 'package.json',
        sourceType: 'file',
      };
    } catch {
      return null;
    }
  }

  private async extractPyproject(): Promise<KnowledgeEpisode | null> {
    const pyprojectPath = path.join(this.projectPath, 'pyproject.toml');
    if (!(await fs.pathExists(pyprojectPath))) return null;

    const content = await fs.readFile(pyprojectPath, 'utf-8');

    // Extract basic info from TOML
    const sections: string[] = [];
    sections.push('# Python Project Configuration');

    // Extract name
    const nameMatch = content.match(/name\s*=\s*"([^"]+)"/);
    if (nameMatch) sections.push(`\nName: ${nameMatch[1]}`);

    // Extract version
    const versionMatch = content.match(/version\s*=\s*"([^"]+)"/);
    if (versionMatch) sections.push(`Version: ${versionMatch[1]}`);

    // Extract description
    const descMatch = content.match(/description\s*=\s*"([^"]+)"/);
    if (descMatch) sections.push(`Description: ${descMatch[1]}`);

    // Extract dependencies section
    const depsMatch = content.match(/\[project\.dependencies\]([\s\S]*?)(?:\n\[|$)/);
    if (depsMatch) {
      const deps = depsMatch[1].match(/"([^"]+)"/g);
      if (deps && deps.length > 0) {
        sections.push('\n## Dependencies');
        deps.slice(0, MAX_PYTHON_DEPS_DISPLAY).forEach(d => sections.push(`- ${d.replace(/"/g, '')}`));
        if (deps.length > MAX_PYTHON_DEPS_DISPLAY) sections.push(`- ... and ${deps.length - MAX_PYTHON_DEPS_DISPLAY} more`);
      }
    }

    return {
      name: 'Python Project Configuration',
      body: sections.join('\n'),
      source: 'pyproject.toml',
      sourceType: 'file',
    };
  }

  private async extractStructure(): Promise<KnowledgeEpisode | null> {
    const sections: string[] = [];
    sections.push('# Project Structure');
    sections.push('');

    // Common directories to check
    const dirs = [
      { path: 'src', desc: 'Source code' },
      { path: 'lib', desc: 'Library code' },
      { path: 'app', desc: 'Application code' },
      { path: 'tests', desc: 'Test files' },
      { path: 'test', desc: 'Test files' },
      { path: '__tests__', desc: 'Jest tests' },
      { path: 'docs', desc: 'Documentation' },
      { path: 'scripts', desc: 'Scripts' },
      { path: 'config', desc: 'Configuration' },
      { path: 'public', desc: 'Public assets' },
      { path: 'static', desc: 'Static files' },
      { path: 'components', desc: 'UI components' },
      { path: 'pages', desc: 'Page components' },
      { path: 'api', desc: 'API routes' },
    ];

    const foundDirs: string[] = [];
    for (const dir of dirs) {
      if (await fs.pathExists(path.join(this.projectPath, dir.path))) {
        foundDirs.push(`- ${dir.path}/: ${dir.desc}`);
      }
    }

    if (foundDirs.length > 0) {
      sections.push('## Directories');
      sections.push(...foundDirs);
      sections.push('');
    }

    // Common config files
    const configs = [
      'tsconfig.json',
      'jest.config.js',
      'jest.config.ts',
      '.eslintrc.js',
      '.eslintrc.json',
      'eslint.config.js',
      'webpack.config.js',
      'vite.config.ts',
      'next.config.js',
      'tailwind.config.js',
      '.env.example',
      'docker-compose.yml',
      'Dockerfile',
      'Makefile',
    ];

    const foundConfigs: string[] = [];
    for (const config of configs) {
      if (await fs.pathExists(path.join(this.projectPath, config))) {
        foundConfigs.push(`- ${config}`);
      }
    }

    if (foundConfigs.length > 0) {
      sections.push('## Configuration Files');
      sections.push(...foundConfigs);
    }

    if (foundDirs.length === 0 && foundConfigs.length === 0) {
      return null;
    }

    return {
      name: 'Project Structure',
      body: sections.join('\n'),
      source: 'directory scan',
      sourceType: 'generated',
    };
  }

  private async generateProjectOverview(): Promise<SerenaMemory> {
    const sections: string[] = [];
    sections.push(`# Project Overview: ${this.projectName}`);
    sections.push('');

    // Detect project type
    const indicators = await this.detectProjectType();
    if (indicators.length > 0) {
      sections.push('## Project Type');
      indicators.forEach(i => sections.push(`- ${i}`));
      sections.push('');
    }

    // Entry points
    const entryPoints = await this.findEntryPoints();
    if (entryPoints.length > 0) {
      sections.push('## Entry Points');
      entryPoints.forEach(e => sections.push(`- ${e}`));
      sections.push('');
    }

    return {
      name: 'project-overview',
      content: sections.join('\n'),
      category: 'overview',
    };
  }

  private async generateStructureMemory(): Promise<SerenaMemory> {
    const sections: string[] = [];
    sections.push('# Code Structure');
    sections.push('');

    // Find source directories
    const srcDirs = ['src', 'lib', 'app', 'components', 'pages'];
    for (const dir of srcDirs) {
      const dirPath = path.join(this.projectPath, dir);
      if (await fs.pathExists(dirPath)) {
        sections.push(`## ${dir}/`);
        try {
          const entries = await fs.readdir(dirPath, { withFileTypes: true });
          const subdirs = entries.filter(e => e.isDirectory()).slice(0, MAX_SUBDIRS_DISPLAY);
          const files = entries.filter(e => e.isFile()).slice(0, MAX_SOURCE_FILES_DISPLAY);

          if (subdirs.length > 0) {
            sections.push('Subdirectories:');
            subdirs.forEach(d => sections.push(`  - ${d.name}/`));
          }
          if (files.length > 0) {
            sections.push('Files:');
            files.forEach(f => sections.push(`  - ${f.name}`));
          }
          sections.push('');
        } catch {
          // Ignore
        }
      }
    }

    return {
      name: 'code-structure',
      content: sections.join('\n'),
      category: 'structure',
    };
  }

  private async detectProjectType(): Promise<string[]> {
    const indicators: string[] = [];

    // Check for various project types
    if (await fs.pathExists(path.join(this.projectPath, 'package.json'))) {
      const pkg = await fs.readJson(path.join(this.projectPath, 'package.json')).catch(() => ({}));

      if (pkg.dependencies?.next || pkg.devDependencies?.next) {
        indicators.push('Next.js application');
      } else if (pkg.dependencies?.react || pkg.devDependencies?.react) {
        indicators.push('React application');
      } else if (pkg.dependencies?.vue || pkg.devDependencies?.vue) {
        indicators.push('Vue.js application');
      } else if (pkg.dependencies?.express || pkg.devDependencies?.express) {
        indicators.push('Express.js server');
      }

      if (pkg.dependencies?.typescript || pkg.devDependencies?.typescript) {
        indicators.push('TypeScript');
      }
    }

    if (await fs.pathExists(path.join(this.projectPath, 'pyproject.toml'))) {
      indicators.push('Python project');
    }

    if (await fs.pathExists(path.join(this.projectPath, 'Cargo.toml'))) {
      indicators.push('Rust project');
    }

    if (await fs.pathExists(path.join(this.projectPath, 'go.mod'))) {
      indicators.push('Go project');
    }

    return indicators;
  }

  private async findEntryPoints(): Promise<string[]> {
    const entryPoints: string[] = [];

    const candidates = [
      'src/index.ts',
      'src/index.js',
      'src/main.ts',
      'src/main.js',
      'src/app.ts',
      'src/app.js',
      'index.ts',
      'index.js',
      'main.py',
      'app.py',
      'main.go',
      'cmd/main.go',
    ];

    for (const candidate of candidates) {
      if (await fs.pathExists(path.join(this.projectPath, candidate))) {
        entryPoints.push(candidate);
      }
    }

    return entryPoints;
  }
}
