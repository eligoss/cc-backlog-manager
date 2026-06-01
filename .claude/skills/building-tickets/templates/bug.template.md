---
documentType: bug
title: "{{summary}}"
description: "One-sentence summary of the bug"
milestone: null
priority: P0
storyPoints: null
labels: [bug]
createdDate: "{{date}}"
exportedDate: null

# Jira Integration Fields
jira-ticketId: null
jira-url: null
jira-parent: null
jira-related: []
jira-blocking: []
jira-blockedBy: []
jira-fixVersion: null
jira-internalNotes: null

# Framework Integration Fields
framework-documentation: null
framework-milestone: null
framework-technicalGuides: []
framework-relatedLocal: []
---

# Bug: {{summary}}

---

## Description

**Context:**

[Brief description of the bug and its impact on users or the system.]

**Steps to Reproduce:**

1. [Step 1 - specific action]
2. [Step 2 - specific action]
3. [Step 3 - specific action]
4. [Observe the error/issue]

**Expected Behavior:**

[What should happen when following the steps above]

**Actual Behavior:**

[What actually happens - describe the bug]

**Environment:**

* OS: [e.g., macOS 14.2, Windows 11]
* Browser/Version: [e.g., Chrome 120, Firefox 121]
* Application Version: [if applicable]
* Other relevant information: [database version, API version, etc.]

**Impact:**

* Severity: [Critical/High/Medium/Low]
* Affected Users: [All users/Specific user group/Individual user]
* Workaround: [If any workaround exists, describe it]

**Technical Notes:**

* [Initial diagnosis or suspected cause]
* [Relevant error messages or logs]
* [Suggested fix approach if known]

---

## Acceptance Criteria

* **Verify** bug is reproducible in test environment
* **Verify** root cause is identified and documented
* **Verify** fix resolves the issue without introducing regressions
* **Verify** fix is tested in all affected environments
* **Verify** relevant tests are added to prevent regression
* **Verify** documentation is updated if needed
* **Verify** related tickets are updated (if bug affects other work)
