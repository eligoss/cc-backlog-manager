import fs from "fs-extra";
import path from "path";
import os from "os";
import { removeCommand } from "../remove.js";
import type { ModuleManifest } from "../../lib/module-loader.js";

// Mock module loader
jest.mock("../../lib/module-loader.js", () => ({
  loadModule: jest.fn(),
  getOptionalDependents: jest.fn().mockResolvedValue([]),
}));

// Mock inquirer to avoid interactive prompts in tests
jest.mock("inquirer", () => ({
  default: {
    prompt: jest.fn().mockResolvedValue({ confirm: true }),
  },
}));

// Mock telemetry
jest.mock("../../lib/telemetry/instrumentation/cli-instrumentation.js", () => ({
  recordCLICommand: jest.fn().mockResolvedValue(undefined),
}));

// Mock registry generator
jest.mock("../../lib/registry-generator.js", () => ({
  generateRegistries: jest.fn().mockResolvedValue(undefined),
}));

describe("remove command", () => {
  let testDir: string;
  let projectPath: string;
  let consoleErrorSpy: jest.SpyInstance;
  const { loadModule } = jest.requireMock("../../lib/module-loader.js");

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "remove-cmd-test-"));
    projectPath = path.join(testDir, "test-project");
    await fs.ensureDir(projectPath);

    // Suppress expected console.error calls from error testing
    consoleErrorSpy = jest.spyOn(console, "error").mockImplementation();

    // Set up loadModule mock to return backlog module by default
    const backlogModule: ModuleManifest = {
      id: "backlog",
      name: "Backlog",
      version: "1.0.0",
      description: "Backlog management module",
      provides: {
        agents: ["ai-backlog-manager"],
        skills: ["organizing-backlog"],
      },
    };
    loadModule.mockResolvedValue(backlogModule);

    // Create minimal project structure
    await fs.writeFile(path.join(projectPath, "CLAUDE.md"), "# Test Project");
    await fs.ensureDir(path.join(projectPath, ".claude/commands"));
    await fs.ensureDir(path.join(projectPath, ".claude/agents"));
    await fs.ensureDir(path.join(projectPath, ".claude/skills"));
    await fs.ensureDir(path.join(projectPath, ".claude/templates"));
    await fs.ensureDir(path.join(projectPath, ".claude/registries/schemas"));
    await fs.ensureDir(path.join(projectPath, "src"));

    // Create manifest with test module
    const manifest = {
      framework: {
        version: "1.0.0",
        installedAt: new Date().toISOString(),
      },
      modules: {
        backlog: {
          version: "1.0.0",
          installedAt: new Date().toISOString(),
        },
      },
    };
    await fs.writeJson(
      path.join(projectPath, ".agentic-framework.json"),
      manifest,
    );

    // Create backlog module artifacts
    await fs.writeFile(
      path.join(projectPath, ".claude/commands/ai-backlog-manager.md"),
      "# Backlog Manager",
    );
    await fs.ensureDir(
      path.join(projectPath, ".claude/skills/organizing-backlog"),
    );
    await fs.writeFile(
      path.join(projectPath, ".claude/skills/organizing-backlog/SKILL.md"),
      "# Organizing Backlog Skill",
    );
    await fs.ensureDir(path.join(projectPath, ".claude/templates/backlog"));
    await fs.writeFile(
      path.join(projectPath, ".claude/templates/backlog/template.md"),
      "Template",
    );
    await fs.ensureDir(
      path.join(projectPath, ".claude/registries/schemas/backlog"),
    );
    await fs.writeFile(
      path.join(projectPath, ".claude/registries/schemas/backlog/schema.json"),
      "{}",
    );
    await fs.ensureDir(path.join(projectPath, "src/backlog"));
    await fs.writeFile(
      path.join(projectPath, "src/backlog/index.ts"),
      'export const test = "test";',
    );
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(testDir);
    jest.clearAllMocks();
    consoleErrorSpy.mockRestore();
  });

  it("should remove module and all its artifacts", async () => {
    await removeCommand("backlog", {
      path: projectPath,
      force: true,
    });

    // Verify agent removed
    expect(
      await fs.pathExists(
        path.join(projectPath, ".claude/commands/ai-backlog-manager.md"),
      ),
    ).toBe(false);

    // Verify skill removed
    expect(
      await fs.pathExists(
        path.join(projectPath, ".claude/skills/organizing-backlog"),
      ),
    ).toBe(false);

    // Verify templates removed
    expect(
      await fs.pathExists(path.join(projectPath, ".claude/templates/backlog")),
    ).toBe(false);

    // Verify schemas removed
    expect(
      await fs.pathExists(
        path.join(projectPath, ".claude/registries/schemas/backlog"),
      ),
    ).toBe(false);

    // Verify scripts removed
    expect(await fs.pathExists(path.join(projectPath, "src/backlog"))).toBe(
      false,
    );

    // Verify manifest updated
    const manifest = await fs.readJson(
      path.join(projectPath, ".agentic-framework.json"),
    );
    expect(manifest.modules).not.toHaveProperty("backlog");
  });

  it("should handle dry-run mode without removing files", async () => {
    await removeCommand("backlog", {
      path: projectPath,
      force: true,
      dryRun: true,
    });

    // Verify nothing was removed
    expect(
      await fs.pathExists(
        path.join(projectPath, ".claude/commands/ai-backlog-manager.md"),
      ),
    ).toBe(true);
    expect(
      await fs.pathExists(
        path.join(projectPath, ".claude/skills/organizing-backlog"),
      ),
    ).toBe(true);
    expect(
      await fs.pathExists(path.join(projectPath, ".claude/templates/backlog")),
    ).toBe(true);
    expect(
      await fs.pathExists(
        path.join(projectPath, ".claude/registries/schemas/backlog"),
      ),
    ).toBe(true);
    expect(await fs.pathExists(path.join(projectPath, "src/backlog"))).toBe(
      true,
    );

    // Verify manifest unchanged
    const manifest = await fs.readJson(
      path.join(projectPath, ".agentic-framework.json"),
    );
    expect(manifest.modules).toHaveProperty("backlog");
  });

  it("should remove agent files from .claude/agents/", async () => {
    // Create agent file in agents directory (dual deployment)
    await fs.writeFile(
      path.join(projectPath, ".claude/agents/ai-backlog-manager.md"),
      "# Backlog Manager Agent",
    );

    await removeCommand("backlog", {
      path: projectPath,
      force: true,
    });

    // Verify agent removed from agents directory
    expect(
      await fs.pathExists(
        path.join(projectPath, ".claude/agents/ai-backlog-manager.md"),
      ),
    ).toBe(false);
  });

  it("should handle missing artifacts gracefully", async () => {
    // Remove some artifacts before running command
    await fs.remove(path.join(projectPath, ".claude/templates/backlog"));
    await fs.remove(path.join(projectPath, "src/backlog"));

    // Should not throw
    await expect(
      removeCommand("backlog", {
        path: projectPath,
        force: true,
      }),
    ).resolves.not.toThrow();

    // Verify remaining artifacts still removed
    expect(
      await fs.pathExists(
        path.join(projectPath, ".claude/commands/ai-backlog-manager.md"),
      ),
    ).toBe(false);
    expect(
      await fs.pathExists(
        path.join(projectPath, ".claude/skills/organizing-backlog"),
      ),
    ).toBe(false);
  });

  it("should fail if project does not exist", async () => {
    const nonExistentPath = path.join(testDir, "nonexistent");

    // Mock process.exit to catch the exit call
    const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    await expect(
      removeCommand("backlog", {
        path: nonExistentPath,
        force: true,
      }),
    ).rejects.toThrow("process.exit called");

    exitSpy.mockRestore();
  });

  it("should fail in non-TTY environment without --force", async () => {
    // Mock process.stdin.isTTY
    const originalIsTTY = process.stdin.isTTY;
    Object.defineProperty(process.stdin, "isTTY", {
      value: false,
      writable: true,
    });

    const exitSpy = jest.spyOn(process, "exit").mockImplementation(() => {
      throw new Error("process.exit called");
    });

    await expect(
      removeCommand("backlog", {
        path: projectPath,
        force: false,
      }),
    ).rejects.toThrow("process.exit called");

    // Restore
    Object.defineProperty(process.stdin, "isTTY", {
      value: originalIsTTY,
      writable: true,
    });
    exitSpy.mockRestore();
  });

  it("should handle core module removal with warnings", async () => {
    // Add core module to manifest
    const manifest = await fs.readJson(
      path.join(projectPath, ".agentic-framework.json"),
    );
    manifest.modules["core"] = {
      version: "1.0.0",
      installedAt: new Date().toISOString(),
    };
    await fs.writeJson(
      path.join(projectPath, ".agentic-framework.json"),
      manifest,
    );

    // Create core artifacts
    await fs.writeFile(
      path.join(projectPath, ".claude/commands/ai-framework-manager.md"),
      "# Framework Manager",
    );

    // Mock loadModule for core
    const coreModule: ModuleManifest = {
      id: "core",
      name: "Core",
      version: "1.0.0",
      description: "Core framework module",
      provides: {
        agents: ["ai-framework-manager"],
      },
    };
    loadModule.mockResolvedValueOnce(coreModule);

    await removeCommand("core", {
      path: projectPath,
      force: true,
    });

    // Verify core removed
    expect(
      await fs.pathExists(
        path.join(projectPath, ".claude/commands/ai-framework-manager.md"),
      ),
    ).toBe(false);
    const updatedManifest = await fs.readJson(
      path.join(projectPath, ".agentic-framework.json"),
    );
    expect(updatedManifest.modules).not.toHaveProperty("core");
  });

  it("should regenerate registries after removal", async () => {
    const { generateRegistries } = jest.requireMock(
      "../../lib/registry-generator.js",
    );

    await removeCommand("backlog", {
      path: projectPath,
      force: true,
    });

    // Verify generateRegistries was called
    expect(generateRegistries).toHaveBeenCalled();
  });

  it("should not remove protected folders", async () => {
    // Create protected folders with content
    await fs.ensureDir(path.join(projectPath, ".claude/context"));
    await fs.writeFile(
      path.join(projectPath, ".claude/context/business-basic.md"),
      "Business context",
    );
    await fs.ensureDir(path.join(projectPath, ".claude/hooks"));
    await fs.writeFile(
      path.join(projectPath, ".claude/hooks/pre-commit.sh"),
      'echo "hook"',
    );

    await removeCommand("backlog", {
      path: projectPath,
      force: true,
    });

    // Verify protected folders still exist
    expect(await fs.pathExists(path.join(projectPath, ".claude/context"))).toBe(
      true,
    );
    expect(
      await fs.pathExists(
        path.join(projectPath, ".claude/context/business-basic.md"),
      ),
    ).toBe(true);
    expect(await fs.pathExists(path.join(projectPath, ".claude/hooks"))).toBe(
      true,
    );
    expect(
      await fs.pathExists(
        path.join(projectPath, ".claude/hooks/pre-commit.sh"),
      ),
    ).toBe(true);
  });
});
