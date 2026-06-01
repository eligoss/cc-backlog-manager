import { describe, it, expect } from '@jest/globals';
import { normalizeSprintName, buildPullJql } from '../../lib/backlog/pull-engine.js';

describe('pull-engine', () => {
  describe('normalizeSprintName', () => {
    it('should strip "Sprint " prefix and return ISO week', () => {
      expect(normalizeSprintName('Sprint 2026-W12')).toBe('2026-W12');
    });

    it('should strip "Sprint_" prefix', () => {
      expect(normalizeSprintName('Sprint_2026-W05')).toBe('2026-W05');
    });

    it('should handle already-normalized names', () => {
      expect(normalizeSprintName('2026-W12')).toBe('2026-W12');
    });

    it('should kebab-case free-form names', () => {
      expect(normalizeSprintName('January Release')).toBe('january-release');
    });

    it('should be case-insensitive for prefix stripping', () => {
      expect(normalizeSprintName('sprint 2026-W03')).toBe('2026-W03');
    });
  });

  describe('buildPullJql', () => {
    it('should build JQL for sprint filter', () => {
      const jql = buildPullJql('DAPM', { sprint: 'Sprint 2026-W12' });
      expect(jql).toBe('project = DAPM AND sprint = "Sprint 2026-W12"');
    });

    it('should build JQL for version filter', () => {
      const jql = buildPullJql('DAPM', { version: 'Mar2026' });
      expect(jql).toBe('project = DAPM AND fixVersion = "Mar2026"');
    });

    it('should build JQL for both filters', () => {
      const jql = buildPullJql('DAPM', { sprint: 'Sprint 2026-W12', version: 'Mar2026' });
      expect(jql).toBe('project = DAPM AND sprint = "Sprint 2026-W12" AND fixVersion = "Mar2026"');
    });

    it('should build JQL for ticket key list (bare pull)', () => {
      const jql = buildPullJql('DAPM', { ticketKeys: ['DAPM-100', 'DAPM-101'] });
      expect(jql).toBe('issueKey IN (DAPM-100,DAPM-101)');
    });
  });
});
