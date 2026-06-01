# Report Generation Examples

This file contains example templates and patterns for the building-reports skill.

---

## Example 1: Executive Summary Template

```markdown
---
title: "[Project] - Executive Summary - [YYYY-MM]"
report-type: executive
period: [YYYY-MM]
author: [AUTHOR_ID]
status: draft
pageId: null
---

# [Project] - Executive Summary - [Period]

## Executive Summary

**Status:** [✅ On Track | ⚠️ At Risk | ❌ Off Track]

**Period:** [Date Range]

**Key Highlights:**
- [Achievement 1 with metric]
- [Achievement 2 with metric]
- [Achievement 3 with metric]

**Critical Issues:**
- [Issue 1 with impact and mitigation]
- [Issue 2 with impact and mitigation]

**Recommendation:** [1-2 sentences with specific actions]

---

## Key Metrics

| Metric | Target | Actual | Variance | Status |
|--------|--------|--------|----------|--------|
| [Metric 1] | [X] | [Y] | [±Z] | [✅⚠️❌] |
| [Metric 2] | [X] | [Y] | [±Z] | [✅⚠️❌] |
| [Metric 3] | [X] | [Y] | [±Z] | [✅⚠️❌] |

---

## Risks & Issues

### Critical Risks
- **[Risk 1]:** [Description] - Impact: [High/Medium/Low] - Mitigation: [Action]
- **[Risk 2]:** [Description] - Impact: [High/Medium/Low] - Mitigation: [Action]

### Active Issues
- **[Issue 1]:** [Description] - Owner: [Name] - ETA: [Date]
- **[Issue 2]:** [Description] - Owner: [Name] - ETA: [Date]

---

## Next Steps

**Week of [DATE]:**
- [ ] [Action 1 - Owner]
- [ ] [Action 2 - Owner]
- [ ] [Action 3 - Owner]

**Key Decisions Needed:**
- [Decision 1] - By: [Date] - Owner: [Name]
- [Decision 2] - By: [Date] - Owner: [Name]

---

## Template Metadata

**Version:** 1.0
**Last Updated:** [DATE]
**Intended Use:** Weekly or monthly executive status updates
**Data Sources:**
- Jira Dashboard: [URL]
- Sprint Reports: [Location]
- Team Status: [Source]

### Data Gathering Checklist
- [ ] Collect sprint/milestone metrics from Jira
- [ ] Review risk register and issue tracker
- [ ] Get team status updates
- [ ] Calculate key metrics (velocity, quality, delivery)
- [ ] Identify top 3-5 highlights and 2-3 critical issues
```

---

## Example 2: Sprint Team Metrics Template

```markdown
---
title: "[Project] - Sprint [XX] Metrics"
report-type: team
period: [YYYYWXX]
sprint-id: [Sprint XX]
author: [AUTHOR_ID]
status: draft
pageId: null
---

# [Project] - Sprint [XX] Metrics

**Sprint:** [Sprint ID]
**Dates:** [Start Date] - [End Date]
**Status:** [Completed|In Progress]

---

## Sprint Overview

**Sprint Goal:** [Goal description]

**Achievement:** [✅ Met | ⚠️ Partially Met | ❌ Not Met]

---

## Velocity Metrics

| Metric | Committed | Completed | Variance | Say/Do Ratio |
|--------|-----------|-----------|----------|--------------|
| Story Points | [X] SP | [Y] SP | [±Z] SP | [%] |
| Ticket Count | [X] | [Y] | [±Z] | [%] |

**Historical Velocity:**
- Sprint [N-2]: [X] SP
- Sprint [N-1]: [Y] SP
- Sprint [N]: [Z] SP
- **Trend:** [↗️ Improving | → Stable | ↘️ Declining]

---

## Quality Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Bug Escape Rate | <5% | [X]% | [✅⚠️❌] |
| Test Coverage | >80% | [X]% | [✅⚠️❌] |
| Code Review Cycle | <24h | [X]h | [✅⚠️❌] |

---

## Team Capacity

| Team Member | Planned Hours | Actual Hours | Utilization |
|-------------|---------------|--------------|-------------|
| [Name 1] | [X]h | [Y]h | [Z]% |
| [Name 2] | [X]h | [Y]h | [Z]% |
| **Total** | [X]h | [Y]h | [Z]% |

---

## Blockers & Impediments

### Active Blockers
- **[Blocker 1]:** [Description] - Impact: [High/Med/Low] - Owner: [Name]
- **[Blocker 2]:** [Description] - Impact: [High/Med/Low] - Owner: [Name]

### Resolved This Sprint
- [Blocker 1] - Resolved: [Date]
- [Blocker 2] - Resolved: [Date]

---

## Recommendations

1. **[Recommendation 1]:** [Specific action with owner and timeline]
2. **[Recommendation 2]:** [Specific action with owner and timeline]
3. **[Recommendation 3]:** [Specific action with owner and timeline]

---

## Template Metadata

**Version:** 1.0
**Data Sources:**
- Jira Sprint Report: [URL]
- Team Capacity Calendar: [Source]
- Quality Dashboard: [URL]

### Data Gathering Checklist
- [ ] Extract sprint metrics from Jira (Story Points: X → Y format)
- [ ] Collect team capacity data
- [ ] Review quality metrics dashboard
- [ ] Document active blockers
- [ ] Calculate say/do ratio and trends
```

---

## Example 3: Actual Generated Report (Mode 2)

```markdown
---
title: "APM-R - Sprint 42 Metrics"
report-type: team
period: 2025W51
sprint-id: Sprint 42
author: ai-report-manager
status: current
pageId: null
---

# APM-R - Sprint 42 Metrics

**Sprint:** Sprint 42
**Dates:** December 16-20, 2025
**Status:** Completed

---

## Sprint Overview

**Sprint Goal:** Complete forecasting UI improvements and reliability dashboard updates

**Achievement:** ✅ Met - All committed stories completed with 15% over-delivery

---

## Velocity Metrics

| Metric | Committed | Completed | Variance | Say/Do Ratio |
|--------|-----------|-----------|----------|--------------|
| Story Points | 20 SP | 23 SP | +3 SP | 115% |
| Ticket Count | 8 | 9 | +1 | 113% |

**Historical Velocity:**
- Sprint 40: 18 SP
- Sprint 41: 21 SP
- Sprint 42: 23 SP
- **Trend:** ↗️ Improving (+28% over 3 sprints)

**Analysis:** Team velocity increased 15% this sprint due to reduced context switching and focused sprint planning. The over-delivery was driven by completing an unplanned bug fix (5 SP) that unblocked the forecasting feature.

---

## Quality Metrics

| Metric | Target | Actual | Status |
|--------|--------|--------|--------|
| Bug Escape Rate | <5% | 3% | ✅ |
| Test Coverage | >80% | 84% | ✅ |
| Code Review Cycle | <24h | 18h | ✅ |

**Analysis:** All quality metrics met or exceeded targets. Test coverage improved 4% due to comprehensive unit tests for forecasting module. Code review cycle reduced by 6 hours through daily sync meetings.

---

## Team Capacity

| Team Member | Planned Hours | Actual Hours | Utilization |
|-------------|---------------|--------------|-------------|
| Developer A | 40h | 38h | 95% |
| Developer B | 40h | 42h | 105% |
| Developer C | 32h | 30h | 94% |
| **Total** | 112h | 110h | 98% |

**Analysis:** Team utilization at optimal 98%. Developer B's overtime was voluntary to complete forecasting feature before holiday break.

---

## Blockers & Impediments

### Active Blockers
- None - All blockers from previous sprint resolved

### Resolved This Sprint
- **API rate limiting:** Resolved Dec 17 - Implemented caching layer
- **Test environment instability:** Resolved Dec 18 - Infrastructure upgrade completed

---

## Recommendations

1. **Maintain sprint planning discipline:** Current focused approach is working well - continue with clear sprint goals and minimal mid-sprint changes.
2. **Expand test coverage for edge cases:** While at 84%, identify remaining gaps in forecasting module error handling.
3. **Schedule post-holiday retrospective:** Review sprint success patterns and apply learnings to Q1 planning.

---

**Data Sources:**
- Jira Sprint Report: https://example.atlassian.net/sprint/42
- Team Capacity: Team calendar and time tracking
- Quality Dashboard: https://example.com/quality-metrics

**Report Generated:** December 20, 2025 by ai-report-manager
```

---

## Example 4: Sprint Retrospective Template

```markdown
---
title: "[Project] - Sprint [XX] Retrospective"
report-type: retrospective
period: [YYYYWXX]
sprint-id: [Sprint XX]
author: [AUTHOR_ID]
status: draft
pageId: null
---

# [Project] - Sprint [XX] Retrospective

**Sprint:** [Sprint ID]
**Date:** [Retrospective Date]
**Participants:** [Team member names]

---

## What Went Well ✅

### [Category 1: e.g., Delivery]
- **[Success 1]:** [Description with evidence]
  - Impact: [Quantifiable result]
  - Why it worked: [Root cause analysis]

- **[Success 2]:** [Description with evidence]
  - Impact: [Quantifiable result]
  - Why it worked: [Root cause analysis]

### [Category 2: e.g., Collaboration]
- **[Success 3]:** [Description with evidence]
  - Impact: [Quantifiable result]
  - Why it worked: [Root cause analysis]

---

## What Could Improve ⚠️

### [Challenge 1]
- **Problem:** [Description]
- **Impact:** [How it affected the sprint]
- **Root Cause:** [Why it happened]
- **Suggested Fix:** [Specific actionable solution]

### [Challenge 2]
- **Problem:** [Description]
- **Impact:** [How it affected the sprint]
- **Root Cause:** [Why it happened]
- **Suggested Fix:** [Specific actionable solution]

---

## Key Learnings 💡

1. **[Learning 1]:** [What we learned]
   - How to apply: [Specific application for future sprints]

2. **[Learning 2]:** [What we learned]
   - How to apply: [Specific application for future sprints]

3. **[Learning 3]:** [What we learned]
   - How to apply: [Specific application for future sprints]

---

## Action Items 🎯

**For Next Sprint:**
- [ ] [Action 1] - Owner: [Name] - Due: [Date]
- [ ] [Action 2] - Owner: [Name] - Due: [Date]
- [ ] [Action 3] - Owner: [Name] - Due: [Date]

**Process Improvements:**
- [ ] [Improvement 1] - Owner: [Name] - Implementation: [Timeline]
- [ ] [Improvement 2] - Owner: [Name] - Implementation: [Timeline]

---

## Metrics Summary

| Metric | This Sprint | Previous Sprint | Trend |
|--------|-------------|-----------------|-------|
| Velocity | [X] SP | [Y] SP | [↗️→↘️] |
| Say/Do Ratio | [X]% | [Y]% | [↗️→↘️] |
| Team Satisfaction | [X]/5 | [Y]/5 | [↗️→↘️] |

---

## Template Metadata

**Version:** 1.0
**Intended Use:** End-of-sprint retrospective documentation
**Data Sources:**
- Team retrospective session notes
- Sprint metrics from Jira
- Team satisfaction survey

### Retrospective Facilitation Checklist
- [ ] Schedule 60-90 minute session with full team
- [ ] Collect sprint metrics beforehand
- [ ] Use anonymous input method for sensitive topics
- [ ] Focus on actionable improvements
- [ ] Assign owners and due dates for all actions
- [ ] Review previous retrospective actions
```

---

## Example 5: Data Validation Checklist (Before Report Generation)

```markdown
# Pre-Report Data Validation Checklist
# Use this before generating any Mode 2 (actual data) report

## Report Information
- [ ] Report Type: [executive|performance|team|risk|retrospective]
- [ ] Time Period: [YYYY-MM or YYYYWXX]
- [ ] Target Audience: [List stakeholders]
- [ ] Template Used: [Template filename or "custom"]

---

## Required Data Sources

### Sprint/Milestone Data
- [ ] Sprint/Milestone ID: _______________
- [ ] Date Range: _______________ to _______________
- [ ] Jira Filter/Board URL: _______________
- [ ] Sprint Report Screenshot: _______________ (if applicable)

### Velocity Data
- [ ] Story Points Committed: _______________
- [ ] Story Points Completed: _______________
- [ ] Verify notation: "X → Y" format parsed correctly (use Y value)
- [ ] Ticket Count Committed: _______________
- [ ] Ticket Count Completed: _______________
- [ ] Say/Do Ratio Calculated: (Completed ÷ Committed) × 100 = _______________%

### Quality Metrics
- [ ] Bug Count: _______________
- [ ] Bug Escape Rate: _______________
- [ ] Test Coverage %: _______________
- [ ] Code Review Cycle Time (avg): _______________
- [ ] Data Source: _______________ (dashboard URL or tool)

### Team Capacity
- [ ] Team Size: _______________
- [ ] Total Planned Hours: _______________
- [ ] Total Actual Hours: _______________
- [ ] Team Utilization %: _______________
- [ ] Data Source: _______________ (calendar or time tracking)

### Risks & Issues
- [ ] Active Blockers Count: _______________
- [ ] Critical Risks: _______________ (list)
- [ ] Resolved Issues This Period: _______________

---

## Data Validation Rules

### Numeric Validation
- [ ] All story point values are whole numbers
- [ ] Percentages add up correctly (e.g., completion % + remaining % = 100%)
- [ ] Trends based on 3+ data points (or note if less available)
- [ ] All calculations verified (say/do ratio, utilization, etc.)

### Date Validation
- [ ] All dates in correct format (YYYY-MM-DD)
- [ ] Time periods don't overlap incorrectly
- [ ] Sprint/period dates match Jira/source system

### Story Points Notation
- [ ] Pattern verified: "Story Points (X → Y)"
- [ ] X = Committed value extracted
- [ ] Y = Completed value extracted
- [ ] Using Y value for "completed" metric
- [ ] Cross-checked by summing individual issue points

---

## Data Collection Status

**Ready to Generate Report?**
- [ ] All required data collected
- [ ] All data sources documented
- [ ] All calculations verified
- [ ] No estimated or assumed values

**If NOT ready:**
- List missing data: _______________________________________________
- Data needed from user: _______________________________________________
- Stop and request data before proceeding

---

## Report Quality Pre-Check

Before finalizing:
- [ ] Executive summary written last (after reviewing all metrics)
- [ ] All metrics have context (target, variance, trend)
- [ ] No duplicate information across sections
- [ ] All recommendations are specific and actionable
- [ ] All links tested and working
- [ ] Native markdown syntax only (no Jira/Confluence markup)
- [ ] YAML frontmatter complete and accurate

---

**Validation Completed By:** _______________
**Date:** _______________
**Report Ready for Generation:** [Yes/No]
```

---

## Pattern: Metrics Table with Full Context

This pattern shows how to present metrics with complete context for stakeholder understanding.

```markdown
## Performance Metrics - December 2025

### Delivery Metrics

| Metric | Target | Actual | Variance | 3-Month Trend | Status | Analysis |
|--------|--------|--------|----------|---------------|--------|----------|
| Velocity | 20 SP | 23 SP | +3 SP (+15%) | 18 → 21 → 23 | ✅ | Improved focus and reduced context switching drove 28% improvement over 3 sprints |
| Say/Do Ratio | 100% | 115% | +15% | 95% → 105% → 115% | ✅ | Over-delivery driven by unplanned bug fix completion; consider capacity buffer |
| On-Time Delivery | 90% | 88% | -2% | 85% → 87% → 88% | ⚠️ | Improving but below target; blocker resolution time impacting schedule |
| Scope Creep | <10% | 12% | +2% | 15% → 13% → 12% | ⚠️ | Decreasing but still above target; strengthen sprint commitment discipline |

### Quality Metrics

| Metric | Target | Actual | Variance | 3-Month Trend | Status | Analysis |
|--------|--------|--------|----------|---------------|--------|----------|
| Test Coverage | >80% | 84% | +4% | 76% → 80% → 84% | ✅ | Steady improvement through comprehensive unit test expansion |
| Bug Escape Rate | <5% | 3% | -2% | 4% → 3.5% → 3% | ✅ | Below target due to enhanced code review and testing discipline |
| Code Review Cycle | <24h | 18h | -6h | 24h → 21h → 18h | ✅ | Daily sync meetings reduced review bottlenecks |
| Defect Density | <10/KLOC | 8/KLOC | -2 | 12 → 10 → 8 | ✅ | Improved code quality through refactoring and design patterns |

### Team Metrics

| Metric | Target | Actual | Variance | 3-Month Trend | Status | Analysis |
|--------|--------|--------|----------|---------------|--------|----------|
| Team Utilization | 80% | 78% | -2% | 75% → 77% → 78% | ⚠️ | Slightly below target; holiday scheduling impact; expect normalization in January |
| Rework Rate | <15% | 12% | -3% | 18% → 15% → 12% | ✅ | Reduced through better requirements clarity and early design reviews |
| Team Satisfaction | >4.0/5 | 4.3/5 | +0.3 | 3.9 → 4.1 → 4.3 | ✅ | Improved through process streamlining and reduced context switching |

**Overall Status:** ✅ **On Track** - 11 of 12 metrics meeting or exceeding targets
```

---

## Pattern: Jira Story Points Extraction Guide

When extracting metrics from Jira sprint screenshots or reports:

### Understanding the Notation

Jira displays story points as: **"Story Points (X → Y)"**

- **X** = Originally committed story points at sprint start
- **Y** = FINAL completed story points (THIS IS THE VALUE TO USE)

### Example 1: Standard Completion

Screenshot shows: **"Story Points (20 → 23)"**

**Interpretation:**
- Committed at sprint start: 20 SP
- Completed by sprint end: 23 SP ← **Use this value**
- Say/Do Ratio: (23 ÷ 20) × 100 = 115%
- Analysis: Team over-delivered by 15%, completing 3 SP more than committed

### Example 2: Under-Delivery

Screenshot shows: **"Story Points (25 → 20)"**

**Interpretation:**
- Committed at sprint start: 25 SP
- Completed by sprint end: 20 SP ← **Use this value**
- Say/Do Ratio: (20 ÷ 25) × 100 = 80%
- Analysis: Team under-delivered by 20%, completing 5 SP less than committed

### Validation Process

1. **Extract both values:** X (committed) and Y (completed)
2. **Use Y for "completed" metric** in your report
3. **Cross-check by summing individual issues:**
   - Add up story points from each completed ticket
   - Total should match Y value
   - If mismatch, investigate discrepancy
4. **Calculate Say/Do ratio:** (Y ÷ X) × 100
5. **Document both values** for transparency

### Report Format

```markdown
## Sprint Velocity

**Committed:** 20 SP
**Completed:** 23 SP
**Variance:** +3 SP (+15%)
**Say/Do Ratio:** 115%

**Analysis:** Team over-delivered by 15% this sprint. The additional 3 SP came from completing an unplanned bug fix (PROJ-1234, 5 SP) that unblocked the forecasting feature, offset by deferring a lower-priority story (PROJ-1235, 2 SP) to the next sprint.
```

---

**Examples Version:** 1.0.0
**Last Updated:** 2025-12-24
**Related Skill:** building-reports
