/**
 * Milestone Migrator Tests
 *
 * Ported from Python: modules/backlog/src/backlog/migrate_milestones.py
 *                     modules/backlog/src/backlog/validate_milestone_migration.py
 *
 * Tests the milestone migration functionality that:
 * 1. Detects old milestone format
 * 2. Converts old milestone files to new sanitized format
 * 3. Validates migration success
 * 4. Tracks migration changes for rollback
 */

import fs from 'fs-extra';
import path from 'path';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils';
import {
  MigrationPlan,
  MigrationTracker,
  getMigrationPlan,
  applyMigration,
  validateMilestoneArchitecture,
  readMilestoneMetadata,
} from '../milestone-migrator';

describe('MilestoneMigrator', () => {
  let sandbox: TestSandbox;
  let backlogDir: string;
  let milestonesDir: string;

  beforeEach(async () => {
    // Create temporary test directory
    sandbox = await createSandbox('milestone-migrator-test');
    backlogDir = sandbox.path;
    milestonesDir = path.join(backlogDir, 'milestones');
    await fs.ensureDir(milestonesDir);
  });

  afterEach(async () => {
    // Clean up temp directory
    await sandbox.cleanup();
  });

  describe('readMilestoneMetadata', () => {
    it('should extract milestoneName from frontmatter', async () => {
      const milestoneFile = path.join(milestonesDir, 'Jan2026.md');
      const content = `---
milestoneName: "APM-R: App: January 2026 (W51, W1, W3)"
status: planning
---
# January 2026`;

      await fs.writeFile(milestoneFile, content, 'utf-8');

      const metadata = await readMilestoneMetadata(milestoneFile);
      expect(metadata.milestoneName).toBe('APM-R: App: January 2026 (W51, W1, W3)');
      expect(metadata.jiraMilestoneId).toBeUndefined();
    });

    it('should extract jiraMilestoneId from frontmatter', async () => {
      const milestoneFile = path.join(milestonesDir, 'milestone.md');
      const content = `---
jiraMilestoneId: "10042"
status: planning
---
# Milestone`;

      await fs.writeFile(milestoneFile, content, 'utf-8');

      const metadata = await readMilestoneMetadata(milestoneFile);
      expect(metadata.jiraMilestoneId).toBe('10042');
      expect(metadata.milestoneName).toBeUndefined();
    });

    it('should extract both milestoneName and jiraMilestoneId', async () => {
      const milestoneFile = path.join(milestonesDir, 'milestone.md');
      const content = `---
milestoneName: "UC1-MVP"
jiraMilestoneId: "10042"
status: planning
---
# UC1 MVP`;

      await fs.writeFile(milestoneFile, content, 'utf-8');

      const metadata = await readMilestoneMetadata(milestoneFile);
      expect(metadata.milestoneName).toBe('UC1-MVP');
      expect(metadata.jiraMilestoneId).toBe('10042');
    });

    it('should return undefined for missing metadata', async () => {
      const milestoneFile = path.join(milestonesDir, 'milestone.md');
      const content = `---
status: planning
---
# Milestone without Jira data`;

      await fs.writeFile(milestoneFile, content, 'utf-8');

      const metadata = await readMilestoneMetadata(milestoneFile);
      expect(metadata.milestoneName).toBeUndefined();
      expect(metadata.jiraMilestoneId).toBeUndefined();
    });

    it('should handle file read errors gracefully', async () => {
      const nonExistentFile = path.join(milestonesDir, 'nonexistent.md');

      await expect(readMilestoneMetadata(nonExistentFile)).rejects.toThrow();
    });
  });

  describe('getMigrationPlan', () => {
    it('should identify milestones needing migration', async () => {
      // Create old-format milestone
      const oldMilestone = path.join(milestonesDir, 'Jan2026.md');
      await fs.writeFile(
        oldMilestone,
        `---
milestoneName: "APM-R: App: January 2026 (W51, W1, W3)"
status: planning
---
# January 2026`,
        'utf-8'
      );

      const plan = await getMigrationPlan(milestonesDir);

      expect(plan['Jan2026.md']).toBeDefined();
      expect(plan['Jan2026.md'].newFilename).toBe('apm-r-app-january-2026-w51-w1-w3.md');
      expect(plan['Jan2026.md'].milestoneName).toBe('APM-R: App: January 2026 (W51, W1, W3)');
    });

    it('should skip milestones without milestoneName', async () => {
      const milestone = path.join(milestonesDir, 'NoJira.md');
      await fs.writeFile(
        milestone,
        `---
status: planning
---
# No Jira Metadata`,
        'utf-8'
      );

      const plan = await getMigrationPlan(milestonesDir);

      expect(plan['NoJira.md']).toBeUndefined();
    });

    it('should skip already-sanitized milestones', async () => {
      const sanitized = path.join(milestonesDir, 'apm-r-app-january-2026-w51-w1-w3.md');
      await fs.writeFile(
        sanitized,
        `---
milestoneName: "APM-R: App: January 2026 (W51, W1, W3)"
status: planning
---
# January 2026`,
        'utf-8'
      );

      const plan = await getMigrationPlan(milestonesDir);

      expect(plan).toEqual({});
    });

    it('should handle multiple milestones needing migration', async () => {
      await fs.writeFile(
        path.join(milestonesDir, 'Jan2026.md'),
        `---
milestoneName: "APM-R: App: January 2026 (W51, W1, W3)"
---
# Jan`,
        'utf-8'
      );

      await fs.writeFile(
        path.join(milestonesDir, 'UC1.md'),
        `---
milestoneName: "UC1-MVP"
---
# UC1`,
        'utf-8'
      );

      const plan = await getMigrationPlan(milestonesDir);

      expect(Object.keys(plan)).toHaveLength(2);
      expect(plan['Jan2026.md'].newFilename).toBe('apm-r-app-january-2026-w51-w1-w3.md');
      expect(plan['UC1.md'].newFilename).toBe('uc1-mvp.md');
    });
  });

  describe('applyMigration', () => {
    it('should rename milestone files according to plan', async () => {
      const oldFile = path.join(milestonesDir, 'Jan2026.md');
      await fs.writeFile(
        oldFile,
        `---
milestoneName: "APM-R: App: January 2026 (W51, W1, W3)"
---
# January 2026`,
        'utf-8'
      );

      const plan: MigrationPlan = {
        'Jan2026.md': {
          newFilename: 'apm-r-app-january-2026-w51-w1-w3.md',
          milestoneName: 'APM-R: App: January 2026 (W51, W1, W3)',
          jiraMilestoneId: undefined,
        },
      };

      const tracker = await applyMigration(backlogDir, plan, false);

      // Check old file was renamed
      expect(await fs.pathExists(oldFile)).toBe(false);

      const newFile = path.join(milestonesDir, 'apm-r-app-january-2026-w51-w1-w3.md');
      expect(await fs.pathExists(newFile)).toBe(true);

      // Check tracker recorded the change
      expect(tracker.changes.milestoneRenames['Jan2026.md']).toBeDefined();
      expect(tracker.changes.milestoneRenames['Jan2026.md']).toBe(
        'apm-r-app-january-2026-w51-w1-w3.md'
      );
    });

    it('should preserve file content during migration', async () => {
      const oldFile = path.join(milestonesDir, 'UC1.md');
      const content = `---
milestoneName: "UC1-MVP"
status: planning
---
# UC1 Milestone

This is the content.`;

      await fs.writeFile(oldFile, content, 'utf-8');

      const plan: MigrationPlan = {
        'UC1.md': {
          newFilename: 'uc1-mvp.md',
          milestoneName: 'UC1-MVP',
          jiraMilestoneId: undefined,
        },
      };

      await applyMigration(backlogDir, plan, false);

      const newFile = path.join(milestonesDir, 'uc1-mvp.md');
      const newContent = await fs.readFile(newFile, 'utf-8');

      expect(newContent).toContain('milestoneName: "UC1-MVP"');
      expect(newContent).toContain('This is the content.');
    });

    it('should skip migration in dry-run mode', async () => {
      const oldFile = path.join(milestonesDir, 'Jan2026.md');
      await fs.writeFile(
        oldFile,
        `---
milestoneName: "APM-R: App: January 2026 (W51, W1, W3)"
---
# January`,
        'utf-8'
      );

      const plan: MigrationPlan = {
        'Jan2026.md': {
          newFilename: 'apm-r-app-january-2026-w51-w1-w3.md',
          milestoneName: 'APM-R: App: January 2026 (W51, W1, W3)',
          jiraMilestoneId: undefined,
        },
      };

      const tracker = await applyMigration(backlogDir, plan, true);

      // Old file should still exist
      expect(await fs.pathExists(oldFile)).toBe(true);

      // New file should not exist
      const newFile = path.join(milestonesDir, 'apm-r-app-january-2026-w51-w1-w3.md');
      expect(await fs.pathExists(newFile)).toBe(false);

      // Tracker should be empty (dry run)
      expect(Object.keys(tracker.changes.milestoneRenames)).toHaveLength(0);
    });

    it('should skip if target file already exists', async () => {
      const oldFile = path.join(milestonesDir, 'Jan2026.md');
      const newFile = path.join(milestonesDir, 'apm-r-app-january-2026-w51-w1-w3.md');

      await fs.writeFile(oldFile, '---\nmilestoneName: "APM-R: App: January 2026 (W51, W1, W3)"\n---\n# Old', 'utf-8');
      await fs.writeFile(newFile, '---\nmilestoneName: "APM-R: App: January 2026 (W51, W1, W3)"\n---\n# New', 'utf-8');

      const plan: MigrationPlan = {
        'Jan2026.md': {
          newFilename: 'apm-r-app-january-2026-w51-w1-w3.md',
          milestoneName: 'APM-R: App: January 2026 (W51, W1, W3)',
          jiraMilestoneId: undefined,
        },
      };

      const tracker = await applyMigration(backlogDir, plan, false);

      // Both files should still exist
      expect(await fs.pathExists(oldFile)).toBe(true);
      expect(await fs.pathExists(newFile)).toBe(true);

      // No changes recorded
      expect(Object.keys(tracker.changes.milestoneRenames)).toHaveLength(0);
    });

    it('should save migration tracker file', async () => {
      const oldFile = path.join(milestonesDir, 'UC1.md');
      await fs.writeFile(
        oldFile,
        `---
milestoneName: "UC1-MVP"
---
# UC1`,
        'utf-8'
      );

      const plan: MigrationPlan = {
        'UC1.md': {
          newFilename: 'uc1-mvp.md',
          milestoneName: 'UC1-MVP',
          jiraMilestoneId: undefined,
        },
      };

      const tracker = await applyMigration(backlogDir, plan, false);
      await tracker.save();

      const trackerFile = path.join(backlogDir, '.migration-tracker.json');
      expect(await fs.pathExists(trackerFile)).toBe(true);

      const trackerData = await fs.readJson(trackerFile);
      expect(trackerData.milestoneRenames['UC1.md']).toBeDefined();
      expect(trackerData.timestamp).toBeDefined();
    });
  });

  describe('validateMilestoneArchitecture', () => {
    it('should pass validation for properly migrated milestones', async () => {
      const milestoneFile = path.join(milestonesDir, 'apm-r-app-january-2026-w51-w1-w3.md');
      await fs.writeFile(
        milestoneFile,
        `---
milestoneName: "APM-R: App: January 2026 (W51, W1, W3)"
status: planning
---
# January 2026`,
        'utf-8'
      );

      const result = await validateMilestoneArchitecture(backlogDir, false);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should detect deprecated milestone field in tickets', async () => {
      // Create a milestone
      await fs.writeFile(
        path.join(milestonesDir, 'uc1-mvp.md'),
        `---
milestoneName: "UC1-MVP"
---
# UC1`,
        'utf-8'
      );

      // Create tickets directory with deprecated field
      const ticketsDir = path.join(backlogDir, 'tickets', 'stories');
      await fs.ensureDir(ticketsDir);
      await fs.writeFile(
        path.join(ticketsDir, 'STORY-001.md'),
        `---
title: "User Login"
milestone: "UC1-MVP"
---
# Story`,
        'utf-8'
      );

      const result = await validateMilestoneArchitecture(backlogDir, false);

      expect(result.valid).toBe(false);
      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('deprecated'))).toBe(true);
    });

    it('should detect unsanitized milestone filenames', async () => {
      const unsanitizedFile = path.join(milestonesDir, 'Jan2026-OLD.md');
      await fs.writeFile(
        unsanitizedFile,
        `---
milestoneName: "January 2026"
---
# Old Format`,
        'utf-8'
      );

      const result = await validateMilestoneArchitecture(backlogDir, false);

      expect(result.warnings.length).toBeGreaterThan(0);
    });

    it('should report missing Jira metadata as warning', async () => {
      const milestoneFile = path.join(milestonesDir, 'no-jira-metadata.md');
      await fs.writeFile(
        milestoneFile,
        `---
status: planning
---
# No Jira Metadata`,
        'utf-8'
      );

      const result = await validateMilestoneArchitecture(backlogDir, false);

      expect(result.warnings.length).toBeGreaterThan(0);
      expect(result.warnings.some((w) => w.includes('Jira metadata'))).toBe(true);
    });

    it('should handle missing directories gracefully', async () => {
      const nonExistentDir = path.join(sandbox.path, 'nonexistent');

      const result = await validateMilestoneArchitecture(nonExistentDir, false);

      expect(result.valid).toBe(false);
      expect(result.errors.length).toBeGreaterThan(0);
    });
  });

  describe('MigrationTracker', () => {
    it('should initialize with empty changes', () => {
      const tracker = new MigrationTracker(path.join(sandbox.path, '.tracker.json'));

      expect(tracker.changes.milestoneRenames).toEqual({});
      expect(tracker.changes.ticketUpdates).toEqual([]);
      expect(tracker.changes.timestamp).toBeDefined();
    });

    it('should track milestone renames', () => {
      const tracker = new MigrationTracker();

      tracker.addRename('Jan2026.md', 'apm-r-app-january-2026-w51-w1-w3.md');

      expect(tracker.changes.milestoneRenames['Jan2026.md']).toBe(
        'apm-r-app-january-2026-w51-w1-w3.md'
      );
    });

    it('should track ticket updates', () => {
      const tracker = new MigrationTracker();

      tracker.addTicketUpdate('tickets/stories/STORY-001.md');

      expect(tracker.changes.ticketUpdates).toContain('tickets/stories/STORY-001.md');
    });

    it('should save and load tracker file', async () => {
      const trackerFile = path.join(sandbox.path, '.tracker.json');
      const tracker = new MigrationTracker(trackerFile);

      tracker.addRename('old.md', 'new.md');
      tracker.addTicketUpdate('ticket.md');

      await tracker.save();

      expect(await fs.pathExists(trackerFile)).toBe(true);

      const loaded = await MigrationTracker.load(trackerFile);

      expect(loaded).not.toBeNull();
      expect(loaded?.milestoneRenames['old.md']).toBeDefined();
      expect(loaded?.ticketUpdates).toContain('ticket.md');
    });

    it('should return null when loading non-existent tracker', async () => {
      const loaded = await MigrationTracker.load(path.join(sandbox.path, 'nonexistent.json'));

      expect(loaded).toBeNull();
    });
  });

  describe('Integration: Full Migration Flow', () => {
    it('should migrate multiple milestones end-to-end', async () => {
      // Create old-format milestones
      await fs.writeFile(
        path.join(milestonesDir, 'Jan2026.md'),
        `---
milestoneName: "APM-R: App: January 2026 (W51, W1, W3)"
status: planning
---
# January 2026`,
        'utf-8'
      );

      await fs.writeFile(
        path.join(milestonesDir, 'UC1.md'),
        `---
milestoneName: "UC1-MVP"
status: planning
---
# UC1 MVP`,
        'utf-8'
      );

      // Get migration plan
      const plan = await getMigrationPlan(milestonesDir);
      expect(Object.keys(plan)).toHaveLength(2);

      // Apply migration
      const tracker = await applyMigration(backlogDir, plan, false);

      // Verify files were renamed
      expect(await fs.pathExists(path.join(milestonesDir, 'Jan2026.md'))).toBe(false);
      expect(await fs.pathExists(path.join(milestonesDir, 'UC1.md'))).toBe(false);
      expect(
        await fs.pathExists(path.join(milestonesDir, 'apm-r-app-january-2026-w51-w1-w3.md'))
      ).toBe(true);
      expect(await fs.pathExists(path.join(milestonesDir, 'uc1-mvp.md'))).toBe(true);

      // Verify tracker
      expect(Object.keys(tracker.changes.milestoneRenames)).toHaveLength(2);

      // Validate architecture
      const validation = await validateMilestoneArchitecture(backlogDir, false);
      expect(validation.valid).toBe(true);
    });
  });
});
