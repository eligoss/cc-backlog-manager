/**
 * Tests for MCP types and helper functions
 *
 * @module mcp/__tests__/types.test
 */

import { successResult, errorResult, ErrorCodes } from '../types.js';
import type { MCPSuccessResult, MCPErrorResult } from '../types.js';

describe('MCP Types', () => {
  describe('ErrorCodes', () => {
    it('should contain all expected error codes', () => {
      expect(ErrorCodes).toEqual({
        PROJECT_NOT_FOUND: 'PROJECT_NOT_FOUND',
        VALIDATION_FAILED: 'VALIDATION_FAILED',
        INVALID_ARGUMENTS: 'INVALID_ARGUMENTS',
        FILE_NOT_FOUND: 'FILE_NOT_FOUND',
        PERMISSION_DENIED: 'PERMISSION_DENIED',
        COMMAND_FAILED: 'COMMAND_FAILED',
        NETWORK_ERROR: 'NETWORK_ERROR',
        TIMEOUT: 'TIMEOUT',
        UNKNOWN_ERROR: 'UNKNOWN_ERROR',
      });
    });

    it('should be immutable (as const)', () => {
      // This test verifies the type system prevents mutation
      // If this compiles, the as const assertion is working
      const codes: Readonly<typeof ErrorCodes> = ErrorCodes;
      expect(codes.PROJECT_NOT_FOUND).toBe('PROJECT_NOT_FOUND');
    });

    it('should have string values matching keys', () => {
      Object.entries(ErrorCodes).forEach(([key, value]) => {
        expect(value).toBe(key);
      });
    });
  });

  describe('successResult', () => {
    it('should create a minimal success result with no parameters', () => {
      const result = successResult();

      expect(result).toEqual({
        success: true,
        data: undefined,
        message: undefined,
        output: undefined,
      });
    });

    it('should create a success result with data only', () => {
      const data = { count: 5, items: ['a', 'b', 'c'] };
      const result = successResult(data);

      expect(result).toEqual({
        success: true,
        data,
        message: undefined,
        output: undefined,
      });
    });

    it('should create a success result with data and message', () => {
      const data = { id: '123' };
      const message = 'Operation completed successfully';
      const result = successResult(data, message);

      expect(result).toEqual({
        success: true,
        data,
        message,
        output: undefined,
      });
    });

    it('should create a success result with all parameters', () => {
      const data = { status: 'done' };
      const message = 'All tests passed';
      const output = 'Test output:\nPASS: test1\nPASS: test2';
      const result = successResult(data, message, output);

      expect(result).toEqual({
        success: true,
        data,
        message,
        output,
      });
    });

    it('should create a success result with message and output only', () => {
      const message = 'Build completed';
      const output = 'Compiled successfully';
      const result = successResult(undefined, message, output);

      expect(result).toEqual({
        success: true,
        data: undefined,
        message,
        output,
      });
    });

    it('should handle empty data object', () => {
      const result = successResult({});

      expect(result).toEqual({
        success: true,
        data: {},
        message: undefined,
        output: undefined,
      });
    });

    it('should handle complex nested data', () => {
      const data = {
        user: {
          id: 123,
          name: 'Test User',
          metadata: {
            tags: ['tag1', 'tag2'],
            score: 95.5,
          },
        },
      };
      const result = successResult(data);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(data);
    });

    it('should satisfy MCPSuccessResult type', () => {
      const result = successResult({ key: 'value' }, 'Success');

      // Type assertion to verify it matches the interface
      const typedResult: MCPSuccessResult = result;
      expect(typedResult.success).toBe(true);
    });
  });

  describe('errorResult', () => {
    it('should create an error result with code and message only', () => {
      const result = errorResult(
        ErrorCodes.VALIDATION_FAILED,
        'Validation failed for field: name'
      );

      expect(result).toEqual({
        success: false,
        error: {
          code: 'VALIDATION_FAILED',
          message: 'Validation failed for field: name',
          suggestion: undefined,
          details: undefined,
        },
      });
    });

    it('should create an error result with suggestion', () => {
      const result = errorResult(
        ErrorCodes.FILE_NOT_FOUND,
        'File not found: config.json',
        'Make sure the file exists in the project root'
      );

      expect(result).toEqual({
        success: false,
        error: {
          code: 'FILE_NOT_FOUND',
          message: 'File not found: config.json',
          suggestion: 'Make sure the file exists in the project root',
          details: undefined,
        },
      });
    });

    it('should create an error result with all parameters', () => {
      const details = {
        path: '/path/to/file',
        permissions: '644',
        requiredPermissions: '755',
      };

      const result = errorResult(
        ErrorCodes.PERMISSION_DENIED,
        'Permission denied when accessing file',
        'Run with sudo or change file permissions',
        details
      );

      expect(result).toEqual({
        success: false,
        error: {
          code: 'PERMISSION_DENIED',
          message: 'Permission denied when accessing file',
          suggestion: 'Run with sudo or change file permissions',
          details,
        },
      });
    });

    it('should handle different error codes', () => {
      const codes = [
        ErrorCodes.PROJECT_NOT_FOUND,
        ErrorCodes.COMMAND_FAILED,
        ErrorCodes.NETWORK_ERROR,
        ErrorCodes.TIMEOUT,
        ErrorCodes.UNKNOWN_ERROR,
      ];

      codes.forEach((code) => {
        const result = errorResult(code, `Error with code: ${code}`);
        expect(result.success).toBe(false);
        expect(result.error.code).toBe(code);
      });
    });

    it('should handle string details', () => {
      const result = errorResult(
        ErrorCodes.COMMAND_FAILED,
        'Command execution failed',
        undefined,
        'Exit code: 1'
      );

      expect(result.error.details).toBe('Exit code: 1');
    });

    it('should handle number details', () => {
      const result = errorResult(
        ErrorCodes.TIMEOUT,
        'Operation timed out',
        undefined,
        30000
      );

      expect(result.error.details).toBe(30000);
    });

    it('should handle array details', () => {
      const details = ['error1', 'error2', 'error3'];
      const result = errorResult(
        ErrorCodes.VALIDATION_FAILED,
        'Multiple validation errors',
        undefined,
        details
      );

      expect(result.error.details).toEqual(details);
    });

    it('should handle null details', () => {
      const result = errorResult(
        ErrorCodes.UNKNOWN_ERROR,
        'Unknown error occurred',
        undefined,
        null
      );

      expect(result.error.details).toBeNull();
    });

    it('should satisfy MCPErrorResult type', () => {
      const result = errorResult(ErrorCodes.INVALID_ARGUMENTS, 'Invalid input');

      // Type assertion to verify it matches the interface
      const typedResult: MCPErrorResult = result;
      expect(typedResult.success).toBe(false);
    });

    it('should create distinct error objects', () => {
      const result1 = errorResult(ErrorCodes.FILE_NOT_FOUND, 'Error 1');
      const result2 = errorResult(ErrorCodes.FILE_NOT_FOUND, 'Error 2');

      expect(result1).not.toBe(result2);
      expect(result1.error).not.toBe(result2.error);
    });
  });

  describe('Type Guards', () => {
    it('should distinguish success from error results', () => {
      const success = successResult({ id: 1 });
      const error = errorResult(ErrorCodes.UNKNOWN_ERROR, 'Failed');

      // Type guard pattern
      if (success.success) {
        expect(success.data).toBeDefined();
      }

      if (!error.success) {
        expect(error.error).toBeDefined();
        expect(error.error.code).toBe('UNKNOWN_ERROR');
      }
    });

    it('should handle result unions correctly', () => {
      const results = [
        successResult({ count: 1 }),
        errorResult(ErrorCodes.VALIDATION_FAILED, 'Failed'),
        successResult(undefined, 'Done'),
      ];

      results.forEach((result) => {
        if (result.success) {
          expect(result).toHaveProperty('data');
        } else {
          expect(result).toHaveProperty('error');
          expect(result.error).toHaveProperty('code');
          expect(result.error).toHaveProperty('message');
        }
      });
    });
  });
});
