import fs from "fs-extra";
import path from "path";
import { getFrameworkRoot } from "./module-loader.js";

/**
 * Scaffold backlog config files to the project root if they don't already exist.
 * Copies backlog.config.json and .env.example from the backlog module templates.
 *
 * Safe to call multiple times — will never overwrite files already present.
 *
 * @param projectPath - Absolute path to the target project root
 * @param frameworkRootOverride - Optional override for the framework root (useful in tests)
 */
export async function scaffoldBacklogConfig(
  projectPath: string,
  frameworkRootOverride?: string,
): Promise<void> {
  const frameworkRoot = frameworkRootOverride ?? getFrameworkRoot();
  const templatesDir = path.join(
    frameworkRoot,
    "modules",
    "backlog",
    "templates",
  );

  const configDest = path.join(projectPath, "backlog.config.json");
  if (!(await fs.pathExists(configDest))) {
    const configSrc = path.join(templatesDir, "backlog.config.json");
    await fs.copy(configSrc, configDest);
  }

  const envExampleDest = path.join(projectPath, ".env.example");
  if (!(await fs.pathExists(envExampleDest))) {
    const envExampleSrc = path.join(templatesDir, ".env.example");
    await fs.copy(envExampleSrc, envExampleDest);
  }
}
