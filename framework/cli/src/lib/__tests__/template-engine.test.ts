/**
 * Unit Tests for Template Engine
 *
 * Tests template copying and generation functionality.
 */

import fs from 'fs-extra';
import { copyTemplates } from '../template-engine.js';

// Mock fs-extra
jest.mock('fs-extra');
const mockedFs = fs as jest.Mocked<typeof fs>;

describe('copyTemplates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockedFs.ensureDir.mockResolvedValue(undefined as any);
    mockedFs.writeFile.mockResolvedValue(undefined);
  });

  describe('minimal template', () => {
    it('should create all three context files', async () => {
      await copyTemplates('/test/project', 'minimal');

      expect(mockedFs.ensureDir).toHaveBeenCalledWith('/test/project/ai/context');
      expect(mockedFs.writeFile).toHaveBeenCalledTimes(3);
    });

    it('should create business-basic.md with minimal template', async () => {
      await copyTemplates('/test/project', 'minimal');

      const businessCall = mockedFs.writeFile.mock.calls.find(
        call => String(call[0]).includes('business-basic.md')
      );

      expect(businessCall).toBeDefined();
      expect(businessCall![1]).toContain('# Business Context (Basic)');
      expect(businessCall![1]).toContain('## Product Overview');
      expect(businessCall![1]).toContain('## User Roles');
      expect(businessCall![1]).toContain('## Key Features');
    });

    it('should create technical-basic.md with minimal template', async () => {
      await copyTemplates('/test/project', 'minimal');

      const technicalCall = mockedFs.writeFile.mock.calls.find(
        call => String(call[0]).includes('technical-basic.md')
      );

      expect(technicalCall).toBeDefined();
      expect(technicalCall![1]).toContain('# Technical Context (Basic)');
      expect(technicalCall![1]).toContain('## Tech Stack');
      expect(technicalCall![1]).toContain('## Architecture Overview');
      expect(technicalCall![1]).toContain('## Key Patterns');
    });

    it('should create process-basic.md with minimal template', async () => {
      await copyTemplates('/test/project', 'minimal');

      const processCall = mockedFs.writeFile.mock.calls.find(
        call => String(call[0]).includes('process-basic.md')
      );

      expect(processCall).toBeDefined();
      expect(processCall![1]).toContain('# Process Context (Basic)');
      expect(processCall![1]).toContain('## Development Workflow');
      expect(processCall![1]).toContain('## Team Structure');
      expect(processCall![1]).toContain('## Release Process');
    });
  });

  describe('full template', () => {
    it('should create all three context files', async () => {
      await copyTemplates('/test/project', 'full');

      expect(mockedFs.ensureDir).toHaveBeenCalledWith('/test/project/ai/context');
      expect(mockedFs.writeFile).toHaveBeenCalledTimes(3);
    });

    it('should create business-basic.md with full template', async () => {
      await copyTemplates('/test/project', 'full');

      const businessCall = mockedFs.writeFile.mock.calls.find(
        call => String(call[0]).includes('business-basic.md')
      );

      expect(businessCall).toBeDefined();
      expect(businessCall![1]).toContain('# Business Context (Basic)');
      expect(businessCall![1]).toContain('## Product Overview');
      expect(businessCall![1]).toContain('**Product Name:**');
      expect(businessCall![1]).toContain('## Business Rules');
      expect(businessCall![1]).toContain('Role 1:');
      expect(businessCall![1]).toContain('Feature 1:');
    });

    it('should create technical-basic.md with full template', async () => {
      await copyTemplates('/test/project', 'full');

      const technicalCall = mockedFs.writeFile.mock.calls.find(
        call => String(call[0]).includes('technical-basic.md')
      );

      expect(technicalCall).toBeDefined();
      expect(technicalCall![1]).toContain('# Technical Context (Basic)');
      expect(technicalCall![1]).toContain('### Frontend');
      expect(technicalCall![1]).toContain('### Backend');
      expect(technicalCall![1]).toContain('### Infrastructure');
      expect(technicalCall![1]).toContain('## Repository Structure');
    });

    it('should create process-basic.md with full template', async () => {
      await copyTemplates('/test/project', 'full');

      const processCall = mockedFs.writeFile.mock.calls.find(
        call => String(call[0]).includes('process-basic.md')
      );

      expect(processCall).toBeDefined();
      expect(processCall![1]).toContain('# Process Context (Basic)');
      expect(processCall![1]).toContain('### Branching Strategy');
      expect(processCall![1]).toContain('### Code Review Process');
      expect(processCall![1]).toContain('### Definition of Done');
      expect(processCall![1]).toContain('## Release Process');
    });
  });

  describe('directory creation', () => {
    it('should ensure ai/context directory exists', async () => {
      await copyTemplates('/custom/path', 'minimal');

      expect(mockedFs.ensureDir).toHaveBeenCalledWith('/custom/path/ai/context');
    });

    it('should write files to correct paths', async () => {
      await copyTemplates('/project', 'minimal');

      const filePaths = mockedFs.writeFile.mock.calls.map(call => call[0]);

      expect(filePaths).toContain('/project/ai/context/business-basic.md');
      expect(filePaths).toContain('/project/ai/context/technical-basic.md');
      expect(filePaths).toContain('/project/ai/context/process-basic.md');
    });
  });

  describe('unknown template', () => {
    it('should use full template as default for unknown template names', async () => {
      await copyTemplates('/test/project', 'unknown');

      const businessCall = mockedFs.writeFile.mock.calls.find(
        call => String(call[0]).includes('business-basic.md')
      );

      // Unknown templates should use full template (contains more detailed sections)
      expect(businessCall![1]).toContain('**Product Name:**');
    });
  });
});
