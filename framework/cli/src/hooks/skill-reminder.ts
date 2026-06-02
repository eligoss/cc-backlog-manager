#!/usr/bin/env node
/**
 * Skill Reminder Hook
 *
 * Reminds agents about available on-demand skills (Tier 3) when
 * contextual cues in the prompt suggest those skills would be helpful.
 *
 * This hook uses the framework's capability system for efficiency:
 * 1. Derives triggers from skills.json capabilities-provided (e.g., "web-search" → ["web", "search"])
 * 2. Extracts keywords from skill descriptions
 * 3. Optionally overlays custom triggers from skill-triggers.json
 *
 * This eliminates redundant data and leverages existing discovery engine metadata.
 *
 * Design decisions:
 * - Triggers on SubagentStart (same as context-loader)
 * - Reminders happen every subagent start (no session tracking)
 * - Max 2 skill reminders per event to avoid noise
 * - Requires 2+ trigger matches for relevance threshold
 */

import {
  parseHookInput,
  sendResponse,
  advisory,
  passThrough,
  type SubagentInfo,
  type HookMessage,
} from './types.js';
import fs from 'fs';
import path from 'path';

// Configuration
const MAX_REMINDERS_PER_EVENT = 2;
const MIN_TRIGGER_MATCHES = 2;
const MIN_KEYWORD_LENGTH = 3; // Ignore short words like "a", "the", "to"

// Common words to filter out from descriptions
const STOP_WORDS = new Set([
  'the', 'and', 'for', 'with', 'this', 'that', 'from', 'use', 'when',
  'how', 'what', 'which', 'where', 'who', 'why', 'are', 'can', 'will',
  'should', 'would', 'could', 'have', 'has', 'had', 'been', 'being',
  'was', 'were', 'is', 'am', 'does', 'did', 'doing', 'done', 'you',
  'your', 'our', 'their', 'its', 'any', 'all', 'each', 'every', 'both',
  'more', 'most', 'other', 'some', 'such', 'only', 'also', 'just',
  'than', 'then', 'now', 'here', 'there', 'these', 'those', 'into',
  'over', 'after', 'before', 'between', 'through', 'during', 'about',
]);

interface SkillEntry {
  id: string;
  module: string;
  'capabilities-provided': string[];
  description?: string;
  location: string;
}

interface SkillsRegistry {
  version: string;
  skills: SkillEntry[];
}

interface CustomTrigger {
  description?: string;
  triggers?: string[];
  'prompt-patterns'?: string[];
}

interface CustomTriggersRegistry {
  version: string;
  'skill-triggers': Record<string, CustomTrigger>;
}

interface AgentDefinition {
  id: string;
  'available-skills'?: string[];
  variant: 'full' | 'slim';
}

interface DerivedTriggers {
  keywords: string[];
  patterns: string[];
  description: string;
}

/**
 * Find the framework root by looking for .agentic-framework.json
 */
function findFrameworkRoot(startDir: string): string | null {
  let currentDir = startDir;

  while (currentDir !== path.dirname(currentDir)) {
    if (fs.existsSync(path.join(currentDir, '.agentic-framework.json'))) {
      return currentDir;
    }
    currentDir = path.dirname(currentDir);
  }

  return null;
}

/**
 * Load agents registry from .claude/registries/agents.json
 */
function loadAgentsRegistry(frameworkRoot: string): AgentDefinition[] {
  const registryPath = path.join(frameworkRoot, '.claude', 'registries', 'agents.json');

  if (!fs.existsSync(registryPath)) {
    return [];
  }

  try {
    const content = fs.readFileSync(registryPath, 'utf-8');
    const registry = JSON.parse(content);
    return registry.agents || [];
  } catch {
    return [];
  }
}

/**
 * Load skills registry from .claude/registries/skills.json
 */
function loadSkillsRegistry(frameworkRoot: string): SkillsRegistry | null {
  const registryPath = path.join(frameworkRoot, '.claude', 'registries', 'skills.json');

  if (!fs.existsSync(registryPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(registryPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Load optional custom triggers registry (for overrides)
 */
function loadCustomTriggers(frameworkRoot: string): CustomTriggersRegistry | null {
  const registryPath = path.join(frameworkRoot, '.claude', 'registries', 'skill-triggers.json');

  if (!fs.existsSync(registryPath)) {
    return null;
  }

  try {
    const content = fs.readFileSync(registryPath, 'utf-8');
    return JSON.parse(content);
  } catch {
    return null;
  }
}

/**
 * Extract keywords from a capability string
 * e.g., "git-workflow-management" → ["git", "workflow", "management"]
 */
function extractCapabilityKeywords(capability: string): string[] {
  return capability
    .split('-')
    .filter((word) => word.length >= MIN_KEYWORD_LENGTH)
    .map((word) => word.toLowerCase());
}

/**
 * Extract keywords from a description string
 * Filters out stop words and short words
 */
function extractDescriptionKeywords(description: string): string[] {
  return description
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, ' ') // Remove punctuation
    .split(/\s+/)
    .filter((word) => word.length >= MIN_KEYWORD_LENGTH && !STOP_WORDS.has(word));
}

/**
 * Derive triggers for a skill from its capabilities and description
 * Optionally overlay custom triggers from skill-triggers.json
 */
function deriveTriggers(
  skill: SkillEntry,
  customTriggers: CustomTriggersRegistry | null
): DerivedTriggers {
  const keywords: Set<string> = new Set();
  const patterns: string[] = [];

  // 1. Extract keywords from capabilities-provided
  for (const capability of skill['capabilities-provided'] || []) {
    for (const keyword of extractCapabilityKeywords(capability)) {
      keywords.add(keyword);
    }
    // Also add the full capability as a keyword (for exact matches)
    keywords.add(capability.toLowerCase());
  }

  // 2. Extract keywords from description
  if (skill.description) {
    for (const keyword of extractDescriptionKeywords(skill.description)) {
      keywords.add(keyword);
    }
  }

  // 3. Overlay custom triggers if available
  const custom = customTriggers?.['skill-triggers']?.[skill.id];
  if (custom) {
    // Add custom keywords
    for (const trigger of custom.triggers || []) {
      keywords.add(trigger.toLowerCase());
    }
    // Add custom patterns
    patterns.push(...(custom['prompt-patterns'] || []));
  }

  // Determine description to show (custom > skill.description > fallback)
  const description =
    custom?.description ||
    skill.description ||
    `Skill: ${skill.id} (${skill['capabilities-provided']?.join(', ') || 'no capabilities'})`;

  return {
    keywords: Array.from(keywords),
    patterns,
    description,
  };
}

/**
 * Count trigger matches for a skill against the prompt
 */
function countTriggerMatches(prompt: string, triggers: DerivedTriggers): number {
  const promptLower = prompt.toLowerCase();
  let matches = 0;

  // Check keyword triggers (case-insensitive word boundary match)
  for (const keyword of triggers.keywords) {
    // Use word boundary matching for better accuracy
    const regex = new RegExp(`\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
    if (regex.test(promptLower)) {
      matches++;
    }
  }

  // Check regex patterns (from custom triggers)
  for (const pattern of triggers.patterns) {
    try {
      const regex = new RegExp(pattern, 'i');
      if (regex.test(prompt)) {
        matches++;
      }
    } catch {
      // Invalid regex, skip
    }
  }

  return matches;
}

/**
 * Find relevant skills based on prompt analysis
 */
function findRelevantSkills(
  prompt: string,
  availableSkills: string[],
  skillsRegistry: SkillsRegistry,
  customTriggers: CustomTriggersRegistry | null
): Array<{ skillId: string; matchCount: number; description: string }> {
  const relevant: Array<{ skillId: string; matchCount: number; description: string }> = [];

  for (const skillId of availableSkills) {
    // Find skill in registry
    const skill = skillsRegistry.skills.find((s) => s.id === skillId);
    if (!skill) {
      continue;
    }

    // Derive triggers from capabilities + description + custom overrides
    const triggers = deriveTriggers(skill, customTriggers);

    // Count matches
    const matchCount = countTriggerMatches(prompt, triggers);

    if (matchCount >= MIN_TRIGGER_MATCHES) {
      relevant.push({
        skillId,
        matchCount,
        description: triggers.description,
      });
    }
  }

  // Sort by match count (most relevant first) and limit to max reminders
  return relevant.sort((a, b) => b.matchCount - a.matchCount).slice(0, MAX_REMINDERS_PER_EVENT);
}

async function main(): Promise<void> {
  try {
    const input = await parseHookInput<SubagentInfo>();
    const messages: HookMessage[] = [];

    // Get the working directory
    const cwd = process.cwd();
    const frameworkRoot = findFrameworkRoot(cwd);

    if (!frameworkRoot) {
      // Not in a framework project, pass through
      sendResponse(passThrough());
      return;
    }

    // Detect agent ID from the prompt
    const agentPattern = /ai-[\w-]+(?:-slim)?/g;
    const matches = input.prompt?.match(agentPattern) || [];
    const agentId = matches[0];

    if (!agentId) {
      // No agent detected, pass through
      sendResponse(passThrough());
      return;
    }

    // Load agents registry
    const agents = loadAgentsRegistry(frameworkRoot);
    const agent = agents.find((a) => a.id === agentId);

    if (!agent || !agent['available-skills'] || agent['available-skills'].length === 0) {
      // Agent not found or has no available skills, pass through
      sendResponse(passThrough());
      return;
    }

    // Load skills registry (required for capability-based triggers)
    const skillsRegistry = loadSkillsRegistry(frameworkRoot);
    if (!skillsRegistry) {
      // No skills registry found, pass through
      sendResponse(passThrough());
      return;
    }

    // Load custom triggers (optional, for overrides)
    const customTriggers = loadCustomTriggers(frameworkRoot);

    // Find relevant skills based on prompt analysis
    const relevantSkills = findRelevantSkills(
      input.prompt || '',
      agent['available-skills'],
      skillsRegistry,
      customTriggers
    );

    if (relevantSkills.length > 0) {
      // Add main reminder message
      messages.push({
        level: 'info',
        message: `Skill reminder for ${agentId}: ${relevantSkills.length} available skill(s) may help with this task`,
      });

      // Add individual skill reminders
      for (const skill of relevantSkills) {
        messages.push({
          level: 'info',
          message: `Available: "${skill.skillId}" - ${skill.description}. Invoke via Skill tool when needed.`,
        });
      }

      const skillList = relevantSkills.map((s) => s.skillId).join(', ');
      sendResponse(advisory(messages, `Skill reminders: ${skillList}`));
    } else {
      // No relevant skills found, pass through silently
      sendResponse(passThrough());
    }
  } catch (_error) {
    // On any error, pass through to avoid blocking
    sendResponse(passThrough());
  }
}

main();
