/**
 * MCP Knowledge Extractors
 *
 * Extract knowledge from projects for seeding Graphiti and Serena.
 */

import path from 'path';
import { FrameworkProjectExtractor, isFrameworkProject } from './framework-project.js';
import { GenericProjectExtractor } from './generic-project.js';

/**
 * Knowledge episode for Graphiti
 */
export interface KnowledgeEpisode {
  name: string;
  body: string;
  source: string;
  sourceType: 'file' | 'generated';
}

/**
 * Serena memory entry
 */
export interface SerenaMemory {
  name: string;
  content: string;
  category: 'overview' | 'patterns' | 'structure';
}

/**
 * Extracted knowledge from a project
 */
export interface ExtractedKnowledge {
  projectName: string;
  projectType: 'framework' | 'generic';
  episodes: KnowledgeEpisode[];
  serenaMemories: SerenaMemory[];
}

/**
 * Knowledge extractor interface
 */
export interface KnowledgeExtractor {
  extract(): Promise<ExtractedKnowledge>;
}

/**
 * Get the appropriate extractor for a project
 */
export async function getExtractor(projectPath: string): Promise<KnowledgeExtractor> {
  const projectName = path.basename(projectPath);

  if (await isFrameworkProject(projectPath)) {
    return new FrameworkProjectExtractor(projectPath, projectName);
  }

  return new GenericProjectExtractor(projectPath, projectName);
}

/**
 * Extract knowledge from a project
 */
export async function extractKnowledge(projectPath: string): Promise<ExtractedKnowledge> {
  const extractor = await getExtractor(projectPath);
  return extractor.extract();
}

export { FrameworkProjectExtractor, isFrameworkProject } from './framework-project.js';
export { GenericProjectExtractor } from './generic-project.js';
