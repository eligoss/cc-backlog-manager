/**
 * Type Safety Regression Tests
 *
 * These tests prevent `any` type usage from creeping back into command files.
 * They scan source files and fail if explicit `any` types are detected in
 * high-impact locations.
 *
 * Why this matters:
 * - `any` defeats TypeScript's type safety
 * - Can lead to runtime errors that could be caught at compile time
 * - Makes refactoring more dangerous
 *
 * @module types/__tests__/type-safety.test
 */

import fs from 'fs';
import path from 'path';
import { glob } from 'glob';

// Find the CLI source directory (works from both src and dist)
function findCliSrcDir(): string {
  // __dirname in Jest will be the src directory since we use ts-jest
  // Try to find the src directory by walking up from current location
  let dir = __dirname;

  // Walk up to find cli/src or cli directory
  while (dir !== path.dirname(dir)) {
    if (path.basename(dir) === 'cli' && fs.existsSync(path.join(dir, 'src'))) {
      return path.join(dir, 'src');
    }
    if (path.basename(dir) === 'src' && fs.existsSync(path.join(dir, 'commands'))) {
      return dir;
    }
    dir = path.dirname(dir);
  }

  // Fallback: try relative path from __dirname
  const srcFromTypes = path.resolve(__dirname, '../../..');
  if (fs.existsSync(path.join(srcFromTypes, 'commands'))) {
    return srcFromTypes;
  }

  // Last resort: use process.cwd() based path
  const cwdSrc = path.resolve(process.cwd(), 'src');
  if (fs.existsSync(path.join(cwdSrc, 'commands'))) {
    return cwdSrc;
  }

  throw new Error('Could not find CLI src directory');
}

const CLI_SRC_DIR = findCliSrcDir();

// Patterns that indicate problematic `any` usage
const PROBLEMATIC_ANY_PATTERNS = [
  // Function parameters with any
  /:\s*any\s*[,)]/g,
  // Return types with any
  /\):\s*any\s*[{;]/g,
  // Variable declarations with any
  /:\s*any\s*=/g,
  // Array of any
  /any\[\]/g,
  // Type assertion to any (not as unknown)
  /as\s+any(?!\s+as)/g,
  // Promise<any>
  /Promise<any>/g,
  // Record<string, any>
  /Record<[^>]+,\s*any>/g,
];

// Patterns that are acceptable (not problematic)
const ACCEPTABLE_PATTERNS = [
  // Comments containing 'any'
  /\/\/.*any/,
  /\/\*.*any.*\*\//s,
  // String literals containing 'any'
  /'[^']*any[^']*'/,
  /"[^"]*any[^"]*"/,
  /`[^`]*any[^`]*`/,
  // Index signatures (needed for Record compatibility)
  /\[key:\s*string\]:\s*unknown/,
  // z.any() from Zod (acceptable in schema definitions)
  /z\.any\(\)/,
];

// Files that are allowed to have `any` (with justification)
const ALLOWED_FILES: Record<string, string> = {
  // API clients need any for external responses
  'api-client.ts': 'External API response types may vary',
  'jira-client.ts': 'Jira API response types are dynamic',
  'confluence-client.ts': 'Confluence API response types are dynamic',
  // Validation utilities need any for generic validation
  'validation.ts': 'Generic validation accepts any input',
  // Field mapper handles dynamic data
  'field-mapper.ts': 'Maps between dynamic field structures',
  // Schema definitions use z.any() for flexibility
  'skill.schema.ts': 'Zod schema uses z.any() for extensibility',
};

// Command files that MUST NOT have any usage
const STRICT_COMMAND_FILES = [
  'commands/init.ts',
  'commands/add.ts',
  'commands/remove.ts',
  'commands/validate.ts',
  'commands/update.ts',
  'commands/backlog/create-ticket.ts',
  'commands/backlog/validate.ts',
];

/**
 * Count problematic any usages in a file
 */
function countProblematicAny(content: string, filePath: string): { count: number; locations: string[] } {
  const lines = content.split('\n');
  const locations: string[] = [];
  let count = 0;

  lines.forEach((line, index) => {
    const lineNum = index + 1;

    // Skip acceptable patterns
    const isAcceptable = ACCEPTABLE_PATTERNS.some(pattern => pattern.test(line));
    if (isAcceptable) {
      return;
    }

    // Check for problematic patterns
    for (const pattern of PROBLEMATIC_ANY_PATTERNS) {
      // Reset regex state
      pattern.lastIndex = 0;
      const matches = line.match(pattern);
      if (matches) {
        count += matches.length;
        matches.forEach(match => {
          locations.push(`${filePath}:${lineNum}: ${match.trim()}`);
        });
      }
    }
  });

  return { count, locations };
}

/**
 * Check if file is in allowed list
 */
function isAllowedFile(filePath: string): boolean {
  const fileName = path.basename(filePath);
  return fileName in ALLOWED_FILES;
}

/**
 * Check if file is a strict command file
 */
function isStrictCommandFile(filePath: string): boolean {
  return STRICT_COMMAND_FILES.some(cmdFile => filePath.includes(cmdFile));
}

describe('Type Safety Regression Tests', () => {
  describe('Command Files: No Explicit any Types', () => {
    let commandFiles: string[] = [];

    beforeAll(async () => {
      const pattern = path.join(CLI_SRC_DIR, 'commands/**/*.ts');
      commandFiles = await glob(pattern, {
        ignore: ['**/__tests__/**', '**/*.test.ts'],
      });
    });

    it('should have command files to test', () => {
      expect(commandFiles.length).toBeGreaterThan(0);
    });

    it('should not have explicit any types in strict command files', () => {
      const violations: string[] = [];

      for (const filePath of commandFiles) {
        if (!isStrictCommandFile(filePath)) {
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const { count, locations } = countProblematicAny(content, filePath);

        if (count > 0) {
          violations.push(...locations);
        }
      }

      if (violations.length > 0) {
        const message = [
          'Found explicit "any" types in strict command files:',
          '',
          ...violations.map(v => `  ${v}`),
          '',
          'Fix: Replace "any" with proper TypeScript types.',
          'See: src/types/command-options.ts for available interfaces.',
        ].join('\n');

        throw new Error(message);
      }
    });

    it('should have typed command options in STRICT files (not any)', () => {
      const violations: string[] = [];
      const warnings: string[] = [];

      for (const filePath of commandFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for action handlers with any
        const actionWithAnyPattern = /\.action\(async\s*\([^)]*:\s*any[^)]*\)/g;
        const matches = content.match(actionWithAnyPattern);

        if (matches) {
          const relativePath = path.relative(process.cwd(), filePath);
          const msg = `${relativePath}: ${matches.length} action handler(s) with any type`;

          // Only fail for strict command files
          if (isStrictCommandFile(filePath)) {
            violations.push(msg);
          } else {
            warnings.push(msg);
          }
        }
      }

      // Warn about non-strict files (soft check)
      if (warnings.length > 0) {
        console.warn('Files with untyped action handlers (consider fixing):');
        warnings.forEach(w => console.warn(`  - ${w}`));
      }

      // Fail only for strict files
      if (violations.length > 0) {
        const message = [
          'Found Commander action handlers with "any" typed options in STRICT files:',
          '',
          ...violations.map(v => `  ${v}`),
          '',
          'Fix: Create a typed interface for command options.',
          'Example:',
          '  interface MyCommandOptions {',
          '    verbose?: boolean;',
          '    path?: string;',
          '  }',
          '  .action(async (options: MyCommandOptions) => { ... })',
        ].join('\n');

        throw new Error(message);
      }
    });

    it('should have typed run functions in STRICT files (not any)', () => {
      const violations: string[] = [];
      const warnings: string[] = [];

      for (const filePath of commandFiles) {
        const content = fs.readFileSync(filePath, 'utf-8');

        // Check for runXxxCommand functions with any
        const runFunctionWithAnyPattern = /async\s+function\s+run\w*Command\s*\([^)]*:\s*any[^)]*\)/g;
        const matches = content.match(runFunctionWithAnyPattern);

        if (matches) {
          const relativePath = path.relative(process.cwd(), filePath);
          const msg = `${relativePath}: ${matches.length} run function(s) with any type`;

          // Only fail for strict command files
          if (isStrictCommandFile(filePath)) {
            violations.push(msg);
          } else {
            warnings.push(msg);
          }
        }
      }

      // Warn about non-strict files (soft check)
      if (warnings.length > 0) {
        console.warn('Files with untyped run functions (consider fixing):');
        warnings.forEach(w => console.warn(`  - ${w}`));
      }

      // Fail only for strict files
      if (violations.length > 0) {
        const message = [
          'Found run command functions with "any" typed options in STRICT files:',
          '',
          ...violations.map(v => `  ${v}`),
          '',
          'Fix: Use typed interface for the options parameter.',
        ].join('\n');

        throw new Error(message);
      }
    });
  });

  describe('Library Files: Documented any Usage', () => {
    let libFiles: string[] = [];

    beforeAll(async () => {
      const pattern = path.join(CLI_SRC_DIR, 'lib/**/*.ts');
      libFiles = await glob(pattern, {
        ignore: ['**/__tests__/**', '**/*.test.ts'],
      });
    });

    it('should only have any in allowed files or with justification', () => {
      const unexpectedAny: string[] = [];

      for (const filePath of libFiles) {
        // Skip allowed files
        if (isAllowedFile(filePath)) {
          continue;
        }

        const content = fs.readFileSync(filePath, 'utf-8');
        const { count, locations } = countProblematicAny(content, filePath);

        // Allow up to 3 any usages in lib files (they may need flexibility)
        if (count > 3) {
          unexpectedAny.push(`${path.basename(filePath)}: ${count} any usages`);
        }
      }

      // This is a soft check - just report, don't fail
      if (unexpectedAny.length > 0) {
        console.warn('Files with many any usages (consider refactoring):');
        unexpectedAny.forEach(f => console.warn(`  - ${f}`));
      }
    });
  });

  describe('Type Definitions File', () => {
    it('should have command-options.ts types file', () => {
      const typesFile = path.join(CLI_SRC_DIR, 'types/command-options.ts');
      expect(fs.existsSync(typesFile)).toBe(true);
    });

    it('should export required interfaces', () => {
      const typesFile = path.join(CLI_SRC_DIR, 'types/command-options.ts');
      const content = fs.readFileSync(typesFile, 'utf-8');

      // Check for essential interfaces
      const requiredInterfaces = [
        'BaseCommandOptions',
        'CreateTicketOptions',
        'JiraSyncOptions',
        'InitOptions',
      ];

      for (const interfaceName of requiredInterfaces) {
        const pattern = new RegExp(`export\\s+interface\\s+${interfaceName}`);
        expect(content).toMatch(pattern);
      }
    });

    it('should not have any types in command-options.ts', () => {
      const typesFile = path.join(CLI_SRC_DIR, 'types/command-options.ts');
      const content = fs.readFileSync(typesFile, 'utf-8');

      const { count, locations } = countProblematicAny(content, typesFile);

      if (count > 0) {
        throw new Error(`Found ${count} any types in command-options.ts:\n${locations.join('\n')}`);
      }
    });
  });
});

describe('TypeScript Compiler Options', () => {
  const findTsconfig = (): string => {
    // Walk up from CLI_SRC_DIR to find tsconfig.json
    let dir = path.dirname(CLI_SRC_DIR); // Start from cli/ directory
    while (dir !== path.dirname(dir)) {
      const tsconfigPath = path.join(dir, 'tsconfig.json');
      if (fs.existsSync(tsconfigPath)) {
        return tsconfigPath;
      }
      dir = path.dirname(dir);
    }
    throw new Error('Could not find tsconfig.json');
  };

  it('should have strict TypeScript configuration', () => {
    const tsconfigPath = findTsconfig();
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));

    // Check for strict mode settings
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });

  it('should have noImplicitAny enabled', () => {
    const tsconfigPath = findTsconfig();
    const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, 'utf-8'));

    // noImplicitAny is included in strict mode
    // If strict is true, noImplicitAny is automatically true
    expect(tsconfig.compilerOptions.strict).toBe(true);
  });
});
