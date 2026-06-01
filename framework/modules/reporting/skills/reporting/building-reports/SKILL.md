---
id: building-reports
module: reporting
name: Report Generation Workflow
description: Report generation patterns, metrics collection workflow, and status reporting standards. Use when generating project reports, collecting metrics, creating report templates, or producing status updates for stakeholders. Covers executive summaries, performance reports, team metrics, and retrospectives.
scope: generic
applicable-projects: any
capabilities-provided:
  - report-generation
  - metrics-collection
  - status-reporting
cli-commands:
  note: "Reporting module does not have dedicated CLI commands yet. Reports are generated manually by agents and can be published to Confluence using 'confluence create-page' command from the confluence module."
  future:
    generate:
      command: "reporting generate"
      description: "Generate report from template (planned)"
      options:
        - "--template <name>: Template name"
        - "--period <period>: Reporting period"
    validate:
      command: "reporting validate"
      description: "Validate report structure (planned)"
      options:
        - "--report <path>: Path to report file"
---

# Report Generation Workflow

## When to Use This Skill

Use this skill when you need to:
- Generate project status reports, executive summaries, or stakeholder updates
- Create reusable report templates for recurring reporting needs
- Collect and analyze project metrics (velocity, quality, delivery)
- Structure report data with proper formatting and visualization
- Understand reporting best practices and quality standards
- Integrate reporting with backlog tracking or planning modules
- Create instructional guides for report templates and processes

**Agents that need this skill:**
- ai-report-manager (full orchestration and template design)

---

## Quick Reference: Report Types

| Report Type | Purpose | Cadence | Audience | Key Sections |
|------------|---------|---------|----------|--------------|
| **Executive Summary** | High-level status and decisions | Weekly/Monthly | Leadership | Status, Key Metrics, Risks, Actions |
| **Performance Report** | Detailed metrics and trends | Monthly/Quarterly | Tech Lead, PM | Metrics, Analysis, Trends, Recommendations |
| **Team Metrics** | Velocity and capacity tracking | Sprint/Weekly | Team, Scrum Master | Velocity, Capacity, Quality, Blockers |
| **Risk & Health** | Critical issues and dependencies | Weekly/As-needed | PM, Leadership | Risks, Health Indicators, Mitigations |
| **Retrospective** | Lessons learned and improvements | End-of-Milestone | Team, PM | What Went Well, Improvements, Actions |

---

## Instructions

### 1. Determine Report Operating Mode

Before starting any reporting work, identify which mode you're operating in:

**Mode 1: Template Creation**
- Creating reusable report structure with placeholders
- No actual data provided (explicitly using placeholders)
- Output serves as foundation for future reports
- Output location: `confluence/templates/reports/`

**Mode 2: Report Generation**
- Creating stakeholder-ready report with real data
- User provides metrics, sprint data, or data sources
- Specific time period mentioned (e.g., "September 2025", "Sprint 42")
- Output location: `confluence/drafts/` or `confluence/spaces/{SPACE}/reports/`

**Mode 3: Guide Creation**
- Creating instructional documentation
- Explaining how to use templates or follow processes
- Output location: `confluence/templates/reports/` or `docs/`

**Decision Tree:**
1. Does request mention "template", "reusable", "design"? → Mode 1
2. Does user provide actual data or specific time period? → Mode 2
3. Does request ask "how to", "explain", "guide"? → Mode 3
4. If unclear → Ask user to clarify intent

### 2. Create Report Templates (Mode 1)

**Purpose:** Design reusable structures that can be filled repeatedly.

**Workflow:**

1. **Analyze Template Requirements**
   - Report type (executive, performance, team, risk, retrospective)
   - Target audience (leadership, team, technical, mixed)
   - Reporting cadence (weekly, sprint-based, monthly, quarterly)
   - Required metrics from project context (check business-basic.md for KPIs)

2. **Design Template Structure**
   ```yaml
   # YAML frontmatter with placeholders
   ---
   title: "[Project] - [Report Type] - [Period]"
   report-type: [executive|performance|team|risk|retrospective]
   period: [YYYY-MM|YYYYWXX]
   author: [AUTHOR_ID]
   status: draft
   pageId: null
   ---

   # Standard sections
   - Executive Summary
   - Key Metrics (tables with targets, actuals, trends)
   - Detailed Analysis
   - Risks & Issues
   - Forward-Looking (next period, actions)
   ```

3. **Define Placeholder Conventions**
   - System IDs: `[UPPERCASE]` → `[PROJECT_ID]`, `[SPRINT_ID]`, `[VERSION_ID]`
   - Descriptive: `[Title Case]` → `[Period]`, `[Status]`, `[Trend]`
   - Numeric: `[X]`, `[Total]`, `[Completed]`, `[Percentage]`
   - Dates: `[YYYY-MM]`, `[YYYYWXX]`, `[DATE_RANGE]`

4. **Document Data Requirements**
   - Where to get each placeholder value (Jira filters, dashboards, team sources)
   - Required vs optional fields
   - Data validation rules
   - Calculation formulas (e.g., Say/Do ratio = Completed ÷ Committed × 100)

5. **Add Template Metadata Footer**
   ```markdown
   ---

   ## Template Metadata

   **Version:** 1.0
   **Last Updated:** [DATE]
   **Intended Use:** [Description]
   **Data Sources:** [List of sources]
   **Related Templates:** [Links to related templates]

   ### Data Gathering Checklist
   - [ ] Source 1: [Description]
   - [ ] Source 2: [Description]
   - [ ] Calculations: [Formulas]
   ```

6. **Output Template**
   - Filename: `{report-type}-template.md` or `{project}-{report-type}-template.md`
   - Location: `confluence/templates/reports/`
   - YAML: `pageId: null`, `status: draft`

**Validation Checklist:**
- [ ] All placeholders use `[BRACKET]` format consistently
- [ ] YAML frontmatter complete with placeholder fields
- [ ] Native markdown syntax only (no Jira/Confluence markup)
- [ ] Data requirements documented clearly
- [ ] Template metadata footer included
- [ ] Related templates linked

### 3. Generate Reports with Real Data (Mode 2)

**Purpose:** Create final stakeholder-ready reports with actual metrics.

**CRITICAL - Data Validation Protocol:**

**NEVER create report data from assumptions or estimates.**

**When data is missing:**
1. Identify all required data before starting
2. Check `confluence/imports/report-data/` for available data
3. If incomplete → **STOP and ASK USER**
4. List EXACTLY what data you need
5. Wait for user to provide specific values

**Examples of WRONG approach (NEVER do this):**
- ❌ "I'll estimate velocity based on similar sprints"
- ❌ "I'll assume 90% completion rate"
- ❌ "I'll calculate using historical patterns"

**Examples of RIGHT approach (ALWAYS do this):**
- ✅ "Sprint velocity data incomplete. Please provide: total story points completed, number of items completed vs. planned, sprint date range"
- ✅ "Performance data not available. Please provide: response time measurements, query performance metrics, CPU/memory utilization"

**Workflow:**

1. **Identify Report Type and Template**
   - Determine report type: executive, performance, team, risk, retrospective
   - Check `confluence/templates/reports/` for existing template
   - Validate template matches requirements

2. **Validate Data Availability (MANDATORY)**
   - List all required metrics and data points
   - Verify data sources are available
   - If incomplete → **STOP and ASK USER**
   - Do NOT proceed until all required data is available

3. **Extract Data from Jira Sprint Screenshots (If Provided)**
   - **Critical:** Understand Story Point Notation
   - Pattern: "Story Points (X → Y)"
     - X = Originally committed story points at sprint start
     - Y = **FINAL completed story points** ← **USE THIS VALUE**
   - Example: "Story Points (20 → 23)" means **23 SP completed** (use 23, not 20)
   - Verify: Sum individual issue points to cross-check Y value
   - Calculate Say/Do ratio: (Y ÷ X) × 100
   - Record: committed (X), completed (Y), say/do ratio

4. **Structure Report Using Template**
   - Copy template if it exists
   - Replace all `[PLACEHOLDERS]` with actual data
   - Fill sections systematically
   - Remove optional sections if not applicable

5. **Write Report with Data and Analysis**
   - Use real numbers from validated sources
   - Add analysis and context (don't just present numbers)
   - Explain what metrics mean, compare to targets
   - Include interpretation (why did velocity change? what caused the trend?)
   - Provide specific, actionable recommendations
   - Avoid duplication across sections (each fact appears once)

6. **Add Metrics with Context**
   - For every metric provide:
     - Actual value
     - Target value
     - Variance (actual - target)
     - Trend (3+ periods if available)
     - Status indicator (✅ On Track | ⚠️ At Risk | ❌ Off Track)

   **Example table format:**
   ```markdown
   | Metric | Target | Actual | Variance | Trend | Status |
   |--------|--------|--------|----------|-------|--------|
   | Velocity | 20 SP | 23 SP | +3 SP | ↗️ +15% | ✅ |
   | Say/Do Ratio | 100% | 115% | +15% | ↗️ +10% | ✅ |
   ```

7. **Include Supporting Evidence**
   - Link to Jira dashboard URLs, sprint reports, version reports
   - Document data sources for traceability
   - Add timestamps for when data was collected

8. **Write Executive Summary LAST**
   - Review all metrics and findings
   - Identify 3-5 key highlights
   - Identify 2-3 critical issues
   - Write 1-2 paragraph summary with clear status:
     - ✅ **On Track:** Meeting targets, no critical risks
     - ⚠️ **At Risk:** Some concerns, mitigation needed
     - ❌ **Off Track:** Missing targets, immediate action required

9. **Output Report**
   - Filename: `{project}-{report-type}-{YYYY-MM}.md` or `{project}-{report-type}-{YYYYWXX}.md`
   - Location: `confluence/drafts/` (for review) or `confluence/spaces/{SPACE}/reports/`
   - YAML: `pageId: null` for new reports, `status: draft` or `status: current`

**Validation Checklist:**
- [ ] All metrics verified against source systems
- [ ] All numbers accurate and current
- [ ] Dates and periods correct
- [ ] Executive summary clear and actionable (1-2 paragraphs)
- [ ] All metrics have context (target, trend, analysis)
- [ ] Recommendations are specific and measurable
- [ ] No duplicate information across sections
- [ ] All links work and point to correct resources
- [ ] Native markdown syntax only (no Jira/Confluence markup)

### 4. Create Instructional Guides (Mode 3)

**Purpose:** Document how to use templates or follow reporting processes.

**Workflow:**

1. **Understand Guide Purpose**
   - What process/template needs documentation?
   - Who is the audience? (new team members, stakeholders, agents)
   - What skill level? (beginner, intermediate, expert)
   - What should they accomplish after reading?

2. **Structure Guide**
   ```markdown
   # [Template/Process Name] - User Guide

   ## Overview
   [What this is, why it exists]

   ## Quick Start (5 steps or less)
   [Minimal steps to get started]

   ## Detailed Instructions
   [Step-by-step process]

   ## Reference Section
   [Definitions, placeholders, data sources]

   ## Troubleshooting
   [Common problems and solutions]

   ## Best Practices
   [Do's and don'ts]
   ```

3. **Write Guide Content**
   - Use imperative voice ("Copy the template", not "You should copy")
   - Include concrete examples
   - Add code blocks for commands/file contents
   - Use checklists for validation steps
   - Link to related resources

4. **Output Guide**
   - Filename: `{TEMPLATE-NAME}-GUIDE.md` or `{PROCESS-NAME}-INSTRUCTIONS.md`
   - Location: `confluence/templates/reports/` (with templates) or `docs/`

**Validation Checklist:**
- [ ] Clear title and overview
- [ ] Quick start section (≤5 steps)
- [ ] Step-by-step instructions
- [ ] Examples provided
- [ ] Common pitfalls addressed
- [ ] Best practices included

### 5. Integrate with Other Modules

**Integration with Backlog Module:**
- Extract ticket status and completion data for reports
- Use backlog metrics (completed tickets, velocity) in team reports
- Reference milestone progress from backlog organization

**Integration with Planning Module:**
- Report on plan progress and phase completion
- Include milestone status from planning workflows
- Track plan success metrics in performance reports

**Integration with Jira Module:**
- Extract sprint data from Jira exports
- Parse Jira sprint screenshots for metrics
- Link to Jira dashboards for supporting evidence

**Integration with Confluence Module:**
- Publish reports to Confluence spaces
- Use Confluence templates for stakeholder-facing reports
- Export report data to Confluence ADF format

---

## Report Templates and Examples

For complete report templates, examples, and detailed patterns, see **EXAMPLES.md** in this skill directory:

- Executive summary template
- Sprint team metrics template
- Retrospective template
- Data validation checklist
- Metrics tables with full context
- Jira story points extraction guide
- Actual generated report examples

**Example patterns covered in EXAMPLES.md:**
1. Executive summary structure
2. Metrics tables with trends and analysis
3. Sprint retrospective format
4. Data validation before generation
5. Story points notation (X → Y) extraction

---

## Metrics Collection Best Practices

### 1. Delivery Metrics
- **Velocity:** Story points completed per sprint/period
- **Say/Do Ratio:** (Completed ÷ Committed) × 100
- **Scope Creep:** Unplanned items added mid-sprint
- **Burndown Health:** Trend line vs ideal burndown

### 2. Quality Metrics
- **Test Coverage:** % of code covered by automated tests
- **Bug Escape Rate:** Bugs found in production vs total bugs
- **Code Review Cycle:** Time from PR creation to merge
- **Defect Density:** Bugs per 1000 lines of code

### 3. Team Metrics
- **Team Utilization:** Actual hours ÷ Planned capacity
- **Rework Rate:** % of time spent on rework vs new work
- **Knowledge Concentration:** Bus factor (team members with critical knowledge)
- **Team Satisfaction:** Survey scores or retrospective sentiment

### 4. Metric Contextualization Rules
- Always compare to target/baseline
- Show 3+ period trend when available
- Explain variance and root causes
- Provide actionable recommendations
- Use visual indicators (✅⚠️❌)

---

## Quality Gates

Before finalizing any report, validate:

### Data Quality
- [ ] All metrics verified against source systems
- [ ] No estimated or assumed values
- [ ] All calculations reviewed and correct
- [ ] Dates and time periods accurate
- [ ] Data sources documented

### Content Quality
- [ ] Executive summary clear and actionable
- [ ] All metrics have context (target, trend, analysis)
- [ ] Recommendations specific and measurable
- [ ] No duplicate information
- [ ] Proper markdown formatting

### Format Quality
- [ ] YAML frontmatter complete
- [ ] Native markdown syntax only
- [ ] Tables properly formatted
- [ ] Links tested and working
- [ ] File naming convention followed

### Stakeholder Readiness
- [ ] Appropriate for target audience
- [ ] Language clear and jargon-free
- [ ] Visualizations aid understanding
- [ ] Supporting evidence linked
- [ ] Ready for distribution or publication

---

## Automation and Scheduling

### Recurring Report Automation
1. Create template once (Mode 1)
2. Document data sources and collection process
3. Schedule data collection (weekly/sprint/monthly)
4. Generate report using template (Mode 2)
5. Review and publish to Confluence

### Report Scheduling Recommendations
- **Weekly Status:** Monday morning (covers previous week)
- **Sprint Reports:** Within 24 hours of sprint end
- **Monthly Performance:** First business day of new month
- **Quarterly Reviews:** Within one week of quarter end
- **Retrospectives:** Immediately after milestone completion

### CLI Integration (Future)
```bash
# Future CLI commands for automation
agentic-framework reporting generate --template executive-summary --period 2025-12
agentic-framework reporting validate --report confluence/drafts/report.md
agentic-framework reporting publish --report confluence/drafts/report.md --space PROJ
```

---

## Anti-Patterns to Avoid

**DON'T:**
- ❌ Estimate or fabricate data when missing
- ❌ Skip data validation before starting
- ❌ Leave placeholders unfilled in final reports
- ❌ Include duplicate information across sections
- ❌ Skip executive summary
- ❌ Use Confluence/Jira markup instead of native markdown
- ❌ Misinterpret Story Points notation (use Y value, not X)
- ❌ Present metrics without context or trend
- ❌ Make vague recommendations ("improve performance")

**DO:**
- ✅ Validate all data before starting
- ✅ Stop and ask if data is missing
- ✅ Replace all placeholders with actual values
- ✅ Add analysis and context to all metrics
- ✅ Write executive summary last (after reviewing all data)
- ✅ Use native markdown syntax
- ✅ Extract correct Story Points value (Y in X→Y pattern)
- ✅ Show trends with 3+ data points
- ✅ Make specific, measurable recommendations

---

## See Also

**Related Skills:**
- `validating-markdown` - Markdown formatting standards
- `verifying-quality` - Quality validation protocols
- `organizing-backlog` - Ticket metrics and backlog data
- `planning-phases` - Plan progress and milestone tracking
- `syncing-with-jira` - Jira data extraction and Confluence publishing

**Related Agents:**
- `ai-report-manager` - Full report orchestration and template design
- `ai-backlog-manager` - Source for ticket and backlog metrics
- `ai-planning-manager` - Source for plan and milestone progress
- `ai-confluence-manager` - Report publishing to Confluence

**Framework Files:**
- [module.json](../../../module.json) - Reporting module capabilities
- [agents/](../../../agents/) - Agent prompts and workflows
- `confluence/templates/reports/` - Report templates
- `.claude/context/business-basic.md` - Project KPIs and success metrics
- `.claude/context/process-basic.md` - Reporting standards and conventions

---

**Skill Version:** 1.0.0
**Module:** reporting
**Last Updated:** 2025-12-24
