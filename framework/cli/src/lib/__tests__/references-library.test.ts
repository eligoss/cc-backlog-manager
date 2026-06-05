/**
 * Tests for deployReferencesLibrary — copy-once deployment of references.yml.
 */

import fs from "fs-extra";
import path from "path";
import os from "os";
import type { ModuleManifest } from "../module-loader.js";
import { deployReferencesLibrary } from "../references-library.js";

describe("deployReferencesLibrary", () => {
  let projectPath: string;
  let coreSourcePath: string;
  let modules: ModuleManifest[];

  beforeEach(async () => {
    projectPath = await fs.mkdtemp(path.join(os.tmpdir(), "refs-proj-"));
    coreSourcePath = await fs.mkdtemp(path.join(os.tmpdir(), "refs-core-"));
    const tplDir = path.join(coreSourcePath, "templates", "references");
    await fs.ensureDir(tplDir);
    await fs.writeFile(
      path.join(tplDir, "references.yml.template"),
      'version: "1.0"\n# template\n',
    );
    modules = [
      { id: "core", version: "1.0.0", _sourcePath: coreSourcePath },
    ];
  });

  afterEach(async () => {
    await fs.remove(projectPath);
    await fs.remove(coreSourcePath);
  });

  it("creates references.yml at project root on first deploy", async () => {
    await deployReferencesLibrary(projectPath, modules);
    const refs = path.join(projectPath, "references.yml");
    expect(await fs.pathExists(refs)).toBe(true);
    expect(await fs.readFile(refs, "utf-8")).toContain("# template");
  });

  it("does not overwrite an existing references.yml on a second deploy", async () => {
    await deployReferencesLibrary(projectPath, modules);
    const refs = path.join(projectPath, "references.yml");
    await fs.writeFile(refs, 'version: "1.0"\n# user-edited\n');
    await deployReferencesLibrary(projectPath, modules); // second invocation hits the guard
    expect(await fs.readFile(refs, "utf-8")).toContain("# user-edited");
  });
});
