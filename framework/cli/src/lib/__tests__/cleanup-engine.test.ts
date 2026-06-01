import fs from "fs-extra";
import path from "path";
import os from "os";
import { CleanupEngine } from "../cleanup-engine.js";
import type { ModuleManifest } from "../module-loader.js";

describe("CleanupEngine", () => {
  let testDir: string;
  let projectPath: string;

  beforeEach(async () => {
    // Create temp directory for tests
    testDir = await fs.mkdtemp(path.join(os.tmpdir(), "cleanup-engine-test-"));
    projectPath = path.join(testDir, "test-project");
    await fs.ensureDir(projectPath);

    // Create project structure
    await fs.ensureDir(path.join(projectPath, ".claude/commands"));
    await fs.ensureDir(path.join(projectPath, ".claude/agents"));
    await fs.ensureDir(path.join(projectPath, ".claude/skills"));
    await fs.ensureDir(path.join(projectPath, ".claude/templates"));
    await fs.ensureDir(path.join(projectPath, ".claude/registries/schemas"));
    await fs.ensureDir(path.join(projectPath, "src"));
  });

  afterEach(async () => {
    // Clean up temp directory
    await fs.remove(testDir);
  });

  describe("previewCleanup", () => {
    it("should preview agents to be removed", async () => {
      const module: ModuleManifest = {
        id: "test-module",
        name: "Test Module",
        version: "1.0.0",
        description: "Test module",
        provides: {
          agents: ["ai-test-agent", "ai-another-agent"],
        },
      };

      const engine = new CleanupEngine(projectPath, true);
      const preview = await engine.previewCleanup(module);

      expect(preview.agents).toEqual(["ai-test-agent", "ai-another-agent"]);
    });

    it("should preview skills to be removed with warning", async () => {
      const module: ModuleManifest = {
        id: "test-module",
        name: "Test Module",
        version: "1.0.0",
        description: "Test module",
        provides: {
          skills: ["test-skill", "another-skill"],
        },
      };

      const engine = new CleanupEngine(projectPath, true);
      const preview = await engine.previewCleanup(module);

      expect(preview.skills).toEqual(["test-skill", "another-skill"]);
      expect(preview.warnings).toHaveLength(1);
      expect(preview.warnings[0]).toContain("may be shared");
    });

    it("should preview templates if directory exists", async () => {
      const module: ModuleManifest = {
        id: "test-module",
        name: "Test Module",
        version: "1.0.0",
        description: "Test module",
        provides: {},
      };

      // Create templates directory
      await fs.ensureDir(
        path.join(projectPath, ".claude/templates/test-module"),
      );

      const engine = new CleanupEngine(projectPath, true);
      const preview = await engine.previewCleanup(module);

      expect(preview.templates).toEqual([".claude/templates/test-module/"]);
    });

    it("should preview schemas if directory exists", async () => {
      const module: ModuleManifest = {
        id: "test-module",
        name: "Test Module",
        version: "1.0.0",
        description: "Test module",
        provides: {},
      };

      // Create schemas directory
      await fs.ensureDir(
        path.join(projectPath, ".claude/registries/schemas/test-module"),
      );

      const engine = new CleanupEngine(projectPath, true);
      const preview = await engine.previewCleanup(module);

      expect(preview.schemas).toEqual([
        ".claude/registries/schemas/test-module/",
      ]);
    });

    it("should preview scripts if directory exists", async () => {
      const module: ModuleManifest = {
        id: "test-module",
        name: "Test Module",
        version: "1.0.0",
        description: "Test module",
        provides: {},
      };

      // Create scripts directory
      await fs.ensureDir(path.join(projectPath, "src/test-module"));

      const engine = new CleanupEngine(projectPath, true);
      const preview = await engine.previewCleanup(module);

      expect(preview.scripts).toEqual(["src/test-module/"]);
    });
  });

  describe("cleanupAgents", () => {
    it("should remove agent markdown files from .claude/commands/", async () => {
      // Create test agent files
      await fs.writeFile(
        path.join(projectPath, ".claude/commands/ai-test-agent.md"),
        "Test agent content",
      );

      const engine = new CleanupEngine(projectPath, false);
      const result = await engine.cleanupAgents(["ai-test-agent"]);

      expect(result.files).toContain(".claude/commands/ai-test-agent.md");
      expect(
        await fs.pathExists(
          path.join(projectPath, ".claude/commands/ai-test-agent.md"),
        ),
      ).toBe(false);
    });

    it("should remove agent markdown files from .claude/agents/", async () => {
      // Create test agent file in agents directory
      await fs.writeFile(
        path.join(projectPath, ".claude/agents/ai-test-agent.md"),
        "Test agent content",
      );

      const engine = new CleanupEngine(projectPath, false);
      const result = await engine.cleanupAgents(["ai-test-agent"]);

      expect(result.files).toContain(".claude/agents/ai-test-agent.md");
      expect(
        await fs.pathExists(
          path.join(projectPath, ".claude/agents/ai-test-agent.md"),
        ),
      ).toBe(false);
    });

    it("should handle missing agent files gracefully", async () => {
      const engine = new CleanupEngine(projectPath, false);
      const result = await engine.cleanupAgents(["ai-nonexistent"]);

      expect(result.files).toHaveLength(0);
    });

    it("should not remove files in dry-run mode", async () => {
      await fs.writeFile(
        path.join(projectPath, ".claude/commands/ai-test-agent.md"),
        "Test agent content",
      );

      const engine = new CleanupEngine(projectPath, true);
      await engine.cleanupAgents(["ai-test-agent"]);

      expect(
        await fs.pathExists(
          path.join(projectPath, ".claude/commands/ai-test-agent.md"),
        ),
      ).toBe(true);
    });
  });

  describe("cleanupSkills", () => {
    it("should remove skill directories from .claude/skills/", async () => {
      // Create test skill directory
      await fs.ensureDir(path.join(projectPath, ".claude/skills/test-skill"));
      await fs.writeFile(
        path.join(projectPath, ".claude/skills/test-skill/SKILL.md"),
        "Test skill",
      );

      const engine = new CleanupEngine(projectPath, false);
      const result = await engine.cleanupSkills(["test-skill"]);

      expect(result.directories).toContain(".claude/skills/test-skill");
      expect(
        await fs.pathExists(
          path.join(projectPath, ".claude/skills/test-skill"),
        ),
      ).toBe(false);
    });

    it("should handle missing skill directories gracefully", async () => {
      const engine = new CleanupEngine(projectPath, false);
      const result = await engine.cleanupSkills(["nonexistent-skill"]);

      expect(result.directories).toHaveLength(0);
    });

    it("should not remove directories in dry-run mode", async () => {
      await fs.ensureDir(path.join(projectPath, ".claude/skills/test-skill"));

      const engine = new CleanupEngine(projectPath, true);
      await engine.cleanupSkills(["test-skill"]);

      expect(
        await fs.pathExists(
          path.join(projectPath, ".claude/skills/test-skill"),
        ),
      ).toBe(true);
    });
  });

  describe("cleanupTemplates", () => {
    it("should remove module template directory", async () => {
      // Create test template directory
      await fs.ensureDir(
        path.join(projectPath, ".claude/templates/test-module"),
      );
      await fs.writeFile(
        path.join(projectPath, ".claude/templates/test-module/template.txt"),
        "Template content",
      );

      const engine = new CleanupEngine(projectPath, false);
      const result = await engine.cleanupTemplates("test-module");

      expect(result.directories).toContain(".claude/templates/test-module");
      expect(
        await fs.pathExists(
          path.join(projectPath, ".claude/templates/test-module"),
        ),
      ).toBe(false);
    });

    it("should handle missing template directory gracefully", async () => {
      const engine = new CleanupEngine(projectPath, false);
      const result = await engine.cleanupTemplates("nonexistent-module");

      expect(result.directories).toHaveLength(0);
    });

    it("should not remove directories in dry-run mode", async () => {
      await fs.ensureDir(
        path.join(projectPath, ".claude/templates/test-module"),
      );

      const engine = new CleanupEngine(projectPath, true);
      await engine.cleanupTemplates("test-module");

      expect(
        await fs.pathExists(
          path.join(projectPath, ".claude/templates/test-module"),
        ),
      ).toBe(true);
    });
  });

  describe("cleanupSchemas", () => {
    it("should remove module schema directory", async () => {
      // Create test schema directory
      await fs.ensureDir(
        path.join(projectPath, ".claude/registries/schemas/test-module"),
      );
      await fs.writeFile(
        path.join(
          projectPath,
          ".claude/registries/schemas/test-module/schema.json",
        ),
        JSON.stringify({ type: "object" }),
      );

      const engine = new CleanupEngine(projectPath, false);
      const result = await engine.cleanupSchemas("test-module");

      expect(result.directories).toContain(
        ".claude/registries/schemas/test-module",
      );
      expect(
        await fs.pathExists(
          path.join(projectPath, ".claude/registries/schemas/test-module"),
        ),
      ).toBe(false);
    });

    it("should handle missing schema directory gracefully", async () => {
      const engine = new CleanupEngine(projectPath, false);
      const result = await engine.cleanupSchemas("nonexistent-module");

      expect(result.directories).toHaveLength(0);
    });

    it("should not remove directories in dry-run mode", async () => {
      await fs.ensureDir(
        path.join(projectPath, ".claude/registries/schemas/test-module"),
      );

      const engine = new CleanupEngine(projectPath, true);
      await engine.cleanupSchemas("test-module");

      expect(
        await fs.pathExists(
          path.join(projectPath, ".claude/registries/schemas/test-module"),
        ),
      ).toBe(true);
    });
  });

  describe("cleanupScripts", () => {
    it("should remove module scripts directory", async () => {
      // Create test scripts directory
      await fs.ensureDir(path.join(projectPath, "src/test-module"));
      await fs.writeFile(
        path.join(projectPath, "src/test-module/script.ts"),
        'export const test = "test";',
      );

      const engine = new CleanupEngine(projectPath, false);
      const result = await engine.cleanupScripts("test-module");

      expect(result.directories).toContain("src/test-module");
      expect(
        await fs.pathExists(path.join(projectPath, "src/test-module")),
      ).toBe(false);
    });

    it("should handle missing scripts directory gracefully", async () => {
      const engine = new CleanupEngine(projectPath, false);
      const result = await engine.cleanupScripts("nonexistent-module");

      expect(result.directories).toHaveLength(0);
    });

    it("should not remove directories in dry-run mode", async () => {
      await fs.ensureDir(path.join(projectPath, "src/test-module"));

      const engine = new CleanupEngine(projectPath, true);
      await engine.cleanupScripts("test-module");

      expect(
        await fs.pathExists(path.join(projectPath, "src/test-module")),
      ).toBe(true);
    });
  });

  describe("cleanupModule", () => {
    it("should clean up all artifacts for a module", async () => {
      const module: ModuleManifest = {
        id: "test-module",
        name: "Test Module",
        version: "1.0.0",
        description: "Test module",
        provides: {
          agents: ["ai-test-agent"],
          skills: ["test-skill"],
        },
      };

      // Create all artifact types (agents deploy to both commands/ and agents/)
      await fs.writeFile(
        path.join(projectPath, ".claude/commands/ai-test-agent.md"),
        "Agent",
      );
      await fs.writeFile(
        path.join(projectPath, ".claude/agents/ai-test-agent.md"),
        "Agent",
      );
      await fs.ensureDir(path.join(projectPath, ".claude/skills/test-skill"));
      await fs.ensureDir(
        path.join(projectPath, ".claude/templates/test-module"),
      );
      await fs.ensureDir(
        path.join(projectPath, ".claude/registries/schemas/test-module"),
      );
      await fs.ensureDir(path.join(projectPath, "src/test-module"));

      const engine = new CleanupEngine(projectPath, false);
      const result = await engine.cleanupModule(module);

      // Verify all were removed
      expect(result.files.length + result.directories.length).toBeGreaterThan(
        0,
      );
      expect(
        await fs.pathExists(
          path.join(projectPath, ".claude/commands/ai-test-agent.md"),
        ),
      ).toBe(false);
      expect(
        await fs.pathExists(
          path.join(projectPath, ".claude/agents/ai-test-agent.md"),
        ),
      ).toBe(false);
      expect(
        await fs.pathExists(
          path.join(projectPath, ".claude/skills/test-skill"),
        ),
      ).toBe(false);
      expect(
        await fs.pathExists(
          path.join(projectPath, ".claude/templates/test-module"),
        ),
      ).toBe(false);
      expect(
        await fs.pathExists(
          path.join(projectPath, ".claude/registries/schemas/test-module"),
        ),
      ).toBe(false);
      expect(
        await fs.pathExists(path.join(projectPath, "src/test-module")),
      ).toBe(false);
    });

    it("should aggregate all removed items", async () => {
      const module: ModuleManifest = {
        id: "test-module",
        name: "Test Module",
        version: "1.0.0",
        description: "Test module",
        provides: {
          agents: ["ai-agent-1", "ai-agent-2"],
          skills: ["skill-1", "skill-2"],
        },
      };

      // Create agents (dual deployment: commands/ and agents/)
      await fs.writeFile(
        path.join(projectPath, ".claude/commands/ai-agent-1.md"),
        "Agent 1",
      );
      await fs.writeFile(
        path.join(projectPath, ".claude/commands/ai-agent-2.md"),
        "Agent 2",
      );
      await fs.writeFile(
        path.join(projectPath, ".claude/agents/ai-agent-1.md"),
        "Agent 1",
      );
      await fs.writeFile(
        path.join(projectPath, ".claude/agents/ai-agent-2.md"),
        "Agent 2",
      );

      // Create skills
      await fs.ensureDir(path.join(projectPath, ".claude/skills/skill-1"));
      await fs.ensureDir(path.join(projectPath, ".claude/skills/skill-2"));

      const engine = new CleanupEngine(projectPath, false);
      const result = await engine.cleanupModule(module);

      expect(result.files).toHaveLength(4); // 2 agents x 2 locations (commands/ + agents/)
      expect(result.directories).toHaveLength(2); // 2 skills
    });
  });

  describe("isProtectedFolder", () => {
    it("should protect context folder", () => {
      expect(CleanupEngine.isProtectedFolder("context")).toBe(true);
      expect(CleanupEngine.isProtectedFolder(".claude/context")).toBe(true);
    });

    it("should protect hooks folder", () => {
      expect(CleanupEngine.isProtectedFolder("hooks")).toBe(true);
      expect(CleanupEngine.isProtectedFolder(".claude/hooks")).toBe(true);
    });

    it("should not protect other folders", () => {
      expect(CleanupEngine.isProtectedFolder("skills")).toBe(false);
      expect(CleanupEngine.isProtectedFolder("templates")).toBe(false);
    });
  });
});
