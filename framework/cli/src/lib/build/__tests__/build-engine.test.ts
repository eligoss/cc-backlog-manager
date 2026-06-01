/**
 * Tests for Build Engine
 *
 * Tests the core build engine functionality including schema validation,
 * cross-reference checking, and output formatting.
 */

import { describe, it, expect, beforeEach, afterEach } from "@jest/globals";
import * as fs from "fs/promises";
import * as path from "path";
import {
  BuildEngine,
  formatBuildOutput,
  type BuildOptions,
  type BuildResult,
} from "../build-engine.js";

// Test fixture directory
const TEST_DIR = path.join(__dirname, "__fixtures__", "build-engine");

describe("BuildEngine", () => {
  let testRoot: string;

  beforeEach(async () => {
    // Create temporary test directory
    testRoot = path.join(TEST_DIR, `test-${Date.now()}`);
    await fs.mkdir(testRoot, { recursive: true });
  });

  afterEach(async () => {
    // Clean up test directory
    try {
      await fs.rm(testRoot, { recursive: true, force: true });
    } catch {
      // Ignore cleanup errors
    }
  });

  describe("Agent Schema Validation", () => {
    it("should validate valid full agent", async () => {
      const agentDir = path.join(
        testRoot,
        "framework",
        "modules",
        "core",
        "agents",
      );
      await fs.mkdir(agentDir, { recursive: true });

      const agentContent = `---
agent: ai-test-agent
role: Test agent for validation
framework-version: '1.2.0'
variant: full
capability-needs:
  - testing
---

# Test Agent

This is a test agent.
`;
      await fs.writeFile(path.join(agentDir, "ai-test-agent.md"), agentContent);

      // Create a skill that provides the capability
      const skillDir = path.join(
        testRoot,
        "framework",
        "modules",
        "core",
        "skills",
        "testing",
      );
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = `---
id: testing-skill
name: Testing Skill
description: Provides testing capabilities for the framework
capabilities-provided:
  - testing
---

# Testing Skill
`;
      await fs.writeFile(path.join(skillDir, "SKILL.md"), skillContent);

      const engine = new BuildEngine({
        projectPath: testRoot,
        frameworkPath: testRoot,
        quick: true,
      });

      const result = await engine.build();
      expect(result.stats.agentsChecked).toBe(1);
      expect(
        result.issues.filter((i) => i.code.startsWith("AGENT_")),
      ).toHaveLength(0);
    });

    it("should detect invalid agent name prefix", async () => {
      const agentDir = path.join(
        testRoot,
        "framework",
        "modules",
        "core",
        "agents",
      );
      await fs.mkdir(agentDir, { recursive: true });

      const agentContent = `---
agent: test-agent
role: Test agent
framework-version: '1.2.0'
capability-needs:
  - testing
---

# Invalid Agent
`;
      await fs.writeFile(path.join(agentDir, "test-agent.md"), agentContent);

      const engine = new BuildEngine({
        projectPath: testRoot,
        frameworkPath: testRoot,
        quick: true,
      });

      const result = await engine.build();
      const agentErrors = result.issues.filter((i) =>
        i.code.startsWith("AGENT_"),
      );
      expect(agentErrors.length).toBeGreaterThan(0);
      expect(agentErrors.some((e) => e.message.includes("ai-"))).toBe(true);
    });
  });

  describe("Skill Schema Validation", () => {
    it("should validate valid skill", async () => {
      const skillDir = path.join(
        testRoot,
        "framework",
        "modules",
        "core",
        "skills",
        "test-skill",
      );
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = `---
id: test-skill
name: Test Skill
description: A test skill for validation testing purposes
capabilities-provided:
  - test-capability
---

# Test Skill
`;
      await fs.writeFile(path.join(skillDir, "SKILL.md"), skillContent);

      const engine = new BuildEngine({
        projectPath: testRoot,
        frameworkPath: testRoot,
        quick: true,
      });

      const result = await engine.build();
      expect(result.stats.skillsChecked).toBe(1);
      expect(
        result.issues.filter((i) => i.code.startsWith("SKILL_")),
      ).toHaveLength(0);
    });

    it("should detect skill without capabilities", async () => {
      const skillDir = path.join(
        testRoot,
        "framework",
        "modules",
        "core",
        "skills",
        "bad-skill",
      );
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = `---
id: bad-skill
name: Bad Skill
description: A skill without capabilities provided
capabilities-provided: []
---

# Bad Skill
`;
      await fs.writeFile(path.join(skillDir, "SKILL.md"), skillContent);

      const engine = new BuildEngine({
        projectPath: testRoot,
        frameworkPath: testRoot,
        quick: true,
      });

      const result = await engine.build();
      const skillErrors = result.issues.filter((i) =>
        i.code.startsWith("SKILL_"),
      );
      expect(skillErrors.length).toBeGreaterThan(0);
    });

    it("should detect invalid skill id format", async () => {
      const skillDir = path.join(
        testRoot,
        "framework",
        "modules",
        "core",
        "skills",
        "BadSkill",
      );
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = `---
id: BadSkill
name: Bad Skill
description: A skill with invalid id format
capabilities-provided:
  - test
---

# Bad Skill
`;
      await fs.writeFile(path.join(skillDir, "SKILL.md"), skillContent);

      const engine = new BuildEngine({
        projectPath: testRoot,
        frameworkPath: testRoot,
        quick: true,
      });

      const result = await engine.build();
      const skillErrors = result.issues.filter((i) =>
        i.code.startsWith("SKILL_"),
      );
      expect(skillErrors.length).toBeGreaterThan(0);
    });
  });

  describe("Cross-Reference Validation", () => {
    it("should detect unknown capability needs", async () => {
      // Create agent with capability need
      const agentDir = path.join(
        testRoot,
        "framework",
        "modules",
        "core",
        "agents",
      );
      await fs.mkdir(agentDir, { recursive: true });

      const agentContent = `---
agent: ai-test
role: Test agent
framework-version: '1.2.0'
capability-needs:
  - unknown-capability
---

# Test Agent
`;
      await fs.writeFile(path.join(agentDir, "ai-test.md"), agentContent);

      // Create skill that doesn't provide the capability
      const skillDir = path.join(
        testRoot,
        "framework",
        "modules",
        "core",
        "skills",
        "other",
      );
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = `---
id: other-skill
name: Other Skill
description: A skill providing different capabilities
capabilities-provided:
  - other-capability
---

# Other Skill
`;
      await fs.writeFile(path.join(skillDir, "SKILL.md"), skillContent);

      const engine = new BuildEngine({
        projectPath: testRoot,
        frameworkPath: testRoot,
        quick: false, // Enable cross-reference validation
      });

      const result = await engine.build();
      const capErrors = result.issues.filter(
        (i) => i.code === "CAPABILITY_NOT_FOUND",
      );
      expect(capErrors.length).toBeGreaterThan(0);
      expect(capErrors[0].message).toContain("unknown-capability");
    });
  });

  describe("Build Result", () => {
    it("should return success when no errors", async () => {
      const skillDir = path.join(
        testRoot,
        "framework",
        "modules",
        "core",
        "skills",
        "test",
      );
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = `---
id: test-skill
name: Test Skill
description: A test skill for validation
capabilities-provided:
  - test
---

# Test
`;
      await fs.writeFile(path.join(skillDir, "SKILL.md"), skillContent);

      const engine = new BuildEngine({
        projectPath: testRoot,
        frameworkPath: testRoot,
        quick: true,
      });

      const result = await engine.build();
      expect(result.success).toBe(true);
      expect(result.errorCount).toBe(0);
    });

    it("should track duration", async () => {
      const engine = new BuildEngine({
        projectPath: testRoot,
        frameworkPath: testRoot,
        quick: true,
      });

      const result = await engine.build();
      expect(result.durationMs).toBeGreaterThanOrEqual(0);
    });

    it("should count warnings separately from errors", async () => {
      const agentDir = path.join(
        testRoot,
        "framework",
        "modules",
        "core",
        "agents",
      );
      await fs.mkdir(agentDir, { recursive: true });

      const agentContent = `---
agent: ai-test-agent
role: Test agent
framework-version: '1.2.0'
capability-needs:
  - test
---

# Test Agent
`;
      await fs.writeFile(path.join(agentDir, "ai-test-agent.md"), agentContent);

      const skillDir = path.join(
        testRoot,
        "framework",
        "modules",
        "core",
        "skills",
        "test",
      );
      await fs.mkdir(skillDir, { recursive: true });

      const skillContent = `---
id: test-skill
name: Test
description: A test skill for testing
capabilities-provided:
  - test
---

# Test
`;
      await fs.writeFile(path.join(skillDir, "SKILL.md"), skillContent);

      const engine = new BuildEngine({
        projectPath: testRoot,
        frameworkPath: testRoot,
        quick: false,
      });

      const result = await engine.build();
      // Should succeed with no errors
      expect(result.warningCount).toBeGreaterThanOrEqual(0);
      expect(result.success).toBe(result.errorCount === 0);
    });
  });

  describe("Quick Mode", () => {
    it("should skip cross-reference validation in quick mode", async () => {
      const agentDir = path.join(
        testRoot,
        "framework",
        "modules",
        "core",
        "agents",
      );
      await fs.mkdir(agentDir, { recursive: true });

      const agentContent = `---
agent: ai-test
role: Test
framework-version: '1.2.0'
variant: full
capability-needs:
  - nonexistent
---

# Test
`;
      await fs.writeFile(path.join(agentDir, "ai-test.md"), agentContent);

      const engine = new BuildEngine({
        projectPath: testRoot,
        frameworkPath: testRoot,
        quick: true, // Quick mode
      });

      const result = await engine.build();
      const capErrors = result.issues.filter(
        (i) => i.code === "CAPABILITY_NOT_FOUND",
      );
      expect(capErrors).toHaveLength(0); // Cross-reference not checked
    });
  });
});

describe("formatBuildOutput", () => {
  it("should format successful build", () => {
    const result: BuildResult = {
      success: true,
      errorCount: 0,
      warningCount: 0,
      issues: [],
      stats: {
        agentsChecked: 5,
        skillsChecked: 10,
        linksChecked: 50,
        filesChecked: 15,
        capabilitiesValidated: 20,
      },
      durationMs: 150,
    };

    const output = formatBuildOutput(result, false);
    expect(output).toContain("Build succeeded");
    expect(output).toContain("5 agents");
    expect(output).toContain("10 skills");
  });

  it("should format failed build with errors", () => {
    const result: BuildResult = {
      success: false,
      errorCount: 2,
      warningCount: 1,
      issues: [
        {
          severity: "error",
          code: "AGENT_INVALID_STRING",
          message: 'Agent name must start with "ai-"',
          file: "agents/bad-agent.md",
          field: "agent",
        },
        {
          severity: "error",
          code: "SKILL_TOO_SMALL",
          message: "Description too short",
          file: "skills/bad/SKILL.md",
          field: "description",
        },
        {
          severity: "warning",
          code: "ORPHAN_SLIM_AGENT",
          message: "Slim agent not in delegates-to",
          file: "agents/slim.md",
        },
      ],
      stats: {
        agentsChecked: 5,
        skillsChecked: 10,
        linksChecked: 0,
        filesChecked: 15,
        capabilitiesValidated: 0,
      },
      durationMs: 200,
    };

    const output = formatBuildOutput(result, false);
    expect(output).toContain("Build failed");
    expect(output).toContain("2 error(s)");
    expect(output).toContain("1 warning(s)");
    expect(output).toContain("agents/bad-agent.md");
    expect(output).toContain("AGENT_INVALID_STRING");
  });

  it("should show suggestions in verbose mode", () => {
    const result: BuildResult = {
      success: false,
      errorCount: 1,
      warningCount: 0,
      issues: [
        {
          severity: "error",
          code: "CAPABILITY_NOT_FOUND",
          message: "Unknown capability",
          file: "agents/test.md",
          suggestion: "Did you mean: git-workflow?",
        },
      ],
      stats: {
        agentsChecked: 1,
        skillsChecked: 0,
        linksChecked: 0,
        filesChecked: 1,
        capabilitiesValidated: 0,
      },
      durationMs: 50,
    };

    const verboseOutput = formatBuildOutput(result, true);
    expect(verboseOutput).toContain("git-workflow");

    const normalOutput = formatBuildOutput(result, false);
    expect(normalOutput).not.toContain("git-workflow");
  });
});
