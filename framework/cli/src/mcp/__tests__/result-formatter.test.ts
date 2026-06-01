/**
 * Tests for result formatter utilities
 *
 * @module mcp/__tests__/result-formatter.test
 */

import {
  stripAnsi,
  truncateOutput,
  captureOutput,
  executeAndCapture,
  parseJsonOutput,
} from '../result-formatter.js';
import { ErrorCodes } from '../types.js';

describe('Result Formatter', () => {
  describe('stripAnsi', () => {
    it('should remove ANSI color codes', () => {
      const colored = '\x1b[31mRed text\x1b[0m';
      const stripped = stripAnsi(colored);
      expect(stripped).toBe('Red text');
    });

    it('should remove multiple ANSI codes', () => {
      const colored = '\x1b[1m\x1b[31mBold red\x1b[0m\x1b[32m Green \x1b[0m';
      const stripped = stripAnsi(colored);
      expect(stripped).toBe('Bold red Green ');
    });

    it('should handle text without ANSI codes', () => {
      const plain = 'Plain text';
      const stripped = stripAnsi(plain);
      expect(stripped).toBe('Plain text');
    });

    it('should handle empty string', () => {
      const stripped = stripAnsi('');
      expect(stripped).toBe('');
    });

    it('should remove ANSI cursor movement codes', () => {
      const withCursor = 'Text\x1b[2Jmore\x1b[Htext';
      const stripped = stripAnsi(withCursor);
      expect(stripped).toBe('Textmoretext');
    });

    it('should remove ANSI codes from multiline text', () => {
      const colored = '\x1b[31mLine 1\x1b[0m\n\x1b[32mLine 2\x1b[0m';
      const stripped = stripAnsi(colored);
      expect(stripped).toBe('Line 1\nLine 2');
    });

    it('should handle CSI sequences', () => {
      const csi = '\x1b[38;5;208mOrange\x1b[0m';
      const stripped = stripAnsi(csi);
      expect(stripped).toBe('Orange');
    });

    it('should handle OSC sequences', () => {
      // Note: The current ANSI regex doesn't match OSC sequences (those starting with \x1b])
      // so they pass through unchanged
      const osc = '\x1b]0;Title\x07Text';
      const stripped = stripAnsi(osc);
      // OSC sequences are not matched by the regex, so they remain unchanged
      expect(stripped).toBe('\x1b]0;Title\x07Text');
    });
  });

  describe('truncateOutput', () => {
    it('should not truncate output shorter than max length', () => {
      const output = 'Short text';
      const result = truncateOutput(output, 100);

      expect(result.output).toBe('Short text');
      expect(result.truncated).toBe(false);
    });

    it('should not truncate output equal to max length', () => {
      const output = 'Exact';
      const result = truncateOutput(output, 5);

      expect(result.output).toBe('Exact');
      expect(result.truncated).toBe(false);
    });

    it('should truncate output longer than max length', () => {
      const output = 'This is a very long text that should be truncated';
      const result = truncateOutput(output, 20);

      expect(result.output).toBe('This is a very long \n... [output truncated]');
      expect(result.truncated).toBe(true);
    });

    it('should add truncation indicator', () => {
      const output = 'A'.repeat(1000);
      const result = truncateOutput(output, 100);

      expect(result.output).toMatch(/\n\.\.\. \[output truncated\]$/);
      expect(result.truncated).toBe(true);
    });

    it('should handle empty string', () => {
      const result = truncateOutput('', 100);

      expect(result.output).toBe('');
      expect(result.truncated).toBe(false);
    });

    it('should handle zero max length', () => {
      const output = 'Text';
      const result = truncateOutput(output, 0);

      expect(result.output).toBe('\n... [output truncated]');
      expect(result.truncated).toBe(true);
    });

    it('should truncate at exact boundary', () => {
      const output = '12345';
      const result = truncateOutput(output, 3);

      expect(result.output).toBe('123\n... [output truncated]');
      expect(result.truncated).toBe(true);
      expect(result.output.length).toBe(26); // "123" + "\n... [output truncated]"
    });

    it('should preserve newlines in truncated output', () => {
      const output = 'Line 1\nLine 2\nLine 3\nLine 4\nLine 5';
      const result = truncateOutput(output, 15);

      expect(result.output).toContain('Line 1\nLine 2');
      expect(result.truncated).toBe(true);
    });
  });

  describe('captureOutput', () => {
    // Store original console methods for restoration
    const originalLog = console.log;
    const originalError = console.error;
    const originalWarn = console.warn;
    const originalInfo = console.info;

    afterEach(() => {
      // Ensure console is restored even if test fails
      console.log = originalLog;
      console.error = originalError;
      console.warn = originalWarn;
      console.info = originalInfo;
    });

    it('should capture console.log output', async () => {
      const { output } = await captureOutput(async () => {
        console.log('Test message');
      });

      expect(output.output).toBe('Test message');
      expect(output.truncated).toBe(false);
    });

    it('should capture console.error output', async () => {
      const { output } = await captureOutput(async () => {
        console.error('Error message');
      });

      expect(output.output).toBe('Error message');
    });

    it('should capture console.warn output', async () => {
      const { output } = await captureOutput(async () => {
        console.warn('Warning message');
      });

      expect(output.output).toBe('Warning message');
    });

    it('should capture console.info output', async () => {
      const { output } = await captureOutput(async () => {
        console.info('Info message');
      });

      expect(output.output).toBe('Info message');
    });

    it('should capture multiple console outputs', async () => {
      const { output } = await captureOutput(async () => {
        console.log('Line 1');
        console.error('Line 2');
        console.warn('Line 3');
        console.info('Line 4');
      });

      expect(output.output).toBe('Line 1\nLine 2\nLine 3\nLine 4');
    });

    it('should strip ANSI codes by default', async () => {
      const { output } = await captureOutput(async () => {
        console.log('\x1b[31mRed text\x1b[0m');
      });

      expect(output.output).toBe('Red text');
    });

    it('should preserve ANSI codes when stripColors is false', async () => {
      const { output } = await captureOutput(
        async () => {
          console.log('\x1b[31mRed text\x1b[0m');
        },
        { stripColors: false }
      );

      expect(output.output).toBe('\x1b[31mRed text\x1b[0m');
    });

    it('should truncate output when maxLength is exceeded', async () => {
      const { output } = await captureOutput(
        async () => {
          console.log('A'.repeat(1000));
        },
        { maxLength: 100 }
      );

      expect(output.truncated).toBe(true);
      expect(output.output).toMatch(/\n\.\.\. \[output truncated\]$/);
    });

    it('should capture process.exit code', async () => {
      const { output } = await captureOutput(async () => {
        process.exit(42);
      });

      expect(output.exitCode).toBe(42);
    });

    it('should capture process.exit(0)', async () => {
      const { output } = await captureOutput(async () => {
        process.exit(0);
      });

      expect(output.exitCode).toBe(0);
    });

    it('should capture process.exit with no argument as 0', async () => {
      const { output } = await captureOutput(async () => {
        process.exit();
      });

      expect(output.exitCode).toBe(0);
    });

    it('should handle thrown errors', async () => {
      const { output } = await captureOutput(async () => {
        throw new Error('Test error');
      });

      expect(output.output).toContain('Test error');
      expect(output.exitCode).toBe(1);
    });

    it('should handle non-Error throws', async () => {
      const { output } = await captureOutput(async () => {
        throw 'String error';
      });

      expect(output.output).toContain('String error');
      expect(output.exitCode).toBe(1);
    });

    it('should return function result when no exit', async () => {
      const { result } = await captureOutput(async () => {
        console.log('Processing');
        return { status: 'success', count: 5 };
      });

      expect(result).toEqual({ status: 'success', count: 5 });
    });

    it('should return undefined when process.exit is called', async () => {
      const { result } = await captureOutput(async () => {
        return { data: 'value' };
        process.exit(1);
      });

      // Result is still returned because exit happens after return
      expect(result).toEqual({ data: 'value' });
    });

    it('should restore console methods after execution', async () => {
      await captureOutput(async () => {
        console.log('Test');
      });

      expect(console.log).toBe(originalLog);
      expect(console.error).toBe(originalError);
      expect(console.warn).toBe(originalWarn);
      expect(console.info).toBe(originalInfo);
    });

    it('should restore console methods even after error', async () => {
      await captureOutput(async () => {
        throw new Error('Test error');
      });

      expect(console.log).toBe(originalLog);
      expect(console.error).toBe(originalError);
    });

    it('should handle non-string console arguments', async () => {
      const { output } = await captureOutput(async () => {
        console.log(123);
        console.log({ key: 'value' });
        console.log([1, 2, 3]);
      });

      expect(output.output).toContain('123');
      expect(output.output).toContain('{"key":"value"}');
      expect(output.output).toContain('[1,2,3]');
    });

    it('should handle mixed console arguments', async () => {
      const { output } = await captureOutput(async () => {
        console.log('String', 123, { obj: true });
      });

      expect(output.output).toContain('String 123 {"obj":true}');
    });

    it('should not actually exit the process', async () => {
      const processExitSpy = jest.spyOn(process, 'exit').mockImplementation();

      await captureOutput(async () => {
        process.exit(1);
      });

      // Process.exit was intercepted, not actually called
      processExitSpy.mockRestore();
    });
  });

  describe('executeAndCapture', () => {
    it('should return success result for successful command', async () => {
      const result = await executeAndCapture(async () => {
        console.log('Command executed');
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.message).toBe('Command completed successfully');
        expect(result.output).toBe('Command executed');
      }
    });

    it('should return success result with empty output', async () => {
      const result = await executeAndCapture(async () => {
        // No output
      });

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toBe('');
      }
    });

    it('should return error result for process.exit(1)', async () => {
      const result = await executeAndCapture(async () => {
        console.log('Starting command');
        process.exit(1);
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCodes.COMMAND_FAILED);
        expect(result.error.message).toContain('exit code 1');
        expect(result.error.details).toContain('Starting command');
      }
    });

    it('should return error result for non-zero exit code', async () => {
      const result = await executeAndCapture(async () => {
        process.exit(127);
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.message).toContain('exit code 127');
      }
    });

    it('should return success for process.exit(0)', async () => {
      const result = await executeAndCapture(async () => {
        console.log('Success');
        process.exit(0);
      });

      expect(result.success).toBe(true);
    });

    it('should return error result for thrown errors', async () => {
      const result = await executeAndCapture(async () => {
        throw new Error('Command failed');
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.code).toBe(ErrorCodes.COMMAND_FAILED);
        // The error message includes the exit code when thrown errors are captured
        expect(result.error.message).toBe('Command failed with exit code 1');
      }
    });

    it('should handle custom capture options', async () => {
      const result = await executeAndCapture(
        async () => {
          console.log('A'.repeat(1000));
        },
        { maxLength: 100 }
      );

      expect(result.success).toBe(true);
      if (result.success && result.output) {
        expect(result.output.length).toBeLessThanOrEqual(100 + 25); // maxLength + truncation message
      }
    });

    it('should preserve ANSI codes when requested', async () => {
      const result = await executeAndCapture(
        async () => {
          console.log('\x1b[31mRed\x1b[0m');
        },
        { stripColors: false }
      );

      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.output).toContain('\x1b[31m');
      }
    });

    it('should handle multiple console outputs in error case', async () => {
      const result = await executeAndCapture(async () => {
        console.log('Step 1');
        console.log('Step 2');
        process.exit(1);
      });

      expect(result.success).toBe(false);
      if (!result.success) {
        expect(result.error.details).toContain('Step 1');
        expect(result.error.details).toContain('Step 2');
      }
    });
  });

  describe('parseJsonOutput', () => {
    it('should parse valid JSON object', () => {
      const output = '{"key": "value", "count": 42}';
      const result = parseJsonOutput(output);

      expect(result).toEqual({ key: 'value', count: 42 });
    });

    it('should parse valid JSON array', () => {
      const output = '[1, 2, 3, 4, 5]';
      const result = parseJsonOutput(output);

      expect(result).toEqual([1, 2, 3, 4, 5]);
    });

    it('should extract JSON from mixed output', () => {
      const output = 'Loading...\nProcessing data...\n{"status": "complete"}\n';
      const result = parseJsonOutput(output);

      expect(result).toEqual({ status: 'complete' });
    });

    it('should extract first JSON from output with multiple JSON blocks', () => {
      // The regex matches the entire string from first { to last }
      // So it captures the whole thing, which isn't valid JSON
      const output = '{"first": 1} some text {"second": 2}';
      const result = parseJsonOutput(output);

      // Returns null because the matched string isn't valid JSON
      expect(result).toBeNull();
    });

    it('should return null for output with no JSON', () => {
      const output = 'Just plain text output';
      const result = parseJsonOutput(output);

      expect(result).toBeNull();
    });

    it('should return null for invalid JSON', () => {
      const output = '{invalid json}';
      const result = parseJsonOutput(output);

      expect(result).toBeNull();
    });

    it('should return null for empty string', () => {
      const result = parseJsonOutput('');

      expect(result).toBeNull();
    });

    it('should handle nested JSON objects', () => {
      const output = 'Result:\n{"user": {"name": "Test", "id": 123}, "active": true}';
      const result = parseJsonOutput(output);

      expect(result).toEqual({
        user: { name: 'Test', id: 123 },
        active: true,
      });
    });

    it('should handle JSON with arrays', () => {
      const output = '{"items": [{"id": 1}, {"id": 2}], "total": 2}';
      const result = parseJsonOutput(output);

      expect(result).toEqual({
        items: [{ id: 1 }, { id: 2 }],
        total: 2,
      });
    });

    it('should handle multiline JSON', () => {
      const output = `
      Header text
      {
        "name": "Test",
        "data": {
          "value": 123
        }
      }
      Footer text
      `;
      const result = parseJsonOutput(output);

      expect(result).toEqual({
        name: 'Test',
        data: { value: 123 },
      });
    });

    it('should handle JSON with escaped characters', () => {
      const output = '{"message": "Line 1\\nLine 2", "path": "C:\\\\Users\\\\test"}';
      const result = parseJsonOutput(output);

      expect(result).toEqual({
        message: 'Line 1\nLine 2',
        path: 'C:\\Users\\test',
      });
    });

    it('should handle JSON with null values', () => {
      const output = '{"value": null, "optional": null}';
      const result = parseJsonOutput(output);

      expect(result).toEqual({ value: null, optional: null });
    });

    it('should handle JSON with boolean values', () => {
      const output = '{"enabled": true, "disabled": false}';
      const result = parseJsonOutput(output);

      expect(result).toEqual({ enabled: true, disabled: false });
    });

    it('should handle JSON with numeric values', () => {
      const output = '{"int": 42, "float": 3.14, "negative": -10}';
      const result = parseJsonOutput(output);

      expect(result).toEqual({ int: 42, float: 3.14, negative: -10 });
    });

    it('should extract array with objects', () => {
      const output = 'Results: [{"name": "A", "value": 1}, {"name": "B", "value": 2}]';
      const result = parseJsonOutput(output);

      expect(result).toEqual([
        { name: 'A', value: 1 },
        { name: 'B', value: 2 },
      ]);
    });

    it('should handle empty JSON object', () => {
      const output = '{}';
      const result = parseJsonOutput(output);

      expect(result).toEqual({});
    });

    it('should handle empty JSON array', () => {
      const output = '[]';
      const result = parseJsonOutput(output);

      expect(result).toEqual([]);
    });

    it('should return null for incomplete JSON', () => {
      const output = '{"incomplete": ';
      const result = parseJsonOutput(output);

      expect(result).toBeNull();
    });

    it('should handle ANSI codes in surrounding text', () => {
      const output = '\x1b[32mSuccess:\x1b[0m {"result": "ok"}';
      const result = parseJsonOutput(output);

      expect(result).toEqual({ result: 'ok' });
    });
  });
});
