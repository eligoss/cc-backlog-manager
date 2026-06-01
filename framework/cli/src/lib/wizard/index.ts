/**
 * Wizard module exports
 */

export { runInitWizard, type WizardResult, type McpWizardConfig } from './init-wizard.js';
export { detectExistingProject, type ExistingProjectInfo, hasExistingFiles } from './detection.js';
export {
  appendGitignore,
  mergeCLAUDEmd,
  mergeSettingsLocal,
  backupAndCreateRoutesYml,
  FRAMEWORK_SEPARATOR,
} from './file-handlers.js';
export { groupModules, getModuleInfo, type ModuleInfo, type ModuleGroup } from './module-groups.js';
export { generateSummary, renderSummary, type WizardAnswers, type ProjectSummary } from './summary.js';
