import { describe, it, expect } from '@jest/globals';
import { getTicketSyncStatus, SyncStatus } from '../../lib/backlog/diff-engine.js';

describe('getTicketSyncStatus', () => {
  it('should return LOCAL_ONLY when no jira-ticketId', () => {
    const status = getTicketSyncStatus({
      frontmatter: { title: 'New ticket' },
      fileMtime: new Date('2026-03-28T10:00:00Z'),
      jiraUpdated: null,
    });
    expect(status).toBe(SyncStatus.LOCAL_ONLY);
  });

  it('should return IN_SYNC when exportedDate >= jiraUpdated', () => {
    const status = getTicketSyncStatus({
      frontmatter: {
        'jira-ticketId': 'DAPM-100',
        exportedDate: '2026-03-28T14:00:00Z',
      },
      fileMtime: new Date('2026-03-27T10:00:00Z'),
      jiraUpdated: '2026-03-28T13:00:00Z',
    });
    expect(status).toBe(SyncStatus.IN_SYNC);
  });

  it('should return REMOTE_NEWER when jiraUpdated > exportedDate', () => {
    const status = getTicketSyncStatus({
      frontmatter: {
        'jira-ticketId': 'DAPM-100',
        exportedDate: '2026-03-25T10:00:00Z',
      },
      fileMtime: new Date('2026-03-24T10:00:00Z'),
      jiraUpdated: '2026-03-28T14:00:00Z',
    });
    expect(status).toBe(SyncStatus.REMOTE_NEWER);
  });

  it('should return LOCAL_NEWER when fileMtime > exportedDate and jira not updated', () => {
    const status = getTicketSyncStatus({
      frontmatter: {
        'jira-ticketId': 'DAPM-100',
        exportedDate: '2026-03-25T10:00:00Z',
      },
      fileMtime: new Date('2026-03-28T10:00:00Z'),
      jiraUpdated: '2026-03-24T10:00:00Z',
    });
    expect(status).toBe(SyncStatus.LOCAL_NEWER);
  });

  it('should return CONFLICT when both local and remote changed', () => {
    const status = getTicketSyncStatus({
      frontmatter: {
        'jira-ticketId': 'DAPM-100',
        exportedDate: '2026-03-20T10:00:00Z',
      },
      fileMtime: new Date('2026-03-28T10:00:00Z'),
      jiraUpdated: '2026-03-27T14:00:00Z',
    });
    expect(status).toBe(SyncStatus.CONFLICT);
  });

  it('should handle date-only exportedDate with backward compat', () => {
    const status = getTicketSyncStatus({
      frontmatter: {
        'jira-ticketId': 'DAPM-100',
        exportedDate: '2026-03-28',
      },
      fileMtime: new Date('2026-03-27T10:00:00Z'),
      jiraUpdated: '2026-03-27T23:00:00Z',
    });
    // exportedDate 2026-03-28T00:00:00Z >= jiraUpdated 2026-03-27T23:00:00Z
    expect(status).toBe(SyncStatus.IN_SYNC);
  });

  it('should return REMOTE_NEWER when no exportedDate but has ticketId', () => {
    const status = getTicketSyncStatus({
      frontmatter: {
        'jira-ticketId': 'DAPM-100',
      },
      fileMtime: new Date('2026-03-28T10:00:00Z'),
      jiraUpdated: '2026-03-28T14:00:00Z',
    });
    expect(status).toBe(SyncStatus.REMOTE_NEWER);
  });
});
