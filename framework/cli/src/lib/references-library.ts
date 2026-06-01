/**
 * Deployment of the external references library (references.yml).
 *
 * Shipped as a `core` template, copied once to the project root so the user can
 * fill it in. Re-running deploy never overwrites an existing file.
 *
 * @module references-library
 */

import fs from "fs-extra";
import path from "path";
import type { ModuleManifest } from "./module-loader.js";

/**
 * Copy-once deploy of references.yml to the project root from the core module's
 * template. No-op if the core module is unavailable or the file already exists.
 */
export async function deployReferencesLibrary(
  projectPath: string,
  modules: ModuleManifest[],
): Promise<void> {
  const core = modules.find((m) => m.id === "core");
  if (!core?._sourcePath) {
    return;
  }
  const templatePath = path.join(
    core._sourcePath,
    "templates",
    "references",
    "references.yml.template",
  );
  const target = path.join(projectPath, "references.yml");

  // Copy-once: never overwrite a user-filled references library.
  if (!(await fs.pathExists(templatePath)) || (await fs.pathExists(target))) {
    return;
  }
  await fs.copy(templatePath, target);
}
