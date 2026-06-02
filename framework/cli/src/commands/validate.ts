import { DiscoveryEngine } from '../lib/discovery-engine.js';
import { FrameworkValidator, ValidationReport } from '../lib/framework-validator.js';
import { VersionValidator, VersionValidationResult } from '../lib/version-validator.js';
import { MarkdownLinkValidator, LinkValidationResult } from '../lib/link-validator.js';
import * as fs from 'fs/promises';
import * as path from 'path';
import chalk from 'chalk';
import { recordValidateCommand } from '../lib/telemetry/instrumentation/cli-instrumentation.js';
import { CliContext } from '../lib/cli-context.js';

interface ValidateOptions {
  path: string;
  strict?: boolean;
  json?: boolean;
  verbose?: boolean;
  versions?: boolean;
  links?: boolean;
}

export async function validateCommand(options: ValidateOptions): Promise<void> {
  const startTime = Date.now();
  const ctx = options.path && options.path !== '.'
    ? await CliContext.create({ path: options.path })
    : await CliContext.require();
  const projectPath = ctx.projectRoot;

  // Resolve framework root for self-dev projects
  let frameworkRoot: string = projectPath; // Default for regular projects

  // Use manifest from context if available
  if (ctx.manifest?.paths?.source) {
    frameworkRoot = path.join(projectPath, ctx.manifest.paths.source);
  }

  try {
    // If --links flag is set, validate markdown links
    if (options.links) {
      const linkValidator = new MarkdownLinkValidator(frameworkRoot);

      // Find all markdown files
      const markdownFiles = await findMarkdownFiles(frameworkRoot);

      // Validate links
      const result = await linkValidator.validateMarkdownLinks(markdownFiles);

      // Output
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printLinksReport(result, options.verbose ?? false);
      }

      // Exit code based on broken links only
      // Broken links in framework files → exit 1 (critical)
      // Anti-patterns are style suggestions, never block commits
      const frameworkErrors = result.brokenLinks.some(link =>
        linkValidator.isFrameworkFile(link.file)
      );

      // Record telemetry
      const durationMs = Date.now() - startTime;
      await recordValidateCommand(
        { strict: options.strict, versions: options.versions, links: options.links },
        { valid: result.valid, brokenLinks: result.brokenLinks.length, antiPatterns: result.antiPatterns.length },
        durationMs,
        result.valid
      ).catch(() => {});

      if (frameworkErrors) {
        process.exit(1); // Critical errors in framework files - block commits
      }
      // Warnings only in content files - allow commits (exit 0)
      return;
    }

    // If --versions flag is set, only validate version consistency
    // Version files (CLAUDE.md, README.md, package.json) are relative to project root
    if (options.versions) {
      const versionValidator = new VersionValidator(projectPath);
      const result = await versionValidator.validateConsistency();

      // Output
      if (options.json) {
        console.log(JSON.stringify(result, null, 2));
      } else {
        printVersionReport(result, options.verbose ?? false);
      }

      // Record telemetry
      const durationMs = Date.now() - startTime;
      await recordValidateCommand(
        { strict: options.strict, versions: options.versions, links: options.links },
        { valid: result.valid, sources: result.sources.length, mismatches: result.mismatches?.length || 0 },
        durationMs,
        result.valid
      ).catch(() => {});

      // Exit code
      if (options.strict && !result.valid) {
        process.exit(1);
      }
      return;
    }

    // Full framework validation
    const engine = new DiscoveryEngine(frameworkRoot);
    await engine.loadModules();
    await engine.buildCapabilityMap();
    const validator = new FrameworkValidator(engine, frameworkRoot, projectPath);

    // Run validation
    const report = await validator.validateAll();

    // Output
    if (options.json) {
      console.log(JSON.stringify(report, null, 2));
    } else {
      printReport(report, options.verbose ?? false);
    }

    // Record telemetry
    const durationMs = Date.now() - startTime;
    await recordValidateCommand(
      { strict: options.strict, versions: options.versions, links: options.links },
      {
        valid: report.overall,
        capabilityResolution: report.capabilityResolution.valid,
        moduleDeclarations: report.moduleDeclarations.valid,
        skillCapabilities: report.skillCapabilities.valid
      },
      durationMs,
      report.overall
    ).catch(() => {});

    // Exit code
    if (options.strict && !report.overall) {
      process.exit(1);
    }
  } catch (error) {
    // Record telemetry for error case
    const durationMs = Date.now() - startTime;
    await recordValidateCommand(
      { strict: options.strict, versions: options.versions, links: options.links },
      { error: error instanceof Error ? error.message : String(error) },
      durationMs,
      false
    ).catch(() => {});

    console.error('Validation failed:', error instanceof Error ? error.message : error);
    process.exit(1);
  }
}

function printVersionReport(result: VersionValidationResult, verbose: boolean): void {
  const _icon = (valid: boolean) => valid ? '✅' : '❌';

  console.log('\nVersion Consistency Validation\n');

  // Show all sources
  for (const source of result.sources) {
    const status = source.version ? '✅' : '❌';
    console.log(`${status} ${source.file}: ${source.version ?? '(not found)'}`);
    if (verbose && source.error) {
      console.log(`   Error: ${source.error}`);
    }
  }

  console.log();

  // Show errors if any
  if (result.errors && result.errors.length > 0) {
    console.log('Errors:');
    result.errors.forEach(e => console.log(`  - ${e}`));
    console.log();
  }

  // Show mismatches if any
  if (result.mismatches && result.mismatches.length > 0) {
    console.log('Version Mismatches:');
    result.mismatches.forEach(m => console.log(`  - ${m}`));
    console.log();
  }

  // Overall status
  console.log(result.valid ? '✅ All versions are consistent' : '❌ Version validation failed');
}

function printReport(report: ValidationReport, verbose: boolean): void {
  const icon = (valid: boolean) => valid ? '✅' : '❌';

  console.log('\nFramework Validation Report\n');

  // Capability Resolution
  const cap = report.capabilityResolution;
  console.log(`${icon(cap.valid)} Capability Resolution: ${cap.stats.passed}/${cap.stats.checked} capabilities resolved`);
  if (verbose && cap.issues.length > 0) {
    cap.issues.forEach(i => console.log(`   - ${i.message}`));
  }

  // Module Declarations
  const mod = report.moduleDeclarations;
  console.log(`${icon(mod.valid)} Module Declarations: ${mod.stats.passed}/${mod.stats.checked} declarations verified`);
  if (verbose && mod.issues.length > 0) {
    mod.issues.forEach(i => console.log(`   - ${i.message}`));
  }

  // Skill Capabilities
  const skill = report.skillCapabilities;
  console.log(`${icon(skill.valid)} Skill Capabilities: ${skill.stats.passed}/${skill.stats.checked} capabilities consistent`);
  if (verbose && skill.issues.length > 0) {
    skill.issues.forEach(i => console.log(`   - ${i.message}`));
  }

  console.log('\n' + (report.overall ? '✅ All validations passed' : '❌ Validation failed'));
}

/**
 * Find all markdown files in framework
 */
async function findMarkdownFiles(rootDir: string): Promise<string[]> {
  const markdownFiles: string[] = [];

  async function scanDirectory(dir: string): Promise<void> {
    try {
      const entries = await fs.readdir(dir, { withFileTypes: true });

      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);

        // Skip node_modules, .git, dist, build directories
        if (entry.isDirectory()) {
          const skipDirs = ['node_modules', '.git', 'dist', 'build', 'coverage'];
          if (!skipDirs.includes(entry.name)) {
            await scanDirectory(fullPath);
          }
        } else if (entry.isFile() && entry.name.endsWith('.md')) {
          markdownFiles.push(fullPath);
        }
      }
    } catch (_error) {
      // Skip directories we can't read
    }
  }

  await scanDirectory(rootDir);
  return markdownFiles;
}

/**
 * Print link validation report
 */
function printLinksReport(result: LinkValidationResult, verbose: boolean): void {
  console.log(chalk.bold('\nMarkdown Link Validation Report\n'));
  console.log('─'.repeat(80));

  // Summary statistics
  console.log(`Files checked: ${result.filesChecked}`);
  console.log(`Links checked: ${result.linksChecked}`);
  console.log(`Broken links: ${result.brokenLinks.length}`);
  console.log(`Anti-patterns: ${result.antiPatterns.length}`);
  console.log();

  // Broken links
  if (result.brokenLinks.length > 0) {
    console.log(chalk.red(`❌ BROKEN LINKS (${result.brokenLinks.length}):`));
    console.log(chalk.gray('   These links point to files that don\'t exist:\n'));

    // Group by file
    const byFile = result.brokenLinks.reduce((acc, link) => {
      if (!acc[link.file]) acc[link.file] = [];
      acc[link.file].push(link);
      return acc;
    }, {} as Record<string, typeof result.brokenLinks>);

    for (const [file, links] of Object.entries(byFile)) {
      const relPath = path.relative(process.cwd(), file);
      console.log(chalk.yellow(`   📄 ${relPath}:`));

      for (const link of links) {
        console.log(chalk.red(`      Line ${link.line}: [${link.linkText}](${link.target})`));
        if (verbose) {
          console.log(chalk.gray(`         ${link.reason}`));
        }
      }
      console.log();
    }
  }

  // Anti-patterns
  if (result.antiPatterns.length > 0) {
    console.log(chalk.yellow(`⚠️  ANTI-PATTERNS (${result.antiPatterns.length}):`));
    console.log(chalk.gray('   These patterns should be converted to proper markdown links:\n'));

    // Group by file
    const byFile = result.antiPatterns.reduce((acc, pattern) => {
      if (!acc[pattern.file]) acc[pattern.file] = [];
      acc[pattern.file].push(pattern);
      return acc;
    }, {} as Record<string, typeof result.antiPatterns>);

    for (const [file, patterns] of Object.entries(byFile)) {
      const relPath = path.relative(process.cwd(), file);
      console.log(chalk.yellow(`   📄 ${relPath}:`));

      for (const pattern of patterns) {
        const typeLabel = {
          backticked_path: 'Backticked path',
          unlinked_reference: 'Unlinked reference',
          plain_path_in_workflow: 'Plain path in workflow'
        }[pattern.patternType];

        console.log(chalk.yellow(`      Line ${pattern.line}: ${typeLabel}`));
        if (verbose) {
          console.log(chalk.gray(`         ${pattern.suggestion}`));
        }
      }
      console.log();
    }
  }

  console.log('─'.repeat(80));

  // Overall status
  if (result.valid) {
    console.log(chalk.green('\n✅ ALL LINKS VALID'));
    console.log(chalk.gray('No broken links or anti-patterns found!'));
  } else {
    // Check if framework files have BROKEN LINKS (not anti-patterns)
    const brokenLinksInFramework = result.brokenLinks.some(link => {
      const validator = new MarkdownLinkValidator(process.cwd());
      return validator.isFrameworkFile(link.file);
    });

    if (result.brokenLinks.length > 0) {
      console.log(chalk.red('\n❌ BROKEN LINKS FOUND'));
      if (brokenLinksInFramework) {
        console.log(chalk.red('   Critical: broken links in framework files (blocks commits)'));
      } else {
        console.log(chalk.yellow('   Broken links in content files (allows commits)'));
      }
    }

    if (result.antiPatterns.length > 0 && result.brokenLinks.length === 0) {
      console.log(chalk.yellow('\n⚠️  STYLE SUGGESTIONS'));
      console.log(chalk.yellow('   Anti-patterns found (backticked paths that could be links)'));
      console.log(chalk.gray('   These are suggestions only, not errors'));
    }
  }

  console.log();
}
