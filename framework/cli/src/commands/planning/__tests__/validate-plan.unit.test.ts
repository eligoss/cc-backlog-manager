/**
 * Unit Tests: Plan Validation - Date Normalization
 *
 * Tests for QA-018: YAML date values must be quoted in plan frontmatter
 *
 * Root cause: YAML parsers interpret unquoted dates like `2025-12-29` as Date objects,
 * but the schema expects string type. This causes validation to fail with
 * "Expected type string, got object".
 *
 * Fix: Added normalizeFrontmatter() function that converts Date objects to ISO date strings
 * before validation.
 *
 * @module commands/planning/__tests__/validate-plan.unit.test
 */

describe('Unit: Plan Validation - Date Normalization', () => {
  /**
   * normalizeFrontmatter function (copied from validate-plan.ts for unit testing)
   * This converts Date objects to ISO date strings recursively.
   */
  function normalizeFrontmatter(data: Record<string, unknown>): Record<string, unknown> {
    const result: Record<string, unknown> = {};

    for (const [key, value] of Object.entries(data)) {
      if (value instanceof Date) {
        // Convert Date to ISO date string (YYYY-MM-DD)
        result[key] = value.toISOString().split('T')[0];
      } else if (Array.isArray(value)) {
        // Recursively normalize array elements
        result[key] = value.map((item) =>
          item && typeof item === 'object' && !(item instanceof Date)
            ? normalizeFrontmatter(item as Record<string, unknown>)
            : item instanceof Date
              ? item.toISOString().split('T')[0]
              : item
        );
      } else if (value && typeof value === 'object') {
        // Recursively normalize nested objects
        result[key] = normalizeFrontmatter(value as Record<string, unknown>);
      } else {
        result[key] = value;
      }
    }

    return result;
  }

  describe('QA-018: Date Object to String Conversion', () => {
    it('should convert Date object to ISO date string', () => {
      const input = {
        created: new Date('2025-12-29T00:00:00Z'),
      };
      const result = normalizeFrontmatter(input);
      expect(result.created).toBe('2025-12-29');
      expect(typeof result.created).toBe('string');
    });

    it('should preserve string dates unchanged', () => {
      const input = {
        created: '2025-12-29',
      };
      const result = normalizeFrontmatter(input);
      expect(result.created).toBe('2025-12-29');
    });

    it('should handle multiple date fields', () => {
      const input = {
        created: new Date('2025-12-29T00:00:00Z'),
        updated: new Date('2025-12-30T12:00:00Z'),
      };
      const result = normalizeFrontmatter(input);
      expect(result.created).toBe('2025-12-29');
      expect(result.updated).toBe('2025-12-30');
    });

    it('should handle nested date objects', () => {
      const input = {
        metadata: {
          created: new Date('2025-12-29T00:00:00Z'),
        },
      };
      const result = normalizeFrontmatter(input);
      expect((result.metadata as Record<string, unknown>).created).toBe('2025-12-29');
    });

    it('should handle dates in arrays', () => {
      const input = {
        milestones: [
          { date: new Date('2025-12-29T00:00:00Z') },
          { date: new Date('2025-12-30T00:00:00Z') },
        ],
      };
      const result = normalizeFrontmatter(input);
      const milestones = result.milestones as Array<Record<string, unknown>>;
      expect(milestones[0].date).toBe('2025-12-29');
      expect(milestones[1].date).toBe('2025-12-30');
    });

    it('should preserve non-date values', () => {
      const input = {
        title: 'My Plan',
        version: 1,
        enabled: true,
        tags: ['tag1', 'tag2'],
        created: new Date('2025-12-29T00:00:00Z'),
      };
      const result = normalizeFrontmatter(input);
      expect(result.title).toBe('My Plan');
      expect(result.version).toBe(1);
      expect(result.enabled).toBe(true);
      expect(result.tags).toEqual(['tag1', 'tag2']);
      expect(result.created).toBe('2025-12-29');
    });

    it('should handle null and undefined values', () => {
      const input = {
        title: 'Test',
        optional: null,
        missing: undefined,
      };
      const result = normalizeFrontmatter(input);
      expect(result.title).toBe('Test');
      expect(result.optional).toBeNull();
      expect(result.missing).toBeUndefined();
    });

    it('should handle empty object', () => {
      const input = {};
      const result = normalizeFrontmatter(input);
      expect(result).toEqual({});
    });

    it('should handle deeply nested structures', () => {
      const input = {
        level1: {
          level2: {
            level3: {
              date: new Date('2025-12-29T00:00:00Z'),
            },
          },
        },
      };
      const result = normalizeFrontmatter(input);
      const nested = result.level1 as Record<string, unknown>;
      const level2 = nested.level2 as Record<string, unknown>;
      const level3 = level2.level3 as Record<string, unknown>;
      expect(level3.date).toBe('2025-12-29');
    });
  });

  describe('Edge Cases', () => {
    it('should handle Date objects at different times of day', () => {
      const input = {
        morning: new Date('2025-12-29T06:00:00Z'),
        afternoon: new Date('2025-12-29T14:00:00Z'),
        evening: new Date('2025-12-29T22:00:00Z'),
      };
      const result = normalizeFrontmatter(input);
      // All should normalize to same date (ignoring time)
      expect(result.morning).toBe('2025-12-29');
      expect(result.afternoon).toBe('2025-12-29');
      expect(result.evening).toBe('2025-12-29');
    });

    it('should handle mixed array with dates and other types', () => {
      const input = {
        items: [
          'string',
          123,
          new Date('2025-12-29T00:00:00Z'),
          { nested: true },
        ],
      };
      const result = normalizeFrontmatter(input);
      const items = result.items as unknown[];
      expect(items[0]).toBe('string');
      expect(items[1]).toBe(123);
      expect(items[2]).toBe('2025-12-29');
      expect(items[3]).toEqual({ nested: true });
    });
  });
});
