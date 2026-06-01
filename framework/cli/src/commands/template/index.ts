/**
 * Template Command Group
 *
 * Commands for managing templates: list, info, render, validate.
 */

import { Command } from 'commander';
import { createListCommand } from './list.js';
import { createInfoCommand } from './info.js';
import { createRenderCommand } from './render.js';
import { createValidateCommand } from './validate.js';

export function createTemplateCommandGroup(): Command {
  const template = new Command('template')
    .description('Manage templates (list, info, render, validate)');

  template.addCommand(createListCommand());
  template.addCommand(createInfoCommand());
  template.addCommand(createRenderCommand());
  template.addCommand(createValidateCommand());

  return template;
}

export { createListCommand } from './list.js';
export { createInfoCommand } from './info.js';
export { createRenderCommand } from './render.js';
export { createValidateCommand } from './validate.js';
