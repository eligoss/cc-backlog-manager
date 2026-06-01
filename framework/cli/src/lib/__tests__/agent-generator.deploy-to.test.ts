/**
 * Unit Tests: AgentGenerator deploy-to behavior
 *
 * Verifies that the AgentGenerator correctly skips JSON generation
 * for agents with `deploy-to: command` frontmatter or registry value,
 * and proceeds with generation for `deploy-to: agent`, `deploy-to: both`,
 * and absent `deploy-to` fields.
 *
 * @module lib/__tests__/agent-generator.deploy-to.test
 */

import { AgentGenerator } from "../agent-generator.js";
import type { AgentDefinition } from "../agent-generator.js";
import fs from "fs-extra";

// Mock fs-extra
jest.mock("fs-extra");
const mockedFs = fs as jest.Mocked<typeof fs>;

// Base agent definition used across tests
const baseAgent = (
  overrides: Partial<AgentDefinition> = {},
): AgentDefinition => ({
  id: "ai-test-agent",
  module: "test",
  file: ".claude/commands/ai-test-agent.md",
  ...overrides,
});

// Build agent markdown content with optional deploy-to in frontmatter
const agentMarkdown = (deployTo?: string): string => {
  const deployToLine = deployTo ? `\ndeploy-to: ${deployTo}` : "";
  return `---\nagent: ai-test-agent\nrole: Test Agent${deployToLine}\n---\n\n# Test Agent\n\n**Purpose:** A focused test agent.\n`;
};

// Registry shape returned by fs.readJson
const agentRegistry = (agents: AgentDefinition[]) => ({ agents });

// Standard fs mock setup: registry exists, module path does not exist, registry path does
const setupFsMocks = (content: string, agent: AgentDefinition): void => {
  mockedFs.pathExists.mockImplementation(async (p: fs.PathLike) => {
    const filePath = String(p);
    // Registry file always exists
    if (filePath.includes(".claude/registries/agents.json")) return true;
    // Module-path lookup (framework/modules/test/agents/ai-test-agent.md) does NOT exist
    // so we fall through to the registry file path
    if (filePath.includes("framework/modules")) return false;
    // Registry file path (.claude/commands/ai-test-agent.md) exists
    if (filePath.includes(".claude/commands/ai-test-agent.md")) return true;
    // JSON output path does not exist (no force-skip)
    if (filePath.endsWith(".json")) return false;
    return false;
  });

  mockedFs.readJson.mockResolvedValue(agentRegistry([agent]));
  mockedFs.readFile.mockResolvedValue(content as any);
  mockedFs.writeJson.mockResolvedValue(undefined as any);
};

describe("AgentGenerator - deploy-to routing", () => {
  let generator: AgentGenerator;

  beforeEach(() => {
    jest.clearAllMocks();
    generator = new AgentGenerator("/project");
  });

  it("deploy-to: command in frontmatter → skips JSON generation", async () => {
    const agent = baseAgent();
    setupFsMocks(agentMarkdown("command"), agent);

    const results = await generator.generateAll();

    expect(results).toHaveLength(1);
    expect(results[0].action).toBe("skipped");
    expect(mockedFs.writeJson).not.toHaveBeenCalled();
  });

  it("deploy-to: agent in frontmatter → proceeds with JSON generation", async () => {
    const agent = baseAgent();
    setupFsMocks(agentMarkdown("agent"), agent);

    const results = await generator.generateAll();

    expect(results).toHaveLength(1);
    expect(results[0].action).toBe("created");
    expect(mockedFs.writeJson).toHaveBeenCalledTimes(1);
  });

  it("deploy-to absent in frontmatter → proceeds with JSON generation (backward compat)", async () => {
    const agent = baseAgent();
    setupFsMocks(agentMarkdown(), agent);

    const results = await generator.generateAll();

    expect(results).toHaveLength(1);
    expect(results[0].action).toBe("created");
    expect(mockedFs.writeJson).toHaveBeenCalledTimes(1);
  });

  it("deploy-to: command in registry (not frontmatter) → still skips via fallback", async () => {
    // Registry has deploy-to: command; frontmatter does NOT have deploy-to
    const agent = baseAgent({ "deploy-to": "command" });
    setupFsMocks(agentMarkdown(), agent);

    const results = await generator.generateAll();

    expect(results).toHaveLength(1);
    expect(results[0].action).toBe("skipped");
    expect(mockedFs.writeJson).not.toHaveBeenCalled();
  });
});
