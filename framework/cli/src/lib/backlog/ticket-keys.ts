/**
 * Extract Jira ticket keys from markdown content.
 * Looks for markdown links like [DAPM-2499](...)
 */
export function extractTicketKeys(content: string): string[] {
  const regex = /\[([A-Z]+-\d+)\]\(/g;
  const seen = new Set<string>();
  let match: RegExpExecArray | null;
  while ((match = regex.exec(content)) !== null) {
    seen.add(match[1]);
  }
  return [...seen];
}
