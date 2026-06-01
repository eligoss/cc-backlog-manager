/**
 * Shared types for backlog module
 *
 * @module types
 */

/**
 * CSV ticket data structure
 */
export interface CsvTicket {
  ticketId: string;
  summary: string;
  issueType: string;
  documentType: 'story' | 'task' | 'bug' | 'spike' | 'epic';
  description?: string;
  status?: string;
  priority?: string;
  storyPoints?: number;
  parentKey?: string;
  parentSummary?: string;
  epic?: string;
  sprint?: string;
  fixVersions?: string;
  milestone?: string;
  labels?: string[];
  acceptanceCriteria?: string;
  assignee?: string;
  createdDate?: string;
  updatedDate?: string;
  filename: string;
  // Additional fields for enhanced import
  reporter?: string;
  component?: string;
  dueDate?: string;
  linkedIssues?: string[];
  epicLink?: string;
  [key: string]: unknown; // Allow additional fields
}
