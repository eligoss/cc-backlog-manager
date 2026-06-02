/**
 * MCP Tools Integration Tests
 *
 * Tests the MCP server tool aggregation system to verify:
 * - All tool categories are properly registered
 * - Tool metadata is complete and valid
 * - Tool schemas can be converted to JSON Schema
 * - Tool registry integration works correctly
 *
 * @module mcp/__tests__/tools.integration.test
 */

// Mock all command modules to avoid ESM import issues
jest.mock('../../commands/init.js', () => ({ initCommand: jest.fn() }));
jest.mock('../../commands/add.js', () => ({ addCommand: jest.fn() }));
jest.mock('../../commands/remove.js', () => ({ removeCommand: jest.fn() }));
jest.mock('../../commands/list.js', () => ({ listCommand: jest.fn() }));
jest.mock('../../commands/info.js', () => ({ infoCommand: jest.fn() }));
jest.mock('../../commands/validate.js', () => ({ validateCommand: jest.fn() }));
jest.mock('../../commands/update.js', () => ({ updateCommand: jest.fn() }));
jest.mock('../../commands/status.js', () => ({ statusCommand: jest.fn() }));
jest.mock('../../commands/sync.js', () => ({ syncCommand: jest.fn() }));
jest.mock('../../commands/dev.js', () => ({ devCommand: jest.fn() }));
jest.mock('../../commands/backlog/create-ticket.js', () => ({
  createCreateTicketCommand: jest.fn()
}));
jest.mock('../../commands/backlog/validate.js', () => ({
  createValidateCommand: jest.fn()
}));
jest.mock('../../commands/backlog/import-jira.js', () => ({
  createImportJiraCommand: jest.fn()
}));
jest.mock('../../commands/backlog/update-fields.js', () => ({
  createUpdateFieldsCommand: jest.fn()
}));
jest.mock('../../commands/backlog/migrate-milestones.js', () => ({
  createMigrateMilestonesCommand: jest.fn()
}));
jest.mock('../../lib/confluence/confluence-commands.js', () => ({
  createPageCommand: jest.fn(),
  fetchPageCommand: jest.fn(),
  importReportsCommand: jest.fn(),
}));
jest.mock('../../lib/confluence/adf-converter.js', () => ({
  markdownToAdf: jest.fn(),
}));
jest.mock('../../commands/template/index.js', () => ({
  createListCommand: jest.fn(),
  createInfoCommand: jest.fn(),
  createRenderCommand: jest.fn(),
  createValidateCommand: jest.fn(),
}));
jest.mock('../../commands/skill/index.js', () => ({
  createDeployCommand: jest.fn(),
  createListCommand: jest.fn(),
  createRemoveCommand: jest.fn(),
  createInfoCommand: jest.fn(),
  createPullCommand: jest.fn(),
}));
jest.mock('../../commands/agent/index.js', () => ({
  createListCommand: jest.fn(),
  createShowCommand: jest.fn(),
  createRunCommand: jest.fn(),
}));
jest.mock('../../lib/common/yaml-frontmatter.js', () => ({
  parseFrontmatter: jest.fn(),
}));

// Mock lib dependencies
jest.mock('../../lib/module-loader.js', () => ({
  loadModule: jest.fn(),
  getAvailableModules: jest.fn().mockReturnValue([]),
  getFrameworkRoot: jest.fn().mockReturnValue('/mock/framework'),
}));
jest.mock('../../lib/sdk/index.js', () => ({
  createSDKGenerator: jest.fn(),
  executeAgent: jest.fn(),
  executePhase: jest.fn(),
}));
jest.mock('../../lib/cli-context.js', () => ({
  CliContext: jest.fn(),
}));
jest.mock('../../lib/planning/plan-creator.js', () => ({
  createPlan: jest.fn(),
}));
jest.mock('../../lib/validation/schema-validator.js', () => ({
  validateWithSchema: jest.fn(),
}));
jest.mock('../../lib/unified-template-engine/index.js', () => ({
  createUnifiedTemplateEngine: jest.fn(),
}));

// Mock result-formatter utilities
jest.mock('../result-formatter.js', () => ({
  executeAndCapture: jest.fn(),
  captureOutput: jest.fn(),
  executeCommand: jest.fn(),
  parseJsonOutput: jest.fn(),
}));

import { allTools, getToolsByCategory, getToolCount } from '../tools/index.js';
import { toolRegistry } from '../tool-registry.js';
import { z } from 'zod';
import type { MCPTool } from '../types.js';

describe('MCP Tools Integration', () => {
  describe('Tool Aggregation', () => {
    it('should aggregate exactly 38 tools', () => {
      expect(allTools.length).toBe(37);
    });

    it('should have all tools with unique names', () => {
      const names = allTools.map((tool) => tool.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(allTools.length);
    });

    it('should follow naming convention for all tools', () => {
      allTools.forEach((tool) => {
        expect(tool.name).toMatch(/^agentic_/);
      });
    });

    it('should report correct total tool count', () => {
      expect(getToolCount()).toBe(37);
    });
  });

  describe('Tool Categories', () => {
    const categories = getToolsByCategory();

    describe('Framework Tools', () => {
      it('should have 11 framework tools', () => {
        expect(categories.framework.length).toBe(11);
      });

      it('should include expected framework tools', () => {
        const names = categories.framework.map((t) => t.name);
        expect(names).toContain('agentic_init');
        expect(names).toContain('agentic_add');
        expect(names).toContain('agentic_remove');
        expect(names).toContain('agentic_list');
        expect(names).toContain('agentic_info');
        expect(names).toContain('agentic_validate');
        expect(names).toContain('agentic_update');
        expect(names).toContain('agentic_status');
        expect(names).toContain('agentic_sync');
        expect(names).toContain('agentic_build');
        expect(names).toContain('agentic_dev');
      });
    });

    describe('Backlog Tools', () => {
      it('should have 5 backlog tools', () => {
        expect(categories.backlog.length).toBe(5);
      });

      it('should include expected backlog tools', () => {
        const names = categories.backlog.map((t) => t.name);
        expect(names).toContain('agentic_backlog_create');
        expect(names).toContain('agentic_backlog_validate');
        expect(names).toContain('agentic_backlog_import');
        expect(names).toContain('agentic_backlog_update');
        expect(names).toContain('agentic_backlog_migrate');
      });

      it('should follow backlog naming pattern', () => {
        categories.backlog.forEach((tool) => {
          expect(tool.name).toMatch(/^agentic_backlog_/);
        });
      });
    });

    describe('Confluence Tools', () => {
      it('should have 4 confluence tools', () => {
        expect(categories.confluence.length).toBe(4);
      });

      it('should include expected confluence tools', () => {
        const names = categories.confluence.map((t) => t.name);
        expect(names).toContain('agentic_confluence_create');
        expect(names).toContain('agentic_confluence_fetch');
        expect(names).toContain('agentic_confluence_import');
        expect(names).toContain('agentic_confluence_validate');
      });

      it('should follow confluence naming pattern', () => {
        categories.confluence.forEach((tool) => {
          expect(tool.name).toMatch(/^agentic_confluence_/);
        });
      });
    });

    describe('Planning Tools', () => {
      it('should have 2 planning tools', () => {
        expect(categories.planning.length).toBe(2);
      });

      it('should include expected planning tools', () => {
        const names = categories.planning.map((t) => t.name);
        expect(names).toContain('agentic_planning_create');
        expect(names).toContain('agentic_planning_validate');
      });

      it('should follow planning naming pattern', () => {
        categories.planning.forEach((tool) => {
          expect(tool.name).toMatch(/^agentic_planning_/);
        });
      });
    });

    describe('Template Tools', () => {
      it('should have 4 template tools', () => {
        expect(categories.template.length).toBe(4);
      });

      it('should include expected template tools', () => {
        const names = categories.template.map((t) => t.name);
        expect(names).toContain('agentic_template_list');
        expect(names).toContain('agentic_template_info');
        expect(names).toContain('agentic_template_render');
        expect(names).toContain('agentic_template_validate');
      });

      it('should follow template naming pattern', () => {
        categories.template.forEach((tool) => {
          expect(tool.name).toMatch(/^agentic_template_/);
        });
      });
    });

    describe('Skill Tools', () => {
      it('should have 5 skill tools', () => {
        expect(categories.skill.length).toBe(5);
      });

      it('should include expected skill tools', () => {
        const names = categories.skill.map((t) => t.name);
        expect(names).toContain('agentic_skill_deploy');
        expect(names).toContain('agentic_skill_list');
        expect(names).toContain('agentic_skill_remove');
        expect(names).toContain('agentic_skill_info');
        expect(names).toContain('agentic_skill_pull');
      });

      it('should follow skill naming pattern', () => {
        categories.skill.forEach((tool) => {
          expect(tool.name).toMatch(/^agentic_skill_/);
        });
      });
    });

    describe('Agent Tools', () => {
      it('should have 3 agent tools', () => {
        expect(categories.agent.length).toBe(3);
      });

      it('should include expected agent tools', () => {
        const names = categories.agent.map((t) => t.name);
        expect(names).toContain('agentic_agent_list');
        expect(names).toContain('agentic_agent_show');
        expect(names).toContain('agentic_agent_run');
      });

      it('should follow agent naming pattern', () => {
        categories.agent.forEach((tool) => {
          expect(tool.name).toMatch(/^agentic_agent_/);
        });
      });
    });

    describe('Create Tools', () => {
      it('should have 3 create tools', () => {
        expect(categories.create.length).toBe(3);
      });

      it('should include expected create tools', () => {
        const names = categories.create.map((t) => t.name);
        expect(names).toContain('agentic_create_agent');
        expect(names).toContain('agentic_create_skill');
        expect(names).toContain('agentic_create_module');
      });

      it('should follow create naming pattern', () => {
        categories.create.forEach((tool) => {
          expect(tool.name).toMatch(/^agentic_create_/);
        });
      });
    });
  });

  describe('Tool Metadata Validation', () => {
    it('should have all required fields for every tool', () => {
      allTools.forEach((tool) => {
        expect(tool.name).toBeDefined();
        expect(typeof tool.name).toBe('string');
        expect(tool.name.length).toBeGreaterThan(0);

        expect(tool.description).toBeDefined();
        expect(typeof tool.description).toBe('string');
        expect(tool.description.length).toBeGreaterThan(0);

        expect(tool.inputSchema).toBeDefined();
        expect(tool.handler).toBeDefined();
        expect(typeof tool.handler).toBe('function');
      });
    });

    it('should have non-empty names', () => {
      allTools.forEach((tool) => {
        expect(tool.name.trim()).toBe(tool.name);
        expect(tool.name.length).toBeGreaterThan(8); // At least "agentic_x"
      });
    });

    it('should have meaningful descriptions', () => {
      allTools.forEach((tool) => {
        expect(tool.description.length).toBeGreaterThan(10);
        expect(tool.description.trim()).toBe(tool.description);
      });
    });

    it('should have valid handler functions', () => {
      allTools.forEach((tool) => {
        expect(typeof tool.handler).toBe('function');
        // Check that handler is async (returns a Promise)
        expect(tool.handler.constructor.name).toBe('AsyncFunction');
      });
    });
  });

  describe('Schema Validation', () => {
    it('should convert all schemas to JSON Schema', () => {
      allTools.forEach((tool) => {
        expect(() => {
          z.toJSONSchema(tool.inputSchema);
        }).not.toThrow();
      });
    });

    it('should produce object schemas', () => {
      allTools.forEach((tool) => {
        const jsonSchema = z.toJSONSchema(tool.inputSchema) as Record<string, unknown>;

        expect(jsonSchema.type).toBe('object');
      });
    });

    it('should have properties object in JSON schemas', () => {
      allTools.forEach((tool) => {
        const jsonSchema = z.toJSONSchema(tool.inputSchema) as Record<string, unknown>;

        expect(jsonSchema.properties).toBeDefined();
        expect(typeof jsonSchema.properties).toBe('object');
      });
    });

    it('should have valid required arrays if present', () => {
      allTools.forEach((tool) => {
        const jsonSchema = z.toJSONSchema(tool.inputSchema) as Record<string, unknown>;

        if (jsonSchema.required) {
          expect(Array.isArray(jsonSchema.required)).toBe(true);
          (jsonSchema.required as string[]).forEach((field) => {
            expect(typeof field).toBe('string');
          });
        }
      });
    });
  });

  describe('Tool Registry Integration', () => {
    let registeredToolCount: number;

    beforeAll(() => {
      // Clear registry before testing
      toolRegistry.clear();
      // Register all tools
      toolRegistry.registerAll(allTools);
      registeredToolCount = toolRegistry.getAll().length;
    });

    afterAll(() => {
      // Clean up after tests
      toolRegistry.clear();
    });

    it('should register all tools without error', () => {
      expect(registeredToolCount).toBe(37);
    });

    it('should list all registered tools', () => {
      const registeredTools = toolRegistry.getAll();
      expect(registeredTools.length).toBe(37);
    });

    it('should retrieve tools by name', () => {
      const tool = toolRegistry.get('agentic_init');
      expect(tool).toBeDefined();
      expect(tool?.name).toBe('agentic_init');
    });

    it('should check tool existence', () => {
      expect(toolRegistry.has('agentic_init')).toBe(true);
      expect(toolRegistry.has('nonexistent_tool')).toBe(false);
    });

    it('should get all tool names', () => {
      const names = toolRegistry.getNames();
      expect(names.length).toBe(37);
      expect(names).toContain('agentic_init');
      expect(names).toContain('agentic_validate');
    });

    it('should generate valid MCP metadata', () => {
      const metadata = toolRegistry.getMetadata();
      expect(metadata.length).toBe(37);

      metadata.forEach((meta) => {
        expect(meta.name).toBeDefined();
        expect(typeof meta.name).toBe('string');

        expect(meta.description).toBeDefined();
        expect(typeof meta.description).toBe('string');

        expect(meta.inputSchema).toBeDefined();
        expect(meta.inputSchema.type).toBe('object');
        expect(meta.inputSchema.properties).toBeDefined();
      });
    });

    it('should prevent duplicate tool registration', () => {
      expect(() => {
        toolRegistry.register(allTools[0]);
      }).toThrow(/already registered/);
    });
  });

  describe('Tool Categorization Completeness', () => {
    it('should account for all tools in categories', () => {
      const categories = getToolsByCategory();
      const totalInCategories =
        categories.framework.length +
        categories.backlog.length +
        categories.confluence.length +
        categories.planning.length +
        categories.template.length +
        categories.skill.length +
        categories.agent.length +
        categories.create.length;

      expect(totalInCategories).toBe(37);
    });

    it('should have no duplicate tools across categories', () => {
      const categories = getToolsByCategory();
      const allCategoryTools = [
        ...categories.framework,
        ...categories.backlog,
        ...categories.confluence,
        ...categories.planning,
        ...categories.template,
        ...categories.skill,        ...categories.agent,
        ...categories.create,
      ];

      const names = allCategoryTools.map((t) => t.name);
      const uniqueNames = new Set(names);
      expect(uniqueNames.size).toBe(allCategoryTools.length);
    });

    it('should match allTools array', () => {
      const categories = getToolsByCategory();
      const allCategoryTools = [
        ...categories.framework,
        ...categories.backlog,
        ...categories.confluence,
        ...categories.planning,
        ...categories.template,
        ...categories.skill,        ...categories.agent,
        ...categories.create,
      ];

      expect(allCategoryTools.length).toBe(allTools.length);

      const allToolNames = new Set(allTools.map((t) => t.name));
      const categoryToolNames = new Set(allCategoryTools.map((t) => t.name));

      expect(categoryToolNames).toEqual(allToolNames);
    });
  });

  describe('Tool Naming Conventions', () => {
    it('should use snake_case for all tool names', () => {
      allTools.forEach((tool) => {
        expect(tool.name).toMatch(/^[a-z_]+$/);
      });
    });

    it('should use consistent prefixes by category', () => {
      const categories = getToolsByCategory();

      categories.backlog.forEach((tool) => {
        expect(tool.name).toMatch(/^agentic_backlog_/);
      });

      categories.confluence.forEach((tool) => {
        expect(tool.name).toMatch(/^agentic_confluence_/);
      });

      categories.planning.forEach((tool) => {
        expect(tool.name).toMatch(/^agentic_planning_/);
      });

      categories.template.forEach((tool) => {
        expect(tool.name).toMatch(/^agentic_template_/);
      });

      categories.skill.forEach((tool) => {
        expect(tool.name).toMatch(/^agentic_skill_/);
      });

      categories.agent.forEach((tool) => {
        expect(tool.name).toMatch(/^agentic_agent_/);
      });

      categories.create.forEach((tool) => {
        expect(tool.name).toMatch(/^agentic_create_/);
      });
    });

    it('should have unique suffixes within categories', () => {
      const categories = getToolsByCategory();

      Object.entries(categories).forEach(([category, tools]) => {
        const suffixes = tools.map((tool) =>
          tool.name.replace(/^agentic_[^_]+_/, '')
        );
        const uniqueSuffixes = new Set(suffixes);
        expect(uniqueSuffixes.size).toBe(tools.length);
      });
    });
  });
});
