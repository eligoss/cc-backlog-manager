# CLI Structure

## Entry Point

**Binary:** framework/cli/bin/agentic-framework
**Main:** framework/cli/src/cli.ts

## Command Organization

**Location:** framework/cli/src/commands/
**Pattern:** One file per top-level command

Commands:
- init.ts - Project initialization
- add.ts - Module installation
- remove.ts - Module removal
- list.ts - Module listing
- validate.ts - Configuration validation
- routes.ts - Routes management
- sync.ts - Registry synchronization
- status.ts - Framework status
- agent.ts - SDK agent operations

## Library Structure

**Location:** framework/cli/src/lib/

Key modules:
- manifest.ts - Manifest parsing
- registry.ts - Registry operations
- validation.ts - Validation utilities
- discovery.ts - Discovery engine

## Type Definitions

**Location:** framework/cli/src/types/

Key types:
- manifest.types.ts - Module manifest types
- agent.types.ts - Agent configuration types

## To Find Code

For CLI command implementation:
```
find_symbol name_path_pattern="*Command" relative_path="framework/cli/src/commands"
```

For discovery logic:
```
get_symbols_overview relative_path="framework/cli/src/lib/discovery.ts"
```
