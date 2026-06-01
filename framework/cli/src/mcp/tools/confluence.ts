/**
 * Confluence MCP Tools
 *
 * MCP tools for Confluence page management:
 * - Create pages from markdown
 * - Fetch pages as markdown
 * - Import reports to Confluence
 * - Validate markdown for ADF conversion
 *
 * @module mcp/tools/confluence
 */

import { z } from 'zod';
import { defineTool } from '../tool-registry.js';
import { executeCommand } from '../result-formatter.js';
import { successResult, errorResult, ErrorCodes } from '../types.js';
import { createPageCommand } from '../../lib/confluence/confluence-commands.js';
import { fetchPageCommand } from '../../lib/confluence/confluence-commands.js';
import { importReportsCommand } from '../../lib/confluence/confluence-commands.js';
import path from 'path';
import fs from 'fs-extra';
import { glob } from 'glob';
import { parseFrontmatter } from '../../lib/common/yaml-frontmatter.js';
import { markdownToAdf, AdfDocument } from '../../lib/confluence/adf-converter.js';
import {
  ValidationReport,
  createReport,
  formatReport,
  mergeReports,
  createError,
  createWarning,
} from '../../lib/validation/validation-report.js';
import { CliContext } from '../../lib/cli-context.js';
import { getFrameworkRoot } from '../../lib/module-loader.js';
import AjvModule from 'ajv';

const Ajv = AjvModule.default || AjvModule;

/**
 * Schema for confluence create tool
 */
const CreatePageSchema = z.object({
  file: z.string().describe('Path to markdown file with YAML frontmatter'),
  space: z.string().optional().describe('Space key (overrides frontmatter)'),
  parent: z.string().optional().describe('Parent page ID (overrides frontmatter)'),
  dryRun: z.boolean().optional().describe('Preview changes without creating page'),
  baseUrl: z.string().optional().describe('Confluence base URL (or use CONFLUENCE_BASE_URL env)'),
  email: z.string().optional().describe('Confluence account email (or use CONFLUENCE_EMAIL env)'),
  token: z.string().optional().describe('Confluence API token (or use CONFLUENCE_API_TOKEN env)'),
});

/**
 * Schema for confluence fetch tool
 */
const FetchPageSchema = z.object({
  pageId: z.string().describe('Confluence page ID'),
  output: z.string().describe('Output file path'),
  baseUrl: z.string().optional().describe('Confluence base URL (or use CONFLUENCE_BASE_URL env)'),
  email: z.string().optional().describe('Confluence account email (or use CONFLUENCE_EMAIL env)'),
  token: z.string().optional().describe('Confluence API token (or use CONFLUENCE_API_TOKEN env)'),
});

/**
 * Schema for confluence import-reports tool
 */
const ImportReportsSchema = z.object({
  dir: z.string().default('./reports').describe('Directory containing markdown reports'),
  dryRun: z.boolean().optional().describe('Preview changes without creating/updating pages'),
  baseUrl: z.string().optional().describe('Confluence base URL (or use CONFLUENCE_BASE_URL env)'),
  email: z.string().optional().describe('Confluence account email (or use CONFLUENCE_EMAIL env)'),
  token: z.string().optional().describe('Confluence API token (or use CONFLUENCE_API_TOKEN env)'),
});

/**
 * Schema for confluence validate tool
 */
const ValidateSchema = z.object({
  path: z.string().default('.').describe('Path to markdown file or directory'),
  strict: z.boolean().optional().describe('Exit with error code on warnings'),
  verbose: z.boolean().optional().describe('Show detailed validation information'),
});

/**
 * agentic_confluence_create tool
 */
export const confluenceCreateTool = defineTool(
  'agentic_confluence_create',
  'Create a Confluence page from a markdown file with YAML frontmatter',
  CreatePageSchema,
  async (args) => {
    try {
      // Get configuration from args or environment
      const baseUrl =
        args.baseUrl ||
        process.env.CONFLUENCE_BASE_URL ||
        process.env.JIRA_BASE_URL;
      const email =
        args.email ||
        process.env.CONFLUENCE_EMAIL ||
        process.env.JIRA_EMAIL;
      const apiToken =
        args.token ||
        process.env.CONFLUENCE_API_TOKEN ||
        process.env.JIRA_API_TOKEN;

      if (!baseUrl || !email || !apiToken) {
        return errorResult(
          ErrorCodes.INVALID_ARGUMENTS,
          'Missing required Confluence credentials',
          'Set CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, and CONFLUENCE_API_TOKEN environment variables or pass via arguments'
        );
      }

      const config = {
        baseUrl: baseUrl.replace(/\/$/, ''),
        email,
        apiToken,
      };

      const commandOptions = {
        parentId: args.parent,
        dryRun: args.dryRun || false,
      };

      const result = await executeCommand(
        () => createPageCommand(args.file, config, commandOptions),
        {}
      );

      if (!result.success) {
        return errorResult(
          ErrorCodes.COMMAND_FAILED,
          result.error?.message || 'Failed to create Confluence page',
          undefined,
          result.error
        );
      }

      return successResult(
        {
          file: args.file,
          space: args.space,
          parent: args.parent,
          dryRun: args.dryRun,
        },
        args.dryRun ? 'Dry run completed' : 'Page created successfully',
        result.output
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        error
      );
    }
  }
);

/**
 * agentic_confluence_fetch tool
 */
export const confluenceFetchTool = defineTool(
  'agentic_confluence_fetch',
  'Fetch a Confluence page by ID and save as markdown with frontmatter',
  FetchPageSchema,
  async (args) => {
    try {
      // Get configuration from args or environment
      const baseUrl =
        args.baseUrl ||
        process.env.CONFLUENCE_BASE_URL ||
        process.env.JIRA_BASE_URL;
      const email =
        args.email ||
        process.env.CONFLUENCE_EMAIL ||
        process.env.JIRA_EMAIL;
      const apiToken =
        args.token ||
        process.env.CONFLUENCE_API_TOKEN ||
        process.env.JIRA_API_TOKEN;

      if (!baseUrl || !email || !apiToken) {
        return errorResult(
          ErrorCodes.INVALID_ARGUMENTS,
          'Missing required Confluence credentials',
          'Set CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, and CONFLUENCE_API_TOKEN environment variables or pass via arguments'
        );
      }

      const config = {
        baseUrl: baseUrl.replace(/\/$/, ''),
        email,
        apiToken,
      };

      const result = await executeCommand(
        () => fetchPageCommand(args.pageId, args.output, config),
        {}
      );

      if (!result.success) {
        return errorResult(
          ErrorCodes.COMMAND_FAILED,
          result.error?.message || 'Failed to fetch Confluence page',
          undefined,
          result.error
        );
      }

      return successResult(
        {
          pageId: args.pageId,
          output: args.output,
        },
        'Page fetched successfully',
        result.output
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        error
      );
    }
  }
);

/**
 * agentic_confluence_import tool
 */
export const confluenceImportTool = defineTool(
  'agentic_confluence_import',
  'Batch import markdown reports to Confluence (creates or updates pages)',
  ImportReportsSchema,
  async (args) => {
    try {
      // Get configuration from args or environment
      const baseUrl =
        args.baseUrl ||
        process.env.CONFLUENCE_BASE_URL ||
        process.env.JIRA_BASE_URL;
      const email =
        args.email ||
        process.env.CONFLUENCE_EMAIL ||
        process.env.JIRA_EMAIL;
      const apiToken =
        args.token ||
        process.env.CONFLUENCE_API_TOKEN ||
        process.env.JIRA_API_TOKEN;

      if (!baseUrl || !email || !apiToken) {
        return errorResult(
          ErrorCodes.INVALID_ARGUMENTS,
          'Missing required Confluence credentials',
          'Set CONFLUENCE_BASE_URL, CONFLUENCE_EMAIL, and CONFLUENCE_API_TOKEN environment variables or pass via arguments'
        );
      }

      const config = {
        baseUrl: baseUrl.replace(/\/$/, ''),
        email,
        apiToken,
      };

      const commandOptions = {
        dryRun: args.dryRun || false,
      };

      // Resolve directory path
      const reportsDir = path.resolve(args.dir);

      const importResult = await importReportsCommand(reportsDir, config, commandOptions);

      const result = await executeCommand(
        async () => importResult,
        {}
      );

      if (!result.success) {
        return errorResult(
          ErrorCodes.COMMAND_FAILED,
          result.error?.message || 'Failed to import reports',
          undefined,
          result.error
        );
      }

      return successResult(
        {
          created: importResult.created,
          updated: importResult.updated,
          skipped: importResult.skipped,
          errors: importResult.errors,
        },
        args.dryRun ? 'Dry run completed' : 'Reports imported successfully',
        result.output
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        error
      );
    }
  }
);

/**
 * agentic_confluence_validate tool
 */
export const confluenceValidateTool = defineTool(
  'agentic_confluence_validate',
  'Validate markdown files for ADF conversion before publishing to Confluence',
  ValidateSchema,
  async (args) => {
    try {
      const { path: targetPath, strict, verbose } = args;

      // Resolve target path
      const resolvedPath = path.resolve(targetPath);

      // Check if path exists
      if (!(await fs.pathExists(resolvedPath))) {
        return errorResult(
          ErrorCodes.FILE_NOT_FOUND,
          `Path not found: ${targetPath}`
        );
      }

      // Find markdown files
      const markdownFiles = await findMarkdownFiles(resolvedPath);

      if (markdownFiles.length === 0) {
        return successResult(
          { filesValidated: 0 },
          'No markdown files found',
          'No markdown files found in the specified path'
        );
      }

      // Load ADF schema
      const adfSchema = await loadAdfSchema();

      // Get CLI context for relative path display
      const _ctx = await CliContext.create();

      // Validate each file
      const reports: ValidationReport[] = [];

      for (const filePath of markdownFiles) {
        const report = await validateMarkdownFile(filePath, adfSchema, { verbose });
        reports.push(report);
      }

      // Merge all reports
      const finalReport = mergeReports(...reports);

      const hasErrors = finalReport.summary.errors > 0;
      const hasWarnings = finalReport.summary.warnings > 0;

      if (!hasErrors && !hasWarnings) {
        return successResult(
          {
            valid: true,
            filesValidated: markdownFiles.length,
            errors: 0,
            warnings: 0,
            info: finalReport.summary.info,
          },
          'All files are valid',
          formatReport(finalReport)
        );
      }

      if (hasErrors || (strict && hasWarnings)) {
        return errorResult(
          ErrorCodes.VALIDATION_FAILED,
          hasErrors ? 'Validation failed with errors' : 'Validation failed with warnings (strict mode)',
          undefined,
          {
            filesValidated: markdownFiles.length,
            errors: finalReport.summary.errors,
            warnings: finalReport.summary.warnings,
            info: finalReport.summary.info,
            report: formatReport(finalReport),
          }
        );
      }

      return successResult(
        {
          valid: true,
          filesValidated: markdownFiles.length,
          errors: finalReport.summary.errors,
          warnings: finalReport.summary.warnings,
          info: finalReport.summary.info,
        },
        'Validation passed with warnings',
        formatReport(finalReport)
      );
    } catch (error) {
      return errorResult(
        ErrorCodes.COMMAND_FAILED,
        error instanceof Error ? error.message : 'Unknown error',
        undefined,
        error
      );
    }
  }
);

/**
 * Validate a single markdown file for Confluence compatibility
 */
async function validateMarkdownFile(
  filePath: string,
  adfSchema: Record<string, unknown>,
  _options: { verbose?: boolean }
): Promise<ValidationReport> {
  const issues = [];

  try {
    // Read file
    const content = await fs.readFile(filePath, 'utf-8');

    // Check for frontmatter
    if (!content.startsWith('---')) {
      issues.push(
        createError(
          'NO_FRONTMATTER',
          'File does not start with YAML frontmatter (---)',
          undefined,
          { file: filePath },
          'Add YAML frontmatter at the beginning of the file'
        )
      );
      return createReport(issues);
    }

    // Parse frontmatter
    let frontmatter: Record<string, unknown>;
    let body: string;
    try {
      const parsed = parseFrontmatter<Record<string, unknown>>(content);
      frontmatter = parsed.data;
      body = parsed.content;
    } catch (error) {
      issues.push(
        createError(
          'FRONTMATTER_PARSE_ERROR',
          `Failed to parse YAML frontmatter: ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          { file: filePath },
          'Check YAML syntax in frontmatter'
        )
      );
      return createReport(issues);
    }

    // Validate required Confluence fields
    if (!frontmatter.title) {
      issues.push(
        createError(
          'MISSING_TITLE',
          'Missing required field: title',
          'title',
          { file: filePath },
          'Add "title: Your Page Title" to frontmatter'
        )
      );
    }

    if (!frontmatter.spaceKey && !frontmatter['confluence-space']) {
      issues.push(
        createWarning(
          'MISSING_SPACE_KEY',
          'Missing space key (spaceKey or confluence-space)',
          'spaceKey',
          { file: filePath },
          'Add "spaceKey: YOUR_SPACE" or "confluence-space: YOUR_SPACE" to frontmatter for publishing'
        )
      );
    }

    // Convert markdown to ADF
    let adf: AdfDocument;
    try {
      adf = markdownToAdf(body);
    } catch (error) {
      issues.push(
        createError(
          'MARKDOWN_TO_ADF_ERROR',
          `Failed to convert markdown to ADF: ${error instanceof Error ? error.message : String(error)}`,
          undefined,
          { file: filePath },
          'Simplify markdown syntax or check for unsupported elements'
        )
      );
      return createReport(issues);
    }

    // Validate ADF structure against schema
    const ajv = new Ajv({ allErrors: true });
    const validate = ajv.compile(adfSchema);
    const valid = validate(adf);

    if (!valid && validate.errors) {
      for (const error of validate.errors) {
        issues.push(
          createError(
            'ADF_SCHEMA_ERROR',
            `Invalid ADF structure: ${error.message || 'Unknown error'}`,
            error.instancePath || undefined,
            { file: filePath },
            'Check markdown syntax and ADF conversion result'
          )
        );
      }
    }

    // Check for empty content
    if (!adf.content || adf.content.length === 0) {
      issues.push(
        createWarning(
          'EMPTY_CONTENT',
          'Document has no content',
          undefined,
          { file: filePath },
          'Add content to the markdown file'
        )
      );
    }

    // Check for common markdown patterns that may not convert well
    const problematicPatterns = [
      { pattern: /<[^>]+>/, message: 'HTML tags detected (may not render in Confluence)' },
      { pattern: /\[!\[.*?\]\(.*?\)\]\(.*?\)/, message: 'Nested image links (not supported in ADF)' },
    ];

    for (const { pattern, message } of problematicPatterns) {
      if (pattern.test(body)) {
        issues.push(
          createWarning('UNSUPPORTED_MARKDOWN', message, undefined, { file: filePath }, 'Use native markdown syntax')
        );
      }
    }

    return createReport(issues);
  } catch (error) {
    return createReport([
      createError(
        'FILE_READ_ERROR',
        `Failed to read or validate file: ${error instanceof Error ? error.message : String(error)}`,
        undefined,
        { file: filePath }
      ),
    ]);
  }
}

/**
 * Find all markdown files in a path
 */
async function findMarkdownFiles(targetPath: string): Promise<string[]> {
  const stat = await fs.stat(targetPath);

  if (stat.isFile()) {
    // Single file
    if (targetPath.endsWith('.md')) {
      return [targetPath];
    } else {
      return [];
    }
  } else if (stat.isDirectory()) {
    // Directory - find all .md files
    const pattern = path.join(targetPath, '**', '*.md');
    const files = await glob(pattern, { absolute: true });
    // Filter out README files
    return files.filter((f) => !f.endsWith('README.md'));
  }

  return [];
}

/**
 * Load ADF schema
 */
async function loadAdfSchema(): Promise<Record<string, unknown>> {
  const frameworkRoot = getFrameworkRoot();
  const schemaPath = path.join(frameworkRoot, 'modules/confluence/schemas/adf.schema.json');

  if (await fs.pathExists(schemaPath)) {
    return await fs.readJson(schemaPath);
  }

  throw new Error('Could not locate adf.schema.json. Please ensure the confluence module is installed.');
}

/**
 * Export all confluence tools
 */
export const confluenceTools = [
  confluenceCreateTool,
  confluenceFetchTool,
  confluenceImportTool,
  confluenceValidateTool,
];
