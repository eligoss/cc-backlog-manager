import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const currentFilePath = fileURLToPath(import.meta.url);
const currentDirPath = path.dirname(currentFilePath);

/**
 * Resolve framework root based on execution context.
 *
 * In development mode:
 *   framework/cli/dist/lib/module-loader.js → framework/ (3 levels up)
 *
 * In published mode:
 *   node_modules/agentic-framework/dist/lib/module-loader.js →
 *   node_modules/agentic-framework/framework/ (2 levels up + framework/)
 */
function resolveFrameworkRoot(): string {
  // Check for bundled framework (published mode)
  const publishedPath = path.resolve(currentDirPath, '..', '..', 'framework');

  if (fs.pathExistsSync(publishedPath)) {
    // Published mode: node_modules/agentic-framework/framework/
    return publishedPath;
  }

  // Development mode: framework/cli/dist/lib → framework/ (3 levels up)
  return path.resolve(currentDirPath, '..', '..', '..');
}

const FRAMEWORK_ROOT = resolveFrameworkRoot();

/**
 * Get the resolved framework root path.
 * Use this when you need access to the framework directory.
 */
export function getFrameworkRoot(): string {
  return FRAMEWORK_ROOT;
}

export interface CliCommand {
  name: string;
  type: 'create' | 'validate' | 'sync' | 'transform' | 'export' | 'import' | 'migrate' | 'update' | 'fetch' | 'query' | 'execute';
  skill?: string;
  template?: string;
  schema?: string;
  description?: string;
}

export interface ModuleManifest {
  $schema?: string;
  id: string;
  version: string;
  name: string;
  description: string;
  provides: {
    agents?: string[];
    skills?: string[];
    capabilities?: string[];
    scripts?: string[];
    guards?: string[];
    directories?: string[]; // root-level project dirs to scaffold during init/add
    'cli-commands'?: Array<CliCommand | string>;
  };
  requires?: Record<string, string>;
  'optional-dependencies'?: string[];
  context?: {
    business?: string[];
    technical?: string[];
    process?: string[];
  };
  'entry-points'?: {
    cli?: Array<{ name: string; script: string; description?: string }>;
    hooks?: {
      'pre-commit'?: string[];
      'post-commit'?: string[];
      'pre-push'?: string[];
    };
  };
  metadata?: {
    author?: string;
    license?: string;
    repository?: string;
    homepage?: string;
    keywords?: string[];
    category?: string;
  };
  _sourcePath?: string; // Internal: path to module source
}

/**
 * Get list of available modules
 */
export async function getAvailableModules(): Promise<string[]> {
  const modules: string[] = [];

  // Check modules directory (includes core)
  const modulesDir = path.join(FRAMEWORK_ROOT, 'modules');
  if (await fs.pathExists(modulesDir)) {
    const entries = await fs.readdir(modulesDir, { withFileTypes: true });
    for (const entry of entries) {
      if (entry.isDirectory()) {
        const moduleJsonPath = path.join(modulesDir, entry.name, 'module.json');
        if (await fs.pathExists(moduleJsonPath)) {
          modules.push(entry.name);
        }
      }
    }
  }

  return modules;
}

/**
 * Load a module manifest
 */
export async function loadModule(moduleName: string): Promise<ModuleManifest> {
  // All modules (including core) are now in modules/ directory
  const modulePath = path.join(FRAMEWORK_ROOT, 'modules', moduleName);
  const manifestPath = path.join(modulePath, 'module.json');

  if (!await fs.pathExists(manifestPath)) {
    throw new Error(`Module '${moduleName}' not found at ${manifestPath}`);
  }

  const manifest = await fs.readJson(manifestPath) as ModuleManifest;
  manifest._sourcePath = modulePath;

  return manifest;
}

/**
 * Validate module dependencies
 */
export async function validateDependencies(
  moduleName: string,
  installedModules: string[]
): Promise<{ valid: boolean; missing: string[] }> {
  const module = await loadModule(moduleName);
  const missing: string[] = [];

  if (module.requires) {
    for (const dep of Object.keys(module.requires)) {
      if (!installedModules.includes(dep)) {
        missing.push(dep);
      }
    }
  }

  return {
    valid: missing.length === 0,
    missing,
  };
}

/**
 * Get modules that depend on a given module (hard dependencies only)
 */
export async function getDependents(moduleName: string): Promise<string[]> {
  const dependents: string[] = [];
  const availableModules = await getAvailableModules();

  for (const mod of availableModules) {
    const module = await loadModule(mod);
    if (module.requires && moduleName in module.requires) {
      dependents.push(mod);
    }
  }

  return dependents;
}

/**
 * Get modules that have optional dependency on a given module
 */
export async function getOptionalDependents(moduleName: string): Promise<string[]> {
  const dependents: string[] = [];
  const availableModules = await getAvailableModules();

  for (const mod of availableModules) {
    const module = await loadModule(mod);
    if (module['optional-dependencies']?.includes(moduleName)) {
      dependents.push(mod);
    }
  }

  return dependents;
}

/**
 * Check for missing optional dependencies and return warnings
 */
export async function checkOptionalDependencies(
  moduleName: string,
  installedModules: string[]
): Promise<{ warnings: string[] }> {
  const module = await loadModule(moduleName);
  const warnings: string[] = [];

  if (module['optional-dependencies']) {
    for (const optDep of module['optional-dependencies']) {
      if (!installedModules.includes(optDep)) {
        // Generate appropriate warning based on what the optional dependency provides
        if (optDep === 'core') {
          warnings.push(
            `Module '${moduleName}' works best with 'core' module (shared skills like verifying-quality, committing-code will be unavailable)`
          );
        } else {
          warnings.push(
            `Optional dependency '${optDep}' is not installed (some features may be limited)`
          );
        }
      }
    }
  }

  return { warnings };
}
