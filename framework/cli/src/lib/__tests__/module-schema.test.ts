/**
 * Unit Tests for module.json JSON Schema — directories field
 *
 * Validates that the schema correctly accepts and rejects manifests with
 * the directories field in provides.
 */

import Ajv from 'ajv';
import addFormats from 'ajv-formats';
import { readFileSync } from 'fs';
import path from 'path';

const schemaPath = path.resolve(
  __dirname,
  '../../../../modules/core/registries/schemas/module.schema.json'
);
const schema = JSON.parse(readFileSync(schemaPath, 'utf-8'));

const ajv = new Ajv({ allErrors: true });
addFormats(ajv);
const validate = ajv.compile(schema);

const baseManifest = {
  id: 'test-mod',
  version: '1.0.0',
  name: 'Test Module',
  description: 'A test module for schema validation',
  provides: {},
};

describe('module.schema.json — directories field', () => {
  it('should accept a manifest with valid directories in provides', () => {
    const manifest = {
      ...baseManifest,
      provides: {
        directories: ['backlog/tickets', 'reports'],
      },
    };
    const valid = validate(manifest);
    expect(validate.errors).toBeNull();
    expect(valid).toBe(true);
  });

  it('should accept an empty directories array', () => {
    const manifest = {
      ...baseManifest,
      provides: {
        directories: [],
      },
    };
    const valid = validate(manifest);
    expect(validate.errors).toBeNull();
    expect(valid).toBe(true);
  });

  it('should accept a manifest without directories (directories is optional)', () => {
    const manifest = { ...baseManifest };
    const valid = validate(manifest);
    expect(validate.errors).toBeNull();
    expect(valid).toBe(true);
  });

  it('should reject directories entries that are not strings', () => {
    const manifest = {
      ...baseManifest,
      provides: {
        directories: [123, true],
      },
    };
    const valid = validate(manifest);
    expect(valid).toBe(false);
    expect(validate.errors).not.toBeNull();
  });

  it('should reject directory paths that do not match the allowed pattern', () => {
    const manifest = {
      ...baseManifest,
      provides: {
        directories: ['UPPERCASE/path'],
      },
    };
    const valid = validate(manifest);
    expect(valid).toBe(false);
    expect(validate.errors).not.toBeNull();
  });

  it('should reject directory paths with traversal segments', () => {
    const manifest = {
      ...baseManifest,
      provides: {
        directories: ['../outside'],
      },
    };
    const valid = validate(manifest);
    expect(valid).toBe(false);
    expect(validate.errors).not.toBeNull();
  });

  it('should reject absolute directory paths', () => {
    const manifest = {
      ...baseManifest,
      provides: {
        directories: ['/absolute/path'],
      },
    };
    const valid = validate(manifest);
    expect(valid).toBe(false);
    expect(validate.errors).not.toBeNull();
  });
});
