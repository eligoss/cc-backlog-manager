#!/usr/bin/env node
import fs from 'fs-extra';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const cliRoot = path.resolve(__dirname, '..');
const frameworkRoot = path.resolve(cliRoot, '..');

async function preparePublish() {
  console.log('\n📦 Preparing framework content for publishing...\n');

  const targetDir = path.join(cliRoot, 'framework');

  // Clean existing bundled framework
  if (await fs.pathExists(targetDir)) {
    console.log('🧹 Cleaning existing bundle...');
    await fs.remove(targetDir);
  }

  await fs.ensureDir(targetDir);

  // Copy all modules (including core, which is now in modules/)
  console.log('📋 Bundling all modules...');
  const modulesSource = path.join(frameworkRoot, 'modules');
  const modulesTarget = path.join(targetDir, 'modules');

  if (await fs.pathExists(modulesSource)) {
    const moduleEntries = await fs.readdir(modulesSource, { withFileTypes: true });
    let moduleCount = 0;

    for (const entry of moduleEntries) {
      if (entry.isDirectory()) {
        const modulePath = path.join(modulesSource, entry.name);
        const targetPath = path.join(modulesTarget, entry.name);

        // Only copy if module.json exists
        if (await fs.pathExists(path.join(modulePath, 'module.json'))) {
          await fs.copy(modulePath, targetPath, {
            filter: (src) => {
              const relativePath = path.relative(modulePath, src);
              return !relativePath.includes('.DS_Store') &&
                     !relativePath.includes('Thumbs.db') &&
                     !relativePath.includes('.gitkeep');
            }
          });
          moduleCount++;
          console.log(`  ✓ ${entry.name}`);
        }
      }
    }

    console.log(`  Total: ${moduleCount} modules bundled`);
  } else {
    console.warn(`  ⚠ Modules directory not found at ${modulesSource}`);
  }

  // Show bundle size
  console.log('\n📊 Bundle statistics:');
  try {
    const { execSync } = await import('child_process');
    const size = execSync(`du -sh "${targetDir}"`).toString().trim().split('\t')[0];
    console.log(`  Size: ${size}`);
  } catch (error) {
    console.log('  (Size calculation not available)');
  }

  // Count files
  try {
    const { execSync } = await import('child_process');
    const fileCount = execSync(`find "${targetDir}" -type f | wc -l`).toString().trim();
    console.log(`  Files: ${fileCount}`);
  } catch (error) {
    console.log('  (File count not available)');
  }

  console.log('\n✅ Framework content bundled successfully!\n');
  console.log(`📂 Bundle location: ${path.relative(process.cwd(), targetDir)}\n`);
}

// Run if called directly
if (import.meta.url === `file://${process.argv[1]}`) {
  preparePublish().catch((error) => {
    console.error('\n❌ Error bundling framework content:\n');
    console.error(error);
    process.exit(1);
  });
}

export { preparePublish };
