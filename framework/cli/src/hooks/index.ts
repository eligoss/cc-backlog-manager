/**
 * Claude Code Hooks
 *
 * TypeScript hooks for Claude Code v2.0-v2.1 integration.
 * These hooks provide advisory quality gates for the Agentic Development Framework.
 *
 * Hooks:
 * - pre-write-quality: Validates before file writes (syntax, hardcoded paths)
 * - post-write-validate: Validates after file writes
 * - claude-folder-protection: Warns when editing synced .claude/ files
 * - stop-quality-check: Final quality summary on session end
 *
 * All hooks operate in advisory mode (report issues, don't block).
 *
 * Usage:
 * Each hook is a standalone script that can be invoked directly:
 *   node dist/hooks/pre-write-quality.js
 *
 * Or via the shell wrappers deployed to .claude/hooks/:
 *   .claude/hooks/pre-write-quality.sh
 */

export * from './types.js';
