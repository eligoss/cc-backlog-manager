/**
 * Unit tests for validateTicketRules with TicketValidationConfig
 *
 * Verifies that component validation is config-driven:
 * - When config.components is populated, only listed values are allowed
 * - When config is absent or components is empty, any component is accepted
 *
 * @module __tests__/unit/ticket-rules-config.test
 */

import { describe, it, expect } from '@jest/globals';
import {
  validateTicketRules,
  TicketData,
  TicketValidationConfig,
} from '../../lib/validation/rules/ticket-rules.js';

describe('ticket-rules with TicketValidationConfig', () => {
  const testFilePath = '/test/backlog/tickets/STORY-001.md';

  // A story body that satisfies all existing validation rules:
  //  - Has ## Description
  //  - Has ## Acceptance Criteria with 5 ** Verify ** points
  //  - Has user story format (AS / I WANT / SO THAT)
  //  - Has two --- dividers
  //  - No code blocks
  const validStoryContent = `---
documentType: story
title: Test Story
component: "Team: Frontend"
---

**AS** a developer, **I WANT** to configure components, **SO THAT** only valid teams appear.

---

## Description

This story tests component validation via config.

---

## Acceptance Criteria

* **Verify** the component field is validated against the config list.
* **Verify** an error is raised when the component is not in the list.
* **Verify** no error occurs when the component is in the list.
* **Verify** no error occurs when no config is provided.
* **Verify** no error occurs when config.components is empty.
`;

  const validStoryData: TicketData = {
    documentType: 'story',
    title: 'Test Story',
    component: 'Team: Frontend',
  };

  it('should pass when component matches config components list', () => {
    const config: TicketValidationConfig = {
      components: ['Team: Frontend', 'Team: Backend'],
    };

    const issues = validateTicketRules(validStoryData, validStoryContent, testFilePath, config);

    const componentIssues = issues.filter(
      (i) => i.code === 'INVALID_COMPONENT'
    );
    expect(componentIssues).toHaveLength(0);
  });

  it('should error when component not in config components list', () => {
    const dataWithUnknownComponent: TicketData = {
      ...validStoryData,
      component: 'Unknown Team',
    };
    const contentWithUnknownComponent = validStoryContent.replace(
      'component: "Team: Frontend"',
      'component: "Unknown Team"'
    );
    const config: TicketValidationConfig = {
      components: ['Team: Frontend', 'Team: Backend'],
    };

    const issues = validateTicketRules(
      dataWithUnknownComponent,
      contentWithUnknownComponent,
      testFilePath,
      config
    );

    const componentIssues = issues.filter((i) => i.code === 'INVALID_COMPONENT');
    expect(componentIssues).toHaveLength(1);
    expect(componentIssues[0].severity).toBe('error');
    expect(componentIssues[0].message).toContain('Unknown Team');
    expect(componentIssues[0].message).toContain('Team: Frontend');
    expect(componentIssues[0].message).toContain('Team: Backend');
  });

  it('should accept any component when no config provided', () => {
    const dataWithArbitraryComponent: TicketData = {
      ...validStoryData,
      component: 'Anything Goes',
    };
    const contentWithArbitraryComponent = validStoryContent.replace(
      'component: "Team: Frontend"',
      'component: "Anything Goes"'
    );

    // No config argument
    const issues = validateTicketRules(
      dataWithArbitraryComponent,
      contentWithArbitraryComponent,
      testFilePath
    );

    const componentIssues = issues.filter((i) => i.code === 'INVALID_COMPONENT');
    expect(componentIssues).toHaveLength(0);
  });

  it('should accept any component when config has empty components list', () => {
    const config: TicketValidationConfig = {
      components: [],
    };

    const issues = validateTicketRules(validStoryData, validStoryContent, testFilePath, config);

    const componentIssues = issues.filter((i) => i.code === 'INVALID_COMPONENT');
    expect(componentIssues).toHaveLength(0);
  });
});
