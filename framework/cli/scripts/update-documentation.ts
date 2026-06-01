#!/usr/bin/env node
/**
 * Documentation Update Script
 *
 * Replaces Python command references with TypeScript CLI equivalents across
 * all framework markdown files.
 *
 * Usage:
 *   npm run update-docs -- --dry-run   # Preview changes
 *   npm run update-docs -- --apply     # Apply changes
 */

import * as fs from 'fs';
import * as path from 'path';
import { promisify } from 'util';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const readFile = promisify(fs.readFile);
const writeFile = promisify(fs.writeFile);

interface CommandMapping {
  pattern: RegExp;
  replacement: string | ((match: string, ...groups: string[]) => string);
  description: string;
  category: 'discovery' | 'sync' | 'version' | 'routes' | 'guards' | 'planning';
  available: boolean; // Is the CLI command available?
}

interface DocumentationUpdate {
  file: string;
  lineNumber: number;
  oldCommand: string;
  newCommand: string;
  category: string;
}

interface UpdateReport {
  totalFiles: number;
  filesScanned: number;
  filesModified: number;
  updates: DocumentationUpdate[];
  errors: Array<{ file: string; error: string }>;
}

// Command mappings with availability tracking
const commandMappings: CommandMapping[] = [
  // Discovery & Validation - Only update what's actually available
  {
    pattern: /python3 src\/framework\/discovery_engine\.py validate/g,
    replacement: 'agentic-framework validate',
    description: 'Validate framework integrity',
    category: 'discovery',
    available: true,
  },

  // Sync commands
  {
    pattern: /python3 src\/framework\/sync_agents\.py/g,
    replacement: 'agentic-framework sync --agents',
    description: 'Sync agents',
    category: 'sync',
    available: true,
  },
  {
    pattern: /python3 src\/framework\/sync_skills\.py/g,
    replacement: 'agentic-framework sync --skills',
    description: 'Sync skills',
    category: 'sync',
    available: true,
  },

  // Version management - Only update validate_version_consistency (available)
  {
    pattern: /python3 scripts\/validate_version_consistency\.py/g,
    replacement: 'agentic-framework validate --versions',
    description: 'Validate version consistency',
    category: 'version',
    available: true,
  },

  // Routes
  {
    pattern: /python3 src\/framework\/update_routes\.py\s+--apply/g,
    replacement: 'agentic-framework routes sync',
    description: 'Sync routes.yml',
    category: 'routes',
    available: true,
  },
  {
    pattern: /python3 src\/framework\/update_routes\.py\s+--report/g,
    replacement: 'agentic-framework routes check',
    description: 'Check routes.yml',
    category: 'routes',
    available: true,
  },
  {
    pattern: /python3 src\/framework\/update_routes\.py/g,
    replacement: 'agentic-framework routes check',
    description: 'Check routes.yml (default)',
    category: 'routes',
    available: true,
  },

  // Planning (module-specific - keep as-is for now)
  // These are intentionally not mapped as they're module-specific
];

/**
 * Find all markdown files in the framework (excluding node_modules)
 */
async function findMarkdownFiles(rootDir: string): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = fs.readdirSync(dir, { withFileTypes: true });

    for (const entry of entries) {
      const fullPath = path.join(dir, entry.name);

      // Skip node_modules, .git, and other ignored directories
      if (entry.isDirectory()) {
        if (!['node_modules', '.git', 'dist', 'coverage'].includes(entry.name)) {
          await walk(fullPath);
        }
      } else if (entry.isFile() && entry.name.endsWith('.md')) {
        files.push(fullPath);
      }
    }
  }

  await walk(rootDir);
  return files;
}

/**
 * Process a single file and collect updates
 */
async function processFile(
  filePath: string,
  dryRun: boolean
): Promise<{ updates: DocumentationUpdate[]; error?: string }> {
  const updates: DocumentationUpdate[] = [];

  // Skip the report file itself
  if (filePath.includes('DOCUMENTATION_UPDATES_REPORT.md')) {
    return { updates: [] };
  }

  try {
    const content = await readFile(filePath, 'utf-8');
    const lines = content.split('\n');
    let newContent = content;

    // Track line numbers for reporting
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const line = lines[lineIndex];

      for (const mapping of commandMappings) {
        const matches = Array.from(line.matchAll(mapping.pattern));

        for (const match of matches) {
          const oldCommand = match[0];
          const newCommand = typeof mapping.replacement === 'function'
            ? mapping.replacement(match[0], ...match.slice(1))
            : mapping.replacement;

          updates.push({
            file: filePath,
            lineNumber: lineIndex + 1,
            oldCommand,
            newCommand,
            category: mapping.category,
          });
        }
      }
    }

    // Apply replacements to content
    if (updates.length > 0 && !dryRun) {
      for (const mapping of commandMappings) {
        newContent = newContent.replace(mapping.pattern, mapping.replacement as string);
      }

      await writeFile(filePath, newContent, 'utf-8');
    }

    return { updates };
  } catch (error) {
    return {
      updates: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Generate markdown report
 */
function generateReport(report: UpdateReport, dryRun: boolean): string {
  const lines: string[] = [];

  lines.push('# Documentation Update Report');
  lines.push('');
  lines.push(`**Mode:** ${dryRun ? 'DRY RUN (Preview)' : 'APPLIED'}`);
  lines.push(`**Date:** ${new Date().toISOString()}`);
  lines.push('');

  // Summary
  lines.push('## Summary');
  lines.push('');
  lines.push(`- **Files Scanned:** ${report.filesScanned}`);
  lines.push(`- **Files Modified:** ${report.filesModified}`);
  lines.push(`- **Total Updates:** ${report.updates.length}`);
  lines.push(`- **Errors:** ${report.errors.length}`);
  lines.push('');

  // Updates by category
  const byCategory = report.updates.reduce((acc, update) => {
    if (!acc[update.category]) acc[update.category] = [];
    acc[update.category].push(update);
    return acc;
  }, {} as Record<string, DocumentationUpdate[]>);

  lines.push('## Updates by Category');
  lines.push('');
  for (const [category, updates] of Object.entries(byCategory)) {
    lines.push(`### ${category.charAt(0).toUpperCase() + category.slice(1)}`);
    lines.push('');
    lines.push(`**Count:** ${updates.length} updates`);
    lines.push('');
  }

  // Detailed changes
  lines.push('## Detailed Changes');
  lines.push('');

  // Group by file
  const byFile = report.updates.reduce((acc, update) => {
    if (!acc[update.file]) acc[update.file] = [];
    acc[update.file].push(update);
    return acc;
  }, {} as Record<string, DocumentationUpdate[]>);

  for (const [file, updates] of Object.entries(byFile)) {
    const relPath = file.replace(process.cwd(), '.');
    lines.push(`### ${relPath}`);
    lines.push('');
    lines.push(`**${updates.length} change(s)**`);
    lines.push('');

    for (const update of updates) {
      lines.push(`**Line ${update.lineNumber}** (${update.category}):`);
      lines.push('```bash');
      lines.push(`# Old:`);
      lines.push(update.oldCommand);
      lines.push('');
      lines.push(`# New:`);
      lines.push(update.newCommand);
      lines.push('```');
      lines.push('');
    }
  }

  // Errors
  if (report.errors.length > 0) {
    lines.push('## Errors');
    lines.push('');
    for (const error of report.errors) {
      lines.push(`- **${error.file}**: ${error.error}`);
    }
    lines.push('');
  }

  // Command availability notes
  lines.push('## Command Availability');
  lines.push('');
  lines.push('### Available in CLI');
  lines.push('');
  for (const mapping of commandMappings.filter(m => m.available)) {
    lines.push(`- ✅ ${mapping.description}`);
  }
  lines.push('');

  lines.push('### Not Yet Available (TODO)');
  lines.push('');
  for (const mapping of commandMappings.filter(m => !m.available)) {
    lines.push(`- ⏳ ${mapping.description}`);
  }
  lines.push('');

  return lines.join('\n');
}

/**
 * Main execution
 */
async function main() {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run');
  const apply = args.includes('--apply');

  if (!dryRun && !apply) {
    console.error('Error: Must specify --dry-run or --apply');
    console.error('');
    console.error('Usage:');
    console.error('  npm run update-docs -- --dry-run   # Preview changes');
    console.error('  npm run update-docs -- --apply     # Apply changes');
    process.exit(1);
  }

  console.log('🔍 Documentation Update Script');
  console.log(`Mode: ${dryRun ? 'DRY RUN (Preview)' : 'APPLY CHANGES'}`);
  console.log('');

  // Find all markdown files
  const rootDir = path.resolve(__dirname, '../..');
  console.log(`📂 Scanning: ${rootDir}`);

  const files = await findMarkdownFiles(rootDir);
  console.log(`📄 Found ${files.length} markdown files`);
  console.log('');

  // Process files
  const report: UpdateReport = {
    totalFiles: files.length,
    filesScanned: 0,
    filesModified: 0,
    updates: [],
    errors: [],
  };

  console.log('🔄 Processing files...');
  for (const file of files) {
    report.filesScanned++;
    const result = await processFile(file, dryRun);

    if (result.error) {
      report.errors.push({ file, error: result.error });
    } else if (result.updates.length > 0) {
      report.filesModified++;
      report.updates.push(...result.updates);
    }

    // Progress indicator
    if (report.filesScanned % 10 === 0) {
      process.stdout.write(`\r   Processed ${report.filesScanned}/${files.length} files...`);
    }
  }
  console.log(`\r   Processed ${report.filesScanned}/${files.length} files... Done!`);
  console.log('');

  // Generate report
  const reportContent = generateReport(report, dryRun);
  const reportPath = path.join(rootDir, 'DOCUMENTATION_UPDATES_REPORT.md');

  await writeFile(reportPath, reportContent, 'utf-8');
  console.log(`📊 Report saved to: ${reportPath}`);
  console.log('');

  // Summary
  console.log('📈 Summary:');
  console.log(`   Files scanned: ${report.filesScanned}`);
  console.log(`   Files modified: ${report.filesModified}`);
  console.log(`   Total updates: ${report.updates.length}`);
  console.log(`   Errors: ${report.errors.length}`);
  console.log('');

  if (dryRun) {
    console.log('✅ Dry run complete. Review the report and run with --apply to make changes.');
  } else {
    console.log('✅ Updates applied successfully!');
  }
}

// Run
main().catch((error) => {
  console.error('❌ Fatal error:', error);
  process.exit(1);
});
