/**
 * Tests for project-knowledge copy-once behavior in SyncEngine.syncSkills.
 *
 * Uses real temp directories (not the mocked-fs suite) so the guard's
 * frontmatter read + target existence check are exercised end to end.
 */

import { SyncEngine } from "../sync-engine.js";
import type { ModuleManifest } from "../module-loader.js";
import fs from "fs-extra";
import path from "path";
import os from "os";

describe("SyncEngine project-knowledge copy-once", () => {
  let frameworkRoot: string;
  let projectPath: string;
  let engine: SyncEngine;
  let module: ModuleManifest;

  beforeEach(async () => {
    frameworkRoot = await fs.mkdtemp(path.join(os.tmpdir(), "pk-fw-"));
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "pk-proj-"));
    engine = new SyncEngine(frameworkRoot, projectPath);
    const sourcePath = path.join(frameworkRoot, "modules", "core");
    await fs.ensureDir(path.join(sourcePath, "skills"));
    module = { id: "core", version: "1.0.0", _sourcePath: sourcePath };
  });

  afterEach(async () => {
    await fs.remove(frameworkRoot);
    await fs.remove(projectPath);
  });

  it("does not overwrite an existing project-knowledge skill on re-sync", async () => {
    const skillSrc = path.join(
      module._sourcePath!,
      "skills",
      "knowing-the-codebase",
    );
    await fs.ensureDir(skillSrc);
    await fs.writeFile(
      path.join(skillSrc, "SKILL.md"),
      "---\nid: knowing-the-codebase\nname: knowing-the-codebase\nproject-knowledge: true\ncapabilities-provided:\n  - codebase-knowledge\n---\n# Template body\n",
    );

    // First sync deploys the template
    await engine.syncSkills([module]);
    const target = path.join(
      projectPath,
      ".claude/skills/knowing-the-codebase/SKILL.md",
    );
    expect(await fs.pathExists(target)).toBe(true);

    // User fills it in
    await fs.writeFile(
      target,
      "# Filled in by the user\nReal project knowledge.\n",
    );

    // Re-sync must NOT clobber it
    const items = await engine.syncSkills([module]);
    const content = await fs.readFile(target, "utf-8");
    expect(content).toContain("Filled in by the user");
    expect(
      items.find((i) => i.name === "knowing-the-codebase")?.action,
    ).toBe("skipped");
  });

  it("still overwrites a normal (non-project-knowledge) skill on re-sync", async () => {
    const skillSrc = path.join(module._sourcePath!, "skills", "committing-code");
    await fs.ensureDir(skillSrc);
    await fs.writeFile(
      path.join(skillSrc, "SKILL.md"),
      "---\nid: committing-code\nname: committing-code\ncapabilities-provided:\n  - git-workflow-management\n---\n# v1 source content\n",
    );
    await engine.syncSkills([module]);
    const target = path.join(
      projectPath,
      ".claude/skills/committing-code/SKILL.md",
    );
    await fs.writeFile(target, "# user edit\n");
    await engine.syncSkills([module]);
    const content = await fs.readFile(target, "utf-8");
    expect(content).toContain("v1 source content");
  });
});
