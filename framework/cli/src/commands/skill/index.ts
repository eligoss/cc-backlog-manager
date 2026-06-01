/**
 * Skill Command Group
 */

import { Command } from 'commander';
import { createSkillDeployCommand } from './deploy.js';
import { createSkillListCommand } from './list.js';
import { createSkillRemoveCommand } from './remove.js';
import { createSkillInfoCommand } from './info.js';
import { createSkillPullCommand } from './pull.js';

export function createSkillCommand(): Command {
  const skill = new Command('skill')
    .description('Manage global skill deployment');

  skill.addCommand(createSkillDeployCommand());
  skill.addCommand(createSkillListCommand());
  skill.addCommand(createSkillRemoveCommand());
  skill.addCommand(createSkillInfoCommand());
  skill.addCommand(createSkillPullCommand());

  return skill;
}
