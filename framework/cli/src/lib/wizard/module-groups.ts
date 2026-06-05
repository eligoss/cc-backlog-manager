/**
 * Module grouping for init wizard
 * Groups modules by category for interactive selection
 */

import { ModuleManifest } from '../module-loader.js';

/**
 * Module information for wizard display
 */
export interface ModuleInfo {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  isCore: boolean;
}

/**
 * Group of related modules
 */
export interface ModuleGroup {
  name: string;
  modules: ModuleInfo[];
}

/**
 * Category order for display
 */
const CATEGORY_ORDER = [
  'Core Infrastructure',
  'Development',
  'Workflow',
  'Integrations',
  'Reporting',
  'Other',
];

/**
 * Module category mapping based on module ID
 */
const MODULE_CATEGORIES: Record<string, string> = {
  core: 'Core Infrastructure',
  coding: 'Development',
  planning: 'Workflow',
  backlog: 'Workflow',
  jira: 'Integrations',
  confluence: 'Integrations',
};

/**
 * Module descriptions for wizard display
 */
const MODULE_DESCRIPTIONS: Record<string, string> = {
  core: 'Framework Core (required)',
  coding: 'Coding & Architecture (architects, app developers, iOS)',
  planning: 'Multi-Phase Planning (plans, phases, workflows)',
  backlog: 'Backlog Management (tickets, sprints, milestones)',
  jira: 'Jira Integration (export, import, sync)',
  confluence: 'Confluence Integration (publishing, ADF)',
};

/**
 * Extract module info from manifest
 */
export function getModuleInfo(manifest: ModuleManifest): ModuleInfo {
  const id = manifest.id;

  return {
    id,
    name: manifest.name,
    description: MODULE_DESCRIPTIONS[id] || manifest.description || '',
    category: MODULE_CATEGORIES[id] || 'Other',
    version: manifest.version,
    isCore: id === 'core',
  };
}

/**
 * Group modules by category
 */
export function groupModules(modules: ModuleInfo[]): ModuleGroup[] {
  // Create groups map
  const groupsMap = new Map<string, ModuleInfo[]>();

  // Initialize groups in order
  for (const category of CATEGORY_ORDER) {
    groupsMap.set(category, []);
  }

  // Assign modules to groups
  for (const module of modules) {
    const category = module.category;
    const group = groupsMap.get(category);
    if (group) {
      group.push(module);
    } else {
      // Fallback to Other
      const otherGroup = groupsMap.get('Other');
      if (otherGroup) {
        otherGroup.push(module);
      }
    }
  }

  // Convert to array, filter empty groups
  const result: ModuleGroup[] = [];
  for (const category of CATEGORY_ORDER) {
    const modules = groupsMap.get(category);
    if (modules && modules.length > 0) {
      result.push({ name: category, modules });
    }
  }

  return result;
}

/**
 * Resolve dependencies - always include core
 */
export function resolveDependencies(selected: string[], _available: ModuleInfo[]): string[] {
  const result = new Set<string>();

  // Always include core first
  result.add('core');

  // Add selected modules
  for (const moduleId of selected) {
    result.add(moduleId);
  }

  return Array.from(result);
}

/**
 * Format module for checkbox display
 */
export function formatModuleChoice(module: ModuleInfo): {
  name: string;
  value: string;
  checked: boolean;
  disabled: boolean | string;
} {
  return {
    name: `${module.id} - ${module.description}`,
    value: module.id,
    checked: module.isCore,
    disabled: module.isCore ? 'required' : false,
  };
}

/**
 * Build checkbox choices from grouped modules
 */
export function buildModuleChoices(groups: ModuleGroup[]): Array<{
  name?: string;
  value?: string;
  checked?: boolean;
  disabled?: boolean | string;
  type?: 'separator';
}> {
  const choices: Array<{
    name?: string;
    value?: string;
    checked?: boolean;
    disabled?: boolean | string;
    type?: 'separator';
  }> = [];

  for (const group of groups) {
    // Add separator for group header
    choices.push({ type: 'separator', name: `\n${group.name}` });

    // Add module choices
    for (const module of group.modules) {
      choices.push(formatModuleChoice(module));
    }
  }

  return choices;
}
