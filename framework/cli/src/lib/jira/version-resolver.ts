import { JiraClient, JiraVersion } from './jira-client.js';

/**
 * Resolve a fixVersion name to its Jira ID.
 *
 * First tries exact match, then substring match.
 * Throws if zero or multiple matches are found.
 */
export async function resolveVersionId(
  client: JiraClient,
  projectKey: string,
  versionName: string,
): Promise<string> {
  const versions = await client.getProjectVersions(projectKey);

  // Try exact match first
  const exact = versions.find((v) => v.name === versionName);
  if (exact) return exact.id;

  // Try partial match (contains, case-insensitive)
  const partial = versions.filter((v) =>
    v.name.toLowerCase().includes(versionName.toLowerCase()),
  );

  if (partial.length === 0) {
    const available = versions.map((v) => v.name).join(', ');
    throw new Error(
      `No matching version found for "${versionName}". Available: ${available}`,
    );
  }

  if (partial.length > 1) {
    const matches = partial.map((v) => v.name).join(', ');
    throw new Error(
      `Multiple versions match "${versionName}": ${matches}. Use exact name.`,
    );
  }

  return partial[0].id;
}

/**
 * Get all unreleased versions for a project (useful for listing available targets)
 */
export async function getUnreleasedVersions(
  client: JiraClient,
  projectKey: string,
): Promise<JiraVersion[]> {
  const versions = await client.getProjectVersions(projectKey);
  return versions.filter((v) => !v.released && !v.archived);
}
