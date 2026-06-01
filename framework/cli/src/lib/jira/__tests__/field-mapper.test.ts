/**
 * Tests for the Jira Field Mapper
 *
 * @module lib/jira/__tests__/field-mapper.test
 */

import {
  mapLocalToJira,
  mapJiraToLocal,
  mergeLabelsAndTags,
  FIELD_MAPPINGS,
} from '../field-mapper.js';

describe('Field Mapper', () => {
  describe('mapLocalToJira', () => {
    describe('basic field mapping', () => {
      it('should map title to summary', () => {
        const local = { title: 'Test Title' };
        const jira = mapLocalToJira(local);

        expect(jira.summary).toBe('Test Title');
      });

      it('should map jira-description to description', () => {
        const local = { 'jira-description': 'Test description' };
        const jira = mapLocalToJira(local);

        expect(jira.description).toBe('Test description');
      });

      it('should skip null values', () => {
        const local = { title: 'Test', priority: null };
        const jira = mapLocalToJira(local);

        expect(jira.summary).toBe('Test');
        expect(jira.priority).toBeUndefined();
      });

      it('should skip undefined values', () => {
        const local = { title: 'Test' };
        const jira = mapLocalToJira(local);

        expect(jira.summary).toBe('Test');
        expect(Object.keys(jira)).toHaveLength(1);
      });
    });

    describe('priority mapping', () => {
      it('should map P0 to Highest', () => {
        const local = { priority: 'P0' };
        const jira = mapLocalToJira(local);

        expect(jira.priority).toEqual({ name: 'Highest' });
      });

      it('should map P1 to High', () => {
        const local = { priority: 'P1' };
        const jira = mapLocalToJira(local);

        expect(jira.priority).toEqual({ name: 'High' });
      });

      it('should map P2 to Medium', () => {
        const local = { priority: 'P2' };
        const jira = mapLocalToJira(local);

        expect(jira.priority).toEqual({ name: 'Medium' });
      });

      it('should map P3 to Low', () => {
        const local = { priority: 'P3' };
        const jira = mapLocalToJira(local);

        expect(jira.priority).toEqual({ name: 'Low' });
      });

      it('should map P4 to Lowest', () => {
        const local = { priority: 'P4' };
        const jira = mapLocalToJira(local);

        expect(jira.priority).toEqual({ name: 'Lowest' });
      });

      it('should pass through named priorities', () => {
        const local = { priority: 'High' };
        const jira = mapLocalToJira(local);

        expect(jira.priority).toEqual({ name: 'High' });
      });

      it('should default unknown priority to Medium', () => {
        const local = { priority: 'Unknown' };
        const jira = mapLocalToJira(local);

        expect(jira.priority).toEqual({ name: 'Medium' });
      });
    });

    describe('document type mapping', () => {
      it('should map story to Story (CREATE mode)', () => {
        const local = { documentType: 'story' };
        const jira = mapLocalToJira(local, 'create');

        expect(jira.issuetype).toEqual({ name: 'Story' });
      });

      it('should map task to Task (CREATE mode)', () => {
        const local = { documentType: 'task' };
        const jira = mapLocalToJira(local, 'create');

        expect(jira.issuetype).toEqual({ name: 'Task' });
      });

      it('should map bug to Bug (CREATE mode)', () => {
        const local = { documentType: 'bug' };
        const jira = mapLocalToJira(local, 'create');

        expect(jira.issuetype).toEqual({ name: 'Bug' });
      });

      it('should map epic to Epic (CREATE mode)', () => {
        const local = { documentType: 'epic' };
        const jira = mapLocalToJira(local, 'create');

        expect(jira.issuetype).toEqual({ name: 'Epic' });
      });

      it('should map spike to Task (CREATE mode)', () => {
        const local = { documentType: 'spike' };
        const jira = mapLocalToJira(local, 'create');

        expect(jira.issuetype).toEqual({ name: 'Task' });
      });

      it('should skip documentType in UPDATE mode', () => {
        const local = { documentType: 'story', title: 'Test' };
        const jira = mapLocalToJira(local, 'update');

        expect(jira.issuetype).toBeUndefined();
        expect(jira.summary).toBe('Test');
      });
    });

    describe('labels mapping', () => {
      it('should map labels array', () => {
        const local = { 'labels': ['label1', 'label2'] };
        const jira = mapLocalToJira(local);

        expect(jira.labels).toEqual(['label1', 'label2']);
      });

      it('should handle single label string', () => {
        const local = { 'labels': 'single-label' };
        const jira = mapLocalToJira(local);

        expect(jira.labels).toEqual(['single-label']);
      });

      it('should trim whitespace from labels', () => {
        const local = { 'labels': ['  label1  ', '  label2  '] };
        const jira = mapLocalToJira(local);

        expect(jira.labels).toEqual(['label1', 'label2']);
      });
    });

    describe('component mapping', () => {
      it('should map jira-component to components array of objects', () => {
        const local = { 'jira-component': 'Backend' };
        const jira = mapLocalToJira(local);

        expect(jira.components).toEqual([{ name: 'Backend' }]);
      });

      it('should handle array of components', () => {
        const local = { 'jira-component': ['Backend', 'Frontend'] };
        const jira = mapLocalToJira(local);

        expect(jira.components).toEqual([{ name: 'Backend' }, { name: 'Frontend' }]);
      });
    });

    describe('project mapping', () => {
      it('should map jira-project in CREATE mode', () => {
        const local = { 'jira-project': 'PROJ' };
        const jira = mapLocalToJira(local, 'create');

        expect(jira.project).toEqual({ key: 'PROJ' });
      });

      it('should skip jira-project in UPDATE mode', () => {
        const local = { 'jira-project': 'PROJ', title: 'Test' };
        const jira = mapLocalToJira(local, 'update');

        expect(jira.project).toBeUndefined();
      });
    });
  });

  describe('mapJiraToLocal', () => {
    describe('basic field mapping', () => {
      it('should map key to jira-ticketId', () => {
        const jira = {
          key: 'PROJ-123',
          fields: {},
        };
        const local = mapJiraToLocal(jira);

        expect(local['jira-ticketId']).toBe('PROJ-123');
      });

      it('should map summary to title', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { summary: 'Test Summary' },
        };
        const local = mapJiraToLocal(jira);

        expect(local.title).toBe('Test Summary');
      });

      it('should map description to jira-description', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { description: 'Test description' },
        };
        const local = mapJiraToLocal(jira);

        expect(local['jira-description']).toBe('Test description');
      });
    });

    describe('priority mapping', () => {
      it('should map Highest to P0', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { priority: { name: 'Highest' } },
        };
        const local = mapJiraToLocal(jira);

        expect(local.priority).toBe('P0');
      });

      it('should map High to P1', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { priority: { name: 'High' } },
        };
        const local = mapJiraToLocal(jira);

        expect(local.priority).toBe('P1');
      });

      it('should map Medium to P2', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { priority: { name: 'Medium' } },
        };
        const local = mapJiraToLocal(jira);

        expect(local.priority).toBe('P2');
      });

      it('should map Low to P3', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { priority: { name: 'Low' } },
        };
        const local = mapJiraToLocal(jira);

        expect(local.priority).toBe('P3');
      });

      it('should map Lowest to P4', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { priority: { name: 'Lowest' } },
        };
        const local = mapJiraToLocal(jira);

        expect(local.priority).toBe('P4');
      });
    });

    describe('issue type mapping', () => {
      it('should map Story to story', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { issuetype: { name: 'Story' } },
        };
        const local = mapJiraToLocal(jira);

        expect(local.documentType).toBe('story');
      });

      it('should map Task to task', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { issuetype: { name: 'Task' } },
        };
        const local = mapJiraToLocal(jira);

        expect(local.documentType).toBe('task');
      });

      it('should map Bug to bug', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { issuetype: { name: 'Bug' } },
        };
        const local = mapJiraToLocal(jira);

        expect(local.documentType).toBe('bug');
      });

      it('should map Epic to epic', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { issuetype: { name: 'Epic' } },
        };
        const local = mapJiraToLocal(jira);

        expect(local.documentType).toBe('epic');
      });
    });

    describe('component mapping', () => {
      it('should extract component name from single component', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { components: [{ name: 'Backend' }] },
        };
        const local = mapJiraToLocal(jira);

        expect(local['jira-component']).toBe('Backend');
      });

      it('should extract component names from multiple components', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { components: [{ name: 'Backend' }, { name: 'Frontend' }] },
        };
        const local = mapJiraToLocal(jira);

        expect(local['jira-component']).toEqual(['Backend', 'Frontend']);
      });

      it('should return null for empty components', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { components: [] },
        };
        const local = mapJiraToLocal(jira);

        expect(local['jira-component']).toBeUndefined();
      });
    });

    describe('date mapping', () => {
      it('should extract date from ISO datetime', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { created: '2024-01-15T10:30:00.000Z' },
        };
        const local = mapJiraToLocal(jira);

        expect(local['jira-created']).toBe('2024-01-15');
      });

      it('should handle updated date', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { updated: '2024-02-20T15:45:00.000Z' },
        };
        const local = mapJiraToLocal(jira);

        expect(local['jira-updated']).toBe('2024-02-20');
      });
    });

    describe('labels mapping', () => {
      it('should map labels array', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { labels: ['label1', 'label2'] },
        };
        const local = mapJiraToLocal(jira);

        expect(local['labels']).toEqual(['label1', 'label2']);
      });

      it('should handle empty labels', () => {
        const jira = {
          key: 'PROJ-123',
          fields: { labels: [] },
        };
        const local = mapJiraToLocal(jira);

        expect(local['labels']).toEqual([]);
      });
    });

    describe('fixVersion mapping', () => {
      it('should map fixVersions to jira-fixVersion', () => {
        const jira = {
          key: 'DAPM-100',
          fields: {
            fixVersions: [
              { id: '10001', name: 'APM-R: App #3 Milestone 2026 (W15, W17, W19)' },
            ],
          },
        };
        const local = mapJiraToLocal(jira);
        expect(local['jira-fixVersion']).toBe('APM-R: App #3 Milestone 2026 (W15, W17, W19)');
      });

      it('should handle missing fixVersions gracefully', () => {
        const jira = { key: 'DAPM-100', fields: { fixVersions: [] } };
        const local = mapJiraToLocal(jira);
        expect(local['jira-fixVersion']).toBeUndefined();
      });
    });

    describe('sprint mapping', () => {
      it('should map sprint to jira-sprint', () => {
        const jira = {
          key: 'DAPM-100',
          fields: {
            sprint: { id: 101, name: 'APMR-APP-2026W17', state: 'active' },
          },
        };
        const local = mapJiraToLocal(jira);
        expect(local['jira-sprint']).toBe('APMR-APP-2026W17');
      });
    });
  });

  describe('mergeLabelsAndTags', () => {
    it('should merge labels and tags into single array', () => {
      const local = {
        labels: ['label1', 'label2'],
        tags: ['tag1', 'tag2'],
      };
      const merged = mergeLabelsAndTags(local);

      expect(merged).toEqual(expect.arrayContaining(['label1', 'label2', 'tag1', 'tag2']));
      expect(merged).toHaveLength(4);
    });

    it('should deduplicate labels and tags', () => {
      const local = {
        labels: ['common', 'label1'],
        tags: ['common', 'tag1'],
      };
      const merged = mergeLabelsAndTags(local);

      expect(merged).toEqual(expect.arrayContaining(['common', 'label1', 'tag1']));
      expect(merged).toHaveLength(3);
    });

    it('should handle labels only', () => {
      const local = { labels: ['label1', 'label2'] };
      const merged = mergeLabelsAndTags(local);

      expect(merged).toEqual(['label1', 'label2']);
    });

    it('should handle tags only', () => {
      const local = { tags: ['tag1', 'tag2'] };
      const merged = mergeLabelsAndTags(local);

      expect(merged).toEqual(['tag1', 'tag2']);
    });

    it('should handle single label string', () => {
      const local = { labels: 'single-label' };
      const merged = mergeLabelsAndTags(local);

      expect(merged).toEqual(['single-label']);
    });

    it('should handle single tag string', () => {
      const local = { tags: 'single-tag' };
      const merged = mergeLabelsAndTags(local);

      expect(merged).toEqual(['single-tag']);
    });

    it('should trim whitespace', () => {
      const local = {
        labels: ['  label1  '],
        tags: ['  tag1  '],
      };
      const merged = mergeLabelsAndTags(local);

      expect(merged).toEqual(expect.arrayContaining(['label1', 'tag1']));
    });

    it('should return empty array for no labels or tags', () => {
      const local = {};
      const merged = mergeLabelsAndTags(local);

      expect(merged).toEqual([]);
    });
  });

  describe('components roundtrip', () => {
    it('should roundtrip single component: local -> Jira -> local', () => {
      const original = { 'jira-component': 'Backend' };
      const jira = mapLocalToJira(original);
      expect(jira.components).toEqual([{ name: 'Backend' }]);

      const backToLocal = mapJiraToLocal({
        key: 'PROJ-1',
        fields: { components: jira.components },
      });
      expect(backToLocal['jira-component']).toBe('Backend');
    });

    it('should roundtrip multiple components: local -> Jira -> local', () => {
      const original = { 'jira-component': ['Backend', 'Frontend'] };
      const jira = mapLocalToJira(original);
      expect(jira.components).toEqual([{ name: 'Backend' }, { name: 'Frontend' }]);

      const backToLocal = mapJiraToLocal({
        key: 'PROJ-1',
        fields: { components: jira.components },
      });
      expect(backToLocal['jira-component']).toEqual(['Backend', 'Frontend']);
    });

    it('should include components in update mode (not immutable)', () => {
      const local = { 'jira-component': 'API', title: 'Test' };
      const jira = mapLocalToJira(local, 'update');
      expect(jira.components).toEqual([{ name: 'API' }]);
    });
  });

  describe('FIELD_MAPPINGS', () => {
    it('should have mappings defined', () => {
      expect(FIELD_MAPPINGS).toBeDefined();
      expect(Array.isArray(FIELD_MAPPINGS)).toBe(true);
      expect(FIELD_MAPPINGS.length).toBeGreaterThan(0);
    });

    it('should have title → summary mapping', () => {
      const titleMapping = FIELD_MAPPINGS.find((m) => m.local === 'title');
      expect(titleMapping).toBeDefined();
      expect(titleMapping?.jira).toBe('summary');
    });

    it('should have documentType → issuetype.name mapping', () => {
      const typeMapping = FIELD_MAPPINGS.find((m) => m.local === 'documentType');
      expect(typeMapping).toBeDefined();
      expect(typeMapping?.jira).toBe('issuetype.name');
      expect(typeMapping?.transform).toBeDefined();
      expect(typeMapping?.reverseTransform).toBeDefined();
    });

    it('should have priority mapping with transform', () => {
      const priorityMapping = FIELD_MAPPINGS.find((m) => m.local === 'priority');
      expect(priorityMapping).toBeDefined();
      expect(priorityMapping?.jira).toBe('priority.name');
      expect(priorityMapping?.transform).toBeDefined();
      expect(priorityMapping?.reverseTransform).toBeDefined();
    });
  });

  describe('field mode semantics', () => {
    // Shared full-data payload used across mode tests
    const fullLocalData = {
      title: 'Test story',
      'jira-description': 'Some description',
      'jira-ticketId': 'PROJ-99',
      documentType: 'story',
      'jira-project': 'PROJ',
      priority: 'P1',
      'labels': ['label1'],
      'jira-component': 'Backend',
      'jira-parent': 'PROJ-1',
      'jira-status': 'In Progress',
      'jira-assignee': 'dev@example.com',
      'jira-reporter': 'pm@example.com',
      'jira-created': '2024-01-01',
      'jira-updated': '2024-02-01',
      'jira-fixVersion': 'v1.0',
      'jira-sprint': 'Sprint 1',
    };

    describe('readonly fields excluded from CREATE', () => {
      it('should not include key in create payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'create');
        expect(jira.key).toBeUndefined();
      });

      it('should not include created in create payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'create');
        expect(jira.created).toBeUndefined();
      });

      it('should not include updated in create payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'create');
        expect(jira.updated).toBeUndefined();
      });

      it('should not include status in create payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'create');
        expect(jira.status).toBeUndefined();
      });
    });

    describe('readonly fields excluded from UPDATE', () => {
      it('should not include key in update payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'update');
        expect(jira.key).toBeUndefined();
      });

      it('should not include created in update payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'update');
        expect(jira.created).toBeUndefined();
      });

      it('should not include updated in update payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'update');
        expect(jira.updated).toBeUndefined();
      });

      it('should not include status in update payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'update');
        expect(jira.status).toBeUndefined();
      });
    });

    describe('createOnly fields included in CREATE', () => {
      it('should include issuetype in create payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'create');
        expect(jira.issuetype).toEqual({ name: 'Story' });
      });

      it('should include project in create payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'create');
        expect(jira.project).toEqual({ key: 'PROJ' });
      });

      it('should include reporter in create payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'create');
        expect((jira.reporter as Record<string, unknown>)?.emailAddress).toBe('pm@example.com');
      });
    });

    describe('createOnly fields excluded from UPDATE', () => {
      it('should not include issuetype in update payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'update');
        expect(jira.issuetype).toBeUndefined();
      });

      it('should not include project in update payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'update');
        expect(jira.project).toBeUndefined();
      });

      it('should not include reporter in update payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'update');
        expect(jira.reporter).toBeUndefined();
      });
    });

    describe('readwrite fields included in both modes', () => {
      it('should include summary in create payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'create');
        expect(jira.summary).toBe('Test story');
      });

      it('should include summary in update payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'update');
        expect(jira.summary).toBe('Test story');
      });

      it('should include priority in create payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'create');
        expect(jira.priority).toEqual({ name: 'High' });
      });

      it('should include priority in update payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'update');
        expect(jira.priority).toEqual({ name: 'High' });
      });

      it('should include labels in create payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'create');
        expect(jira.labels).toEqual(['label1']);
      });

      it('should include labels in update payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'update');
        expect(jira.labels).toEqual(['label1']);
      });

      it('should include assignee in create payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'create');
        expect((jira.assignee as Record<string, unknown>)?.emailAddress).toBe('dev@example.com');
      });

      it('should include assignee in update payload', () => {
        const jira = mapLocalToJira(fullLocalData, 'update');
        expect((jira.assignee as Record<string, unknown>)?.emailAddress).toBe('dev@example.com');
      });
    });

    describe('readonly fields still extracted during pull (mapJiraToLocal)', () => {
      const jiraIssue = {
        key: 'PROJ-99',
        fields: {
          summary: 'Test story',
          'status': { name: 'In Progress' },
          created: '2024-01-01T00:00:00.000Z',
          updated: '2024-02-01T00:00:00.000Z',
        },
      };

      it('should extract key as jira-ticketId', () => {
        const local = mapJiraToLocal(jiraIssue);
        expect(local['jira-ticketId']).toBe('PROJ-99');
      });

      it('should extract status as jira-status', () => {
        const local = mapJiraToLocal(jiraIssue);
        expect(local['jira-status']).toBe('In Progress');
      });

      it('should extract created as jira-created', () => {
        const local = mapJiraToLocal(jiraIssue);
        expect(local['jira-created']).toBe('2024-01-01');
      });

      it('should extract updated as jira-updated', () => {
        const local = mapJiraToLocal(jiraIssue);
        expect(local['jira-updated']).toBe('2024-02-01');
      });
    });
  });
});
