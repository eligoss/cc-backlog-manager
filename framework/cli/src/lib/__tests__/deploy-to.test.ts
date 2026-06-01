/**
 * Unit Tests: SyncEngine deploy-to routing
 *
 * Verifies that the sync engine correctly routes agent files to
 * .claude/commands/ and/or .claude/agents/ based on the deploy-to
 * frontmatter field.
 *
 * @module lib/__tests__/deploy-to.test
 */

import { SyncEngine } from "../sync-engine.js";
import type { ModuleManifest } from "../module-loader.js";
import fs from "fs-extra";

// Mock fs-extra
jest.mock("fs-extra");
const mockedFs = fs as jest.Mocked<typeof fs>;

// Create mock LinkTransformer
const mockTransformFile = jest.fn().mockResolvedValue("transformed content");

jest.mock("../link-transformer.js", () => ({
  LinkTransformer: jest.fn().mockImplementation(() => ({
    transformFile: mockTransformFile,
    transformLinks: jest.fn(),
  })),
}));

// Mock telemetry
jest.mock("../telemetry/instrumentation/sync-instrumentation.js", () => ({
  recordSyncAll: jest.fn().mockResolvedValue(undefined),
}));

// Helper: build agent frontmatter content with optional deploy-to field
const agentContent = (deployTo?: string): string => {
  const field = deployTo ? `\ndeploy-to: ${deployTo}` : "";
  return `---\nagent: ai-test-agent\nrole: Test Agent${field}\n---\n\n# Test Agent\n`;
};

// Shared module manifest used across tests
const testModule = (): ModuleManifest => ({
  id: "test",
  version: "1.0.0",
  provides: { agents: ["ai-test-agent"], skills: [] },
  _sourcePath: "/framework/modules/test",
});

// Set up fs mocks for a single agent file with the given content
const setupFsMocks = (content: string): void => {
  mockedFs.ensureDir.mockResolvedValue(undefined as any);
  mockedFs.pathExists.mockResolvedValue(true as any);
  mockedFs.readdir.mockResolvedValue(["ai-test-agent.md"] as any);
  mockedFs.stat.mockResolvedValue({ isFile: () => true } as any);
  mockedFs.readFile.mockResolvedValue(content as any);
  mockedFs.writeFile.mockResolvedValue(undefined as any);
};

describe("SyncEngine - deploy-to routing", () => {
  let engine: SyncEngine;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTransformFile.mockResolvedValue("transformed content");
    engine = new SyncEngine("/framework", "/project");
  });

  it("deploy-to absent — deploys to both commands/ and agents/ (backward compatible)", async () => {
    setupFsMocks(agentContent());

    const items = await engine.syncAgents([testModule()]);

    expect(items).toHaveLength(1);
    expect(items[0].name).toBe("ai-test-agent");

    // transformFile is called once per copy operation; expect two calls
    const targets = mockTransformFile.mock.calls.map(
      (call: unknown[]) => call[1] as string,
    );
    const toCommands = targets.some((t) => t.includes(".claude/commands/"));
    const toAgents = targets.some((t) => t.includes(".claude/agents/"));

    expect(toCommands).toBe(true);
    expect(toAgents).toBe(true);
  });

  it("deploy-to: command — deploys ONLY to commands/, NOT agents/", async () => {
    setupFsMocks(agentContent("command"));

    await engine.syncAgents([testModule()]);

    const targets = mockTransformFile.mock.calls.map(
      (call: unknown[]) => call[1] as string,
    );
    const toCommands = targets.some((t) => t.includes(".claude/commands/"));
    const toAgents = targets.some((t) => t.includes(".claude/agents/"));

    expect(toCommands).toBe(true);
    expect(toAgents).toBe(false);
  });

  it("deploy-to: agent — deploys ONLY to agents/, NOT commands/", async () => {
    setupFsMocks(agentContent("agent"));

    await engine.syncAgents([testModule()]);

    const targets = mockTransformFile.mock.calls.map(
      (call: unknown[]) => call[1] as string,
    );
    const toCommands = targets.some((t) => t.includes(".claude/commands/"));
    const toAgents = targets.some((t) => t.includes(".claude/agents/"));

    expect(toCommands).toBe(false);
    expect(toAgents).toBe(true);
  });

  it("deploy-to: both — deploys to both commands/ and agents/", async () => {
    setupFsMocks(agentContent("both"));

    await engine.syncAgents([testModule()]);

    const targets = mockTransformFile.mock.calls.map(
      (call: unknown[]) => call[1] as string,
    );
    const toCommands = targets.some((t) => t.includes(".claude/commands/"));
    const toAgents = targets.some((t) => t.includes(".claude/agents/"));

    expect(toCommands).toBe(true);
    expect(toAgents).toBe(true);
  });

  it("no frontmatter block — content without --- delimiters defaults to both", async () => {
    const noFrontmatterContent = "# Test Agent\n\nNo frontmatter here.\n";
    setupFsMocks(noFrontmatterContent);

    await engine.syncAgents([testModule()]);

    const targets = mockTransformFile.mock.calls.map(
      (call: unknown[]) => call[1] as string,
    );
    const toCommands = targets.some((t) => t.includes(".claude/commands/"));
    const toAgents = targets.some((t) => t.includes(".claude/agents/"));

    expect(toCommands).toBe(true);
    expect(toAgents).toBe(true);
  });

  it("frontmatter with no deploy-to key — has --- block but no deploy-to field → defaults to both", async () => {
    const noDeployToContent =
      "---\nagent: ai-test-agent\nrole: Test Agent\n---\n\n# Test Agent\n";
    setupFsMocks(noDeployToContent);

    await engine.syncAgents([testModule()]);

    const targets = mockTransformFile.mock.calls.map(
      (call: unknown[]) => call[1] as string,
    );
    const toCommands = targets.some((t) => t.includes(".claude/commands/"));
    const toAgents = targets.some((t) => t.includes(".claude/agents/"));

    expect(toCommands).toBe(true);
    expect(toAgents).toBe(true);
  });

  it("unrecognized deploy-to value (e.g. 'slash') — defaults to both", async () => {
    setupFsMocks(agentContent("slash"));

    await engine.syncAgents([testModule()]);

    const targets = mockTransformFile.mock.calls.map(
      (call: unknown[]) => call[1] as string,
    );
    const toCommands = targets.some((t) => t.includes(".claude/commands/"));
    const toAgents = targets.some((t) => t.includes(".claude/agents/"));

    expect(toCommands).toBe(true);
    expect(toAgents).toBe(true);
  });

  it("invalid frontmatter — defaults to both when parsing fails", async () => {
    // Provide content that will cause yaml.parse to throw (invalid YAML block)
    const invalidContent = "---\n: invalid: yaml: [\n---\n\n# Test Agent\n";
    setupFsMocks(invalidContent);

    await engine.syncAgents([testModule()]);

    const targets = mockTransformFile.mock.calls.map(
      (call: unknown[]) => call[1] as string,
    );
    const toCommands = targets.some((t) => t.includes(".claude/commands/"));
    const toAgents = targets.some((t) => t.includes(".claude/agents/"));

    expect(toCommands).toBe(true);
    expect(toAgents).toBe(true);
  });
});
