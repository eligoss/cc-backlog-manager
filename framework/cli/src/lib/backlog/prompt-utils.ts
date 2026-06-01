/**
 * Wrapper for inquirer to enable easier testing
 *
 * This module wraps inquirer's prompt function to make it easier to mock in tests.
 * Since inquirer is an ESM-only package, wrapping it allows us to use CommonJS mocks in Jest.
 */

import inquirer, { Answers } from 'inquirer';

export async function prompt<T extends Answers = Answers>(questions: Parameters<typeof inquirer.prompt>[0]): Promise<T> {
  return inquirer.prompt<T>(questions);
}
