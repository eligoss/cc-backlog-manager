import {
  generateSprintFile,
  generateMilestoneFile,
  updateSprintFileMetadata,
  updateMilestoneFileMetadata,
} from '../jira-file-generators';
import fs from 'fs-extra';
import path from 'path';
import { parseFrontmatter } from '../../common/yaml-frontmatter';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils';

describe('JiraFileGenerators', () => {
  let sandbox: TestSandbox;
  let tempDir: string;
  let consoleErrorSpy: jest.SpyInstance;

  beforeEach(async () => {
    sandbox = await createSandbox('jira-file-generators');
    tempDir = sandbox.path;
    // Suppress expected console.error calls from success messages
    consoleErrorSpy = jest.spyOn(console, 'error').mockImplementation();
  });

  afterEach(async () => {
    await sandbox.cleanup();
    consoleErrorSpy.mockRestore();
  });

  describe('generateSprintFile', () => {
    it('should generate sprint file with required fields', async () => {
      const sprintFile = await generateSprintFile({
        sprintId: '2026-W1',
        backlogDir: tempDir,
      });

      expect(sprintFile).toBe(path.join(tempDir, 'sprints', '2026-W1.md'));
      expect(await fs.pathExists(sprintFile)).toBe(true);

      const content = await fs.readFile(sprintFile, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.sprintId).toBe('2026-W1');
      expect(data.committed).toBe(0);
      expect(data.ticketCount).toBe(0);
    });

    it('should include optional fields when provided', async () => {
      const sprintFile = await generateSprintFile({
        sprintId: '2026-W1',
        sprintName: 'APM-APP-2026-W1',
        jiraSprintId: '16786',
        milestone: 'Jan2026',
        committed: 5,
        ticketCount: 10,
        backlogDir: tempDir,
      });

      const content = await fs.readFile(sprintFile, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.sprintId).toBe('2026-W1');
      expect(data.sprintName).toBe('APM-APP-2026-W1');
      expect(data.jiraSprintId).toBe('16786');
      expect(data.milestone).toBe('Jan2026');
      expect(data.committed).toBe(5);
      expect(data.ticketCount).toBe(10);
    });

    it('should preserve field order in frontmatter', async () => {
      const sprintFile = await generateSprintFile({
        sprintId: '2026-W1',
        sprintName: 'APM-APP-2026-W1',
        jiraSprintId: '16786',
        milestone: 'Jan2026',
        committed: 5,
        ticketCount: 10,
        backlogDir: tempDir,
      });

      const content = await fs.readFile(sprintFile, 'utf-8');

      // Extract YAML frontmatter
      const lines = content.split('\n');
      const yamlLines = lines.slice(1, lines.indexOf('---', 1));

      // Check field order: jiraSprintId, sprintName, sprintId, milestone, committed, ticketCount
      expect(yamlLines[0]).toContain('jiraSprintId');
      expect(yamlLines[1]).toContain('sprintName');
      expect(yamlLines[2]).toContain('sprintId');
      expect(yamlLines[3]).toContain('milestone');
      expect(yamlLines[4]).toContain('committed');
      expect(yamlLines[5]).toContain('ticketCount');
    });

    it('should generate correct markdown body', async () => {
      const sprintFile = await generateSprintFile({
        sprintId: '2026-W1',
        sprintName: 'APM-APP-2026-W1',
        jiraSprintId: '16786',
        milestone: 'Jan2026',
        committed: 5,
        ticketCount: 10,
        backlogDir: tempDir,
      });

      const content = await fs.readFile(sprintFile, 'utf-8');
      const { content: body } = parseFrontmatter(content);

      expect(body).toContain('## Sprint: APM-APP-2026-W1');
      expect(body).toContain('**Sprint ID:** 2026-W1');
      expect(body).toContain('**Jira Sprint ID:** 16786');
      expect(body).toContain('**Milestone:** Jan2026');
      expect(body).toContain('- Committed: 5');
      expect(body).toContain('- Tickets: 10');
      expect(body).toContain('### Tickets');
    });

    it('should handle missing optional fields in body', async () => {
      const sprintFile = await generateSprintFile({
        sprintId: '2026-W1',
        backlogDir: tempDir,
      });

      const content = await fs.readFile(sprintFile, 'utf-8');
      const { content: body } = parseFrontmatter(content);

      expect(body).toContain('## Sprint: 2026-W1');
      expect(body).toContain('**Jira Sprint ID:** TBD');
      expect(body).toContain('**Milestone:** Unassigned');
    });

    it('should throw error if sprintId is empty', async () => {
      await expect(
        generateSprintFile({
          sprintId: '',
          backlogDir: tempDir,
        })
      ).rejects.toThrow('sprint_id is required');
    });

    it('should create sprints directory if it does not exist', async () => {
      const sprintsDir = path.join(tempDir, 'sprints');
      expect(await fs.pathExists(sprintsDir)).toBe(false);

      await generateSprintFile({
        sprintId: '2026-W1',
        backlogDir: tempDir,
      });

      expect(await fs.pathExists(sprintsDir)).toBe(true);
    });
  });

  describe('generateMilestoneFile', () => {
    it('should generate milestone file with required fields', async () => {
      const milestoneFile = await generateMilestoneFile({
        milestoneId: 'Jan2026',
        backlogDir: tempDir,
      });

      expect(milestoneFile).toBe(path.join(tempDir, 'milestones', 'Jan2026.md'));
      expect(await fs.pathExists(milestoneFile)).toBe(true);

      const content = await fs.readFile(milestoneFile, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.milestone).toBe('Jan2026');
      expect(data.title).toBe('Milestone Jan2026');
      expect(data.committed).toBe(0);
      expect(data.ticketCount).toBe(0);
    });

    it('should include optional fields when provided', async () => {
      const milestoneFile = await generateMilestoneFile({
        milestoneId: 'Jan2026',
        milestoneName: 'January 2026 (W51, W1, W3)',
        jiraMilestoneId: 'Jan2026',
        committed: 15,
        ticketCount: 25,
        backlogDir: tempDir,
      });

      const content = await fs.readFile(milestoneFile, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.milestone).toBe('Jan2026');
      expect(data.milestoneName).toBe('January 2026 (W51, W1, W3)');
      expect(data.jiraMilestoneId).toBe('Jan2026');
      expect(data.title).toBe('Milestone Jan2026');
      expect(data.committed).toBe(15);
      expect(data.ticketCount).toBe(25);
    });

    it('should preserve field order in frontmatter', async () => {
      const milestoneFile = await generateMilestoneFile({
        milestoneId: 'Jan2026',
        milestoneName: 'January 2026',
        jiraMilestoneId: 'Jan2026',
        committed: 15,
        ticketCount: 25,
        backlogDir: tempDir,
      });

      const content = await fs.readFile(milestoneFile, 'utf-8');

      // Extract YAML frontmatter
      const lines = content.split('\n');
      const yamlLines = lines.slice(1, lines.indexOf('---', 1));

      // Check field order: jiraMilestoneId, milestoneName, milestone, title, committed, ticketCount
      expect(yamlLines[0]).toContain('jiraMilestoneId');
      expect(yamlLines[1]).toContain('milestoneName');
      expect(yamlLines[2]).toContain('milestone');
      expect(yamlLines[3]).toContain('title');
      expect(yamlLines[4]).toContain('committed');
      expect(yamlLines[5]).toContain('ticketCount');
    });

    it('should generate correct markdown body', async () => {
      const milestoneFile = await generateMilestoneFile({
        milestoneId: 'Jan2026',
        milestoneName: 'January 2026',
        jiraMilestoneId: 'Jan2026',
        committed: 15,
        ticketCount: 25,
        backlogDir: tempDir,
      });

      const content = await fs.readFile(milestoneFile, 'utf-8');
      const { content: body } = parseFrontmatter(content);

      expect(body).toContain('## Milestone: January 2026');
      expect(body).toContain('**Milestone ID:** Jan2026');
      expect(body).toContain('**Jira Milestone ID:** Jan2026');
      expect(body).toContain('- Committed: 15');
      expect(body).toContain('- Tickets: 25');
      expect(body).toContain('### Tickets');
    });

    it('should handle missing optional fields in body', async () => {
      const milestoneFile = await generateMilestoneFile({
        milestoneId: 'Jan2026',
        backlogDir: tempDir,
      });

      const content = await fs.readFile(milestoneFile, 'utf-8');
      const { content: body } = parseFrontmatter(content);

      expect(body).toContain('## Milestone: Jan2026');
      expect(body).toContain('**Jira Milestone ID:** Jan2026');
    });

    it('should throw error if milestoneId is empty', async () => {
      await expect(
        generateMilestoneFile({
          milestoneId: '',
          backlogDir: tempDir,
        })
      ).rejects.toThrow('milestone_id is required');
    });

    it('should create milestones directory if it does not exist', async () => {
      const milestonesDir = path.join(tempDir, 'milestones');
      expect(await fs.pathExists(milestonesDir)).toBe(false);

      await generateMilestoneFile({
        milestoneId: 'Jan2026',
        backlogDir: tempDir,
      });

      expect(await fs.pathExists(milestonesDir)).toBe(true);
    });
  });

  describe('updateSprintFileMetadata', () => {
    it('should update sprint file metadata', async () => {
      // Create initial file
      const sprintFile = await generateSprintFile({
        sprintId: '2026-W1',
        sprintName: 'Initial Name',
        jiraSprintId: '16786',
        milestone: 'Jan2026',
        committed: 0,
        ticketCount: 0,
        backlogDir: tempDir,
      });

      // Update metadata
      await updateSprintFileMetadata(sprintFile, {
        sprintName: 'Updated Name',
        committed: 5,
        ticketCount: 10,
      });

      const content = await fs.readFile(sprintFile, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.sprintName).toBe('Updated Name');
      expect(data.committed).toBe(5);
      expect(data.ticketCount).toBe(10);
      // Unchanged fields
      expect(data.sprintId).toBe('2026-W1');
      expect(data.jiraSprintId).toBe('16786');
      expect(data.milestone).toBe('Jan2026');
    });

    it('should preserve existing content body', async () => {
      const sprintFile = await generateSprintFile({
        sprintId: '2026-W1',
        backlogDir: tempDir,
      });

      const originalContent = await fs.readFile(sprintFile, 'utf-8');
      const { content: originalBody } = parseFrontmatter(originalContent);

      await updateSprintFileMetadata(sprintFile, {
        committed: 5,
      });

      const updatedContent = await fs.readFile(sprintFile, 'utf-8');
      const { content: updatedBody } = parseFrontmatter(updatedContent);

      expect(updatedBody.trim()).toBe(originalBody.trim());
    });

    it('should throw error if file does not exist', async () => {
      const nonExistentFile = path.join(tempDir, 'sprints', 'nonexistent.md');

      await expect(
        updateSprintFileMetadata(nonExistentFile, { committed: 5 })
      ).rejects.toThrow('Sprint file not found');
    });

    it('should throw error if file has invalid format', async () => {
      const invalidFile = path.join(tempDir, 'sprints', 'invalid.md');
      await fs.ensureDir(path.join(tempDir, 'sprints'));
      await fs.writeFile(invalidFile, 'Invalid content without frontmatter', 'utf-8');

      await expect(
        updateSprintFileMetadata(invalidFile, { committed: 5 })
      ).rejects.toThrow('Invalid sprint file format');
    });

    it('should throw error if file has malformed frontmatter', async () => {
      const malformedFile = path.join(tempDir, 'sprints', 'malformed.md');
      await fs.ensureDir(path.join(tempDir, 'sprints'));
      await fs.writeFile(malformedFile, '---\nkey: value\n', 'utf-8'); // Missing closing ---

      await expect(
        updateSprintFileMetadata(malformedFile, { committed: 5 })
      ).rejects.toThrow('Malformed YAML frontmatter');
    });

    it('should only update specified fields', async () => {
      const sprintFile = await generateSprintFile({
        sprintId: '2026-W1',
        sprintName: 'Original',
        jiraSprintId: '16786',
        milestone: 'Jan2026',
        committed: 0,
        ticketCount: 0,
        backlogDir: tempDir,
      });

      await updateSprintFileMetadata(sprintFile, {
        committed: 5,
      });

      const content = await fs.readFile(sprintFile, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.committed).toBe(5);
      expect(data.sprintName).toBe('Original');
      expect(data.jiraSprintId).toBe('16786');
      expect(data.milestone).toBe('Jan2026');
      expect(data.ticketCount).toBe(0);
    });
  });

  describe('updateMilestoneFileMetadata', () => {
    it('should update milestone file metadata', async () => {
      // Create initial file
      const milestoneFile = await generateMilestoneFile({
        milestoneId: 'Jan2026',
        milestoneName: 'Initial Name',
        jiraMilestoneId: 'Jan2026',
        committed: 0,
        ticketCount: 0,
        backlogDir: tempDir,
      });

      // Update metadata
      await updateMilestoneFileMetadata(milestoneFile, {
        milestoneName: 'Updated Name',
        committed: 15,
        ticketCount: 25,
      });

      const content = await fs.readFile(milestoneFile, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.milestoneName).toBe('Updated Name');
      expect(data.committed).toBe(15);
      expect(data.ticketCount).toBe(25);
      // Unchanged fields
      expect(data.milestone).toBe('Jan2026');
      expect(data.jiraMilestoneId).toBe('Jan2026');
    });

    it('should preserve existing content body', async () => {
      const milestoneFile = await generateMilestoneFile({
        milestoneId: 'Jan2026',
        backlogDir: tempDir,
      });

      const originalContent = await fs.readFile(milestoneFile, 'utf-8');
      const { content: originalBody } = parseFrontmatter(originalContent);

      await updateMilestoneFileMetadata(milestoneFile, {
        committed: 15,
      });

      const updatedContent = await fs.readFile(milestoneFile, 'utf-8');
      const { content: updatedBody } = parseFrontmatter(updatedContent);

      expect(updatedBody.trim()).toBe(originalBody.trim());
    });

    it('should throw error if file does not exist', async () => {
      const nonExistentFile = path.join(tempDir, 'milestones', 'nonexistent.md');

      await expect(
        updateMilestoneFileMetadata(nonExistentFile, { committed: 15 })
      ).rejects.toThrow('Milestone file not found');
    });

    it('should throw error if file has invalid format', async () => {
      const invalidFile = path.join(tempDir, 'milestones', 'invalid.md');
      await fs.ensureDir(path.join(tempDir, 'milestones'));
      await fs.writeFile(invalidFile, 'Invalid content without frontmatter', 'utf-8');

      await expect(
        updateMilestoneFileMetadata(invalidFile, { committed: 15 })
      ).rejects.toThrow('Invalid milestone file format');
    });

    it('should throw error if file has malformed frontmatter', async () => {
      const malformedFile = path.join(tempDir, 'milestones', 'malformed.md');
      await fs.ensureDir(path.join(tempDir, 'milestones'));
      await fs.writeFile(malformedFile, '---\nkey: value\n', 'utf-8'); // Missing closing ---

      await expect(
        updateMilestoneFileMetadata(malformedFile, { committed: 15 })
      ).rejects.toThrow('Malformed YAML frontmatter');
    });

    it('should only update specified fields', async () => {
      const milestoneFile = await generateMilestoneFile({
        milestoneId: 'Jan2026',
        milestoneName: 'Original',
        jiraMilestoneId: 'Jan2026',
        committed: 0,
        ticketCount: 0,
        backlogDir: tempDir,
      });

      await updateMilestoneFileMetadata(milestoneFile, {
        committed: 15,
      });

      const content = await fs.readFile(milestoneFile, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.committed).toBe(15);
      expect(data.milestoneName).toBe('Original');
      expect(data.jiraMilestoneId).toBe('Jan2026');
      expect(data.ticketCount).toBe(0);
    });
  });
});
