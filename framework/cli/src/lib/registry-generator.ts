import fs from 'fs-extra';
import path from 'path';
import type { ModuleManifest } from './module-loader.js';
import { DiscoveryEngine } from './discovery-engine.js';

/**
 * Generate project registries based on installed modules
 */
export async function generateRegistries(
  projectPath: string,
  modules: ModuleManifest[]
): Promise<void> {
  const registriesPath = path.join(projectPath, '.claude', 'registries');
  await fs.ensureDir(registriesPath);

  // Generate agents.json
  await generateAgentsRegistry(registriesPath, modules);

  // Generate skills.json
  await generateSkillsRegistry(registriesPath, modules);

  // Generate discovery-map.json
  await generateDiscoveryMap(registriesPath, modules);

  // Generate commands.json
  await generateCommandsRegistry(registriesPath, modules);

  // Generate cli-commands.md slash command reference
  await generateCommandsReference(projectPath, modules);

  // Copy static registries (skill-triggers.json)
  await copyStaticRegistries(registriesPath, modules);
}

/**
 * Copy static registry files from core module to project registries
 */
async function copyStaticRegistries(
  registriesPath: string,
  modules: ModuleManifest[]
): Promise<void> {
  const frameworkRoot = getFrameworkRoot(modules);
  if (!frameworkRoot) {
    return;
  }

  // Copy skill-triggers.json from core module
  const skillTriggersSource = path.join(
    frameworkRoot,
    'modules',
    'core',
    'registries',
    'skill-triggers.json'
  );

  if (await fs.pathExists(skillTriggersSource)) {
    const skillTriggersTarget = path.join(registriesPath, 'skill-triggers.json');
    await fs.copy(skillTriggersSource, skillTriggersTarget);
  }
}

/**
 * Derive the framework root from module source paths.
 * Module _sourcePath is like: /path/to/framework/modules/core
 * Framework root should be: /path/to/framework (two levels up)
 */
function getFrameworkRoot(modules: ModuleManifest[]): string | null {
  for (const module of modules) {
    if (module._sourcePath) {
      // Go up two levels: from .../framework/modules/core to .../framework
      return path.resolve(module._sourcePath, '..', '..');
    }
  }
  return null;
}

/**
 * Normalize a cli-commands entry — the schema allows either a plain string
 * (e.g., "init") or a full command object. Returns a consistent shape.
 */
function normalizeCliCommand(entry: { name: string; type?: string; skill?: string; description?: string } | string): { name: string; type?: string; skill?: string; description?: string } {
  return typeof entry === 'string' ? { name: entry } : entry;
}

async function generateCommandsRegistry(
  registriesPath: string,
  modules: ModuleManifest[]
): Promise<void> {
  const commands: Record<string, unknown>[] = [];

  for (const module of modules) {
    const cliCommands = module.provides?.['cli-commands'];
    if (!cliCommands || cliCommands.length === 0) {
      continue;
    }
    for (const raw of cliCommands) {
      const cmd = normalizeCliCommand(raw);
      const id = 'cmd-' + cmd.name.replace(/\s+/g, '-');
      const entry: Record<string, unknown> = {
        id,
        name: cmd.name,
        module: module.id,
        file: `.claude/cli-commands.md`,
      };
      if (cmd.type) entry.type = cmd.type;
      if (cmd.skill) entry.skill = cmd.skill;
      if (cmd.description) entry.description = cmd.description;
      commands.push(entry);
    }
  }

  await fs.writeJson(
    path.join(registriesPath, 'commands.json'),
    { version: '1.0.0', commands },
    { spaces: 2 }
  );
}

async function generateCommandsReference(
  projectPath: string,
  modules: ModuleManifest[]
): Promise<void> {
  // Group commands by module, preserving only modules that have cli-commands
  const byModule: Array<{ id: string; name: string; commands: Array<{ name: string; type: string; description?: string }> }> = [];

  for (const module of modules) {
    const cliCommands = module.provides?.['cli-commands'];
    if (!cliCommands || cliCommands.length === 0) continue;
    byModule.push({
      id: module.id,
      name: module.name,
      commands: cliCommands.map(raw => {
        const cmd = normalizeCliCommand(raw);
        return { name: cmd.name, type: cmd.type ?? '', description: cmd.description };
      }),
    });
  }

  const sharedRef = path.join(projectPath, '.claude', 'cli-commands.md');

  if (byModule.length === 0) {
    // Remove stale reference file if no modules provide commands
    if (await fs.pathExists(sharedRef)) {
      await fs.remove(sharedRef);
    }
    return;
  }

  const lines: string[] = [
    '---',
    'name: CLI Commands Reference',
    'description: Available agentic-framework CLI commands for this project based on installed modules',
    '---',
    '',
    '# CLI Commands Reference',
    '',
    'Run these commands from your project root.',
    '',
  ];

  for (const mod of byModule) {
    lines.push(`## ${mod.name} (\`${mod.id}\`)`);
    lines.push('');
    lines.push('| Command | Type | Description |');
    lines.push('|---------|------|-------------|');
    for (const cmd of mod.commands) {
      const desc = cmd.description ?? '';
      lines.push(`| \`agentic-framework ${cmd.name}\` | ${cmd.type} | ${desc} |`);
    }
    lines.push('');
  }

  await fs.ensureDir(path.join(projectPath, '.claude'));
  await fs.writeFile(sharedRef, lines.join('\n'), 'utf-8');
}

async function generateAgentsRegistry(
  registriesPath: string,
  modules: ModuleManifest[]
): Promise<void> {
  // Handle empty modules array
  const frameworkRoot = getFrameworkRoot(modules);
  if (!frameworkRoot) {
    await fs.writeJson(
      path.join(registriesPath, 'agents.json'),
      { version: '1.0.0', agents: [] },
      { spaces: 2 }
    );
    return;
  }

  // Use DiscoveryEngine to parse agent frontmatter
  const discoveryEngine = new DiscoveryEngine(frameworkRoot);
  await discoveryEngine.loadModules();
  const allAgentDefs = await discoveryEngine.getAllAgents();

  // Filter agents by installed modules
  const installedModuleIds = modules.map(m => m.id);
  const agentDefs = allAgentDefs.filter(agent =>
    installedModuleIds.includes(agent.moduleId)
  );

  // Build agents array from parsed definitions
  const agents = agentDefs.map(agent => {
    // Build base agent object
    const agentObj: Record<string, unknown> = {
      id: agent.id,
      module: agent.moduleId,
      file: `.claude/commands/${agent.id}.md`,
      'capability-needs': agent.capabilityNeeds,
      'token-budget': agent.tokenBudget,
      variant: agent.variant || 'full',
    };

    // Add essential-skills if they exist and are non-empty
    if (agent.essentialSkills && agent.essentialSkills.length > 0) {
      agentObj['essential-skills'] = agent.essentialSkills;
    }

    // Add available-skills if they exist and are non-empty
    if (agent.availableSkills && agent.availableSkills.length > 0) {
      agentObj['available-skills'] = agent.availableSkills;
    }

    // Add delegation fields only if they exist and are non-empty
    if (agent.delegatesTo && agent.delegatesTo.length > 0) {
      agentObj['delegates-to'] = agent.delegatesTo;
    }

    if (agent.parentAgent) {
      agentObj['parent-agent'] = agent.parentAgent;
    }

    return agentObj;
  });

  await fs.writeJson(
    path.join(registriesPath, 'agents.json'),
    { version: '1.0.0', agents },
    { spaces: 2 }
  );
}

async function generateSkillsRegistry(
  registriesPath: string,
  modules: ModuleManifest[]
): Promise<void> {
  // Handle empty modules array
  const frameworkRoot = getFrameworkRoot(modules);
  if (!frameworkRoot) {
    await fs.writeJson(
      path.join(registriesPath, 'skills.json'),
      { version: '1.0.0', skills: [] },
      { spaces: 2 }
    );
    return;
  }

  // Use DiscoveryEngine to parse skill frontmatter
  const discoveryEngine = new DiscoveryEngine(frameworkRoot);
  await discoveryEngine.loadModules();
  const allSkillDefs = await discoveryEngine.getAllSkills();

  // Filter skills by installed modules
  const installedModuleIds = modules.map(m => m.id);
  const skillDefs = allSkillDefs.filter(skill =>
    installedModuleIds.includes(skill.moduleId)
  );

  // Build skills array from parsed definitions
  const skills = skillDefs.map(skill => {
    const skillObj: Record<string, unknown> = {
      id: skill.id,
      module: skill.moduleId,
      'capabilities-provided': skill.capabilitiesProvided,
      location: `.claude/skills/${skill.id}/`,
    };
    // Include description if available (used by skill-reminder hook for trigger matching)
    if (skill.description) {
      skillObj.description = skill.description;
    }
    return skillObj;
  });

  await fs.writeJson(
    path.join(registriesPath, 'skills.json'),
    { version: '1.0.0', skills },
    { spaces: 2 }
  );
}

async function generateDiscoveryMap(
  registriesPath: string,
  modules: ModuleManifest[]
): Promise<void> {
  // Handle empty modules array
  const frameworkRoot = getFrameworkRoot(modules);
  if (!frameworkRoot) {
    await fs.writeJson(
      path.join(registriesPath, 'discovery-map.json'),
      { version: '1.0.0', capabilities: [] },
      { spaces: 2 }
    );
    return;
  }

  // Use DiscoveryEngine to parse agent/skill frontmatter
  const discoveryEngine = new DiscoveryEngine(frameworkRoot);
  await discoveryEngine.loadModules();
  const allAgentDefs = await discoveryEngine.getAllAgents();
  const allSkillDefs = await discoveryEngine.getAllSkills();

  // Filter by installed modules
  const installedModuleIds = modules.map(m => m.id);
  const agentDefs = allAgentDefs.filter(agent =>
    installedModuleIds.includes(agent.moduleId)
  );
  const skillDefs = allSkillDefs.filter(skill =>
    installedModuleIds.includes(skill.moduleId)
  );

  // Build capability map from parsed definitions
  const capabilities: Record<string, { skills: string[]; agents: string[] }> = {};

  // Map skills to their provided capabilities
  for (const skill of skillDefs) {
    for (const capability of skill.capabilitiesProvided) {
      if (!capabilities[capability]) {
        capabilities[capability] = { skills: [], agents: [] };
      }
      if (!capabilities[capability].skills.includes(skill.id)) {
        capabilities[capability].skills.push(skill.id);
      }
    }
  }

  // Map agents to their required capabilities
  for (const agent of agentDefs) {
    for (const capability of agent.capabilityNeeds) {
      if (!capabilities[capability]) {
        capabilities[capability] = { skills: [], agents: [] };
      }
      if (!capabilities[capability].agents.includes(agent.id)) {
        capabilities[capability].agents.push(agent.id);
      }
    }
  }

  const discoveryMap = Object.entries(capabilities).map(([capability, mapping]) => ({
    capability,
    'skills-providing': mapping.skills,
    'used-by-agents': mapping.agents,
  }));

  await fs.writeJson(
    path.join(registriesPath, 'discovery-map.json'),
    { version: '1.0.0', capabilities: discoveryMap },
    { spaces: 2 }
  );
}

