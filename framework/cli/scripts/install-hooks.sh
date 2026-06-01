#!/bin/bash
#
# Hook Installation Script for Agentic Development Framework
#
# This script installs git pre-commit hooks to ensure deployment files
# (.claude/skills/ and .claude/commands/) stay in sync with their sources.
#
# Usage:
#   ./cli/scripts/install-hooks.sh [options]
#
# Options:
#   --force    Overwrite existing hooks
#   --help     Show this help message

set -e

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Parse command line arguments
FORCE=false
while [[ $# -gt 0 ]]; do
    case $1 in
        --force)
            FORCE=true
            shift
            ;;
        --help)
            echo "Hook Installation Script for Agentic Development Framework"
            echo ""
            echo "Usage: $0 [options]"
            echo ""
            echo "Options:"
            echo "  --force    Overwrite existing hooks"
            echo "  --help     Show this help message"
            echo ""
            exit 0
            ;;
        *)
            echo -e "${RED}Unknown option: $1${NC}"
            echo "Use --help for usage information"
            exit 1
            ;;
    esac
done

# Find project root (scripts is at framework/cli/scripts/, so go up 3 levels)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

echo -e "${BLUE}Installing git hooks for Agentic Development Framework${NC}"
echo ""

# Check if this is a git repository
if [ ! -d "$PROJECT_ROOT/.git" ]; then
    echo -e "${RED}Error: Not a git repository${NC}"
    echo "This script must be run from within a git repository."
    exit 1
fi

# Check if this is an agentic framework project
if [ ! -f "$PROJECT_ROOT/.agentic-framework.json" ]; then
    echo -e "${YELLOW}Warning: No .agentic-framework.json found${NC}"
    echo "This directory may not be an agentic framework project."
    read -p "Continue anyway? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Aborted."
        exit 1
    fi
fi

# Create hooks directory if it doesn't exist
HOOKS_DIR="$PROJECT_ROOT/.git/hooks"
mkdir -p "$HOOKS_DIR"

# Pre-commit hook
PRE_COMMIT_HOOK="$HOOKS_DIR/pre-commit"

# Check if pre-commit hook already exists
if [ -f "$PRE_COMMIT_HOOK" ] && [ "$FORCE" = false ]; then
    echo -e "${YELLOW}Pre-commit hook already exists${NC}"
    echo "Path: $PRE_COMMIT_HOOK"
    echo ""
    read -p "Overwrite? [y/N] " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        echo "Skipping pre-commit hook installation."
        echo -e "${YELLOW}Use --force to overwrite existing hooks${NC}"
        exit 0
    fi
fi

# Create pre-commit hook
echo -e "${BLUE}Installing pre-commit hook...${NC}"

cat > "$PRE_COMMIT_HOOK" << 'EOF'
#!/bin/bash
#
# Git pre-commit hook for Agentic Development Framework
#
# Automatically syncs .claude/skills/ and .claude/commands/ with their source
# files (ai/skills/ and ai/agents/) before each commit. This ensures deployment
# files are always in sync.
#
# Exit codes:
#   0 - All checks passed (or auto-synced successfully)
#   1 - Error running sync

set -e  # Exit on any error

# Colors for output
RED='\033[0;31m'
YELLOW='\033[1;33m'
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Find project root (where .agentic-framework.json is located)
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

echo -e "${BLUE}Running pre-commit sync...${NC}"

# Check if agentic-framework CLI is available
if ! command -v npx &> /dev/null; then
    echo -e "${RED}Error: npx not found${NC}"
    echo "Please install Node.js and npm to use this hook."
    exit 1
fi

# Check if this is an agentic framework project
if [ ! -f "$PROJECT_ROOT/.agentic-framework.json" ]; then
    # Not a framework project, skip checks
    echo -e "${YELLOW}Not an agentic framework project, skipping sync${NC}"
    exit 0
fi

# Determine which CLI to use
if [ -f "$PROJECT_ROOT/framework/cli/dist/index.js" ]; then
    # Framework development mode - use local CLI
    CLI_CMD="node $PROJECT_ROOT/framework/cli/dist/index.js"
elif command -v agentic-framework &> /dev/null; then
    # Globally installed CLI
    CLI_CMD="agentic-framework"
else
    # Fallback to npx
    CLI_CMD="agentic-framework"
fi

# Check if sync is needed, and if so, auto-sync
check_and_sync() {
    local check_type="$1"
    local check_flag="$2"

    # Run sync check
    if $CLI_CMD sync "$check_flag" --check -p "$PROJECT_ROOT" > /dev/null 2>&1; then
        echo -e "${GREEN}✓ $check_type in sync${NC}"
        return 0
    else
        local exit_code=$?
        if [ $exit_code -eq 2 ]; then
            echo -e "${YELLOW}⟳ $check_type out of sync, auto-syncing...${NC}"
            # Run sync (not just check)
            if $CLI_CMD sync "$check_flag" -p "$PROJECT_ROOT" > /dev/null 2>&1; then
                echo -e "${GREEN}✓ $check_type synced${NC}"
                return 0
            else
                echo -e "${RED}✗ Failed to sync $check_type${NC}"
                return 1
            fi
        else
            echo -e "${RED}✗ Error checking $check_type${NC}"
            return 1
        fi
    fi
}

# Track if any syncs happened
SYNCED=0
SYNC_FAILED=0

# Check and sync skills
if ! check_and_sync "Skills" "--skills"; then
    SYNC_FAILED=1
else
    # Check if files were modified
    if [ -n "$(git diff --name-only .claude/skills/ 2>/dev/null)" ]; then
        SYNCED=1
    fi
fi

# Check and sync agents
if ! check_and_sync "Agents" "--agents"; then
    SYNC_FAILED=1
else
    # Check if files were modified
    if [ -n "$(git diff --name-only .claude/commands/ 2>/dev/null)" ]; then
        SYNCED=1
    fi
fi

# If sync failed, abort commit
if [ $SYNC_FAILED -eq 1 ]; then
    echo ""
    echo -e "${RED}Commit aborted: Sync failed${NC}"
    echo "Please fix the errors and try again."
    exit 1
fi

# If files were synced, stage them
if [ $SYNCED -eq 1 ]; then
    echo -e "${BLUE}Staging synced files...${NC}"
    git add .claude/skills/ .claude/commands/ 2>/dev/null || true
    echo -e "${GREEN}✓ Synced files staged${NC}"
fi

# Build and link CLI if in framework development mode
if [ -d "$PROJECT_ROOT/framework/cli" ]; then
    echo -e "${BLUE}Building and linking CLI...${NC}"

    # Build the CLI
    cd "$PROJECT_ROOT/framework/cli"
    if ! npm run build --silent > /dev/null 2>&1; then
        echo -e "${RED}✗ Failed to build CLI${NC}"
        exit 1
    fi

    # Link globally
    if ! npm link --silent > /dev/null 2>&1; then
        echo -e "${RED}✗ Failed to link CLI${NC}"
        exit 1
    fi

    echo -e "${GREEN}✓ CLI built and linked successfully${NC}"
fi

echo -e "${GREEN}Pre-commit sync complete!${NC}"
exit 0
EOF

# Make hook executable
chmod +x "$PRE_COMMIT_HOOK"

echo -e "${GREEN}✓ Pre-commit hook installed successfully${NC}"
echo "Path: $PRE_COMMIT_HOOK"
echo ""
echo -e "${BLUE}The hook will:${NC}"
echo "  • Auto-sync skills if out of sync"
echo "  • Auto-sync agents if out of sync"
echo "  • Stage synced files automatically"
echo "  • Only block if sync fails"
echo ""
echo -e "${GREEN}Installation complete!${NC}"
echo ""
