/**
 * Unit Tests for settings-local template
 *
 * Tests the processSettingsTemplate function to ensure it correctly
 * replaces {{PROJECT_ROOT}} placeholder with actual absolute paths.
 *
 * Note: Hook configurations have been moved to settings-json.ts (framework-owned).
 * settings-local.ts only contains statusLine and permissions (user-owned).
 */

import {
  settingsLocalTemplate,
  processSettingsTemplate,
} from "../settings-local";

describe("settings-local template", () => {
  describe("settingsLocalTemplate", () => {
    it("should NOT have hooks configuration (hooks moved to settings.json)", () => {
      expect(settingsLocalTemplate.hooks).toBeUndefined();
    });

    it("should have statusLine with {{PROJECT_ROOT}} placeholder", () => {
      expect(settingsLocalTemplate.statusLine).toBeDefined();
      expect(settingsLocalTemplate.statusLine?.command).toContain(
        "{{PROJECT_ROOT}}",
      );
    });

    it("should have permissions with default allow list", () => {
      expect(settingsLocalTemplate.permissions).toBeDefined();
      expect(settingsLocalTemplate.permissions?.allow).toContain(
        "Bash(git add:*)",
      );
      expect(settingsLocalTemplate.permissions?.allow).toContain("WebSearch");
    });
  });

  describe("processSettingsTemplate", () => {
    it("should replace {{PROJECT_ROOT}} with actual project path", () => {
      const projectPath = "/Users/test/my-project";
      const processed = processSettingsTemplate(projectPath);

      expect(processed.statusLine?.command).toBe(
        "/Users/test/my-project/.claude/statusline.sh",
      );
      expect(processed.statusLine?.command).not.toContain("{{PROJECT_ROOT}}");
    });

    it("should not have any remaining {{PROJECT_ROOT}} placeholders", () => {
      const projectPath = "/test/path";
      const processed = processSettingsTemplate(projectPath);

      const asString = JSON.stringify(processed);
      expect(asString).not.toContain("{{PROJECT_ROOT}}");
    });

    it("should preserve permissions after processing", () => {
      const projectPath = "/test/path";
      const processed = processSettingsTemplate(projectPath);

      expect(processed.permissions).toBeDefined();
      expect(processed.permissions?.allow).toContain("Bash(git add:*)");
      expect(processed.permissions?.allow).toContain("WebSearch");
    });

    it("should work with Windows-style paths (forward slashes)", () => {
      const windowsPath = "C:/Users/test/project";
      const processed = processSettingsTemplate(windowsPath);

      expect(processed.statusLine?.command).toBe(
        "C:/Users/test/project/.claude/statusline.sh",
      );
    });

    it("should work with paths containing spaces", () => {
      const pathWithSpaces = "/Users/test user/my project";
      const processed = processSettingsTemplate(pathWithSpaces);

      expect(processed.statusLine?.command).toBe(
        "/Users/test user/my project/.claude/statusline.sh",
      );
    });
  });
});
