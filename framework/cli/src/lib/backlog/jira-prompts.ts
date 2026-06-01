/**
 * Interactive prompts for Jira operations
 *
 * Provides interactive prompts for missing sprint/milestone data.
 * Prompts users for Jira IDs when smart lookup cannot find matching
 * existing files. Supports dry-run mode (no prompts, shows what would be asked).
 *
 * Usage:
 *   import { promptForJiraSprintId, suggestMilestoneIdFromName } from './jira-prompts.js';
 *
 *   const jiraId = await promptForJiraSprintId('APM-APP-2026-W1', false);
 *   const suggested = suggestMilestoneIdFromName('January 2026');
 */

import { prompt } from './prompt-utils.js';
import chalk from 'chalk';

/**
 * Check if the current environment supports interactive prompts
 *
 * @returns True if interactive mode is available (TTY and not in CI)
 */
export function isInteractive(): boolean {
  return Boolean(process.stdin.isTTY) && !process.env.CI;
}

/**
 * Suggest milestone ID from milestone name
 *
 * Extracts month abbreviation and year from milestone name.
 * Examples:
 *   "January 2026" -> "Jan2026"
 *   "November 2025" -> "Nov2025"
 *   "January 2026 (W51, W1, W3)" -> "Jan2026"
 *
 * @param milestoneName - Milestone name from CSV (e.g., "January 2026 (W51, W1, W3)")
 * @returns Suggested milestone ID (e.g., "Jan2026") or null if cannot parse
 */
export function suggestMilestoneIdFromName(milestoneName: string): string | null {
  if (!milestoneName) {
    return null;
  }

  // Remove everything after parentheses
  const cleanName = milestoneName.split('(')[0].trim();

  // Month name to abbreviation mapping
  const months: Record<string, string> = {
    january: 'Jan',
    february: 'Feb',
    march: 'Mar',
    april: 'Apr',
    may: 'May',
    june: 'Jun',
    july: 'Jul',
    august: 'Aug',
    september: 'Sep',
    october: 'Oct',
    november: 'Nov',
    december: 'Dec',
  };

  // Split into words and look for month and year
  const words = cleanName.toLowerCase().split(/\s+/);
  let monthAbbr: string | null = null;
  let year: string | null = null;

  for (const word of words) {
    // Check if word is a month
    for (const [monthName, abbr] of Object.entries(months)) {
      if (word.startsWith(monthName)) {
        monthAbbr = abbr;
        break;
      }
    }

    // Check if word is a 4-digit year
    if (/^\d{4}$/.test(word)) {
      year = word;
    }
  }

  if (monthAbbr && year) {
    return `${monthAbbr}${year}`;
  }

  return null;
}

/**
 * Prompt user for Jira sprint ID when not found via smart lookup
 *
 * Provides helpful context and examples.
 *
 * @param sprintName - Sprint name from CSV (e.g., "APM-APP-2026-W1")
 * @param dryRun - If true, show what would be prompted but don't actually prompt
 * @returns Jira sprint ID (numeric string) or null if user skips
 */
export async function promptForJiraSprintId(
  sprintName: string,
  dryRun: boolean = false
): Promise<string | null> {
  if (dryRun) {
    console.error(
      chalk.blue(`ℹ️  [DRY RUN] Would prompt: Enter Jira sprint ID for '${sprintName}' (numeric, e.g., 16786)`)
    );
    return null;
  }

  if (!isInteractive()) {
    console.error(chalk.blue('ℹ️  Non-interactive mode. Skipping prompt.'));
    return null;
  }

  // Display context
  console.error(chalk.yellow(`\n⚠️  Sprint '${sprintName}' not found in existing sprints.`));
  console.error(chalk.blue('ℹ️  Need Jira sprint ID to find or create sprint file.'));
  console.error(chalk.blue('ℹ️  Jira sprint IDs are numeric (e.g., 16786, 16787)'));
  console.error(chalk.blue('ℹ️  Find sprint ID in Jira: Projects → APM → Backlog → Sprint details'));

  const { sprintId } = await prompt<{ sprintId: string }>([
    {
      type: 'input',
      name: 'sprintId',
      message: `Enter Jira sprint ID for '${sprintName}' (or press Enter to skip):`,
      validate: (input: string) => {
        if (!input) {
          return true; // Allow empty (skip)
        }
        if (!/^\d+$/.test(input)) {
          return 'Invalid format. Sprint ID must be numeric (e.g., 16786)';
        }
        return true;
      },
    },
  ]);

  if (!sprintId) {
    console.error(chalk.yellow('⚠️  Skipping. New sprint file will be created.'));
    return null;
  }

  return sprintId;
}

/**
 * Prompt user for milestone ID when not found via smart lookup
 *
 * Provides helpful context, examples, and smart suggestion from milestone name.
 *
 * @param milestoneName - Milestone name from CSV (e.g., "January 2026 (W51, W1, W3)")
 * @param dryRun - If true, show what would be prompted but don't actually prompt
 * @returns Milestone ID (e.g., "Jan2026") or null if user skips
 */
export async function promptForMilestoneId(
  milestoneName: string,
  dryRun: boolean = false
): Promise<string | null> {
  const suggested = suggestMilestoneIdFromName(milestoneName);

  if (dryRun) {
    let promptText = `Enter milestone ID for '${milestoneName}'`;
    if (suggested) {
      promptText += ` (suggested: ${suggested})`;
    }
    promptText += ' (e.g., Jan2026, Nov2025)';
    console.error(chalk.blue(`ℹ️  [DRY RUN] Would prompt: ${promptText}`));
    return null;
  }

  if (!isInteractive()) {
    console.error(chalk.blue('ℹ️  Non-interactive mode.'));
    if (suggested) {
      console.error(chalk.blue(`ℹ️  Using suggested milestone ID: ${suggested}`));
      return suggested;
    }
    console.error(chalk.blue('ℹ️  No suggestion available. Skipping prompt.'));
    return null;
  }

  // Display context
  console.error(chalk.yellow(`\n⚠️  Milestone '${milestoneName}' not found in existing milestones.`));
  console.error(chalk.blue('ℹ️  Need milestone ID for milestone file (v11.1+).'));
  console.error(chalk.blue('ℹ️  Milestone filename will be generated from Jira name using sanitization.'));
  console.error(chalk.blue('ℹ️  Use any ID format: Jan2026, UC2, PostUC2, Demo, etc.'));

  if (suggested) {
    console.error(chalk.blue(`ℹ️  Suggestion from name: ${suggested}`));
  }

  const { milestoneId } = await prompt<{ milestoneId: string }>([
    {
      type: 'input',
      name: 'milestoneId',
      message: suggested
        ? `Enter milestone ID for '${milestoneName}' (default: ${suggested}):`
        : `Enter milestone ID for '${milestoneName}' (or press Enter to skip):`,
      default: suggested || undefined,
      validate: (input: string) => {
        // Empty with suggestion is valid (uses default)
        if (!input && suggested) {
          return true;
        }
        // Empty without suggestion means skip
        if (!input) {
          return true;
        }
        // Validate alphanumeric format
        if (!/^[A-Za-z0-9\-_]+$/.test(input)) {
          return 'Invalid format. Use alphanumeric format (letters, numbers, hyphens): Jan2026, UC2, Post-UC2, etc.';
        }
        return true;
      },
    },
  ]);

  // Handle empty input with suggestion (use suggestion)
  if (!milestoneId && suggested) {
    return suggested;
  }

  if (!milestoneId) {
    console.error(chalk.yellow('⚠️  Skipping. New milestone file will be created.'));
    return null;
  }

  return milestoneId;
}

/**
 * Confirm smart lookup result when name differs from CSV
 *
 * Used when sprint found by Jira ID but name differs from CSV.
 *
 * @param lookupType - 'sprint' or 'milestone'
 * @param foundId - Found local ID
 * @param foundName - Found name from file
 * @param csvName - Name from CSV
 * @param dryRun - If true, show what would be confirmed but don't actually prompt
 * @returns True if confirmed, false otherwise
 */
export async function confirmSmartLookup(
  lookupType: 'sprint' | 'milestone',
  foundId: string,
  foundName: string,
  csvName: string,
  dryRun: boolean = false
): Promise<boolean> {
  if (dryRun) {
    console.error(
      chalk.blue(
        `ℹ️  [DRY RUN] Would confirm: ${lookupType} renamed? '${foundName}' → '${csvName}'`
      )
    );
    return true;
  }

  if (!isInteractive()) {
    console.error(chalk.blue('ℹ️  Non-interactive mode. Using existing name.'));
    return false;
  }

  // Display context
  console.error(chalk.yellow(`\n⚠️  ${lookupType.charAt(0).toUpperCase() + lookupType.slice(1)} appears to have been renamed.`));
  console.error(chalk.blue(`ℹ️  Found: '${foundName}'`));
  console.error(chalk.blue(`ℹ️  CSV has: '${csvName}'`));
  console.error(chalk.blue(`ℹ️  Local ID: ${foundId}`));

  const { confirm } = await prompt<{ confirm: boolean }>([
    {
      type: 'confirm',
      name: 'confirm',
      message: `Update ${lookupType} name to CSV value? '${foundName}' → '${csvName}'`,
      default: false,
    },
  ]);

  return confirm;
}
