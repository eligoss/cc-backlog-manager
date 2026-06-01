/**
 * Field Mapper - Maps between local YAML frontmatter and Jira API fields
 *
 * Provides bidirectional mapping with transformation functions for:
 * - Type conversions (string ↔ object)
 * - Format conversions (date formats, priority codes)
 * - Field name mappings (local YAML keys ↔ Jira REST API paths)
 *
 * @module lib/jira/field-mapper
 */

/**
 * Field mapping configuration
 */
export interface FieldMapping {
  /** Local YAML frontmatter field name */
  local: string;
  /** Jira API field path (dot notation for nested fields) */
  jira: string;
  /**
   * When this field can be written to Jira.
   * - 'readonly'   — never sent in any write (key, created, updated, status)
   * - 'createOnly' — sent on CREATE, skipped on UPDATE (issuetype, project)
   * - 'readwrite'  — sent on both CREATE and UPDATE (default)
   */
  mode?: 'readonly' | 'createOnly' | 'readwrite';
  /** Transform local → Jira (optional) */
  transform?: (value: unknown) => unknown;
  /** Transform Jira → local (optional) */
  reverseTransform?: (value: unknown) => unknown;
}

/**
 * Priority mapping from local codes to Jira names
 */
const PRIORITY_MAP: Record<string, string> = {
  P0: 'Highest',
  P1: 'High',
  P2: 'Medium',
  P3: 'Low',
  P4: 'Lowest',
  Highest: 'Highest',
  High: 'High',
  Medium: 'Medium',
  Low: 'Low',
  Lowest: 'Lowest',
};

/**
 * Reverse priority mapping from Jira names to local codes
 */
const REVERSE_PRIORITY_MAP: Record<string, string> = {
  Highest: 'P0',
  High: 'P1',
  Medium: 'P2',
  Low: 'P3',
  Lowest: 'P4',
};

/**
 * Document type to Jira issue type mapping
 */
const ISSUE_TYPE_MAP: Record<string, string> = {
  story: 'Story',
  task: 'Task',
  bug: 'Bug',
  spike: 'Task',
  epic: 'Epic',
};

/**
 * Reverse issue type mapping from Jira to local
 */
const REVERSE_ISSUE_TYPE_MAP: Record<string, string> = {
  Story: 'story',
  Task: 'task',
  Bug: 'bug',
  Epic: 'epic',
};

/**
 * Field mappings configuration
 *
 * Maps local YAML frontmatter fields to Jira REST API field paths.
 * Supports nested field access using dot notation (e.g., "issuetype.name").
 */
export const FIELD_MAPPINGS: FieldMapping[] = [
  // Basic fields
  {
    local: 'title',
    jira: 'summary',
    mode: 'readwrite',
  },
  {
    local: 'jira-description',
    jira: 'description',
    mode: 'readwrite',
  },
  {
    // key is set by Jira — never writable via field update API
    local: 'jira-ticketId',
    jira: 'key',
    mode: 'readonly',
  },

  // Issue type (CREATE only — cannot be changed via update API)
  {
    local: 'documentType',
    jira: 'issuetype.name',
    mode: 'createOnly',
    transform: (value: unknown) => ISSUE_TYPE_MAP[String(value).toLowerCase()] || 'Story',
    reverseTransform: (value: unknown) => REVERSE_ISSUE_TYPE_MAP[String(value)] || 'story',
  },

  // Project (CREATE only — cannot be changed via update API)
  {
    local: 'jira-project',
    jira: 'project.key',
    mode: 'createOnly',
  },

  // Priority
  {
    local: 'priority',
    jira: 'priority.name',
    mode: 'readwrite',
    transform: (value: unknown) => PRIORITY_MAP[String(value)] || 'Medium',
    reverseTransform: (value: unknown) => REVERSE_PRIORITY_MAP[String(value)] || String(value),
  },

  // Labels (combine labels and tags)
  {
    local: 'labels',
    jira: 'labels',
    mode: 'readwrite',
    transform: (value: unknown) => {
      const arr = Array.isArray(value) ? value : [value];
      return arr.map((v) => String(v).trim());
    },
    reverseTransform: (value: unknown) => (Array.isArray(value) ? value : []),
  },

  // Component
  {
    local: 'jira-component',
    jira: 'components',
    mode: 'readwrite',
    transform: (value: unknown) => {
      const components = Array.isArray(value) ? value : [value];
      return components.map((name) => ({ name: String(name).trim() }));
    },
    reverseTransform: (value: unknown) => {
      if (!value || !Array.isArray(value) || value.length === 0) return null;
      const components = value as Array<{ name: string }>;
      return components.length === 1 ? components[0].name : components.map((c) => c.name);
    },
  },

  // Epic / parent link (updatable via standard update API)
  {
    local: 'jira-parent',
    jira: 'parent.key',
    mode: 'readwrite',
  },

  // Status — requires transitions API, never a direct field update
  {
    local: 'jira-status',
    jira: 'status.name',
    mode: 'readonly',
  },

  // Assignee (updatable)
  {
    local: 'jira-assignee',
    jira: 'assignee.emailAddress',
    mode: 'readwrite',
  },

  // Reporter — set on create only; Jira Cloud rejects reporter updates for most users
  {
    local: 'jira-reporter',
    jira: 'reporter.emailAddress',
    mode: 'createOnly',
  },

  // Dates — set by Jira server, never writable via field update API
  {
    local: 'jira-created',
    jira: 'created',
    mode: 'readonly',
    transform: (value: unknown) => String(value),
    reverseTransform: (value: unknown) => {
      // Convert ISO datetime to date only
      const strValue = String(value);
      return strValue ? strValue.split('T')[0] : null;
    },
  },
  {
    local: 'jira-updated',
    jira: 'updated',
    mode: 'readonly',
    transform: (value: unknown) => String(value),
    reverseTransform: (value: unknown) => {
      // Convert ISO datetime to date only
      const strValue = String(value);
      return strValue ? strValue.split('T')[0] : null;
    },
  },

  // Fix Version (read-only for pull — push uses dedicated engine)
  {
    local: 'jira-fixVersion',
    jira: 'fixVersions',
    mode: 'readwrite',
    transform: (value: unknown) => {
      // Push: convert name to object array (not used directly — push-version-engine handles this)
      if (typeof value === 'string') return [{ name: value }];
      return value;
    },
    reverseTransform: (value: unknown) => {
      // Pull: extract first version name
      if (!value || !Array.isArray(value) || value.length === 0) return undefined;
      const versions = value as Array<{ name: string }>;
      return versions[0]?.name ?? undefined;
    },
  },

  // Sprint (readonly — Jira Cloud requires the Agile API for sprint assignment;
  // use `backlog push-sprint` instead of generic push for sprint changes)
  {
    local: 'jira-sprint',
    jira: 'sprint',
    mode: 'readonly',
    reverseTransform: (value: unknown) => {
      // Sprint comes as object { id, name, state } or string
      if (!value) return undefined;
      if (typeof value === 'object' && value !== null && 'name' in value) {
        return (value as { name: string }).name;
      }
      return String(value);
    },
  },
];

/**
 * Get a nested field value from an object using dot notation
 *
 * @param obj - Object to access
 * @param path - Dot-separated path (e.g., "issuetype.name")
 * @returns Field value or undefined
 *
 * @example
 * ```typescript
 * const obj = { issuetype: { name: "Story" } };
 * getNestedField(obj, "issuetype.name"); // "Story"
 * ```
 */
function getNestedField(obj: Record<string, unknown>, path: string): unknown {
  const parts = path.split('.');
  let current: unknown = obj;

  for (const part of parts) {
    if (current === null || current === undefined) {
      return undefined;
    }
    current = (current as Record<string, unknown>)[part];
  }

  return current;
}

/**
 * Set a nested field value in an object using dot notation
 *
 * @param obj - Object to modify
 * @param path - Dot-separated path (e.g., "issuetype.name")
 * @param value - Value to set
 *
 * @example
 * ```typescript
 * const obj = {};
 * setNestedField(obj, "issuetype.name", "Story");
 * // obj = { issuetype: { name: "Story" } }
 * ```
 */
function setNestedField(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split('.');
  let current: Record<string, unknown> = obj;

  for (let i = 0; i < parts.length - 1; i++) {
    const part = parts[i];
    if (!(part in current)) {
      current[part] = {};
    }
    current = current[part] as Record<string, unknown>;
  }

  current[parts[parts.length - 1]] = value;
}

/**
 * Map local YAML frontmatter data to Jira API fields
 *
 * Converts local frontmatter fields to Jira REST API format with:
 * - Field name mapping (local → Jira)
 * - Type transformations (string → object for complex fields)
 * - Value transformations (priority codes → names)
 *
 * @param localData - Local YAML frontmatter data
 * @param mode - Export mode ('create' or 'update')
 * @returns Jira API fields object
 *
 * @example
 * ```typescript
 * const local = {
 *   title: "User authentication",
 *   documentType: "story",
 *   priority: "P1"
 * };
 *
 * const jiraFields = mapLocalToJira(local, 'create');
 * // {
 * //   summary: "User authentication",
 * //   issuetype: { name: "Story" },
 * //   priority: { name: "High" }
 * // }
 * ```
 */
export function mapLocalToJira(
  localData: Record<string, unknown>,
  mode: 'create' | 'update' = 'update'
): Record<string, unknown> {
  const jiraFields: Record<string, unknown> = {};

  for (const mapping of FIELD_MAPPINGS) {
    const { local, jira, transform } = mapping;

    // Skip readonly fields — never sent in any write operation
    if (mapping.mode === 'readonly') {
      continue;
    }

    // Skip createOnly fields in UPDATE mode
    if (mode === 'update' && mapping.mode === 'createOnly') {
      continue;
    }

    // Skip if local field doesn't exist
    if (!(local in localData)) {
      continue;
    }

    const localValue = localData[local];

    // Skip null/undefined values
    if (localValue === null || localValue === undefined) {
      continue;
    }

    // Apply transformation if provided
    const jiraValue = transform ? transform(localValue) : localValue;

    // Set Jira field (handles nested paths)
    setNestedField(jiraFields, jira, jiraValue);
  }

  return jiraFields;
}

/**
 * Map Jira API fields to local YAML frontmatter data
 *
 * Converts Jira REST API response to local frontmatter format with:
 * - Field name mapping (Jira → local)
 * - Type transformations (object → string for simple fields)
 * - Value transformations (priority names → codes)
 *
 * @param jiraData - Jira API issue fields
 * @returns Local YAML frontmatter data
 *
 * @example
 * ```typescript
 * const jiraIssue = {
 *   key: "DAPM-1234",
 *   fields: {
 *     summary: "User authentication",
 *     issuetype: { name: "Story" },
 *     priority: { name: "High" }
 *   }
 * };
 *
 * const local = mapJiraToLocal(jiraIssue);
 * // {
 * //   jira-ticketId: "DAPM-1234",
 * //   title: "User authentication",
 * //   documentType: "story",
 * //   priority: "P1"
 * // }
 * ```
 */
export function mapJiraToLocal(jiraData: Record<string, unknown>): Record<string, unknown> {
  const localData: Record<string, unknown> = {};

  // Handle top-level key field
  if (jiraData.key) {
    localData['jira-ticketId'] = jiraData.key;
  }

  // Extract fields from Jira issue structure
  const fields = (jiraData as { fields?: Record<string, unknown> }).fields || jiraData;

  for (const mapping of FIELD_MAPPINGS) {
    const { local, jira, reverseTransform } = mapping;

    // Get Jira field value (handles nested paths)
    const jiraValue = getNestedField(fields, jira);

    // Skip if Jira field doesn't exist
    if (jiraValue === null || jiraValue === undefined) {
      continue;
    }

    // Apply reverse transformation if provided
    const localValue = reverseTransform ? reverseTransform(jiraValue) : jiraValue;

    // Skip null values after transformation
    if (localValue === null || localValue === undefined) {
      continue;
    }

    localData[local] = localValue;
  }

  return localData;
}

/**
 * Merge labels and tags from local data
 *
 * Combines labels and tags fields, deduplicates, and returns as array.
 *
 * @param localData - Local YAML frontmatter data
 * @returns Deduplicated array of labels
 */
export function mergeLabelsAndTags(localData: Record<string, unknown>): string[] {
  const labels = new Set<string>();

  // Add from labels field
  if (localData.labels) {
    const labelList = Array.isArray(localData.labels)
      ? localData.labels
      : [localData.labels];
    labelList.forEach((label) => labels.add(String(label).trim()));
  }

  // Add from tags field
  if (localData.tags) {
    const tagList = Array.isArray(localData.tags) ? localData.tags : [localData.tags];
    tagList.forEach((tag) => labels.add(String(tag).trim()));
  }

  return Array.from(labels);
}
