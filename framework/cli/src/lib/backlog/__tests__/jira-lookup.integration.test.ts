import { describe, it, expect } from '@jest/globals';
import {
  findSprintByName,
  findSprintByJiraId,
  findMilestoneByName,
  findMilestoneById,
  listAllSprints,
  listAllMilestones,
  parseSprintFileYaml,
  parseMilestoneFileYaml,
  SprintMetadata,
  MilestoneMetadata,
} from '../jira-lookup';
import fs from 'fs-extra';
import path from 'path';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils';

describe('jira-lookup', () => {
  let sandbox: TestSandbox;
  let backlogDir: string;
  let sprintsDir: string;
  let milestonesDir: string;

  beforeEach(async () => {
    sandbox = await createSandbox('jira-lookup-test');
    backlogDir = path.join(sandbox.path, 'backlog');
    sprintsDir = path.join(backlogDir, 'sprints');
    milestonesDir = path.join(backlogDir, 'milestones');

    await fs.ensureDir(sprintsDir);
    await fs.ensureDir(milestonesDir);
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  async function createSprintFile(
    sprintId: string,
    metadata: {
      sprintName?: string;
      jiraSprintId?: string;
      milestone?: string;
      committed?: number;
      ticketCount?: number;
    }
  ): Promise<string> {
    const filePath = path.join(sprintsDir, `${sprintId}.md`);
    const yaml = `---
sprintName: ${metadata.sprintName !== undefined ? `"${metadata.sprintName}"` : '""'}
jiraSprintId: ${metadata.jiraSprintId !== undefined ? `"${metadata.jiraSprintId}"` : '""'}
milestone: ${metadata.milestone !== undefined ? `"${metadata.milestone}"` : '""'}
committed: ${metadata.committed || 0}
ticketCount: ${metadata.ticketCount || 0}
---

# Sprint ${sprintId}
`;
    await fs.writeFile(filePath, yaml, 'utf-8');
    return filePath;
  }

  async function createMilestoneFile(
    milestoneId: string,
    metadata: {
      milestoneName?: string;
      jiraMilestoneId?: string;
      committed?: number;
      ticketCount?: number;
    }
  ): Promise<string> {
    const filePath = path.join(milestonesDir, `${milestoneId}.md`);
    const yaml = `---
milestoneName: ${metadata.milestoneName !== undefined ? `"${metadata.milestoneName}"` : '""'}
jiraMilestoneId: ${metadata.jiraMilestoneId !== undefined ? `"${metadata.jiraMilestoneId}"` : '""'}
committed: ${metadata.committed || 0}
ticketCount: ${metadata.ticketCount || 0}
---

# Milestone ${milestoneId}
`;
    await fs.writeFile(filePath, yaml, 'utf-8');
    return filePath;
  }

  describe('parseSprintFileYaml', () => {
    it('should parse valid sprint file', async () => {
      const filePath = await createSprintFile('2025-W45', {
        sprintName: 'APM-APP-2025-W45',
        jiraSprintId: '16786',
        milestone: 'Jan2026',
        committed: 80,
        ticketCount: 10,
      });

      const result = await parseSprintFileYaml(filePath);

      expect(result).not.toBeNull();
      expect(result?.sprintId).toBe('2025-W45');
      expect(result?.sprintName).toBe('APM-APP-2025-W45');
      expect(result?.jiraSprintId).toBe('16786');
      expect(result?.milestone).toBe('Jan2026');
      expect(result?.committed).toBe(80);
      expect(result?.ticketCount).toBe(10);
    });

    it('should handle missing optional fields', async () => {
      const filePath = await createSprintFile('2025-W45', {});

      const result = await parseSprintFileYaml(filePath);

      expect(result).not.toBeNull();
      expect(result?.sprintId).toBe('2025-W45');
      expect(result?.sprintName).toBeUndefined();
      expect(result?.jiraSprintId).toBeUndefined();
    });

    it('should return null for invalid YAML', async () => {
      const filePath = path.join(sprintsDir, '2025-W45.md');
      await fs.writeFile(filePath, 'Invalid content without frontmatter', 'utf-8');

      const result = await parseSprintFileYaml(filePath);

      expect(result).toBeNull();
    });

    it('should extract sprint ID from filename', async () => {
      const filePath = await createSprintFile('2025-W52', {
        sprintName: 'Test Sprint',
      });

      const result = await parseSprintFileYaml(filePath);

      expect(result?.sprintId).toBe('2025-W52');
    });

    it('should handle files without closing frontmatter', async () => {
      const filePath = path.join(sprintsDir, '2025-W45.md');
      await fs.writeFile(filePath, '---\nsprintName: Test\n\nNo closing marker', 'utf-8');

      const result = await parseSprintFileYaml(filePath);

      expect(result).toBeNull();
    });
  });

  describe('parseMilestoneFileYaml', () => {
    it('should parse valid milestone file', async () => {
      const filePath = await createMilestoneFile('Jan2026', {
        milestoneName: 'January 2026 (W51, W1, W3)',
        jiraMilestoneId: '10050',
        committed: 120,
        ticketCount: 15,
      });

      const result = await parseMilestoneFileYaml(filePath);

      expect(result).not.toBeNull();
      expect(result?.milestoneId).toBe('Jan2026');
      expect(result?.milestoneName).toBe('January 2026 (W51, W1, W3)');
      expect(result?.jiraMilestoneId).toBe('10050');
      expect(result?.committed).toBe(120);
      expect(result?.ticketCount).toBe(15);
    });

    it('should handle missing optional fields', async () => {
      const filePath = await createMilestoneFile('Jan2026', {});

      const result = await parseMilestoneFileYaml(filePath);

      expect(result).not.toBeNull();
      expect(result?.milestoneId).toBe('Jan2026');
      expect(result?.milestoneName).toBeUndefined();
    });

    it('should return null for invalid YAML', async () => {
      const filePath = path.join(milestonesDir, 'Jan2026.md');
      await fs.writeFile(filePath, 'Invalid content without frontmatter', 'utf-8');

      const result = await parseMilestoneFileYaml(filePath);

      expect(result).toBeNull();
    });

    it('should extract milestone ID from filename', async () => {
      const filePath = await createMilestoneFile('Dec2025', {
        milestoneName: 'December 2025',
      });

      const result = await parseMilestoneFileYaml(filePath);

      expect(result?.milestoneId).toBe('Dec2025');
    });
  });

  describe('findSprintByName', () => {
    it('should find sprint by exact name match', async () => {
      await createSprintFile('2025-W45', {
        sprintName: 'APM-APP-2025-W45',
        jiraSprintId: '16786',
      });
      await createSprintFile('2025-W46', {
        sprintName: 'APM-APP-2025-W46',
        jiraSprintId: '16787',
      });

      const result = await findSprintByName('APM-APP-2025-W45', backlogDir);

      expect(result).not.toBeNull();
      expect(result?.sprintName).toBe('APM-APP-2025-W45');
      expect(result?.sprintId).toBe('2025-W45');
    });

    it('should return null for no match', async () => {
      await createSprintFile('2025-W45', {
        sprintName: 'APM-APP-2025-W45',
      });

      const result = await findSprintByName('NonexistentSprint', backlogDir);

      expect(result).toBeNull();
    });

    it('should return null if sprints directory does not exist', async () => {
      await fs.remove(sprintsDir);

      const result = await findSprintByName('APM-APP-2025-W45', backlogDir);

      expect(result).toBeNull();
    });

    it('should handle multiple sprints and find correct one', async () => {
      await createSprintFile('2025-W45', {
        sprintName: 'APM-APP-2025-W45',
      });
      await createSprintFile('2025-W46', {
        sprintName: 'APM-APP-2025-W46',
      });
      await createSprintFile('2025-W47', {
        sprintName: 'APM-APP-2025-W47',
      });

      const result = await findSprintByName('APM-APP-2025-W46', backlogDir);

      expect(result).not.toBeNull();
      expect(result?.sprintId).toBe('2025-W46');
    });
  });

  describe('findSprintByJiraId', () => {
    it('should find sprint by Jira sprint ID', async () => {
      await createSprintFile('2025-W45', {
        sprintName: 'APM-APP-2025-W45',
        jiraSprintId: '16786',
      });

      const result = await findSprintByJiraId('16786', backlogDir);

      expect(result).not.toBeNull();
      expect(result?.jiraSprintId).toBe('16786');
      expect(result?.sprintId).toBe('2025-W45');
    });

    it('should return null for no match', async () => {
      await createSprintFile('2025-W45', {
        jiraSprintId: '16786',
      });

      const result = await findSprintByJiraId('99999', backlogDir);

      expect(result).toBeNull();
    });

    it('should detect renamed sprints', async () => {
      await createSprintFile('2025-W45', {
        sprintName: 'NewSprintName',
        jiraSprintId: '16786',
      });

      const result = await findSprintByJiraId('16786', backlogDir);

      expect(result).not.toBeNull();
      expect(result?.sprintName).toBe('NewSprintName');
      expect(result?.jiraSprintId).toBe('16786');
    });
  });

  describe('findMilestoneByName', () => {
    it('should find milestone by exact name match', async () => {
      await createMilestoneFile('Jan2026', {
        milestoneName: 'January 2026 (W51, W1, W3)',
      });
      await createMilestoneFile('Feb2026', {
        milestoneName: 'February 2026',
      });

      const result = await findMilestoneByName('January 2026 (W51, W1, W3)', backlogDir);

      expect(result).not.toBeNull();
      expect(result?.milestoneName).toBe('January 2026 (W51, W1, W3)');
      expect(result?.milestoneId).toBe('Jan2026');
    });

    it('should return null for no match', async () => {
      await createMilestoneFile('Jan2026', {
        milestoneName: 'January 2026',
      });

      const result = await findMilestoneByName('NonexistentMilestone', backlogDir);

      expect(result).toBeNull();
    });

    it('should return null if milestones directory does not exist', async () => {
      await fs.remove(milestonesDir);

      const result = await findMilestoneByName('January 2026', backlogDir);

      expect(result).toBeNull();
    });
  });

  describe('findMilestoneById', () => {
    it('should find milestone by ID (filename stem)', async () => {
      await createMilestoneFile('Jan2026', {
        milestoneName: 'January 2026',
      });

      const result = await findMilestoneById('Jan2026', backlogDir);

      expect(result).not.toBeNull();
      expect(result?.milestoneId).toBe('Jan2026');
    });

    it('should return null if file does not exist', async () => {
      const result = await findMilestoneById('Nonexistent2026', backlogDir);

      expect(result).toBeNull();
    });

    it('should return null if milestones directory does not exist', async () => {
      await fs.remove(milestonesDir);

      const result = await findMilestoneById('Jan2026', backlogDir);

      expect(result).toBeNull();
    });
  });

  describe('listAllSprints', () => {
    it('should list all sprints sorted by ID', async () => {
      await createSprintFile('2025-W47', { sprintName: 'Sprint 47' });
      await createSprintFile('2025-W45', { sprintName: 'Sprint 45' });
      await createSprintFile('2025-W46', { sprintName: 'Sprint 46' });

      const result = await listAllSprints(backlogDir);

      expect(result).toHaveLength(3);
      expect(result[0].sprintId).toBe('2025-W45');
      expect(result[1].sprintId).toBe('2025-W46');
      expect(result[2].sprintId).toBe('2025-W47');
    });

    it('should return empty array if sprints directory does not exist', async () => {
      await fs.remove(sprintsDir);

      const result = await listAllSprints(backlogDir);

      expect(result).toHaveLength(0);
    });

    it('should skip invalid sprint files', async () => {
      await createSprintFile('2025-W45', { sprintName: 'Valid Sprint' });
      const invalidPath = path.join(sprintsDir, '2025-W46.md');
      await fs.writeFile(invalidPath, 'Invalid file without frontmatter', 'utf-8');

      const result = await listAllSprints(backlogDir);

      expect(result).toHaveLength(1);
      expect(result[0].sprintId).toBe('2025-W45');
    });
  });

  describe('listAllMilestones', () => {
    it('should list all milestones sorted by ID', async () => {
      await createMilestoneFile('Mar2026', { milestoneName: 'March 2026' });
      await createMilestoneFile('Jan2026', { milestoneName: 'January 2026' });
      await createMilestoneFile('Feb2026', { milestoneName: 'February 2026' });

      const result = await listAllMilestones(backlogDir);

      expect(result).toHaveLength(3);
      expect(result[0].milestoneId).toBe('Feb2026');
      expect(result[1].milestoneId).toBe('Jan2026');
      expect(result[2].milestoneId).toBe('Mar2026');
    });

    it('should return empty array if milestones directory does not exist', async () => {
      await fs.remove(milestonesDir);

      const result = await listAllMilestones(backlogDir);

      expect(result).toHaveLength(0);
    });

    it('should skip invalid milestone files', async () => {
      await createMilestoneFile('Jan2026', { milestoneName: 'Valid Milestone' });
      const invalidPath = path.join(milestonesDir, 'Feb2026.md');
      await fs.writeFile(invalidPath, 'Invalid file without frontmatter', 'utf-8');

      const result = await listAllMilestones(backlogDir);

      expect(result).toHaveLength(1);
      expect(result[0].milestoneId).toBe('Jan2026');
    });
  });
});
