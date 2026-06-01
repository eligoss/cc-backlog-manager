/**
 * Confluence Commands
 *
 * Core logic for Confluence CLI commands:
 * - createPageCommand: Create Confluence page from markdown file
 * - fetchPageCommand: Fetch page from Confluence and save as markdown
 * - importReportsCommand: Batch import markdown reports to Confluence
 */

import fs from 'fs-extra';
import path from 'path';
import { ConfluenceClient, ConfluenceClientConfig } from './confluence-client.js';
import { markdownToAdf, adfToMarkdown } from './adf-converter.js';
import { parseFrontmatter, stringifyFrontmatter } from '../common/yaml-frontmatter.js';

/**
 * Options for create-page command
 */
export interface CreatePageOptions {
  parentId?: string;
  dryRun?: boolean;
}

/**
 * Options for import-reports command
 */
export interface ImportReportsOptions {
  dryRun?: boolean;
}

/**
 * Result of import-reports command
 */
export interface ImportReportsResult {
  total: number;
  created: number;
  updated: number;
  skipped: number;
  errors: number;
}

/**
 * Create a Confluence page from a markdown file
 *
 * @param markdownPath - Path to markdown file with YAML frontmatter
 * @param config - Confluence client configuration
 * @param options - Command options
 */
export async function createPageCommand(
  markdownPath: string,
  config: ConfluenceClientConfig,
  options: CreatePageOptions = {}
): Promise<void> {
  // Read markdown file
  const content = await fs.readFile(markdownPath, 'utf-8');

  // Parse frontmatter and body
  const { data: frontmatter, content: body } = parseFrontmatter<{
    title?: string;
    spaceKey?: string;
    parentId?: string;
    [key: string]: unknown;
  }>(content);

  // Validate required fields
  if (!frontmatter.title) {
    throw new Error('Missing required field "title" in YAML frontmatter');
  }
  if (!frontmatter.spaceKey) {
    throw new Error('Missing required field "spaceKey" in YAML frontmatter');
  }

  const title = frontmatter.title;
  const spaceKey = frontmatter.spaceKey;
  const parentId = options.parentId || frontmatter.parentId;

  console.log(`Creating page: ${title}`);
  console.log(`Space: ${spaceKey}`);
  if (parentId) {
    console.log(`Parent ID: ${parentId}`);
  }

  // Convert markdown to ADF
  console.log('Converting markdown to ADF...');
  const adf = markdownToAdf(body);

  if (options.dryRun) {
    console.log('[DRY RUN] Would create page in Confluence');
    console.log(`Title: ${title}`);
    console.log(`Space: ${spaceKey}`);
    console.log(`Parent: ${parentId || 'none'}`);
    return;
  }

  // Create Confluence client
  const client = new ConfluenceClient(config);

  // Create page
  console.log('Creating page in Confluence...');
  const pageId = await client.createPage(spaceKey, title, adf, parentId);

  // Fetch created page to get metadata
  const page = await client.getPage(pageId);

  console.log('\nPage created successfully!');
  console.log(`  Page ID: ${pageId}`);
  console.log(`  Version: ${page.version.number}`);
  console.log(`  URL: ${config.baseUrl}${page._links?.webui || ''}`);

  // Update frontmatter in markdown file
  const updatedFrontmatter = {
    ...frontmatter,
    pageId: pageId,
    version: page.version.number,
    confluenceUrl: `${config.baseUrl}${page._links?.webui || ''}`,
  };

  const updatedContent = stringifyFrontmatter(updatedFrontmatter, body);
  await fs.writeFile(markdownPath, updatedContent, 'utf-8');

  console.log(`\nUpdated local file: ${markdownPath}`);
}

/**
 * Fetch a Confluence page and save as markdown
 *
 * @param pageId - Confluence page ID
 * @param outputPath - Path to save markdown file
 * @param config - Confluence client configuration
 */
export async function fetchPageCommand(
  pageId: string,
  outputPath: string,
  config: ConfluenceClientConfig
): Promise<void> {
  console.log(`Fetching page ${pageId} from Confluence...`);

  // Create Confluence client
  const client = new ConfluenceClient(config);

  // Fetch page
  const page = await client.getPage(pageId);

  console.log(`Fetched page: ${page.title}`);
  console.log(`Space: ${page.spaceId}`);
  console.log(`Version: ${page.version.number}`);

  // Extract ADF content
  if (!page.body?.atlas_doc_format?.value) {
    throw new Error('Page does not contain ADF content');
  }
  const adf = JSON.parse(page.body.atlas_doc_format.value);

  // Convert ADF to markdown
  console.log('Converting ADF to markdown...');
  const markdown = adfToMarkdown(adf);

  // Build frontmatter
  const frontmatter: Record<string, unknown> = {
    title: page.title,
    pageId: page.id,
    spaceKey: page.spaceId,
    version: page.version.number,
    status: page.status,
    confluenceUrl: `${config.baseUrl}${page._links?.webui || ''}`,
  };

  if (page.parentId) {
    frontmatter.parentId = page.parentId;
  }

  // Combine frontmatter and markdown
  const fullContent = stringifyFrontmatter(frontmatter, markdown);

  // Ensure output directory exists
  const outputDir = path.dirname(outputPath);
  await fs.ensureDir(outputDir);

  // Write to file
  await fs.writeFile(outputPath, fullContent, 'utf-8');

  console.log(`\nPage saved to: ${outputPath}`);
}

/**
 * Import markdown reports to Confluence (batch processing)
 *
 * @param reportsDir - Directory containing markdown reports
 * @param config - Confluence client configuration
 * @param options - Command options
 * @returns Import result statistics
 */
export async function importReportsCommand(
  reportsDir: string,
  config: ConfluenceClientConfig,
  options: ImportReportsOptions = {}
): Promise<ImportReportsResult> {
  const result: ImportReportsResult = {
    total: 0,
    created: 0,
    updated: 0,
    skipped: 0,
    errors: 0,
  };

  // Check if directory exists
  const exists = await fs.pathExists(reportsDir);
  if (!exists) {
    throw new Error(`Reports directory not found: ${reportsDir}`);
  }

  // Find all markdown files
  const files = await fs.readdir(reportsDir);
  const markdownFiles = files.filter((f) => f.endsWith('.md'));

  result.total = markdownFiles.length;

  if (markdownFiles.length === 0) {
    console.log('No markdown files found in reports directory');
    return result;
  }

  console.log(`Found ${markdownFiles.length} markdown files`);

  // Create Confluence client
  const client = new ConfluenceClient(config);

  // Process each file
  for (const file of markdownFiles) {
    const filePath = path.join(reportsDir, file);

    try {
      console.log(`\nProcessing: ${file}`);

      // Read file
      const content = await fs.readFile(filePath, 'utf-8');

      // Parse frontmatter
      const { data: frontmatter, content: body } = parseFrontmatter<{
        title?: string;
        spaceKey?: string;
        parentId?: string;
        [key: string]: unknown;
      }>(content);

      // Validate required fields
      if (!frontmatter.title || !frontmatter.spaceKey) {
        console.log(`  Skipped: Missing title or spaceKey in frontmatter`);
        result.skipped++;
        continue;
      }

      const title = frontmatter.title;
      const spaceKey = frontmatter.spaceKey;
      const parentId = frontmatter.parentId;

      // Convert markdown to ADF
      const adf = markdownToAdf(body);

      if (options.dryRun) {
        console.log(`  [DRY RUN] Would process: ${title}`);
        continue;
      }

      // Check if page already exists
      const existingPage = await client.getPageByTitle(spaceKey, title);

      if (existingPage) {
        // Update existing page
        console.log(`  Updating existing page (ID: ${existingPage.id})...`);
        const newVersion = existingPage.version.number + 1;
        await client.updatePage(existingPage.id, title, adf, newVersion);

        // Fetch updated page
        const updatedPage = await client.getPage(existingPage.id);

        // Update frontmatter
        const updatedFrontmatter = {
          ...frontmatter,
          pageId: existingPage.id,
          version: updatedPage.version.number,
          confluenceUrl: `${config.baseUrl}${updatedPage._links?.webui || ''}`,
        };

        const updatedContent = stringifyFrontmatter(updatedFrontmatter, body);
        await fs.writeFile(filePath, updatedContent, 'utf-8');

        console.log(`  Updated successfully (Version: ${updatedPage.version.number})`);
        result.updated++;
      } else {
        // Create new page
        console.log(`  Creating new page...`);
        const pageId = await client.createPage(spaceKey, title, adf, parentId);

        // Fetch created page
        const createdPage = await client.getPage(pageId);

        // Update frontmatter
        const updatedFrontmatter = {
          ...frontmatter,
          pageId: pageId,
          version: createdPage.version.number,
          confluenceUrl: `${config.baseUrl}${createdPage._links?.webui || ''}`,
        };

        const updatedContent = stringifyFrontmatter(updatedFrontmatter, body);
        await fs.writeFile(filePath, updatedContent, 'utf-8');

        console.log(`  Created successfully (ID: ${pageId})`);
        result.created++;
      }
    } catch (error) {
      console.error(`  Error: ${error instanceof Error ? error.message : 'Unknown error'}`);
      result.errors++;
    }
  }

  // Print summary
  console.log('\n' + '='.repeat(60));
  console.log('IMPORT SUMMARY');
  console.log('='.repeat(60));
  console.log(`Total files: ${result.total}`);
  console.log(`Created: ${result.created}`);
  console.log(`Updated: ${result.updated}`);
  console.log(`Skipped: ${result.skipped}`);
  console.log(`Errors: ${result.errors}`);
  console.log('='.repeat(60));

  return result;
}
