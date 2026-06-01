/**
 * OpenClaw Commands
 */

import { Command } from "commander";
import { createOpenclawExportCommand } from "./export.js";

export function createOpenclawCommand(): Command {
  const cmd = new Command("openclaw").description(
    "OpenClaw integration commands",
  );

  cmd.addCommand(createOpenclawExportCommand());

  return cmd;
}
