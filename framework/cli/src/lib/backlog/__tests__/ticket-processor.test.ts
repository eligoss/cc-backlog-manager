import {
  processTicket,
  generateTicketFrontmatter,
  generateTicketBody,
  getTicketFilePath,
  sanitizeFilename,
  convertJiraToMarkdown,
  extractAcceptanceCriteria,
  parseJiraDate,
  CsvTicket,
  ProcessingOptions,
} from '../ticket-processor';
import fs from 'fs-extra';
import path from 'path';
import { parseFrontmatter } from '../../common/yaml-frontmatter';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils';

describe('TicketProcessor', () => {
  let sandbox: TestSandbox;
  let tempDir: string;

  beforeEach(async () => {
    sandbox = await createSandbox('ticket-processor');
    tempDir = sandbox.path;
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('sanitizeFilename', () => {
    it('should convert summary to kebab-case', () => {
      expect(sanitizeFilename('Fix Shimmer Loading')).toBe('fix-shimmer-loading');
    });

    it('should remove ticket ID prefix', () => {
      expect(sanitizeFilename('DAPM-1315: Fix Shimmer Loading')).toBe('fix-shimmer-loading');
    });

    it('should remove project prefix patterns', () => {
      expect(sanitizeFilename('APM-R: FE: Component: Fix Bug')).toBe('fix-bug');
      expect(sanitizeFilename('APM-R: BE: Service: Add Feature')).toBe('add-feature');
    });

    it('should handle special characters', () => {
      expect(sanitizeFilename('Fix: Issue #123 (urgent!)')).toBe('issue-123-urgent');
    });

    it('should limit length to 60 characters', () => {
      const longText = 'This is a very long summary that should be truncated at sixty characters approximately';
      const result = sanitizeFilename(longText);
      expect(result.length).toBeLessThanOrEqual(60);
      expect(result.endsWith('-')).toBe(false); // Should not end with hyphen after truncation
    });

    it('should remove leading and trailing hyphens', () => {
      expect(sanitizeFilename('---Fix Issue---')).toBe('fix-issue');
    });
  });

  describe('convertJiraToMarkdown', () => {
    it('should convert Jira headers to markdown', () => {
      expect(convertJiraToMarkdown('h1. Header 1')).toBe('# Header 1');
      expect(convertJiraToMarkdown('h2. Header 2')).toBe('## Header 2');
      expect(convertJiraToMarkdown('h3. Header 3')).toBe('### Header 3');
    });

    it('should convert Jira bold to markdown', () => {
      expect(convertJiraToMarkdown('This is *bold* text')).toBe('This is **bold** text');
    });

    it('should convert Jira code blocks', () => {
      expect(convertJiraToMarkdown('{noformat}code{noformat}')).toBe('```code```');
      expect(convertJiraToMarkdown('{code:javascript}code{code}')).toBe('```code```');
    });

    it('should convert Jira inline code', () => {
      expect(convertJiraToMarkdown('Use {{variable}} here')).toBe('Use `variable` here');
    });

    it('should convert Jira bullet lists', () => {
      expect(convertJiraToMarkdown('* Item 1\n* Item 2')).toBe('- Item 1\n- Item 2');
      expect(convertJiraToMarkdown('# Item 1\n# Item 2')).toBe('1. Item 1\n1. Item 2');
    });

    it('should convert Jira links', () => {
      expect(convertJiraToMarkdown('[text|https://example.com]')).toBe('[text](https://example.com)');
    });

    it('should handle empty or null text', () => {
      expect(convertJiraToMarkdown('')).toBe('');
      expect(convertJiraToMarkdown(null as any)).toBe('');
    });
  });

  describe('extractAcceptanceCriteria', () => {
    it('should extract bullet points from acceptance criteria', () => {
      const ac = '- Verify feature works\n- Verify no errors\n- Verify UI is correct';
      const result = extractAcceptanceCriteria(ac);
      expect(result).toEqual([
        'feature works',
        'no errors',
        'UI is correct',
      ]);
    });

    it('should remove "Verify" prefix', () => {
      const ac = '- Verify something\n- *Verify* another thing';
      const result = extractAcceptanceCriteria(ac);
      expect(result).toEqual([
        'something',
        'another thing',
      ]);
    });

    it('should handle Jira wiki markup', () => {
      const ac = '* Verify feature 1\n* Verify feature 2';
      const result = extractAcceptanceCriteria(ac);
      expect(result).toEqual([
        'feature 1',
        'feature 2',
      ]);
    });

    it('should handle empty criteria', () => {
      expect(extractAcceptanceCriteria('')).toEqual([]);
      expect(extractAcceptanceCriteria(null as any)).toEqual([]);
    });
  });

  describe('parseJiraDate', () => {
    it('should parse Jira date format', () => {
      expect(parseJiraDate('18/Nov/25 12:59 PM')).toBe('2025-11-18');
      expect(parseJiraDate('01/Jan/26 09:00 AM')).toBe('2026-01-01');
    });

    it('should parse ISO date format', () => {
      expect(parseJiraDate('2025-11-18')).toBe('2025-11-18');
    });

    it('should handle empty or invalid dates', () => {
      expect(parseJiraDate('')).toBeNull();
      expect(parseJiraDate('invalid')).toBeNull();
    });
  });

  describe('generateTicketFrontmatter', () => {
    const baseTicket: CsvTicket = {
      ticketId: 'DAPM-1315',
      summary: 'Fix shimmer loading',
      issueType: 'Story',
      status: 'Done',
      priority: 'High',
      description: 'Fix the shimmer loading issue',
      assignee: 'John Doe',
      storyPoints: 5,
      parentKey: 'DAPM-1000',
      parentSummary: 'Parent Epic',
      sprint: 'APM-APP-2025W50',
      fixVersions: 'APM-R: App: November 2025',
      labels: 'apm-r,frontend',
      acceptanceCriteria: '- Verify shimmer works',
      created: '18/Nov/25 12:59 PM',
      updated: '19/Nov/25 01:30 PM',
    };

    it('should include all required fields', () => {
      const result = generateTicketFrontmatter(baseTicket);

      expect(result.documentType).toBe('story');
      expect(result.version).toBe('1.0');
      expect(result.title).toBe('Fix shimmer loading');
      expect(result.description).toBe('Fix shimmer loading');
      expect(result.component).toBe('APM:  Reliability App');
      expect(result.priority).toBe('P1'); // High -> P1
      expect(result.storyPoints).toBe(5);
      expect(result.labels).toEqual(['apm-r', 'frontend']);
      expect(result.createdDate).toBe('2025-11-18');
      expect(result.exportedDate).toBe('2025-11-19');
    });

    it('should include Jira fields with jira- prefix', () => {
      const result = generateTicketFrontmatter(baseTicket);

      expect(result['jira-ticketId']).toBe('DAPM-1315');
      expect(result['jira-url']).toBe('https://wencosupport.atlassian.net/browse/DAPM-1315');
      expect(result['jira-parent']).toBe('DAPM-1000');
      expect(result['jira-related']).toEqual([]);
      expect(result['jira-blocking']).toEqual([]);
      expect(result['jira-blockedBy']).toEqual([]);
      // jira-fixVersion and jira-internalNotes are optional, not included by default
    });

    it('should include framework fields with framework- prefix', () => {
      const result = generateTicketFrontmatter(baseTicket);

      expect(result['framework-documentation']).toBeNull();
      expect(result['framework-milestone']).toBeNull();
      expect(result['framework-technicalGuides']).toEqual([]);
      expect(result['framework-relatedLocal']).toEqual([]);
    });

    it('should map priority correctly', () => {
      expect(generateTicketFrontmatter({ ...baseTicket, priority: 'Critical' }).priority).toBe('P0');
      expect(generateTicketFrontmatter({ ...baseTicket, priority: 'High' }).priority).toBe('P1');
      expect(generateTicketFrontmatter({ ...baseTicket, priority: 'Medium' }).priority).toBe('P2');
      expect(generateTicketFrontmatter({ ...baseTicket, priority: 'Low' }).priority).toBe('P2');
    });

    it('should handle missing story points', () => {
      const result = generateTicketFrontmatter({ ...baseTicket, storyPoints: undefined });
      expect(result.storyPoints).toBeUndefined();
    });

    it('should default to today for missing dates', () => {
      const today = new Date().toISOString().split('T')[0];
      const result = generateTicketFrontmatter({ ...baseTicket, created: '', updated: '' });
      expect(result.createdDate).toBe(today);
      expect(result.exportedDate).toBe(today);
    });

    it('should default labels to apm-r when empty', () => {
      const result = generateTicketFrontmatter({ ...baseTicket, labels: '' });
      expect(result.labels).toEqual(['apm-r']);
    });

    it('should truncate description to 150 characters', () => {
      const longSummary = 'a'.repeat(200);
      const result = generateTicketFrontmatter({ ...baseTicket, summary: longSummary });
      expect(result.description.length).toBe(150);
    });
  });

  describe('generateTicketBody', () => {
    const baseTicket: CsvTicket = {
      ticketId: 'DAPM-1315',
      summary: 'Fix shimmer loading',
      issueType: 'Story',
      status: 'Done',
      priority: 'High',
      description: 'Fix the shimmer loading issue',
      assignee: 'John Doe',
      storyPoints: 5,
      parentKey: 'DAPM-1000',
      parentSummary: 'Parent Epic',
      sprint: 'APM-APP-2025W50',
      fixVersions: 'APM-R: App: November 2025',
      labels: 'apm-r',
      acceptanceCriteria: '- Verify shimmer works\n- Verify no errors',
      created: '18/Nov/25 12:59 PM',
      updated: '19/Nov/25 01:30 PM',
    };

    it('should include user story for stories', () => {
      const result = generateTicketBody(baseTicket, 'story');
      expect(result).toContain('**AS** a user,');
      expect(result).toContain('**I WANT**');
      expect(result).toContain('**SO THAT**');
    });

    it('should include user story for tasks', () => {
      const result = generateTicketBody({ ...baseTicket, issueType: 'Task' }, 'task');
      expect(result).toContain('**AS** a user,');
    });

    it('should not include user story for bugs', () => {
      const result = generateTicketBody({ ...baseTicket, issueType: 'Bug' }, 'bug');
      expect(result).not.toContain('**AS** a user,');
    });

    it('should include description section', () => {
      const result = generateTicketBody(baseTicket, 'story');
      expect(result).toContain('## Description');
      expect(result).toContain('Fix the shimmer loading issue');
    });

    it('should convert Jira markup in description', () => {
      const ticket = { ...baseTicket, description: 'h3. Context\nThis is *bold*' };
      const result = generateTicketBody(ticket, 'story');
      expect(result).toContain('**Context:**');
      expect(result).toContain('This is **bold**');
    });

    it('should include acceptance criteria section', () => {
      const result = generateTicketBody(baseTicket, 'story');
      expect(result).toContain('## Acceptance Criteria');
      expect(result).toContain('- **Verify** shimmer works');
      expect(result).toContain('- **Verify** no errors');
    });

    it('should include default acceptance criteria when empty', () => {
      const result = generateTicketBody({ ...baseTicket, acceptanceCriteria: '' }, 'story');
      expect(result).toContain('- **Verify** implementation meets requirements');
    });

    it('should include section dividers', () => {
      const result = generateTicketBody(baseTicket, 'story');
      const dividers = result.match(/^---$/gm);
      expect(dividers).toHaveLength(2); // Before and after Description
    });
  });

  describe('getTicketFilePath', () => {
    const baseTicket: CsvTicket = {
      ticketId: 'DAPM-1315',
      summary: 'Fix shimmer loading',
      issueType: 'Story',
      status: 'Done',
      priority: 'High',
      description: '',
      assignee: '',
      storyPoints: 5,
      parentKey: '',
      parentSummary: '',
      sprint: '',
      fixVersions: '',
      labels: '',
      acceptanceCriteria: '',
      created: '',
      updated: '',
    };

    it('should place stories in stories directory', () => {
      const options: ProcessingOptions = {
        basePath: tempDir,
        importType: 'sprint',
      };
      const result = getTicketFilePath(baseTicket, options, 'story');
      expect(result).toBe(path.join(tempDir, 'tickets', 'stories', '1315-fix-shimmer-loading.md'));
    });

    it('should place tasks in tasks directory', () => {
      const options: ProcessingOptions = {
        basePath: tempDir,
        importType: 'sprint',
      };
      const result = getTicketFilePath({ ...baseTicket, issueType: 'Task' }, options, 'task');
      expect(result).toBe(path.join(tempDir, 'tickets', 'tasks', '1315-fix-shimmer-loading.md'));
    });

    it('should place bugs in bugs directory', () => {
      const options: ProcessingOptions = {
        basePath: tempDir,
        importType: 'sprint',
      };
      const result = getTicketFilePath({ ...baseTicket, issueType: 'Bug' }, options, 'bug');
      expect(result).toBe(path.join(tempDir, 'tickets', 'bugs', '1315-fix-shimmer-loading.md'));
    });

    it('should place epics in epics directory (not tickets)', () => {
      const options: ProcessingOptions = {
        basePath: tempDir,
        importType: 'sprint',
      };
      const result = getTicketFilePath({ ...baseTicket, issueType: 'Epic' }, options, 'epic');
      expect(result).toBe(path.join(tempDir, 'epics', '1315-fix-shimmer-loading.md'));
    });

    it('should extract ticket number from issue key', () => {
      const options: ProcessingOptions = {
        basePath: tempDir,
        importType: 'sprint',
      };
      const result = getTicketFilePath(baseTicket, options, 'story');
      expect(result).toContain('1315-');
    });

    it('should sanitize filename from summary', () => {
      const ticket = { ...baseTicket, summary: 'APM-R: FE: Component: Fix Bug!' };
      const options: ProcessingOptions = {
        basePath: tempDir,
        importType: 'sprint',
      };
      const result = getTicketFilePath(ticket, options, 'story');
      expect(result).toContain('1315-fix-bug.md');
    });
  });

  describe('processTicket', () => {
    const baseTicket: CsvTicket = {
      ticketId: 'DAPM-1315',
      summary: 'Fix shimmer loading',
      issueType: 'Story',
      status: 'Done',
      priority: 'High',
      description: 'Fix the shimmer loading issue',
      assignee: 'John Doe',
      storyPoints: 5,
      parentKey: 'DAPM-1000',
      parentSummary: 'Parent Epic',
      sprint: 'APM-APP-2025W50',
      fixVersions: 'APM-R: App: November 2025',
      labels: 'apm-r',
      acceptanceCriteria: '- Verify shimmer works',
      created: '18/Nov/25 12:59 PM',
      updated: '19/Nov/25 01:30 PM',
    };

    it('should create new ticket file', async () => {
      const options: ProcessingOptions = {
        basePath: tempDir,
        importType: 'sprint',
        dryRun: false,
      };

      const result = await processTicket(baseTicket, options);

      expect(result.created).toBe(true);
      expect(result.updated).toBe(false);
      expect(result.filePath).toContain('1315-fix-shimmer-loading.md');
      expect(await fs.pathExists(result.filePath)).toBe(true);

      const content = await fs.readFile(result.filePath, 'utf-8');
      expect(content).toContain('---');
      expect(content).toContain('documentType: story');
      expect(content).toContain('# Fix shimmer loading');
    });

    it('should validate frontmatter structure', async () => {
      const options: ProcessingOptions = {
        basePath: tempDir,
        importType: 'sprint',
        dryRun: false,
      };

      const result = await processTicket(baseTicket, options);
      const content = await fs.readFile(result.filePath, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data.documentType).toBe('story');
      expect(data.title).toBe('Fix shimmer loading');
      expect(data['jira-ticketId']).toBe('DAPM-1315');
    });

    it('should update existing ticket file', async () => {
      const options: ProcessingOptions = {
        basePath: tempDir,
        importType: 'sprint',
        dryRun: false,
      };

      // Create initial file
      const result1 = await processTicket(baseTicket, options);
      expect(result1.created).toBe(true);

      // Update with modified data
      const updatedTicket = { ...baseTicket, description: 'Updated description' };
      const result2 = await processTicket(updatedTicket, options);

      expect(result2.created).toBe(false);
      expect(result2.updated).toBe(true);
      expect(result2.filePath).toBe(result1.filePath);

      const content = await fs.readFile(result2.filePath, 'utf-8');
      expect(content).toContain('Updated description');
    });

    it('should handle dry run mode', async () => {
      const options: ProcessingOptions = {
        basePath: tempDir,
        importType: 'sprint',
        dryRun: true,
      };

      const result = await processTicket(baseTicket, options);

      expect(result.created).toBe(false);
      expect(result.updated).toBe(false);
      expect(await fs.pathExists(result.filePath)).toBe(false);
      expect(result.content).toBeTruthy();
    });

    it('should handle different issue types', async () => {
      const options: ProcessingOptions = {
        basePath: tempDir,
        importType: 'sprint',
        dryRun: false,
      };

      const taskTicket = { ...baseTicket, ticketId: 'DAPM-1001', issueType: 'Task' };
      const bugTicket = { ...baseTicket, ticketId: 'DAPM-1002', issueType: 'Bug' };
      const epicTicket = { ...baseTicket, ticketId: 'DAPM-1003', issueType: 'Epic' };

      const result1 = await processTicket(taskTicket, options);
      const result2 = await processTicket(bugTicket, options);
      const result3 = await processTicket(epicTicket, options);

      expect(result1.filePath).toContain('tickets/tasks');
      expect(result2.filePath).toContain('tickets/bugs');
      expect(result3.filePath).toContain('epics');
    });

    it('should include milestone in frontmatter when provided', async () => {
      const options: ProcessingOptions = {
        basePath: tempDir,
        importType: 'milestone',
        milestoneId: 'Nov2025',
        dryRun: false,
      };

      const result = await processTicket(baseTicket, options);
      const content = await fs.readFile(result.filePath, 'utf-8');
      const { data } = parseFrontmatter(content);

      expect(data['framework-milestone']).toBe('Nov2025');
    });

    it('should handle spikes as tasks', async () => {
      const options: ProcessingOptions = {
        basePath: tempDir,
        importType: 'sprint',
        dryRun: false,
      };

      const spikeTicket = { ...baseTicket, ticketId: 'DAPM-1004', issueType: 'Spike' };
      const result = await processTicket(spikeTicket, options);

      expect(result.filePath).toContain('tickets/spikes');
      const content = await fs.readFile(result.filePath, 'utf-8');
      const { data } = parseFrontmatter(content);
      expect(data.documentType).toBe('spike');
    });

    it('should handle sub-tasks as tasks', async () => {
      const options: ProcessingOptions = {
        basePath: tempDir,
        importType: 'sprint',
        dryRun: false,
      };

      const subtaskTicket = { ...baseTicket, ticketId: 'DAPM-1005', issueType: 'Sub-task' };
      const result = await processTicket(subtaskTicket, options);

      expect(result.filePath).toContain('tickets/tasks');
      const content = await fs.readFile(result.filePath, 'utf-8');
      const { data } = parseFrontmatter(content);
      expect(data.documentType).toBe('task');
    });
  });
});
