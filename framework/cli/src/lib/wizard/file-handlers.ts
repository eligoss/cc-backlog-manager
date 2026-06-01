/**
 * File handlers for init wizard
 * Handles merge/append strategies for existing files
 */

import fs from 'fs-extra';
import path from 'path';

// Separator for CLAUDE.md framework section
export const FRAMEWORK_SEPARATOR = '<!-- AGENTIC FRAMEWORK - DO NOT EDIT ABOVE THIS LINE -->';

// Framework entries for .gitignore
export const GITIGNORE_FRAMEWORK_ENTRIES = [
  '',
  '# Agentic Framework',
  'telemetry.config.json',
  'routes.yml.backup',
  '',
  '# Telemetry data (do not commit)',
  '.claude/telemetry/',
  '*.telemetry.jsonl',
  '',
  '# Serena cache',
  '.serena/cache/',
];

/**
 * Append framework entries to .gitignore without duplicating
 */
export async function appendGitignore(projectPath: string): Promise<{ action: 'created' | 'appended' | 'unchanged' }> {
  const gitignorePath = path.join(projectPath, '.gitignore');

  if (await fs.pathExists(gitignorePath)) {
    const existing = await fs.readFile(gitignorePath, 'utf-8');

    // Check if framework section already exists
    if (existing.includes('# Agentic Framework')) {
      return { action: 'unchanged' };
    }

    // Filter entries that don't already exist
    const linesToAdd = GITIGNORE_FRAMEWORK_ENTRIES.filter(line => {
      const trimmed = line.trim();
      return trimmed === '' || !existing.includes(trimmed);
    });

    if (linesToAdd.length > 1) { // More than just the empty line
      await fs.appendFile(gitignorePath, linesToAdd.join('\n') + '\n');
      return { action: 'appended' };
    }

    return { action: 'unchanged' };
  } else {
    // Create new .gitignore with framework entries
    const content = `# Dependencies
node_modules/

# Build
dist/
*.pyc
__pycache__/

# IDE
.idea/
.vscode/
*.swp
*.swo

# Environment
.env
.env.local

# OS
.DS_Store
Thumbs.db

# Logs
*.log
logs/
${GITIGNORE_FRAMEWORK_ENTRIES.join('\n')}
`;
    await fs.writeFile(gitignorePath, content);
    return { action: 'created' };
  }
}

/**
 * Merge framework section into CLAUDE.md
 * Prepends framework content, preserves user content below separator
 */
export async function mergeCLAUDEmd(
  projectPath: string,
  frameworkContent: string
): Promise<{ action: 'created' | 'merged' | 'updated' }> {
  const claudePath = path.join(projectPath, 'CLAUDE.md');

  if (await fs.pathExists(claudePath)) {
    const existing = await fs.readFile(claudePath, 'utf-8');

    if (existing.includes(FRAMEWORK_SEPARATOR)) {
      // Already has framework section - replace it (for sync command)
      const parts = existing.split(FRAMEWORK_SEPARATOR);
      const userContent = parts[1] || '';
      await fs.writeFile(
        claudePath,
        frameworkContent + '\n\n' + FRAMEWORK_SEPARATOR + userContent
      );
      return { action: 'updated' };
    } else {
      // Prepend framework section, keep all existing content
      await fs.writeFile(
        claudePath,
        frameworkContent + '\n\n' + FRAMEWORK_SEPARATOR + '\n\n' + existing
      );
      return { action: 'merged' };
    }
  } else {
    // No existing file - create with separator for future updates
    await fs.writeFile(
      claudePath,
      frameworkContent + '\n\n' + FRAMEWORK_SEPARATOR + '\n'
    );
    return { action: 'created' };
  }
}

/**
 * Deep merge two objects, with source values taking precedence
 */
function deepMerge<T extends Record<string, unknown>>(target: T, source: T): T {
  const result = { ...target } as T;

  for (const key in source) {
    if (Object.prototype.hasOwnProperty.call(source, key)) {
      const sourceValue = source[key];
      const targetValue = target[key];

      if (
        sourceValue !== null &&
        typeof sourceValue === 'object' &&
        !Array.isArray(sourceValue) &&
        targetValue !== null &&
        typeof targetValue === 'object' &&
        !Array.isArray(targetValue)
      ) {
        (result as Record<string, unknown>)[key] = deepMerge(
          targetValue as Record<string, unknown>,
          sourceValue as Record<string, unknown>
        );
      } else {
        (result as Record<string, unknown>)[key] = sourceValue;
      }
    }
  }

  return result;
}

/**
 * Merge settings.local.json
 * Deep merge settings, preserve user customizations, combine permissions
 */
export async function mergeSettingsLocal(
  projectPath: string,
  frameworkSettings: Record<string, unknown>
): Promise<{ action: 'created' | 'merged' }> {
  const settingsPath = path.join(projectPath, '.claude/settings.local.json');

  await fs.ensureDir(path.dirname(settingsPath));

  if (await fs.pathExists(settingsPath)) {
    const existing = await fs.readJson(settingsPath);

    // Deep merge: user settings take precedence
    const merged = deepMerge(frameworkSettings, existing);

    // Special handling for permissions.allow - combine arrays and deduplicate
    const frameworkPermissions = (frameworkSettings.permissions as Record<string, unknown>)?.allow as string[] || [];
    const existingPermissions = (existing.permissions as Record<string, unknown>)?.allow as string[] || [];

    if (!merged.permissions) {
      merged.permissions = {};
    }
    (merged.permissions as Record<string, unknown>).allow = [
      ...new Set([...frameworkPermissions, ...existingPermissions]),
    ];

    await fs.writeJson(settingsPath, merged, { spaces: 2 });
    return { action: 'merged' };
  } else {
    await fs.writeJson(settingsPath, frameworkSettings, { spaces: 2 });
    return { action: 'created' };
  }
}

/**
 * Create context files, skipping existing ones
 */
export async function createContextFilesWithSkip(
  projectPath: string,
  getContextTemplate: (filename: string) => string
): Promise<{ created: string[]; skipped: string[] }> {
  const contextDir = path.join(projectPath, '.claude/context');
  await fs.ensureDir(contextDir);

  const contextFiles = [
    'business-basic.md',
    'business-advanced.md',
    'business-expert.md',
    'technical-basic.md',
    'technical-advanced.md',
    'technical-expert.md',
    'process-basic.md',
    'process-advanced.md',
    'process-expert.md',
  ];

  const created: string[] = [];
  const skipped: string[] = [];

  for (const file of contextFiles) {
    const filePath = path.join(contextDir, file);
    if (!(await fs.pathExists(filePath))) {
      await fs.writeFile(filePath, getContextTemplate(file));
      created.push(file);
    } else {
      skipped.push(file);
    }
  }

  return { created, skipped };
}

/**
 * Backup existing routes.yml before creating new one
 */
export async function backupAndCreateRoutesYml(
  projectPath: string,
  content: string
): Promise<{ action: 'created' | 'backed_up_and_created' }> {
  const routesPath = path.join(projectPath, 'routes.yml');

  if (await fs.pathExists(routesPath)) {
    const backupPath = path.join(projectPath, 'routes.yml.backup');
    await fs.copy(routesPath, backupPath);
    await fs.writeFile(routesPath, content);
    return { action: 'backed_up_and_created' };
  } else {
    await fs.writeFile(routesPath, content);
    return { action: 'created' };
  }
}
