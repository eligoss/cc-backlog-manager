/**
 * Writer Analyze Command
 *
 * CLI command for analyzing book projects (character graph, timeline, word counts).
 *
 * Usage:
 *   agentic-framework writer analyze
 *   agentic-framework writer analyze --verbose
 *
 * @module commands/writer/analyze
 */

import { Command } from 'commander';
import { withCLITelemetry } from '../../lib/telemetry/instrumentation/cli-instrumentation.js';
import path from 'path';
import fs from 'fs-extra';
import chalk from 'chalk';

/**
 * Options for writer analyze command
 */
interface WriterAnalyzeCmdOptions {
  /** Output directory for analysis files */
  output?: string;
  /** Verbose output */
  verbose?: boolean;
  /** Project root path */
  path?: string;
  /** Index signature for telemetry compatibility */
  [key: string]: unknown;
}

/**
 * Create the analyze command.
 *
 * @returns Commander command instance
 */
export function createAnalyzeCommand(): Command {
  const command = new Command('analyze');

  command
    .description('Run analysis: character graph, timeline, word counts')
    .option('-o, --output <path>', 'Output directory for analysis files', 'build/analysis')
    .option('-v, --verbose', 'Verbose output', false)
    .option('-p, --path <path>', 'Project root path', '.')
    .action(async (cmdOptions: WriterAnalyzeCmdOptions) => {
      await withCLITelemetry(
        'writer',
        'analyze',
        cmdOptions,
        async () => {
          try {
            await runAnalyzeCommand(cmdOptions);
            return { success: true };
          } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error);
            console.error(chalk.red(`\nError: ${errorMessage}\n`));
            process.exit(1);
          }
        }
      );
    });

  return command;
}

/**
 * Run the analyze command.
 *
 * @param cmdOptions - Command options
 */
async function runAnalyzeCommand(cmdOptions: WriterAnalyzeCmdOptions): Promise<void> {
  const startTime = Date.now();

  // Resolve project root
  const projectRoot = path.resolve(cmdOptions.path ?? '.');

  console.log('');
  console.log(chalk.bold('='.repeat(80)));
  console.log(chalk.bold('Writer Analysis'));
  console.log(chalk.bold('='.repeat(80)));
  console.log('');
  console.log(chalk.dim(`Project Root: ${projectRoot}`));
  console.log('');

  // Verify this is a book project
  await verifyBookProject(projectRoot);

  // Ensure analysis directory exists
  const analysisDir = path.join(projectRoot, cmdOptions.output ?? 'build/analysis');
  await fs.ensureDir(analysisDir);

  // Run analysis
  console.log(chalk.bold('Running analysis...\n'));

  // Word counts
  console.log(chalk.dim('  Counting words...'));
  const wordCounts = await analyzeWordCounts(projectRoot);
  await fs.writeFile(
    path.join(analysisDir, 'word-counts.json'),
    JSON.stringify(wordCounts, null, 2)
  );
  console.log(chalk.green(`  ✓ Word counts: ${wordCounts.total.toLocaleString()} total words`));

  // Character graph
  console.log(chalk.dim('  Building character graph...'));
  const characterGraph = await analyzeCharacters(projectRoot);
  await fs.writeFile(
    path.join(analysisDir, 'character-graph.json'),
    JSON.stringify(characterGraph, null, 2)
  );
  console.log(chalk.green(`  ✓ Character graph: ${characterGraph.characters.length} characters`));

  // Timeline
  console.log(chalk.dim('  Building timeline...'));
  const timeline = await analyzeTimeline(projectRoot);
  await fs.writeFile(
    path.join(analysisDir, 'timeline.json'),
    JSON.stringify(timeline, null, 2)
  );
  console.log(chalk.green(`  ✓ Timeline: ${timeline.events.length} events`));

  const duration = Date.now() - startTime;

  console.log('');
  console.log(chalk.bold('Analysis Summary:'));
  console.log(chalk.dim(`  Duration:     ${duration}ms`));
  console.log(chalk.dim(`  Output:       ${analysisDir}`));
  console.log('');
  console.log(chalk.green('✓ Analysis completed successfully\n'));
}

/**
 * Verify this is a valid book project
 */
async function verifyBookProject(projectRoot: string): Promise<void> {
  const manuscriptDir = path.join(projectRoot, 'manuscript');
  if (!(await fs.pathExists(manuscriptDir))) {
    throw new Error(
      `Not a valid book project: missing manuscript directory. Run 'agentic-framework writer init' first.`
    );
  }
}

/**
 * Result of word count analysis
 */
interface WordCountAnalysis {
  total: number;
  parts: Array<{
    name: string;
    words: number;
    chapters: Array<{
      name: string;
      words: number;
      scenes: number;
    }>;
  }>;
  averagePerPart: number;
  timestamp: string;
}

/**
 * Analyze word counts
 */
async function analyzeWordCounts(projectRoot: string): Promise<WordCountAnalysis> {
  let total = 0;
  const parts: WordCountAnalysis['parts'] = [];

  const manuscriptPath = path.join(projectRoot, 'manuscript');

  try {
    const partDirs = (await fs.readdir(manuscriptPath)).filter((p) => p.startsWith('part-'));

    for (const partDir of partDirs) {
      const partPath = path.join(manuscriptPath, partDir);
      const partStat = await fs.stat(partPath);
      if (!partStat.isDirectory()) continue;

      let partWords = 0;
      const chapters: Array<{ name: string; words: number; scenes: number }> = [];

      const chapterDirs = (await fs.readdir(partPath)).filter((c) => c.startsWith('chapter-'));

      for (const chapterDir of chapterDirs) {
        const chapterPath = path.join(partPath, chapterDir);
        const chapterStat = await fs.stat(chapterPath);
        if (!chapterStat.isDirectory()) continue;

        let chapterWords = 0;
        const scenes = (await fs.readdir(chapterPath)).filter((s) => s.startsWith('scene-'));

        for (const scene of scenes) {
          const scenePath = path.join(chapterPath, scene);
          const content = await fs.readFile(scenePath, 'utf-8');
          const words = content.split(/\s+/).filter((w) => w.length > 0).length;
          chapterWords += words;
        }

        chapters.push({ name: chapterDir, words: chapterWords, scenes: scenes.length });
        partWords += chapterWords;
      }

      parts.push({ name: partDir, words: partWords, chapters });
      total += partWords;
    }
  } catch (_err) {
    // Manuscript may not exist yet
  }

  return {
    total,
    parts,
    averagePerPart: parts.length > 0 ? Math.round(total / parts.length) : 0,
    timestamp: new Date().toISOString(),
  };
}

/**
 * Result of character analysis
 */
interface CharacterAnalysis {
  characters: Array<{
    id: string;
    name: string;
    file: string;
  }>;
  relationships: unknown[];
  metadata: {
    characterCount: number;
    relationshipCount: number;
  };
  timestamp: string;
}

/**
 * Analyze characters
 */
async function analyzeCharacters(projectRoot: string): Promise<CharacterAnalysis> {
  const characters: CharacterAnalysis['characters'] = [];

  const charactersPath = path.join(projectRoot, 'characters');
  if (await fs.pathExists(charactersPath)) {
    const files = await fs.readdir(charactersPath);

    for (const file of files) {
      if (!file.endsWith('.md')) continue;

      const filePath = path.join(charactersPath, file);

      // Simple extraction from content
      const name = file.replace('.md', '').replace(/-/g, ' ');
      characters.push({
        id: file.replace('.md', ''),
        name,
        file: path.relative(projectRoot, filePath),
      });
    }
  }

  return {
    characters,
    relationships: [], // Would need more complex parsing
    metadata: {
      characterCount: characters.length,
      relationshipCount: 0,
    },
    timestamp: new Date().toISOString(),
  };
}

/**
 * Result of timeline analysis
 */
interface TimelineAnalysis {
  events: Array<{
    id: string;
    file: string;
  }>;
  metadata: {
    eventCount: number;
    eras: unknown[];
  };
  timestamp: string;
}

/**
 * Analyze timeline
 */
async function analyzeTimeline(projectRoot: string): Promise<TimelineAnalysis> {
  const events: TimelineAnalysis['events'] = [];

  // Would need to parse history events from world directory
  const worldPath = path.join(projectRoot, 'world');
  if (await fs.pathExists(worldPath)) {
    const historyPath = path.join(worldPath, 'history');
    if (await fs.pathExists(historyPath)) {
      const eventsPath = path.join(historyPath, 'events');
      if (await fs.pathExists(eventsPath)) {
        const files = await fs.readdir(eventsPath);
        for (const file of files) {
          if (file.endsWith('.md')) {
            events.push({
              id: file.replace('.md', ''),
              file: path.join('world/history/events', file),
            });
          }
        }
      }
    }
  }

  return {
    events,
    metadata: {
      eventCount: events.length,
      eras: [],
    },
    timestamp: new Date().toISOString(),
  };
}
