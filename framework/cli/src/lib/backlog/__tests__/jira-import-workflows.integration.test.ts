/**
 * Tests for Jira import workflows - smart lookup and resolution
 *
 * @group backlog
 */

import { describe, it, expect, beforeEach, afterEach } from '@jest/globals';
import fs from 'fs-extra';
import path from 'path';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils';
import {
  resolveSprintMetadata,
  resolveMilestoneMetadata,
  extractSprintIdFromName,
  generateSprintId,
} from '../jira-import-workflows.js';
import type { CsvExtraction } from '../jira-validators.js';

describe('jira-import-workflows', () => {
  let sandbox: TestSandbox;
  let backlogDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    sandbox = await createSandbox('jira-import-test');
    backlogDir = path.join(sandbox.path, 'backlog');
    await fs.ensureDir(backlogDir);
    await fs.ensureDir(path.join(backlogDir, 'sprints'));
    await fs.ensureDir(path.join(backlogDir, 'milestones'));
  });

  afterEach(async () => {
    // Cleanup
    await sandbox.cleanup();
  });

  describe('resolveSprintMetadata', () => {
    it('should find existing sprint by name with Jira ID', async () => {
      // Create existing sprint file
      const sprintFile = path.join(backlogDir, 'sprints', '2025-W45.md');
      const content = `---
jiraSprintId: '16786'
sprintName: APM-APP-2025W45
sprintId: 2025-W45
milestone: Jan2026
committed: 0
ticketCount: 0
---

## Sprint: APM-APP-2025W45
`;
      await fs.writeFile(sprintFile, content);

      const csvData: CsvExtraction = {
        sprintName: 'APM-APP-2025W45',
        hasSprintColumn: true,
        hasFixVersionsColumn: false,
        uniqueSprints: ['APM-APP-2025W45'],
        uniqueMilestones: [],
      };

      const args = { dryRun: false };
      const result = await resolveSprintMetadata(args, csvData, backlogDir, false);

      expect(result).toEqual({
        sprintId: '2025-W45',
        sprintName: 'APM-APP-2025W45',
        jiraSprintId: '16786',
      });
    });

    it('should use sprint name from args if provided', async () => {
      const csvData: CsvExtraction = {
        sprintName: 'APM-APP-2025W45',
        hasSprintColumn: true,
        hasFixVersionsColumn: false,
        uniqueSprints: ['APM-APP-2025W45'],
        uniqueMilestones: [],
      };

      const args = { sprintName: 'Custom-Sprint-Name', dryRun: true };
      const result = await resolveSprintMetadata(args, csvData, backlogDir, false);

      expect(result.sprintName).toBe('Custom-Sprint-Name');
    });

    it('should throw error if no sprint name found', async () => {
      const csvData: CsvExtraction = {
        hasSprintColumn: false,
        hasFixVersionsColumn: false,
        uniqueSprints: [],
        uniqueMilestones: [],
      };

      const args = { dryRun: false };

      await expect(
        resolveSprintMetadata(args, csvData, backlogDir, false)
      ).rejects.toThrow('Cannot determine sprint name');
    });

    it('should generate new sprint if not found by name', async () => {
      const csvData: CsvExtraction = {
        sprintName: 'APM-APP-2025W45',
        hasSprintColumn: true,
        hasFixVersionsColumn: false,
        uniqueSprints: ['APM-APP-2025W45'],
        uniqueMilestones: [],
      };

      const args = { dryRun: true };
      const result = await resolveSprintMetadata(args, csvData, backlogDir, false);

      expect(result.sprintId).toBe('2025-W45');
      expect(result.sprintName).toBe('APM-APP-2025W45');
      expect(result.jiraSprintId).toBeNull();
    });

    it('should find sprint by Jira ID when not found by name', async () => {
      // Create existing sprint file with different name
      const sprintFile = path.join(backlogDir, 'sprints', '2025-W45.md');
      const content = `---
jiraSprintId: '16786'
sprintName: OLD-SPRINT-NAME
sprintId: 2025-W45
committed: 0
ticketCount: 0
---

## Sprint: OLD-SPRINT-NAME
`;
      await fs.writeFile(sprintFile, content);

      const csvData: CsvExtraction = {
        sprintName: 'NEW-SPRINT-NAME',
        hasSprintColumn: true,
        hasFixVersionsColumn: false,
        uniqueSprints: ['NEW-SPRINT-NAME'],
        uniqueMilestones: [],
      };

      // In dry-run mode with jira sprint id
      const args = { dryRun: true, jiraSprintId: '16786' };
      const result = await resolveSprintMetadata(args, csvData, backlogDir, false);

      expect(result.sprintId).toBe('2025-W45');
      expect(result.jiraSprintId).toBe('16786');
    });
  });

  describe('resolveMilestoneMetadata', () => {
    it('should find existing milestone by name', async () => {
      // Create existing milestone file
      const milestoneFile = path.join(backlogDir, 'milestones', 'Jan2026.md');
      const content = `---
jiraMilestoneId: Jan2026
milestoneName: 'January 2026 (W51, W1, W3)'
milestone: Jan2026
title: Milestone Jan2026
committed: 0
ticketCount: 0
---

## Milestone: January 2026
`;
      await fs.writeFile(milestoneFile, content);

      const csvData: CsvExtraction = {
        milestoneName: 'January 2026 (W51, W1, W3)',
        hasSprintColumn: false,
        hasFixVersionsColumn: true,
        uniqueSprints: [],
        uniqueMilestones: ['January 2026 (W51, W1, W3)'],
      };

      const args = { dryRun: false };
      const result = await resolveMilestoneMetadata(args, csvData, backlogDir, false);

      expect(result).toEqual({
        milestoneId: 'Jan2026',
        milestoneName: 'January 2026 (W51, W1, W3)',
        jiraMilestoneId: 'Jan2026',
      });
    });

    it('should use milestone name from args if provided', async () => {
      const csvData: CsvExtraction = {
        milestoneName: 'January 2026 (W51, W1, W3)',
        hasSprintColumn: false,
        hasFixVersionsColumn: true,
        uniqueSprints: [],
        uniqueMilestones: ['January 2026 (W51, W1, W3)'],
      };

      const args = { milestoneName: 'February 2026', dryRun: true };
      const result = await resolveMilestoneMetadata(args, csvData, backlogDir, false);

      expect(result.milestoneName).toBe('February 2026');
      expect(result.milestoneId).toBe('Feb2026');
    });

    it('should throw error if no milestone name found', async () => {
      const csvData: CsvExtraction = {
        hasSprintColumn: false,
        hasFixVersionsColumn: false,
        uniqueSprints: [],
        uniqueMilestones: [],
      };

      const args = { dryRun: false };

      await expect(
        resolveMilestoneMetadata(args, csvData, backlogDir, false)
      ).rejects.toThrow('Cannot determine milestone name');
    });

    it('should use provided Jira milestone ID', async () => {
      const csvData: CsvExtraction = {
        milestoneName: 'January 2026',
        hasSprintColumn: false,
        hasFixVersionsColumn: true,
        uniqueSprints: [],
        uniqueMilestones: ['January 2026'],
      };

      const args = { jiraMilestoneId: 'Jan2026', dryRun: false };
      const result = await resolveMilestoneMetadata(args, csvData, backlogDir, false);

      expect(result.milestoneId).toBe('Jan2026');
      expect(result.jiraMilestoneId).toBe('Jan2026');
    });

    it('should suggest milestone ID from name in dry-run mode', async () => {
      const csvData: CsvExtraction = {
        milestoneName: 'November 2025',
        hasSprintColumn: false,
        hasFixVersionsColumn: true,
        uniqueSprints: [],
        uniqueMilestones: ['November 2025'],
      };

      const args = { dryRun: true };
      const result = await resolveMilestoneMetadata(args, csvData, backlogDir, false);

      expect(result.milestoneId).toBe('Nov2025');
      expect(result.milestoneName).toBe('November 2025');
    });
  });

  describe('extractSprintIdFromName', () => {
    it('should extract sprint ID from YYYYWNN format', () => {
      expect(extractSprintIdFromName('APM-APP-2025W45')).toBe('2025-W45');
      expect(extractSprintIdFromName('2025W45')).toBe('2025-W45');
      expect(extractSprintIdFromName('PREFIX-2026W1')).toBe('2026-W1');
    });

    it('should extract sprint ID from YYYY-WNN format', () => {
      expect(extractSprintIdFromName('APM-APP-2025-W45')).toBe('2025-W45');
      expect(extractSprintIdFromName('2025-W45')).toBe('2025-W45');
    });

    it('should handle single digit week numbers', () => {
      expect(extractSprintIdFromName('2026W1')).toBe('2026-W1');
      expect(extractSprintIdFromName('APM-2025W5')).toBe('2025-W5');
    });

    it('should return null for unparseable names', () => {
      expect(extractSprintIdFromName('invalid-name')).toBeNull();
      expect(extractSprintIdFromName('Sprint-Name')).toBeNull();
      expect(extractSprintIdFromName('')).toBeNull();
    });
  });

  describe('generateSprintId', () => {
    it('should generate sprint ID in YYYY-WNN format', () => {
      const sprintId = generateSprintId();

      // Should match YYYY-WNN pattern
      expect(sprintId).toMatch(/^\d{4}-W\d{1,2}$/);

      // Extract year and week
      const [year, week] = sprintId.split('-W');
      const currentYear = new Date().getFullYear();

      // Year should be current year or next year
      expect(parseInt(year)).toBeGreaterThanOrEqual(currentYear);
      expect(parseInt(year)).toBeLessThanOrEqual(currentYear + 1);

      // Week should be between 1 and 53
      expect(parseInt(week)).toBeGreaterThanOrEqual(1);
      expect(parseInt(week)).toBeLessThanOrEqual(53);
    });
  });
});
