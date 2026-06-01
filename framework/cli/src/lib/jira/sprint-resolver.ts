import { JiraClient, JiraSprint } from './jira-client.js';

/**
 * Resolve a sprint name to its Jira sprint ID.
 *
 * Finds the project's board, then searches active+future sprints
 * for a matching name (exact first, then substring).
 */
export async function resolveSprintId(
  client: JiraClient,
  projectKey: string,
  sprintName: string,
): Promise<number> {
  const boards = await client.getBoardsForProject(projectKey);

  if (boards.length === 0) {
    throw new Error(`No boards found for project "${projectKey}".`);
  }

  // Use the first scrum board, or fall back to first board
  const board = boards.find((b) => b.type === 'scrum') ?? boards[0];
  if (boards.length > 1) {
    console.log(
      `[sprint-resolver] Multiple boards found for project "${projectKey}" (${boards.length} total). Selected board: "${board.name}" (ID: ${board.id}, type: ${board.type}).`,
    );
  }

  const sprints = await client.getSprintsForBoard(board.id, 'active,future');

  // Try exact match
  const exact = sprints.find((s) => s.name === sprintName);
  if (exact) return exact.id;

  // Try partial match (contains, case-insensitive)
  const partial = sprints.filter((s) =>
    s.name.toLowerCase().includes(sprintName.toLowerCase()),
  );

  if (partial.length === 0) {
    const available = sprints.map((s) => `${s.name} (${s.state})`).join(', ');
    throw new Error(
      `No matching sprint found for "${sprintName}". Available: ${available}`,
    );
  }

  if (partial.length > 1) {
    const matches = partial.map((s) => s.name).join(', ');
    throw new Error(
      `Multiple sprints match "${sprintName}": ${matches}. Use exact name.`,
    );
  }

  return partial[0].id;
}
