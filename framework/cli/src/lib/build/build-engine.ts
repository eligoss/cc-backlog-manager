/**
 * Build Engine - Unified validation for framework artifacts
 *
 * Provides compile-time-like validation for markdown files with YAML frontmatter.
 * Consolidates schema validation, link checking, and cross-reference verification.
 *
 * @module build/build-engine
 */

import * as fs from "fs/promises";
import * as path from "path";
import fg from "fast-glob";
import matter from "gray-matter";
import { z, ZodError } from "zod";
import chalk from "chalk";

import {
  AgentSchema,
  AgentSchemaLoose,
  type Agent,
} from "../schemas/agent.schema.js";
import { SkillSchema, type Skill } from "../schemas/skill.schema.js";
import { MarkdownLinkValidator } from "../link-validator.js";

/**
 * Build error with file location
 */
export interface BuildError {
  /** Error severity */
  severity: "error" | "warning";
  /** Error code for categorization */
  code: string;
  /** Human-readable message */
  message: string;
  /** File path (relative to project root) */
  file: string;
  /** Line number (1-indexed, if available) */
  line?: number;
  /** Column number (if available) */
  column?: number;
  /** Field path for schema errors */
  field?: string;
  /** Suggested fix */
  suggestion?: string;
}

/**
 * Build result summary
 */
export interface BuildResult {
  /** Whether build passed (no errors) */
  success: boolean;
  /** Total errors found */
  errorCount: number;
  /** Total warnings found */
  warningCount: number;
  /** All errors and warnings */
  issues: BuildError[];
  /** Validation statistics */
  stats: {
    agentsChecked: number;
    skillsChecked: number;
    linksChecked: number;
    filesChecked: number;
    capabilitiesValidated: number;
  };
  /** Duration in milliseconds */
  durationMs: number;
}

/**
 * Build options
 */
export interface BuildOptions {
  /** Project root path */
  projectPath: string;
  /** Framework source path (for self-dev projects) */
  frameworkPath?: string;
  /** Check external links (slower) */
  externalLinks?: boolean;
  /** Quick mode - schema validation only */
  quick?: boolean;
  /** Verbose output */
  verbose?: boolean;
  /** Generate JSON schemas for IDE */
  emitSchemas?: boolean;
  /** Output directory for generated schemas */
  schemaOutputDir?: string;
}

/**
 * Parsed agent with metadata
 */
interface ParsedAgent {
  file: string;
  data: Agent;
  raw: Record<string, unknown>;
}

/**
 * Parsed skill with metadata
 */
interface ParsedSkill {
  file: string;
  data: Skill;
  raw: Record<string, unknown>;
}

/**
 * Build Engine - main entry point for framework validation
 */
export class BuildEngine {
  private readonly projectPath: string;
  private readonly frameworkPath: string;
  private readonly options: BuildOptions;
  private readonly issues: BuildError[] = [];

  // Collected data for cross-reference validation
  private agents: ParsedAgent[] = [];
  private skills: ParsedSkill[] = [];
  private providedCapabilities = new Set<string>();

  constructor(options: BuildOptions) {
    this.options = options;
    this.projectPath = path.resolve(options.projectPath);
    this.frameworkPath = options.frameworkPath
      ? path.resolve(options.frameworkPath)
      : this.projectPath;
  }

  /**
   * Run the full build process
   */
  async build(): Promise<BuildResult> {
    const startTime = Date.now();

    try {
      // Phase 1: Schema validation
      await this.validateAgentSchemas();
      await this.validateSkillSchemas();

      // Phase 2: Cross-reference validation (unless quick mode)
      if (!this.options.quick) {
        await this.validateCrossReferences();
      }

      // Phase 3: Link validation (unless quick mode)
      if (!this.options.quick) {
        await this.validateLinks();
      }

      // Phase 4: Generate IDE schemas (if requested)
      if (this.options.emitSchemas) {
        await this.emitJsonSchemas();
      }
    } catch (error) {
      this.addError({
        severity: "error",
        code: "BUILD_FATAL",
        message: error instanceof Error ? error.message : String(error),
        file: "build-engine",
      });
    }

    const durationMs = Date.now() - startTime;

    const errorCount = this.issues.filter((i) => i.severity === "error").length;
    const warningCount = this.issues.filter(
      (i) => i.severity === "warning",
    ).length;

    return {
      success: errorCount === 0,
      errorCount,
      warningCount,
      issues: this.issues,
      stats: {
        agentsChecked: this.agents.length,
        skillsChecked: this.skills.length,
        linksChecked: 0, // Updated by validateLinks
        filesChecked: this.agents.length + this.skills.length,
        capabilitiesValidated: this.providedCapabilities.size,
      },
      durationMs,
    };
  }

  /**
   * Validate all agent frontmatter schemas
   */
  private async validateAgentSchemas(): Promise<void> {
    const agentPatterns = [
      `${this.frameworkPath}/framework/modules/*/agents/*.md`,
      `${this.projectPath}/ai/agents/*.md`,
      `${this.projectPath}/.claude/commands/*.md`,
    ];

    const files = await fg(agentPatterns, {
      ignore: ["**/node_modules/**", "**/.git/**"],
      absolute: true,
    });

    for (const file of files) {
      await this.validateAgentFile(file);
    }
  }

  /**
   * Validate a single agent file
   */
  private async validateAgentFile(filePath: string): Promise<void> {
    const relPath = path.relative(this.projectPath, filePath);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const { data } = matter(content);

      // Skip files without agent frontmatter
      if (!data.agent) {
        return;
      }

      // Loose parse first to get line numbers for errors
      const _looseResult = AgentSchemaLoose.safeParse(data);

      // Strict validation
      const result = AgentSchema.safeParse(data);

      if (!result.success) {
        this.addZodErrors(result.error, relPath, "AGENT");
      } else {
        this.agents.push({
          file: relPath,
          data: result.data,
          raw: data as Record<string, unknown>,
        });
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("ENOENT")) {
        return; // Skip missing files
      }
      this.addError({
        severity: "error",
        code: "AGENT_PARSE_ERROR",
        message: `Failed to parse agent file: ${error instanceof Error ? error.message : error}`,
        file: relPath,
      });
    }
  }

  /**
   * Validate all skill frontmatter schemas
   */
  private async validateSkillSchemas(): Promise<void> {
    const skillPatterns = [
      `${this.frameworkPath}/framework/modules/*/skills/**/SKILL.md`,
      `${this.projectPath}/ai/skills/**/SKILL.md`,
      `${this.projectPath}/.claude/skills/**/SKILL.md`,
    ];

    const files = await fg(skillPatterns, {
      ignore: ["**/node_modules/**", "**/.git/**"],
      absolute: true,
    });

    for (const file of files) {
      await this.validateSkillFile(file);
    }
  }

  /**
   * Validate a single skill file
   */
  private async validateSkillFile(filePath: string): Promise<void> {
    const relPath = path.relative(this.projectPath, filePath);

    try {
      const content = await fs.readFile(filePath, "utf-8");
      const { data } = matter(content);

      // Skip files without skill frontmatter
      if (!data.id && !data.name) {
        return;
      }

      // Strict validation
      const result = SkillSchema.safeParse(data);

      if (!result.success) {
        this.addZodErrors(result.error, relPath, "SKILL");
      } else {
        this.skills.push({
          file: relPath,
          data: result.data,
          raw: data as Record<string, unknown>,
        });

        // Collect provided capabilities
        for (const cap of result.data["capabilities-provided"]) {
          this.providedCapabilities.add(cap);
        }
      }
    } catch (error) {
      if (error instanceof Error && error.message.includes("ENOENT")) {
        return;
      }
      this.addError({
        severity: "error",
        code: "SKILL_PARSE_ERROR",
        message: `Failed to parse skill file: ${error instanceof Error ? error.message : error}`,
        file: relPath,
      });
    }
  }

  /**
   * Validate cross-references between agents and skills
   */
  private async validateCrossReferences(): Promise<void> {
    // 1. Validate capability-needs resolve to capabilities-provided
    for (const agent of this.agents) {
      const capabilityNeeds = agent.data["capability-needs"] || [];

      for (const need of capabilityNeeds) {
        if (!this.providedCapabilities.has(need)) {
          const suggestions = this.findSimilarCapabilities(need);
          this.addError({
            severity: "error",
            code: "CAPABILITY_NOT_FOUND",
            message: `Unknown capability '${need}'`,
            file: agent.file,
            field: "capability-needs",
            suggestion:
              suggestions.length > 0
                ? `Did you mean: ${suggestions.join(", ")}?`
                : `Available capabilities: ${[...this.providedCapabilities].slice(0, 5).join(", ")}${this.providedCapabilities.size > 5 ? "..." : ""}`,
          });
        }
      }
    }

    // 2. Validate agent names are unique (within same source type)
    // Agents exist in both .claude/commands/ (scaffolded) and framework/modules/ (source) - that's expected
    const agentsByName = new Map<string, string>();
    for (const agent of this.agents) {
      const existing = agentsByName.get(agent.data.agent);
      if (existing) {
        const sameSource =
          (existing.includes("modules/") && agent.file.includes("modules/")) ||
          (existing.includes("commands/") && agent.file.includes("commands/"));
        if (sameSource) {
          this.addError({
            severity: "error",
            code: "DUPLICATE_AGENT",
            message: `Duplicate agent name '${agent.data.agent}'`,
            file: agent.file,
            suggestion: `Rename one of the duplicate agents`,
          });
        }
      } else {
        agentsByName.set(agent.data.agent, agent.file);
      }
    }
  }

  /**
   * Find similar capability names for suggestions
   */
  private findSimilarCapabilities(needle: string): string[] {
    const results: string[] = [];
    const needleLower = needle.toLowerCase();

    for (const cap of this.providedCapabilities) {
      const capLower = cap.toLowerCase();
      // Simple similarity: contains or Levenshtein distance < 3
      if (capLower.includes(needleLower) || needleLower.includes(capLower)) {
        results.push(cap);
      } else if (this.levenshteinDistance(needleLower, capLower) <= 3) {
        results.push(cap);
      }
    }

    return results.slice(0, 3);
  }

  /**
   * Simple Levenshtein distance for typo detection
   */
  private levenshteinDistance(a: string, b: string): number {
    if (a.length === 0) return b.length;
    if (b.length === 0) return a.length;

    const matrix: number[][] = [];

    for (let i = 0; i <= b.length; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= a.length; j++) {
      matrix[0][j] = j;
    }

    for (let i = 1; i <= b.length; i++) {
      for (let j = 1; j <= a.length; j++) {
        if (b.charAt(i - 1) === a.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1,
          );
        }
      }
    }

    return matrix[b.length][a.length];
  }

  /**
   * Validate markdown links
   */
  private async validateLinks(): Promise<void> {
    const validator = new MarkdownLinkValidator(this.frameworkPath);

    // Find all markdown files
    const patterns = [
      `${this.frameworkPath}/framework/modules/**/*.md`,
      `${this.projectPath}/ai/**/*.md`,
      `${this.projectPath}/docs/**/*.md`,
      `${this.projectPath}/.claude/**/*.md`,
    ];

    const files = await fg(patterns, {
      ignore: ["**/node_modules/**", "**/.git/**", "**/dist/**"],
      absolute: true,
    });

    const result = await validator.validateMarkdownLinks(files);

    // Convert broken links to build errors
    for (const broken of result.brokenLinks) {
      const isFramework = validator.isFrameworkFile(broken.file);
      this.addError({
        severity: isFramework ? "error" : "warning",
        code: "BROKEN_LINK",
        message: `Broken link to '${broken.target}'`,
        file: path.relative(this.projectPath, broken.file),
        line: broken.line,
        suggestion: broken.reason,
      });
    }

    // Convert anti-patterns to warnings
    for (const pattern of result.antiPatterns) {
      this.addError({
        severity: "warning",
        code: "LINK_ANTIPATTERN",
        message: `${pattern.patternType}: ${pattern.pattern.substring(0, 50)}...`,
        file: path.relative(this.projectPath, pattern.file),
        line: pattern.line,
        suggestion: pattern.suggestion,
      });
    }
  }

  /**
   * Generate JSON schemas for IDE integration
   */
  private async emitJsonSchemas(): Promise<void> {
    // Dynamic import to avoid loading if not needed
    const { zodToJsonSchema } = await import("zod-to-json-schema");

    const outputDir =
      this.options.schemaOutputDir ||
      path.join(this.projectPath, ".idea", "jsonSchemas");

    await fs.mkdir(outputDir, { recursive: true });

    // Generate agent schema
    // @ts-expect-error - zod-to-json-schema v3.25.1 types not yet updated for Zod v4 internal changes
    const agentJsonSchema = zodToJsonSchema(AgentSchema, {
      name: "AgentFrontmatter",
      $refStrategy: "none",
    });

    await fs.writeFile(
      path.join(outputDir, "agent-frontmatter.schema.json"),
      JSON.stringify(agentJsonSchema, null, 2),
      "utf-8",
    );

    // Generate skill schema
    // @ts-expect-error - zod-to-json-schema v3.25.1 types not yet updated for Zod v4 internal changes
    const skillJsonSchema = zodToJsonSchema(SkillSchema, {
      name: "SkillFrontmatter",
      $refStrategy: "none",
    });

    await fs.writeFile(
      path.join(outputDir, "skill-frontmatter.schema.json"),
      JSON.stringify(skillJsonSchema, null, 2),
      "utf-8",
    );

    // Generate WebStorm YAML schema associations
    const yamlSchemas = {
      "JSON Schema associations": [
        {
          name: "Agent Frontmatter",
          pattern: "**/agents/**/*.md",
          schemaURL: "./agent-frontmatter.schema.json",
        },
        {
          name: "Skill Frontmatter",
          pattern: "**/skills/**/SKILL.md",
          schemaURL: "./skill-frontmatter.schema.json",
        },
      ],
    };

    await fs.writeFile(
      path.join(outputDir, "yaml-schema-mappings.json"),
      JSON.stringify(yamlSchemas, null, 2),
    );

    if (this.options.verbose) {
      console.log(chalk.green(`✓ Generated JSON schemas in ${outputDir}`));
    }
  }

  /**
   * Convert Zod errors to build errors
   */
  private addZodErrors(error: ZodError, file: string, prefix: string): void {
    for (const issue of error.issues) {
      const field = issue.path.join(".");
      this.addError({
        severity: "error",
        code: `${prefix}_${issue.code.toUpperCase()}`,
        message: issue.message,
        file,
        field: field || undefined,
        suggestion: this.getZodSuggestion(issue),
      });
    }
  }

  /**
   * Get suggestion for Zod validation error
   * Updated for Zod v4 - issue types are no longer exported
   */
  private getZodSuggestion(issue: z.ZodIssue): string | undefined {
    switch (issue.code) {
      case "invalid_type":
        // In Zod v4, check if properties exist
        if ("expected" in issue && "received" in issue) {
          return `Expected ${issue.expected}, got ${issue.received}`;
        }
        return undefined;
      case "too_small":
        if ("minimum" in issue) {
          return `Minimum ${issue.minimum} required`;
        }
        return undefined;
      case "too_big":
        if ("maximum" in issue) {
          return `Maximum ${issue.maximum} allowed`;
        }
        return undefined;
      default:
        return undefined;
    }
  }

  /**
   * Add an error to the issues list
   */
  private addError(error: BuildError): void {
    this.issues.push(error);
  }
}

/**
 * Format build results for console output
 */
export function formatBuildOutput(
  result: BuildResult,
  verbose: boolean,
): string {
  const lines: string[] = [];

  lines.push("");
  lines.push(chalk.bold("Framework Build Report"));
  lines.push("─".repeat(60));

  // Group errors by file
  const byFile = new Map<string, BuildError[]>();
  for (const issue of result.issues) {
    const existing = byFile.get(issue.file) || [];
    existing.push(issue);
    byFile.set(issue.file, existing);
  }

  // Sort files with errors first
  const sortedFiles = [...byFile.keys()].sort((a, b) => {
    const aIssues = byFile.get(a);
    const bIssues = byFile.get(b);
    const aHasErrors = aIssues?.some((i) => i.severity === "error") ?? false;
    const bHasErrors = bIssues?.some((i) => i.severity === "error") ?? false;
    if (aHasErrors && !bHasErrors) return -1;
    if (!aHasErrors && bHasErrors) return 1;
    return a.localeCompare(b);
  });

  for (const file of sortedFiles) {
    const issues = byFile.get(file);
    if (!issues) continue;
    lines.push("");
    lines.push(chalk.cyan(file));

    for (const issue of issues) {
      const icon =
        issue.severity === "error" ? chalk.red("✗") : chalk.yellow("⚠");
      const location = issue.line ? `:${issue.line}` : "";
      const field = issue.field ? ` [${issue.field}]` : "";

      lines.push(`  ${icon} ${issue.code}${location}${field}`);
      lines.push(`    ${issue.message}`);

      if (verbose && issue.suggestion) {
        lines.push(chalk.gray(`    → ${issue.suggestion}`));
      }
    }
  }

  lines.push("");
  lines.push("─".repeat(60));

  // Statistics
  lines.push(
    chalk.dim(
      `Checked: ${result.stats.agentsChecked} agents, ${result.stats.skillsChecked} skills`,
    ),
  );
  lines.push(
    chalk.dim(`Capabilities validated: ${result.stats.capabilitiesValidated}`),
  );
  lines.push(chalk.dim(`Duration: ${result.durationMs}ms`));
  lines.push("");

  // Summary
  if (result.success) {
    lines.push(chalk.green.bold("✓ Build succeeded"));
    if (result.warningCount > 0) {
      lines.push(chalk.yellow(`  ${result.warningCount} warning(s)`));
    }
  } else {
    lines.push(chalk.red.bold(`✗ Build failed`));
    lines.push(
      chalk.red(
        `  ${result.errorCount} error(s), ${result.warningCount} warning(s)`,
      ),
    );
  }

  lines.push("");

  return lines.join("\n");
}
