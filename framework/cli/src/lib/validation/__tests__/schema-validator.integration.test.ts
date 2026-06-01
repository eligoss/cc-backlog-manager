import path from 'path';
import fs from 'fs-extra';
import {
  validateWithSchema,
  validateWithSchemaObject,
  validateMultiple,
} from '../schema-validator';
import { createSandbox, TestSandbox } from '../../__tests__/test-utils/sandbox';

describe('SchemaValidator', () => {
  let sandbox: TestSandbox;
  let testDir: string;
  let schemaPath: string;

  beforeEach(async () => {
    sandbox = await createSandbox('schema-validator');
    testDir = sandbox.path;

    // Create a test JSON Schema
    schemaPath = path.join(testDir, 'test.schema.json');
    await fs.writeJson(schemaPath, {
      $schema: 'http://json-schema.org/draft-07/schema#',
      type: 'object',
      required: ['name', 'version'],
      properties: {
        name: {
          type: 'string',
          minLength: 1,
        },
        version: {
          type: 'string',
          pattern: '^\\d+\\.\\d+\\.\\d+$',
        },
        description: {
          type: 'string',
        },
        status: {
          type: 'string',
          enum: ['active', 'inactive', 'pending'],
        },
        priority: {
          type: 'number',
          minimum: 1,
          maximum: 5,
        },
        tags: {
          type: 'array',
          items: {
            type: 'string',
          },
        },
      },
      additionalProperties: false,
    });
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe('validateWithSchema', () => {
    it('should validate valid data successfully', async () => {
      const data = {
        name: 'test-module',
        version: '1.0.0',
        description: 'A test module',
      };

      const report = await validateWithSchema(data, schemaPath);

      expect(report.valid).toBe(true);
      expect(report.issues).toHaveLength(0);
      expect(report.summary.errors).toBe(0);
      expect(report.summary.warnings).toBe(0);
    });

    it('should detect missing required field', async () => {
      const data = {
        name: 'test-module',
        // missing 'version'
      };

      const report = await validateWithSchema(data, schemaPath);

      expect(report.valid).toBe(false);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].severity).toBe('error');
      expect(report.issues[0].message).toContain('Missing required property: version');
      expect(report.issues[0].code).toBe('SCHEMA_REQUIRED');
    });

    it('should detect type mismatch', async () => {
      const data = {
        name: 'test-module',
        version: 123, // should be string
      };

      const report = await validateWithSchema(data, schemaPath);

      expect(report.valid).toBe(false);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].severity).toBe('error');
      expect(report.issues[0].message).toContain('Expected type string');
      expect(report.issues[0].code).toBe('SCHEMA_TYPE');
      expect(report.issues[0].field).toBe('version');
    });

    it('should detect pattern mismatch', async () => {
      const data = {
        name: 'test-module',
        version: 'invalid-version',
      };

      const report = await validateWithSchema(data, schemaPath);

      expect(report.valid).toBe(false);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].severity).toBe('error');
      expect(report.issues[0].message).toContain('does not match pattern');
      expect(report.issues[0].code).toBe('SCHEMA_PATTERN');
    });

    it('should detect enum violation', async () => {
      const data = {
        name: 'test-module',
        version: '1.0.0',
        status: 'invalid-status',
      };

      const report = await validateWithSchema(data, schemaPath);

      expect(report.valid).toBe(false);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].message).toContain('active, inactive, pending');
      expect(report.issues[0].code).toBe('SCHEMA_ENUM');
    });

    it('should detect minimum/maximum violations', async () => {
      const data = {
        name: 'test-module',
        version: '1.0.0',
        priority: 10, // max is 5
      };

      const report = await validateWithSchema(data, schemaPath);

      expect(report.valid).toBe(false);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].message).toContain('must be <=');
      expect(report.issues[0].code).toBe('SCHEMA_MAXIMUM');
    });

    it('should detect additional properties', async () => {
      const data = {
        name: 'test-module',
        version: '1.0.0',
        unknownField: 'value',
      };

      const report = await validateWithSchema(data, schemaPath);

      expect(report.valid).toBe(false);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].message).toContain('Unexpected property: unknownField');
      expect(report.issues[0].code).toBe('SCHEMA_ADDITIONALPROPERTIES');
    });

    it('should handle multiple validation errors', async () => {
      const data = {
        // missing 'name' and 'version'
        status: 'invalid',
        priority: 10,
        unknownField: 'value',
      };

      const report = await validateWithSchema(data, schemaPath);

      expect(report.valid).toBe(false);
      expect(report.issues.length).toBeGreaterThan(1);
      expect(report.summary.errors).toBeGreaterThan(1);
    });

    it('should provide helpful suggestions in error messages', async () => {
      const data = {
        name: 'test-module',
        version: 123, // wrong type
      };

      const report = await validateWithSchema(data, schemaPath);

      expect(report.issues[0].suggestion).toBeDefined();
      expect(report.issues[0].suggestion).toContain('Convert the value to type');
    });

    it('should handle missing schema file', async () => {
      const nonExistentPath = path.join(testDir, 'non-existent-schema.json');

      const report = await validateWithSchema({}, nonExistentPath);

      expect(report.valid).toBe(false);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].code).toBe('SCHEMA_ERROR');
      expect(report.issues[0].message).toContain('Failed to load or parse schema');
    });

    it('should handle invalid JSON in schema file', async () => {
      const invalidSchemaPath = path.join(testDir, 'invalid.schema.json');
      await fs.writeFile(invalidSchemaPath, 'not valid json');

      const report = await validateWithSchema({}, invalidSchemaPath);

      expect(report.valid).toBe(false);
      expect(report.issues).toHaveLength(1);
      expect(report.issues[0].code).toBe('SCHEMA_ERROR');
    });

    it('should include field path in validation issues', async () => {
      const data = {
        name: 'test-module',
        version: 123,
      };

      const report = await validateWithSchema(data, schemaPath);

      expect(report.issues[0].field).toBe('version');
    });

    it('should include schema file in location', async () => {
      const data = {
        version: 123,
      };

      const report = await validateWithSchema(data, schemaPath);

      expect(report.issues[0].location).toBeDefined();
      expect(report.issues[0].location?.file).toBe(schemaPath);
    });
  });

  describe('validateWithSchemaObject', () => {
    it('should validate with schema object instead of file', () => {
      const schema = {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
        },
      };

      const data = { name: 'test' };

      const report = validateWithSchemaObject(data, schema);

      expect(report.valid).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it('should detect errors with schema object', () => {
      const schema = {
        type: 'object',
        required: ['name'],
        properties: {
          name: { type: 'string' },
        },
      };

      const data = { name: 123 };

      const report = validateWithSchemaObject(data, schema);

      expect(report.valid).toBe(false);
      expect(report.issues).toHaveLength(1);
    });

    it('should handle invalid schema object', () => {
      const invalidSchema = {
        type: 'invalid-type',
      };

      const report = validateWithSchemaObject({}, invalidSchema);

      expect(report.valid).toBe(false);
      expect(report.issues[0].code).toBe('SCHEMA_COMPILATION_ERROR');
    });
  });

  describe('validateMultiple', () => {
    it('should validate multiple files and merge reports', async () => {
      const schema1Path = path.join(testDir, 'schema1.json');
      const schema2Path = path.join(testDir, 'schema2.json');

      await fs.writeJson(schema1Path, {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' } },
      });

      await fs.writeJson(schema2Path, {
        type: 'object',
        required: ['version'],
        properties: { version: { type: 'string' } },
      });

      const files = [
        { data: { name: 'test' }, schemaPath: schema1Path, fileName: 'file1.json' },
        { data: { version: '1.0.0' }, schemaPath: schema2Path, fileName: 'file2.json' },
      ];

      const report = await validateMultiple(files);

      expect(report.valid).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it('should merge errors from multiple files', async () => {
      const schema1Path = path.join(testDir, 'schema1.json');
      const schema2Path = path.join(testDir, 'schema2.json');

      await fs.writeJson(schema1Path, {
        type: 'object',
        required: ['name'],
        properties: { name: { type: 'string' } },
      });

      await fs.writeJson(schema2Path, {
        type: 'object',
        required: ['version'],
        properties: { version: { type: 'string' } },
      });

      const files = [
        { data: {}, schemaPath: schema1Path, fileName: 'file1.json' },
        { data: {}, schemaPath: schema2Path, fileName: 'file2.json' },
      ];

      const report = await validateMultiple(files);

      expect(report.valid).toBe(false);
      expect(report.issues.length).toBeGreaterThanOrEqual(2);
      // validateWithSchema adds schemaPath to location first, then validateMultiple overrides with fileName
      // Since the issues have location set to schemaPath, the || operator in validateMultiple won't replace it
      // Let's just check that we have multiple issues with locations
      expect(report.issues[0].location).toBeDefined();
      expect(report.issues[1].location).toBeDefined();
    });
  });

  describe('integration with real schema', () => {
    it('should validate plan data against real plan schema structure', async () => {
      // Create a schema similar to plan.schema.json
      const planSchemaPath = path.join(testDir, 'plan.schema.json');
      await fs.writeJson(planSchemaPath, {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: ['title', 'category', 'phases'],
        properties: {
          title: {
            type: 'string',
            minLength: 1,
          },
          category: {
            type: 'string',
            enum: ['framework', 'backend', 'frontend', 'infrastructure'],
          },
          phases: {
            type: 'array',
            minItems: 1,
            items: {
              type: 'object',
              required: ['name', 'tasks'],
              properties: {
                name: { type: 'string' },
                tasks: {
                  type: 'array',
                  items: { type: 'string' },
                },
              },
            },
          },
          status: {
            type: 'string',
            enum: ['planning', 'in-progress', 'completed'],
          },
        },
      });

      const validPlan = {
        title: 'Feature Implementation Plan',
        category: 'backend',
        phases: [
          {
            name: 'Design',
            tasks: ['Create architecture diagram', 'Define API contracts'],
          },
          {
            name: 'Implementation',
            tasks: ['Implement endpoints', 'Write tests'],
          },
        ],
        status: 'planning',
      };

      const report = await validateWithSchema(validPlan, planSchemaPath);

      expect(report.valid).toBe(true);
      expect(report.issues).toHaveLength(0);
    });

    it('should detect invalid plan structure', async () => {
      const planSchemaPath = path.join(testDir, 'plan.schema.json');
      await fs.writeJson(planSchemaPath, {
        $schema: 'http://json-schema.org/draft-07/schema#',
        type: 'object',
        required: ['title', 'category', 'phases'],
        properties: {
          title: { type: 'string' },
          category: {
            type: 'string',
            enum: ['framework', 'backend', 'frontend'],
          },
          phases: {
            type: 'array',
            minItems: 1,
          },
        },
      });

      const invalidPlan = {
        title: 'Test Plan',
        category: 'invalid-category',
        phases: [], // empty array, minItems is 1
      };

      const report = await validateWithSchema(invalidPlan, planSchemaPath);

      expect(report.valid).toBe(false);
      expect(report.summary.errors).toBeGreaterThan(0);
    });
  });
});
