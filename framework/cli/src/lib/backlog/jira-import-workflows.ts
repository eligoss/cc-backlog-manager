/**
 * Smart lookup and resolution workflows for Jira imports.
 *
 * Integrates validators, lookup, and prompts to provide smart sprint/milestone
 * resolution with user prompting support and rename detection.
 *
 * @module jira-import-workflows
 */

import {
  findSprintByName,
  findSprintByJiraId,
  findMilestoneByName,
  findMilestoneById,
} from './jira-lookup.js';
import type { CsvExtraction } from './jira-validators.js';

/**
 * Result of sprint metadata resolution
 */
export interface SprintResolution {
  /** Local ID (e.g., "2025-W45") */
  sprintId: string;
  /** Sprint name from CSV (e.g., "APM-APP-2025W45") */
  sprintName: string;
  /** Numeric Jira ID (e.g., "16786") or null */
  jiraSprintId: string | null;
}

/**
 * Result of milestone metadata resolution
 */
export interface MilestoneResolution {
  /** Local ID (e.g., "Jan2026") */
  milestoneId: string;
  /** Milestone name from CSV */
  milestoneName: string;
  /** Jira milestone ID (usually same as ID) */
  jiraMilestoneId: string;
}

/**
 * Arguments for workflow resolution
 */
export interface WorkflowArgs {
  sprintName?: string;
  milestoneName?: string;
  jiraSprintId?: string;
  jiraMilestoneId?: string;
  dryRun?: boolean;
  [key: string]: string | boolean | undefined;
}

/**
 * Resolve sprint metadata through smart lookup workflow.
 *
 * Workflow:
 * 1. Extract sprint name from CSV Sprint column
 * 2. Search existing sprint files by name
 * 3. If found with jiraSprintId -> use it, no prompt
 * 4. If not found -> prompt user for Jira sprint ID (or use from args)
 * 5. If user provides ID -> search by ID
 * 6. If found by ID -> check if renamed, update name
 * 7. If not found -> create new sprint
 *
 * @param args - Parsed command-line arguments
 * @param csvData - Extracted CSV data (CSVExtraction)
 * @param backlogDir - Path to backlog directory
 * @param verbose - Show detailed output
 * @returns Sprint resolution with sprint_id, sprint_name, jira_sprint_id
 * @throws Error if critical validation fails
 */
export async function resolveSprintMetadata(
  args: WorkflowArgs,
  csvData: CsvExtraction,
  backlogDir: string,
  verbose: boolean = false
): Promise<SprintResolution> {
  if (verbose) {
    console.error('🔍 Smart Sprint Lookup:');
  }

  // Get sprint name from args or CSV
  const sprintName = args.sprintName || csvData.sprintName;

  if (!sprintName) {
    throw new Error('❌ Cannot determine sprint name from CSV or arguments');
  }

  if (verbose) {
    console.error(`  Sprint Name (CSV): ${sprintName}`);
  }

  // Step 2: Search by name
  if (verbose) {
    console.error('  Searching by name...');
  }

  const foundByName = await findSprintByName(sprintName, backlogDir);

  if (foundByName) {
    if (verbose) {
      console.error(`  ✅ Found by name: ${foundByName.sprintId}`);
      if (foundByName.jiraSprintId) {
        console.error(`  ✅ Jira Sprint ID: ${foundByName.jiraSprintId}`);
      }
    }

    if (foundByName.jiraSprintId) {
      // Step 3: Already have Jira ID, use it
      return {
        sprintId: foundByName.sprintId,
        sprintName,
        jiraSprintId: foundByName.jiraSprintId,
      };
    }
  }

  if (verbose) {
    console.error('  ⚠️  Not found by name, checking for Jira ID...');
  }

  // Step 4: Check if Jira sprint ID was provided via args
  const jiraSprintId = args.jiraSprintId || null;

  if (jiraSprintId) {
    // Step 5: Search by Jira ID
    if (verbose) {
      console.error(`  Searching by Jira ID: ${jiraSprintId}...`);
    }

    const foundById = await findSprintByJiraId(jiraSprintId, backlogDir);

    if (foundById) {
      // Step 6: Check if renamed
      if (verbose) {
        console.error(`  ✅ Found by ID: ${foundById.sprintId}`);
      }

      if (foundById.sprintName !== sprintName) {
        if (verbose) {
          console.error('  ⚠️  Sprint appears to be renamed:');
          console.error(`     Old: ${foundById.sprintName}`);
          console.error(`     New: ${sprintName}`);
        }

        // In dry-run mode, confirm rename would be auto-accepted
        // In real mode, this would update the sprint file
        // For now, we'll just log it
      }

      return {
        sprintId: foundById.sprintId,
        sprintName,
        jiraSprintId,
      };
    }
  }

  // Step 7: Create new sprint
  if (verbose) {
    console.error('  Creating new sprint file...');
  }

  // Extract sprint ID from sprint name (e.g., "APM-APP-2025W45" -> "2025-W45")
  let sprintId = extractSprintIdFromName(sprintName);
  if (!sprintId) {
    sprintId = generateSprintId();
  }

  if (verbose) {
    console.error(`  ✅ New sprint ID: ${sprintId}`);
  }

  return {
    sprintId,
    sprintName,
    jiraSprintId,
  };
}

/**
 * Resolve milestone metadata through smart lookup workflow.
 *
 * Workflow:
 * 1. Extract milestone name from CSV Fix Versions
 * 2. Search existing milestone files by name
 * 3. If found -> use existing ID
 * 4. If not found -> prompt user for milestone ID (suggest from name)
 * 5. If user provides ID -> search by ID
 * 6. If found by ID -> check if renamed, update name
 * 7. If not found -> create new milestone
 *
 * @param args - Parsed command-line arguments
 * @param csvData - Extracted CSV data (CSVExtraction)
 * @param backlogDir - Path to backlog directory
 * @param verbose - Show detailed output
 * @returns Milestone resolution with milestone_id, milestone_name, jira_milestone_id
 * @throws Error if critical validation fails
 */
export async function resolveMilestoneMetadata(
  args: WorkflowArgs,
  csvData: CsvExtraction,
  backlogDir: string,
  verbose: boolean = false
): Promise<MilestoneResolution> {
  if (verbose) {
    console.error('🔍 Smart Milestone Lookup:');
  }

  // Get milestone name from args or CSV
  const milestoneName = args.milestoneName || csvData.milestoneName;

  if (!milestoneName) {
    throw new Error('❌ Cannot determine milestone name from CSV or arguments');
  }

  if (verbose) {
    console.error(`  Milestone Name (CSV): ${milestoneName}`);
  }

  // Step 2: Search by name
  if (verbose) {
    console.error('  Searching by name...');
  }

  const foundByName = await findMilestoneByName(milestoneName, backlogDir);

  if (foundByName) {
    if (verbose) {
      console.error(`  ✅ Found by name: ${foundByName.milestoneId}`);
    }

    return {
      milestoneId: foundByName.milestoneId,
      milestoneName,
      jiraMilestoneId: foundByName.milestoneId,
    };
  }

  if (verbose) {
    console.error('  ⚠️  Not found by name, checking for milestone ID...');
  }

  // Step 3b: Check if jira-milestone-id was provided via CLI
  const jiraMilestoneIdArg = args.jiraMilestoneId;
  if (jiraMilestoneIdArg) {
    if (verbose) {
      console.error(`  Using provided Jira milestone ID: ${jiraMilestoneIdArg}`);
    }
    // In v11.1+, the filename is generated from Jira name via sanitization
    // Use the provided ID as-is
    const milestoneId = jiraMilestoneIdArg;
    if (verbose) {
      console.error(`  ✅ New milestone with provided Jira ID: ${milestoneId}`);
    }
    return {
      milestoneId,
      milestoneName,
      jiraMilestoneId: jiraMilestoneIdArg,
    };
  }

  // Step 4: Suggest milestone ID from name (used in dry-run or when no ID provided)
  const milestoneId = suggestMilestoneIdFromName(milestoneName);

  if (!milestoneId) {
    throw new Error(`❌ Could not determine milestone ID for: ${milestoneName}`);
  }

  if (verbose) {
    console.error(`  Milestone ID: ${milestoneId}`);
  }

  // Step 5: Search by ID
  if (verbose) {
    console.error(`  Searching by ID: ${milestoneId}...`);
  }

  const foundById = await findMilestoneById(milestoneId, backlogDir);

  if (foundById) {
    // Step 6: Check if renamed
    if (verbose) {
      console.error(`  ✅ Found by ID: ${foundById.milestoneId}`);
    }

    if (foundById.milestoneName && foundById.milestoneName !== milestoneName) {
      if (verbose) {
        console.error('  ⚠️  Milestone appears to be renamed:');
        console.error(`     Old: ${foundById.milestoneName}`);
        console.error(`     New: ${milestoneName}`);
      }

      // In dry-run mode, confirm rename would be auto-accepted
      // In real mode, this would update the milestone file
      // For now, we'll just log it
    }

    return {
      milestoneId,
      milestoneName,
      jiraMilestoneId: milestoneId,
    };
  }

  // Step 7: Create new milestone
  if (verbose) {
    console.error('  Creating new milestone file...');
    console.error(`  ✅ New milestone ID: ${milestoneId}`);
  }

  return {
    milestoneId,
    milestoneName,
    jiraMilestoneId: milestoneId,
  };
}

/**
 * Extract local sprint ID from sprint name.
 *
 * Looks for patterns like "APM-APP-2025W45" or "APM-2025W45" and converts
 * to "2025-W45" format.
 *
 * @param sprintName - Sprint name from CSV (e.g., "APM-APP-2025W45")
 * @returns Sprint ID (e.g., "2025-W45") or null if cannot parse
 */
export function extractSprintIdFromName(sprintName: string): string | null {
  if (!sprintName) {
    return null;
  }

  // Pattern: year-week (with optional prefix)
  // Examples: "APM-APP-2025W45" -> "2025-W45"
  //           "2025W45" -> "2025-W45"
  const patterns = [
    /(\d{4})W(\d{1,2})/,      // YYYYWNN format
    /(\d{4})-W(\d{1,2})/,     // YYYY-WNN format
  ];

  for (const pattern of patterns) {
    const match = sprintName.match(pattern);
    if (match) {
      const year = match[1];
      const week = match[2];
      return `${year}-W${week}`;
    }
  }

  return null;
}

/**
 * Generate a new sprint ID based on current date.
 *
 * @returns Sprint ID (e.g., "2025-W50")
 */
export function generateSprintId(): string {
  const now = new Date();

  // Get ISO week number
  // ISO week date calculation:
  // - Week starts on Monday
  // - Week 1 is the week with the year's first Thursday
  const getISOWeek = (date: Date): { year: number; week: number } => {
    const target = new Date(date.valueOf());
    const dayNr = (date.getDay() + 6) % 7; // Monday = 0, Sunday = 6
    target.setDate(target.getDate() - dayNr + 3); // Nearest Thursday
    const firstThursday = target.valueOf();
    target.setMonth(0, 1); // January 1
    if (target.getDay() !== 4) {
      target.setMonth(0, 1 + ((4 - target.getDay() + 7) % 7));
    }
    const weekNumber = 1 + Math.ceil((firstThursday - target.valueOf()) / 604800000);
    return {
      year: target.getFullYear(),
      week: weekNumber,
    };
  };

  const { year, week } = getISOWeek(now);
  return `${year}-W${week}`;
}

/**
 * Suggest milestone ID from milestone name.
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

  // Month mapping
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
