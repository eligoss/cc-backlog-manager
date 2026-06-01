/**
 * Unit tests for plan validation rules
 *
 * @module lib/validation/rules/__tests__/plan-rules.test
 */

import {
  validatePlanRules,
  validatePlanContent,
  PlanData,
  Phase,
} from '../plan-rules.js';

describe('Plan Rules', () => {
  const testFilePath = '/test/plans/test-plan/PLAN.md';

  describe('validatePlanRules', () => {
    describe('success metrics validation', () => {
      it('should warn when phases lack success metrics', () => {
        const data: PlanData = {
          status: 'pending',
          phases: [
            {
              title: 'Phase 1',
              goal: 'Do something',
              deliverables: ['Create a feature'],
            },
          ],
          successCriteria: ['All tests pass'],
          riskLevel: 'low',
          estimatedHours: 5,
        };

        const issues = validatePlanRules(data, testFilePath);

        const successMetricsIssue = issues.find(
          (i) => i.code === 'MISSING_SUCCESS_METRICS'
        );
        expect(successMetricsIssue).toBeDefined();
        expect(successMetricsIssue?.severity).toBe('warning');
      });

      it('should not warn when phases have success metrics', () => {
        const data: PlanData = {
          status: 'pending',
          phases: [
            {
              title: 'Phase 1',
              goal: 'Do something',
              deliverables: ['Create a feature'],
              successMetrics: ['Feature works correctly'],
            },
          ],
          successCriteria: ['All tests pass'],
          riskLevel: 'low',
          estimatedHours: 5,
        };

        const issues = validatePlanRules(data, testFilePath);

        const successMetricsIssue = issues.find(
          (i) => i.code === 'MISSING_SUCCESS_METRICS'
        );
        expect(successMetricsIssue).toBeUndefined();
      });
    });

    describe('action verb validation', () => {
      it('should warn when deliverables do not start with action verbs', () => {
        const data: PlanData = {
          status: 'pending',
          phases: [
            {
              title: 'Phase 1',
              goal: 'Do something',
              deliverables: ['The new feature'],
              successMetrics: ['Feature works'],
            },
          ],
          successCriteria: ['All tests pass'],
          riskLevel: 'low',
          estimatedHours: 5,
        };

        const issues = validatePlanRules(data, testFilePath);

        const actionVerbIssue = issues.find(
          (i) => i.code === 'DELIVERABLE_NO_ACTION_VERB'
        );
        expect(actionVerbIssue).toBeDefined();
        expect(actionVerbIssue?.severity).toBe('warning');
        expect(actionVerbIssue?.message).toContain('The new feature');
      });

      it('should not warn when deliverables start with action verbs', () => {
        const data: PlanData = {
          status: 'pending',
          phases: [
            {
              title: 'Phase 1',
              goal: 'Do something',
              deliverables: ['Create the new feature', 'Implement tests'],
              successMetrics: ['Feature works'],
            },
          ],
          successCriteria: ['All tests pass'],
          riskLevel: 'low',
          estimatedHours: 5,
        };

        const issues = validatePlanRules(data, testFilePath);

        const actionVerbIssue = issues.find(
          (i) => i.code === 'DELIVERABLE_NO_ACTION_VERB'
        );
        expect(actionVerbIssue).toBeUndefined();
      });

      it('should accept various action verbs', () => {
        const verbs = [
          'create',
          'implement',
          'design',
          'build',
          'develop',
          'update',
          'refactor',
          'add',
          'test',
          'document',
        ];

        for (const verb of verbs) {
          const data: PlanData = {
            status: 'pending',
            phases: [
              {
                title: 'Phase 1',
                goal: 'Do something',
                deliverables: [`${verb.charAt(0).toUpperCase() + verb.slice(1)} something`],
                successMetrics: ['It works'],
              },
            ],
            successCriteria: ['Done'],
            riskLevel: 'low',
            estimatedHours: 5,
          };

          const issues = validatePlanRules(data, testFilePath);
          const actionVerbIssue = issues.find(
            (i) => i.code === 'DELIVERABLE_NO_ACTION_VERB'
          );
          expect(actionVerbIssue).toBeUndefined();
        }
      });
    });

    describe('success criteria validation', () => {
      it('should warn when plan lacks success criteria', () => {
        const data: PlanData = {
          status: 'pending',
          phases: [
            {
              title: 'Phase 1',
              goal: 'Do something',
              deliverables: ['Create a feature'],
              successMetrics: ['It works'],
            },
          ],
          riskLevel: 'low',
          estimatedHours: 5,
        };

        const issues = validatePlanRules(data, testFilePath);

        const successCriteriaIssue = issues.find(
          (i) => i.code === 'MISSING_SUCCESS_CRITERIA'
        );
        expect(successCriteriaIssue).toBeDefined();
        expect(successCriteriaIssue?.severity).toBe('warning');
      });

      it('should warn when success criteria is empty array', () => {
        const data: PlanData = {
          status: 'pending',
          phases: [
            {
              title: 'Phase 1',
              goal: 'Do something',
              deliverables: ['Create a feature'],
              successMetrics: ['It works'],
            },
          ],
          successCriteria: [],
          riskLevel: 'low',
          estimatedHours: 5,
        };

        const issues = validatePlanRules(data, testFilePath);

        const successCriteriaIssue = issues.find(
          (i) => i.code === 'MISSING_SUCCESS_CRITERIA'
        );
        expect(successCriteriaIssue).toBeDefined();
      });
    });

    describe('risk level validation', () => {
      it('should info when plan lacks risk level', () => {
        const data: PlanData = {
          status: 'pending',
          phases: [
            {
              title: 'Phase 1',
              goal: 'Do something',
              deliverables: ['Create a feature'],
              successMetrics: ['It works'],
            },
          ],
          successCriteria: ['All done'],
          estimatedHours: 5,
        };

        const issues = validatePlanRules(data, testFilePath);

        const riskLevelIssue = issues.find((i) => i.code === 'MISSING_RISK_LEVEL');
        expect(riskLevelIssue).toBeDefined();
        expect(riskLevelIssue?.severity).toBe('info');
      });
    });

    describe('estimated hours validation', () => {
      it('should info when plan lacks time estimate', () => {
        const data: PlanData = {
          status: 'pending',
          phases: [
            {
              title: 'Phase 1',
              goal: 'Do something',
              deliverables: ['Create a feature'],
              successMetrics: ['It works'],
            },
          ],
          successCriteria: ['All done'],
          riskLevel: 'low',
        };

        const issues = validatePlanRules(data, testFilePath);

        const timeEstimateIssue = issues.find(
          (i) => i.code === 'MISSING_TIME_ESTIMATE'
        );
        expect(timeEstimateIssue).toBeDefined();
        expect(timeEstimateIssue?.severity).toBe('info');
      });

      it('should warn when estimated hours is less than 3', () => {
        const data: PlanData = {
          status: 'pending',
          phases: [
            {
              title: 'Phase 1',
              goal: 'Do something',
              deliverables: ['Create a feature'],
              successMetrics: ['It works'],
            },
          ],
          successCriteria: ['All done'],
          riskLevel: 'low',
          estimatedHours: 2,
        };

        const issues = validatePlanRules(data, testFilePath);

        const insufficientIssue = issues.find(
          (i) => i.code === 'INSUFFICIENT_COMPLEXITY'
        );
        expect(insufficientIssue).toBeDefined();
        expect(insufficientIssue?.severity).toBe('warning');
        expect(insufficientIssue?.message).toContain('2 hours');
      });

      it('should not warn when estimated hours is 3 or more', () => {
        const data: PlanData = {
          status: 'pending',
          phases: [
            {
              title: 'Phase 1',
              goal: 'Do something',
              deliverables: ['Create a feature'],
              successMetrics: ['It works'],
            },
          ],
          successCriteria: ['All done'],
          riskLevel: 'low',
          estimatedHours: 3,
        };

        const issues = validatePlanRules(data, testFilePath);

        const insufficientIssue = issues.find(
          (i) => i.code === 'INSUFFICIENT_COMPLEXITY'
        );
        expect(insufficientIssue).toBeUndefined();
      });
    });

    describe('category format validation', () => {
      it('should warn when category is not kebab-case', () => {
        const data: PlanData = {
          status: 'pending',
          category: 'MyCategory',
          phases: [
            {
              title: 'Phase 1',
              goal: 'Do something',
              deliverables: ['Create a feature'],
              successMetrics: ['It works'],
            },
          ],
          successCriteria: ['All done'],
          riskLevel: 'low',
          estimatedHours: 5,
        };

        const issues = validatePlanRules(data, testFilePath);

        const categoryIssue = issues.find(
          (i) => i.code === 'INVALID_CATEGORY_FORMAT'
        );
        expect(categoryIssue).toBeDefined();
        expect(categoryIssue?.severity).toBe('warning');
      });

      it('should not warn when category is valid kebab-case', () => {
        const data: PlanData = {
          status: 'pending',
          category: 'my-category',
          phases: [
            {
              title: 'Phase 1',
              goal: 'Do something',
              deliverables: ['Create a feature'],
              successMetrics: ['It works'],
            },
          ],
          successCriteria: ['All done'],
          riskLevel: 'low',
          estimatedHours: 5,
        };

        const issues = validatePlanRules(data, testFilePath);

        const categoryIssue = issues.find(
          (i) => i.code === 'INVALID_CATEGORY_FORMAT'
        );
        expect(categoryIssue).toBeUndefined();
      });

      it('should accept single-word categories', () => {
        const data: PlanData = {
          status: 'pending',
          category: 'framework',
          phases: [
            {
              title: 'Phase 1',
              goal: 'Do something',
              deliverables: ['Create a feature'],
              successMetrics: ['It works'],
            },
          ],
          successCriteria: ['All done'],
          riskLevel: 'low',
          estimatedHours: 5,
        };

        const issues = validatePlanRules(data, testFilePath);

        const categoryIssue = issues.find(
          (i) => i.code === 'INVALID_CATEGORY_FORMAT'
        );
        expect(categoryIssue).toBeUndefined();
      });
    });

    describe('phase count validation', () => {
      it('should warn when plan has fewer than 3 phases', () => {
        const data: PlanData = {
          status: 'pending',
          phases: [
            {
              title: 'Phase 1',
              goal: 'Do something',
              deliverables: ['Create a feature'],
              successMetrics: ['It works'],
            },
            {
              title: 'Phase 2',
              goal: 'Do more',
              deliverables: ['Add tests'],
              successMetrics: ['Tests pass'],
            },
          ],
          successCriteria: ['All done'],
          riskLevel: 'low',
          estimatedHours: 5,
        };

        const issues = validatePlanRules(data, testFilePath);

        const phaseCountIssue = issues.find((i) => i.code === 'TOO_FEW_PHASES');
        expect(phaseCountIssue).toBeDefined();
        expect(phaseCountIssue?.severity).toBe('warning');
      });

      it('should warn when plan has more than 7 phases', () => {
        const phases: Phase[] = [];
        for (let i = 1; i <= 8; i++) {
          phases.push({
            title: `Phase ${i}`,
            goal: `Goal ${i}`,
            deliverables: [`Create thing ${i}`],
            successMetrics: [`Thing ${i} works`],
          });
        }

        const data: PlanData = {
          status: 'pending',
          phases,
          successCriteria: ['All done'],
          riskLevel: 'low',
          estimatedHours: 10,
        };

        const issues = validatePlanRules(data, testFilePath);

        const phaseCountIssue = issues.find((i) => i.code === 'TOO_MANY_PHASES');
        expect(phaseCountIssue).toBeDefined();
        expect(phaseCountIssue?.severity).toBe('warning');
      });

      it('should not warn when plan has 3-7 phases', () => {
        const phases: Phase[] = [];
        for (let i = 1; i <= 4; i++) {
          phases.push({
            title: `Phase ${i}`,
            goal: `Goal ${i}`,
            deliverables: [`Create thing ${i}`],
            successMetrics: [`Thing ${i} works`],
          });
        }

        const data: PlanData = {
          status: 'pending',
          phases,
          successCriteria: ['All done'],
          riskLevel: 'low',
          estimatedHours: 10,
        };

        const issues = validatePlanRules(data, testFilePath);

        const tooFew = issues.find((i) => i.code === 'TOO_FEW_PHASES');
        const tooMany = issues.find((i) => i.code === 'TOO_MANY_PHASES');
        expect(tooFew).toBeUndefined();
        expect(tooMany).toBeUndefined();
      });
    });

    describe('phase title length validation', () => {
      it('should warn when phase title exceeds 60 characters', () => {
        const data: PlanData = {
          status: 'pending',
          phases: [
            {
              title: 'This is a very long phase title that exceeds the sixty character limit we have set',
              goal: 'Do something',
              deliverables: ['Create a feature'],
              successMetrics: ['It works'],
            },
          ],
          successCriteria: ['All done'],
          riskLevel: 'low',
          estimatedHours: 5,
        };

        const issues = validatePlanRules(data, testFilePath);

        const titleIssue = issues.find((i) => i.code === 'PHASE_TITLE_TOO_LONG');
        expect(titleIssue).toBeDefined();
        expect(titleIssue?.severity).toBe('warning');
      });
    });

    describe('single deliverable validation', () => {
      it('should info when phase has only one deliverable', () => {
        const data: PlanData = {
          status: 'pending',
          phases: [
            {
              title: 'Phase 1',
              goal: 'Do something',
              deliverables: ['Create a feature'],
              successMetrics: ['It works'],
            },
          ],
          successCriteria: ['All done'],
          riskLevel: 'low',
          estimatedHours: 5,
        };

        const issues = validatePlanRules(data, testFilePath);

        const singleDeliverableIssue = issues.find(
          (i) => i.code === 'SINGLE_DELIVERABLE_PHASE'
        );
        expect(singleDeliverableIssue).toBeDefined();
        expect(singleDeliverableIssue?.severity).toBe('info');
      });

      it('should not warn when phase has multiple deliverables', () => {
        const data: PlanData = {
          status: 'pending',
          phases: [
            {
              title: 'Phase 1',
              goal: 'Do something',
              deliverables: ['Create a feature', 'Add tests'],
              successMetrics: ['It works'],
            },
          ],
          successCriteria: ['All done'],
          riskLevel: 'low',
          estimatedHours: 5,
        };

        const issues = validatePlanRules(data, testFilePath);

        const singleDeliverableIssue = issues.find(
          (i) => i.code === 'SINGLE_DELIVERABLE_PHASE'
        );
        expect(singleDeliverableIssue).toBeUndefined();
      });
    });

    describe('empty plan handling', () => {
      it('should handle plan with no phases', () => {
        const data: PlanData = {
          status: 'pending',
          successCriteria: ['All done'],
          riskLevel: 'low',
          estimatedHours: 5,
        };

        const issues = validatePlanRules(data, testFilePath);
        // Should not throw, just return warnings about missing success criteria
        expect(Array.isArray(issues)).toBe(true);
      });

      it('should handle plan with empty phases array', () => {
        const data: PlanData = {
          status: 'pending',
          phases: [],
          successCriteria: ['All done'],
          riskLevel: 'low',
          estimatedHours: 5,
        };

        const issues = validatePlanRules(data, testFilePath);
        expect(Array.isArray(issues)).toBe(true);
      });
    });
  });

  describe('validatePlanContent', () => {
    describe('required sections', () => {
      it('should error when missing Problem Statement section', () => {
        const content = `
## Solution Overview
This is the solution.

## Phases
Phase details here.
        `;

        const issues = validatePlanContent(content, testFilePath);

        const problemStatementIssue = issues.find(
          (i) => i.code === 'MISSING_PROBLEM_STATEMENT'
        );
        expect(problemStatementIssue).toBeDefined();
        expect(problemStatementIssue?.severity).toBe('error');
      });

      it('should error when missing Solution Overview section', () => {
        const content = `
## Problem Statement
This is the problem.

## Phases
Phase details here.
        `;

        const issues = validatePlanContent(content, testFilePath);

        const solutionOverviewIssue = issues.find(
          (i) => i.code === 'MISSING_SOLUTION_OVERVIEW'
        );
        expect(solutionOverviewIssue).toBeDefined();
        expect(solutionOverviewIssue?.severity).toBe('error');
      });

      it('should error when missing Phases section', () => {
        const content = `
## Problem Statement
This is the problem.

## Solution Overview
This is the solution.
        `;

        const issues = validatePlanContent(content, testFilePath);

        const phasesIssue = issues.find((i) => i.code === 'MISSING_PHASES_SECTION');
        expect(phasesIssue).toBeDefined();
        expect(phasesIssue?.severity).toBe('error');
      });

      it('should warn when missing Success Criteria section', () => {
        const content = `
## Problem Statement
This is the problem.

## Solution Overview
This is the solution.

## Phases
Phase details here.
        `;

        const issues = validatePlanContent(content, testFilePath);

        const successCriteriaIssue = issues.find(
          (i) => i.code === 'MISSING_SUCCESS_CRITERIA_SECTION'
        );
        expect(successCriteriaIssue).toBeDefined();
        expect(successCriteriaIssue?.severity).toBe('warning');
      });
    });

    describe('content length validation', () => {
      it('should warn when content is too short', () => {
        const content = `
## Problem Statement
Short.

## Solution Overview
Short.

## Phases
Short.
        `;

        const issues = validatePlanContent(content, testFilePath);

        const shortIssue = issues.find((i) => i.code === 'PLAN_TOO_SHORT');
        expect(shortIssue).toBeDefined();
        expect(shortIssue?.severity).toBe('warning');
      });

      it('should not warn when content is long enough', () => {
        const longContent = `
## Problem Statement

This is a detailed problem statement that explains the issue we are trying to solve.
The problem is complex and requires careful analysis before we can proceed with
a solution. We need to consider multiple factors and stakeholders.

## Solution Overview

The proposed solution involves several key components that work together to
address the problem. We will implement a phased approach to minimize risk
and ensure proper testing at each stage of development.

## Phases

### Phase 1: Research
- Analyze existing systems
- Document requirements
- Create technical specifications

### Phase 2: Implementation
- Build core components
- Integrate with existing systems
- Implement error handling

### Phase 3: Testing
- Unit tests
- Integration tests
- User acceptance testing

## Success Criteria

- All tests pass
- Performance targets met
- User feedback positive
        `;

        const issues = validatePlanContent(longContent, testFilePath);

        const shortIssue = issues.find((i) => i.code === 'PLAN_TOO_SHORT');
        expect(shortIssue).toBeUndefined();
      });
    });

    describe('valid plan', () => {
      it('should return no errors for a complete valid plan', () => {
        const content = `
## Problem Statement

This is a comprehensive problem statement that clearly explains the issue.

## Solution Overview

This is a detailed solution overview that describes the approach.

## Phases

### Phase 1
Details about phase 1.

### Phase 2
Details about phase 2.

### Phase 3
Details about phase 3.

## Success Criteria

- Criteria 1
- Criteria 2
- Criteria 3

## Additional Notes

Some additional context and notes about the plan.
        `;

        const issues = validatePlanContent(content, testFilePath);

        const errors = issues.filter((i) => i.severity === 'error');
        expect(errors).toHaveLength(0);
      });
    });
  });
});
