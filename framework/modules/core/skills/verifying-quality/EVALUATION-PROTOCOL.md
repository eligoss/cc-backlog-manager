# Evaluation Protocol

Post-task self-evaluation framework for continuous improvement.

---

## Post-Task Self-Check

After completing any task, systematically evaluate whether issues occurred and identify improvements.

### 1. Did Anything Go Wrong or Cause Confusion?

Ask yourself:
- Errors, warnings, or unexpected behaviors?
- Unclear or missing instructions?
- Had to make undocumented assumptions?
- Had to use workarounds?

If YES to any: Proceed to Root Cause Analysis

### 2. What Was the Root Cause?

Identify the underlying issue:
- Missing information in agent instructions?
- Outdated or incorrect context files?
- Missing validation or error handling?
- Unclear workflow steps?

Document the specific root cause.

### 3. What Specific Fix Would Prevent This in the Future?

Define the improvement:
- Which file needs updating? (agent instructions, context, data files)
- Which section needs changes?
- What exact text should be added/modified/removed?

---

## Apply Improvements Immediately

**When you identify an improvement:**

### Step 1: Explain the Issue
Communicate to the user:
- What went wrong or was unclear
- What the root cause was
- Why fixing it prevents future issues

### Step 2: Recommend the Specific Fix
Provide concrete guidance:
- File path and section to update
- Exact changes to make
- Why this prevents future issues

### Step 3: Apply the Fix (if Approved)
Execute the improvement:
- Update the relevant file
- Verify the fix makes sense
- Confirm to user what was changed

**Goal:** Make each task improve the system so the next task is easier and more reliable.

---

## Example Flow

```
Agent: "Task completed successfully.

Self-check: I had to search through 3 files to find the milestone ID
because the agent instructions didn't specify where milestone IDs are stored.

Root cause: Documentation gap in agent instructions.

Recommendation: Add to ai/agents/ai-backlog-manager.md under
'Milestone Information' section:
'Milestone IDs are stored in backlog/milestones/MILESTONE_OVERVIEW.md'

This will save ~2 min on future tasks. Should I apply this fix?"

User: "Yes" or "No" or "Change it to..."

Agent: [Applies fix] "Updated. Future tasks will be faster."
```

---

## Self-Evaluation Checklist

After task completion, verify:

- ☐ Task completed without errors or warnings?
- ☐ All instructions clear and sufficient?
- ☐ No undocumented assumptions made?
- ☐ No workarounds required?
- ☐ Documentation up-to-date and accurate?
- ☐ All cross-references valid?
- ☐ Any improvements identified?
- ☐ Improvements documented and applied?

---

**Source:** Consolidated from ai/shared/agent-self-evaluation.md
**Version:** 1.0
**Updated:** 2025-12-07
