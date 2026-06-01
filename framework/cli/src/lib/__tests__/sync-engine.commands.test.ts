/**
 * Unit Tests: SyncEngine.syncCommands()
 *
 * Tests for syncing CLI command wrappers (cmd-*.md files) from module
 * commands/ directories to .claude/commands/.
 *
 * @module lib/__tests__/sync-engine.commands.test
 */

import fs from "fs-extra";
import path from "path";
import { createSandbox, TestSandbox } from "./test-utils";
import { SyncEngine } from "../sync-engine";
import type { ModuleManifest } from "../module-loader";

describe("SyncEngine - Commands", () => {
  let sandbox: TestSandbox;
  let testDir: string;
  let frameworkDir: string;
  let projectDir: string;
  let engine: SyncEngine;

  beforeEach(async () => {
    sandbox = await createSandbox("sync-engine-commands-test");
    testDir = sandbox.path;
    frameworkDir = path.join(testDir, "framework");
    projectDir = path.join(testDir, "project");

    // Create framework structure for link transformation
    await fs.ensureDir(path.join(frameworkDir, "ai/registries"));
    await fs.ensureDir(path.join(frameworkDir, "ai/context"));
    await fs.writeFile(
      path.join(frameworkDir, "ai/registries/agents.json"),
      "{}",
    );
    await fs.writeFile(
      path.join(frameworkDir, "ai/context/business-basic.md"),
      "# Context",
    );
    await fs.writeFile(path.join(frameworkDir, "README.md"), "# Framework");

    // Create project structure
    await fs.ensureDir(path.join(projectDir, ".claude/skills"));
    await fs.ensureDir(path.join(projectDir, ".claude/commands"));

    engine = new SyncEngine(frameworkDir, projectDir);
  });

  afterEach(async () => {
    await sandbox.cleanup();
  });

  describe("syncCommands", () => {
    it("should sync cmd-*.md files to .claude/commands/", async () => {
      // Create test module with command files
      const backlogDir = path.join(testDir, "modules/backlog");
      await fs.ensureDir(path.join(backlogDir, "commands"));

      await fs.writeFile(
        path.join(backlogDir, "commands/cmd-backlog-create-ticket.md"),
        "# Create Ticket\n\nCreate a new backlog ticket",
      );

      await fs.writeFile(
        path.join(backlogDir, "commands/cmd-backlog-validate.md"),
        "# Validate Backlog\n\nValidate backlog structure",
      );

      const modules: ModuleManifest[] = [
        {
          id: "backlog",
          version: "1.0.0",
          provides: {
            agents: [],
            skills: [],
          },
          _sourcePath: backlogDir,
        },
      ];

      const items = await engine.syncCommands(modules);

      // Should have synced 2 commands
      expect(items).toHaveLength(2);
      expect(items.filter((i) => i.action === "updated")).toHaveLength(2);

      // Check command names
      const commandNames = items.map((i) => i.name);
      expect(commandNames).toContain("cmd-backlog-create-ticket");
      expect(commandNames).toContain("cmd-backlog-validate");

      // Verify files exist in target
      const targetDir = path.join(projectDir, ".claude/commands");
      expect(
        await fs.pathExists(
          path.join(targetDir, "cmd-backlog-create-ticket.md"),
        ),
      ).toBe(true);
      expect(
        await fs.pathExists(path.join(targetDir, "cmd-backlog-validate.md")),
      ).toBe(true);
    });

    it("should only sync files matching cmd-*.md pattern", async () => {
      const moduleDir = path.join(testDir, "modules/test");
      await fs.ensureDir(path.join(moduleDir, "commands"));

      // Create various files
      await fs.writeFile(
        path.join(moduleDir, "commands/cmd-valid-command.md"),
        "# Valid",
      );
      await fs.writeFile(
        path.join(moduleDir, "commands/not-command.md"),
        "# Not Command",
      );
      await fs.writeFile(
        path.join(moduleDir, "commands/README.md"),
        "# README",
      );
      await fs.writeFile(
        path.join(moduleDir, "commands/cmd-another.md"),
        "# Another",
      );
      await fs.writeFile(
        path.join(moduleDir, "commands/command-no-prefix.md"),
        "# No Prefix",
      );

      const modules: ModuleManifest[] = [
        {
          id: "test",
          version: "1.0.0",
          provides: { agents: [], skills: [] },
          _sourcePath: moduleDir,
        },
      ];

      const items = await engine.syncCommands(modules);

      // Should only sync cmd-*.md files
      expect(items).toHaveLength(2);

      const commandNames = items.map((i) => i.name);
      expect(commandNames).toContain("cmd-valid-command");
      expect(commandNames).toContain("cmd-another");

      // Verify in target
      const targetDir = path.join(projectDir, ".claude/commands");
      expect(
        await fs.pathExists(path.join(targetDir, "cmd-valid-command.md")),
      ).toBe(true);
      expect(await fs.pathExists(path.join(targetDir, "cmd-another.md"))).toBe(
        true,
      );
      expect(await fs.pathExists(path.join(targetDir, "not-command.md"))).toBe(
        false,
      );
      expect(await fs.pathExists(path.join(targetDir, "README.md"))).toBe(
        false,
      );
      expect(
        await fs.pathExists(path.join(targetDir, "command-no-prefix.md")),
      ).toBe(false);
    });

    it("should handle modules with no commands directory", async () => {
      const moduleDir = path.join(testDir, "modules/no-commands");
      await fs.ensureDir(moduleDir);

      const modules: ModuleManifest[] = [
        {
          id: "no-commands",
          version: "1.0.0",
          provides: { agents: [], skills: [] },
          _sourcePath: moduleDir,
        },
      ];

      const items = await engine.syncCommands(modules);

      expect(items).toHaveLength(0);
    });

    it("should handle modules with empty commands directory", async () => {
      const moduleDir = path.join(testDir, "modules/empty-commands");
      await fs.ensureDir(path.join(moduleDir, "commands"));

      const modules: ModuleManifest[] = [
        {
          id: "empty-commands",
          version: "1.0.0",
          provides: { agents: [], skills: [] },
          _sourcePath: moduleDir,
        },
      ];

      const items = await engine.syncCommands(modules);

      expect(items).toHaveLength(0);
    });

    it("should handle modules with no _sourcePath", async () => {
      const modules: ModuleManifest[] = [
        {
          id: "no-source",
          version: "1.0.0",
          provides: {
            agents: [],
            skills: [],
          },
          // No _sourcePath
        },
      ];

      const items = await engine.syncCommands(modules);

      // Should skip module without source path
      expect(items).toHaveLength(0);
    });

    it("should transform markdown links in command files", async () => {
      const moduleDir = path.join(testDir, "modules/test");
      const commandsDir = path.join(moduleDir, "commands");
      await fs.ensureDir(commandsDir);

      // Create a test file within the framework directory structure
      // so the link transformer recognizes it as a framework file
      const skillDir = path.join(
        frameworkDir,
        "modules/test/skills/test-skill",
      );
      await fs.ensureDir(skillDir);
      await fs.writeFile(path.join(skillDir, "SKILL.md"), "# Test Skill");

      // Calculate relative path from commands dir to skill file
      const relativeToSkill = path.relative(
        commandsDir,
        path.join(skillDir, "SKILL.md"),
      );

      await fs.writeFile(
        path.join(commandsDir, "cmd-test-command.md"),
        `# Test Command\n\nSee [skill](${relativeToSkill})`,
      );

      const modules: ModuleManifest[] = [
        {
          id: "test",
          version: "1.0.0",
          provides: { agents: [], skills: [] },
          _sourcePath: moduleDir,
        },
      ];

      await engine.syncCommands(modules);

      const targetDir = path.join(projectDir, ".claude/commands");
      const content = await fs.readFile(
        path.join(targetDir, "cmd-test-command.md"),
        "utf-8",
      );

      // Links to framework files should be preserved (relative paths are maintained
      // when source is within framework structure)
      expect(content).toContain("[skill]");
      expect(content).toContain("SKILL.md");
    });

    it("should sync commands from multiple modules", async () => {
      // Module 1: backlog
      const backlogDir = path.join(testDir, "modules/backlog");
      await fs.ensureDir(path.join(backlogDir, "commands"));
      await fs.writeFile(
        path.join(backlogDir, "commands/cmd-backlog-create-ticket.md"),
        "# Create Ticket",
      );

      // Module 2: confluence
      const confluenceDir = path.join(testDir, "modules/confluence");
      await fs.ensureDir(path.join(confluenceDir, "commands"));
      await fs.writeFile(
        path.join(confluenceDir, "commands/cmd-confluence-create-page.md"),
        "# Create Page",
      );

      const modules: ModuleManifest[] = [
        {
          id: "backlog",
          version: "1.0.0",
          provides: { agents: [], skills: [] },
          _sourcePath: backlogDir,
        },
        {
          id: "confluence",
          version: "1.0.0",
          provides: { agents: [], skills: [] },
          _sourcePath: confluenceDir,
        },
      ];

      const items = await engine.syncCommands(modules);

      // Should have synced 2 commands total
      expect(items).toHaveLength(2);

      const commandNames = items.map((i) => i.name);
      expect(commandNames).toContain("cmd-backlog-create-ticket");
      expect(commandNames).toContain("cmd-confluence-create-page");
    });

    it("should report synced items with correct metadata", async () => {
      const moduleDir = path.join(testDir, "modules/test");
      await fs.ensureDir(path.join(moduleDir, "commands"));
      await fs.writeFile(
        path.join(moduleDir, "commands/cmd-test-command.md"),
        "# Test",
      );

      const modules: ModuleManifest[] = [
        {
          id: "test",
          version: "1.0.0",
          provides: { agents: [], skills: [] },
          _sourcePath: moduleDir,
        },
      ];

      const items = await engine.syncCommands(modules);

      expect(items).toHaveLength(1);

      const item = items[0];
      expect(item).toHaveProperty("name", "cmd-test-command");
      expect(item).toHaveProperty("source");
      expect(item).toHaveProperty("target");
      expect(item).toHaveProperty("action", "updated");

      expect(item.source).toBe(
        path.join(moduleDir, "commands/cmd-test-command.md"),
      );
      expect(item.target).toBe(
        path.join(projectDir, ".claude/commands/cmd-test-command.md"),
      );
    });

    it("should overwrite existing command files", async () => {
      const moduleDir = path.join(testDir, "modules/test");
      await fs.ensureDir(path.join(moduleDir, "commands"));

      // Create initial command file
      await fs.writeFile(
        path.join(moduleDir, "commands/cmd-test-command.md"),
        "# Test Command v1",
      );

      const modules: ModuleManifest[] = [
        {
          id: "test",
          version: "1.0.0",
          provides: { agents: [], skills: [] },
          _sourcePath: moduleDir,
        },
      ];

      // First sync
      await engine.syncCommands(modules);

      // Verify initial content
      const targetPath = path.join(
        projectDir,
        ".claude/commands/cmd-test-command.md",
      );
      let content = await fs.readFile(targetPath, "utf-8");
      expect(content).toContain("v1");

      // Update source file
      await fs.writeFile(
        path.join(moduleDir, "commands/cmd-test-command.md"),
        "# Test Command v2",
      );

      // Second sync
      await engine.syncCommands(modules);

      // Verify updated content
      content = await fs.readFile(targetPath, "utf-8");
      expect(content).toContain("v2");
      expect(content).not.toContain("v1");
    });

    it("should handle command files with frontmatter", async () => {
      const moduleDir = path.join(testDir, "modules/test");
      await fs.ensureDir(path.join(moduleDir, "commands"));

      const commandContent = `---
command: cmd-test-command
cli-command: "agentic-framework test command"
module: test
type: create
---

# Test Command

Execute the test command.`;

      await fs.writeFile(
        path.join(moduleDir, "commands/cmd-test-command.md"),
        commandContent,
      );

      const modules: ModuleManifest[] = [
        {
          id: "test",
          version: "1.0.0",
          provides: { agents: [], skills: [] },
          _sourcePath: moduleDir,
        },
      ];

      await engine.syncCommands(modules);

      const targetPath = path.join(
        projectDir,
        ".claude/commands/cmd-test-command.md",
      );
      const content = await fs.readFile(targetPath, "utf-8");

      // Frontmatter should be preserved
      expect(content).toContain("---");
      expect(content).toContain("command: cmd-test-command");
      expect(content).toContain(
        'cli-command: "agentic-framework test command"',
      );
      expect(content).toContain("# Test Command");
    });

    it("should skip non-file entries in commands directory", async () => {
      const moduleDir = path.join(testDir, "modules/test");
      await fs.ensureDir(path.join(moduleDir, "commands"));

      // Create a subdirectory (should be skipped)
      await fs.ensureDir(path.join(moduleDir, "commands/cmd-subdirectory"));
      await fs.writeFile(
        path.join(moduleDir, "commands/cmd-subdirectory/file.md"),
        "# Should not sync",
      );

      // Create valid command file
      await fs.writeFile(
        path.join(moduleDir, "commands/cmd-valid.md"),
        "# Valid",
      );

      const modules: ModuleManifest[] = [
        {
          id: "test",
          version: "1.0.0",
          provides: { agents: [], skills: [] },
          _sourcePath: moduleDir,
        },
      ];

      const items = await engine.syncCommands(modules);

      // Should only sync the file, not the directory
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe("cmd-valid");
    });
  });

  describe("findCommandFiles", () => {
    it("should find all cmd-*.md files in directory", async () => {
      const moduleDir = path.join(testDir, "modules/test");
      const commandsDir = path.join(moduleDir, "commands");
      await fs.ensureDir(commandsDir);

      await fs.writeFile(path.join(commandsDir, "cmd-create.md"), "# Create");
      await fs.writeFile(
        path.join(commandsDir, "cmd-validate.md"),
        "# Validate",
      );
      await fs.writeFile(path.join(commandsDir, "cmd-sync.md"), "# Sync");
      await fs.writeFile(path.join(commandsDir, "not-command.md"), "# Not");

      const modules: ModuleManifest[] = [
        {
          id: "test",
          version: "1.0.0",
          provides: { agents: [], skills: [] },
          _sourcePath: moduleDir,
        },
      ];

      const items = await engine.syncCommands(modules);

      // Should find exactly 3 command files
      expect(items).toHaveLength(3);

      const names = items.map((i) => i.name).sort();
      expect(names).toEqual(["cmd-create", "cmd-sync", "cmd-validate"]);
    });

    it("should handle empty directory", async () => {
      const moduleDir = path.join(testDir, "modules/test");
      await fs.ensureDir(path.join(moduleDir, "commands"));

      const modules: ModuleManifest[] = [
        {
          id: "test",
          version: "1.0.0",
          provides: { agents: [], skills: [] },
          _sourcePath: moduleDir,
        },
      ];

      const items = await engine.syncCommands(modules);
      expect(items).toHaveLength(0);
    });
  });

  describe("syncAgents - dual deployment", () => {
    it("should deploy agents to both .claude/commands/ and .claude/agents/", async () => {
      const moduleDir = path.join(testDir, "modules/test");
      await fs.ensureDir(path.join(moduleDir, "agents"));

      await fs.writeFile(
        path.join(moduleDir, "agents/ai-test-agent.md"),
        "# Test Agent\n\nThis is a test agent.",
      );

      const modules: ModuleManifest[] = [
        {
          id: "test",
          version: "1.0.0",
          provides: { agents: ["ai-test-agent"], skills: [] },
          _sourcePath: moduleDir,
        },
      ];

      const items = await engine.syncAgents(modules);

      // Should report one agent synced
      expect(items).toHaveLength(1);
      expect(items[0].name).toBe("ai-test-agent");
      expect(items[0].action).toBe("updated");

      // Verify agent exists in both locations
      const commandsDir = path.join(projectDir, ".claude/commands");
      const agentsDir = path.join(projectDir, ".claude/agents");

      expect(
        await fs.pathExists(path.join(commandsDir, "ai-test-agent.md")),
      ).toBe(true);
      expect(
        await fs.pathExists(path.join(agentsDir, "ai-test-agent.md")),
      ).toBe(true);

      // Both copies should have the same content
      const commandsContent = await fs.readFile(
        path.join(commandsDir, "ai-test-agent.md"),
        "utf-8",
      );
      const agentsContent = await fs.readFile(
        path.join(agentsDir, "ai-test-agent.md"),
        "utf-8",
      );
      expect(commandsContent).toBe(agentsContent);
    });

    it("should deploy multiple agents to both directories", async () => {
      const moduleDir = path.join(testDir, "modules/coding");
      await fs.ensureDir(path.join(moduleDir, "agents"));

      await fs.writeFile(
        path.join(moduleDir, "agents/ai-architect.md"),
        "# Architect",
      );
      await fs.writeFile(
        path.join(moduleDir, "agents/ai-app-developer.md"),
        "# App Developer",
      );

      const modules: ModuleManifest[] = [
        {
          id: "coding",
          version: "1.0.0",
          provides: {
            agents: ["ai-architect", "ai-app-developer"],
            skills: [],
          },
          _sourcePath: moduleDir,
        },
      ];

      await engine.syncAgents(modules);

      const commandsDir = path.join(projectDir, ".claude/commands");
      const agentsDir = path.join(projectDir, ".claude/agents");

      expect(
        await fs.pathExists(path.join(commandsDir, "ai-architect.md")),
      ).toBe(true);
      expect(
        await fs.pathExists(path.join(commandsDir, "ai-app-developer.md")),
      ).toBe(true);
      expect(await fs.pathExists(path.join(agentsDir, "ai-architect.md"))).toBe(
        true,
      );
      expect(
        await fs.pathExists(path.join(agentsDir, "ai-app-developer.md")),
      ).toBe(true);
    });
  });

  describe("syncAgents - partial failure resilience", () => {
    it("should still deploy to .claude/commands/ when .claude/agents/ copy fails", async () => {
      const moduleDir = path.join(testDir, "modules/test");
      await fs.ensureDir(path.join(moduleDir, "agents"));

      await fs.writeFile(
        path.join(moduleDir, "agents/ai-test-agent.md"),
        "# Test Agent\n\nThis is a test agent.",
      );

      const modules: ModuleManifest[] = [
        {
          id: "test",
          version: "1.0.0",
          provides: { agents: ["ai-test-agent"], skills: [] },
          _sourcePath: moduleDir,
        },
      ];

      // Spy on fs.ensureDir to throw when creating .claude/agents directory
      const originalEnsureDir = fs.ensureDir.bind(fs);
      const ensureDirSpy = jest
        .spyOn(fs, "ensureDir")
        .mockImplementation(async (dir: string) => {
          if (typeof dir === "string" && dir.includes(".claude/agents")) {
            throw new Error("Simulated agents dir failure");
          }
          return originalEnsureDir(dir);
        });

      // Suppress console.warn for the expected warning
      const warnSpy = jest.spyOn(console, "warn").mockImplementation(() => {});

      try {
        const items = await engine.syncAgents(modules);

        // Should still report the agent as synced (primary deployment succeeded)
        expect(items).toHaveLength(1);
        expect(items[0].name).toBe("ai-test-agent");
        expect(items[0].action).toBe("updated");

        // Verify agent exists in .claude/commands/ (primary)
        const commandsDir = path.join(projectDir, ".claude/commands");
        expect(
          await fs.pathExists(path.join(commandsDir, "ai-test-agent.md")),
        ).toBe(true);

        // Warning should have been logged
        expect(warnSpy).toHaveBeenCalledWith(
          expect.stringContaining(
            "Failed to deploy ai-test-agent to .claude/agents/",
          ),
        );
      } finally {
        ensureDirSpy.mockRestore();
        warnSpy.mockRestore();
      }
    });
  });

  describe("checkSync - commands", () => {
    it("should detect commands needing sync", async () => {
      const moduleDir = path.join(testDir, "modules/test");
      await fs.ensureDir(path.join(moduleDir, "commands"));

      await fs.writeFile(
        path.join(moduleDir, "commands/cmd-test.md"),
        "# Test Command",
      );

      const modules: ModuleManifest[] = [
        {
          id: "test",
          version: "1.0.0",
          provides: { agents: [], skills: [] },
          _sourcePath: moduleDir,
        },
      ];

      // Check before sync
      const checkBefore = await engine.checkSync(modules);
      expect(checkBefore.inSync).toBe(false);
      expect(checkBefore.commandsNeedSync).toContain("cmd-test");

      // Sync
      await engine.syncCommands(modules);

      // Check after sync
      const checkAfter = await engine.checkSync(modules);
      expect(checkAfter.inSync).toBe(true);
      expect(checkAfter.commandsNeedSync).toHaveLength(0);
    });

    it("should detect when command file is modified", async () => {
      const moduleDir = path.join(testDir, "modules/test");
      await fs.ensureDir(path.join(moduleDir, "commands"));

      await fs.writeFile(
        path.join(moduleDir, "commands/cmd-test.md"),
        "# Test v1",
      );

      const modules: ModuleManifest[] = [
        {
          id: "test",
          version: "1.0.0",
          provides: { agents: [], skills: [] },
          _sourcePath: moduleDir,
        },
      ];

      // Initial sync
      await engine.syncCommands(modules);

      // Verify in sync
      let check = await engine.checkSync(modules);
      expect(check.inSync).toBe(true);

      // Modify source file
      await fs.writeFile(
        path.join(moduleDir, "commands/cmd-test.md"),
        "# Test v2 - modified",
      );

      // Should detect out of sync
      check = await engine.checkSync(modules);
      expect(check.inSync).toBe(false);
      expect(check.commandsNeedSync).toContain("cmd-test");
    });
  });

  describe("syncAll - commands integration", () => {
    it("should include commands in syncAll report", async () => {
      const moduleDir = path.join(testDir, "modules/test");
      await fs.ensureDir(path.join(moduleDir, "commands"));

      await fs.writeFile(
        path.join(moduleDir, "commands/cmd-test.md"),
        "# Test Command",
      );

      const modules: ModuleManifest[] = [
        {
          id: "test",
          version: "1.0.0",
          provides: { agents: [], skills: [] },
          _sourcePath: moduleDir,
        },
      ];

      const report = await engine.syncAll(modules);

      // Report should include commands
      expect(report).toHaveProperty("commands");
      expect(report.commands).toHaveLength(1);
      expect(report.commands[0].name).toBe("cmd-test");

      // Stats should include command count
      expect(report.stats).toHaveProperty("commandsSynced");
      expect(report.stats.commandsSynced).toBe(1);
    });

    it("should sync commands alongside agents and skills", async () => {
      const moduleDir = path.join(testDir, "modules/test");

      // Create agents
      await fs.ensureDir(path.join(moduleDir, "agents"));
      await fs.writeFile(
        path.join(moduleDir, "agents/ai-test-agent.md"),
        "# Test Agent",
      );

      // Create skills
      await fs.ensureDir(path.join(moduleDir, "skills/test-skill"));
      await fs.writeFile(
        path.join(moduleDir, "skills/test-skill/SKILL.md"),
        "# Test Skill",
      );

      // Create commands
      await fs.ensureDir(path.join(moduleDir, "commands"));
      await fs.writeFile(
        path.join(moduleDir, "commands/cmd-test-command.md"),
        "# Test Command",
      );

      const modules: ModuleManifest[] = [
        {
          id: "test",
          version: "1.0.0",
          provides: { agents: ["ai-test-agent"], skills: ["test-skill"] },
          _sourcePath: moduleDir,
        },
      ];

      const report = await engine.syncAll(modules);

      // All three should be synced
      expect(report.skills).toHaveLength(1);
      expect(report.agents).toHaveLength(1);
      expect(report.commands).toHaveLength(1);

      expect(report.stats.skillsSynced).toBe(1);
      expect(report.stats.agentsSynced).toBe(1);
      expect(report.stats.commandsSynced).toBe(1);

      // Verify files exist in both .claude/commands/ and .claude/agents/
      const commandsDir = path.join(projectDir, ".claude/commands");
      expect(
        await fs.pathExists(path.join(commandsDir, "ai-test-agent.md")),
      ).toBe(true);
      expect(
        await fs.pathExists(path.join(commandsDir, "cmd-test-command.md")),
      ).toBe(true);

      const agentsDir = path.join(projectDir, ".claude/agents");
      expect(
        await fs.pathExists(path.join(agentsDir, "ai-test-agent.md")),
      ).toBe(true);

      const skillsDir = path.join(projectDir, ".claude/skills");
      expect(
        await fs.pathExists(path.join(skillsDir, "test-skill/SKILL.md")),
      ).toBe(true);
    });

    it("should count skipped commands in stats", async () => {
      const moduleDir = path.join(testDir, "modules/test");
      await fs.ensureDir(path.join(moduleDir, "commands"));

      // Create a command that will succeed
      await fs.writeFile(
        path.join(moduleDir, "commands/cmd-valid.md"),
        "# Valid",
      );

      const modules: ModuleManifest[] = [
        {
          id: "test",
          version: "1.0.0",
          provides: { agents: [], skills: [] },
          _sourcePath: moduleDir,
        },
      ];

      const report = await engine.syncAll(modules);

      // All commands should be synced (not skipped)
      const skippedCommands = report.commands.filter(
        (c) => c.action === "skipped",
      );
      expect(skippedCommands).toHaveLength(0);

      // Stats should reflect successful sync
      expect(report.stats.commandsSynced).toBe(1);
    });
  });
});
