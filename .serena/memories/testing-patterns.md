# Testing Patterns

## Test Location

**Tests:** framework/cli/src/**/*.test.ts
**Config:** framework/cli/jest.config.js

## Coverage Requirements

**Minimum:** 64% coverage
**Command:** npm test --coverage

## Test Organization

**Pattern:** Co-located with source
```
framework/cli/src/
├── commands/
│   ├── init.ts
│   └── init.test.ts
├── lib/
│   ├── discovery.ts
│   └── discovery.test.ts
```

## Naming Convention

- **Test file:** source-file.test.ts
- **Test suite:** describe('ClassName' or 'functionName')
- **Test case:** it('should expected behavior')

## Running Tests

```bash
# All tests
npm test

# Specific file
npm test -- discovery.test.ts

# With coverage
npm test -- --coverage

# Watch mode
npm test -- --watch
```

## Mocking

Use Jest mocks for:
- File system operations
- External API calls
- Module dependencies

## To Find Tests

```
find_file name="*.test.ts" relative_path="framework/cli"
```
