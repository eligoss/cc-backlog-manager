---
id: baseline-{{bookName}}
title: "Book Baseline - {{bookTitle}}"
type: baseline
established: {{date}}
book: {{bookName}}
world-snapshot:
  date: "{{worldDate}}"
  era: "{{era}}"
  major-events-concluded: []
  major-events-active: []
token-budget:
  full: 2000
  summary: 400
---

# Book Baseline: {{bookTitle}}

## Purpose

This baseline defines the world state at the exact moment this book begins. It captures:
- What the reader knows (or doesn't know yet)
- What the AI needs to know for consistent writing
- Character states and locations
- Active conflicts and tensions
- Established facts vs. future reveals

## World State When Book Opens

### Timeline Position

**World Date:** {{worldDate}}
**Era:** {{era}}
**Time Since Last Major Event:** [Duration]

### Political Situation

[Current political landscape - alliances, tensions, power structures]

### Geographic Context

[Where the story takes place - primary locations at book start]

### Active Conflicts

[Ongoing tensions, wars, disputes at the time the book begins]

### Social Climate

[General mood, cultural trends, societal concerns]

### Recent Events

[What has happened recently that affects the opening of this book]

## Character States at Book Opening

| Character | Location | Status | Physical State | Mental State | Knowledge State |
|-----------|----------|--------|----------------|--------------|-----------------|
| [Name] | [Where they are] | [Alive/Role] | [Condition] | [State of mind] | [What they know] |
| [Name] | [Where] | [Status] | [Condition] | [State] | [Knowledge] |

### Character Relationships

[Map of relationships between characters at book start]

### Character Goals

- **[Character]**: [What they want at book opening]
- **[Character]**: [Goal]

## Magic State

[If magic system evolves: what magic exists and what's known about it at this point]

## Technology State

[What technology exists, what's available to characters]

## Resources and Items

[Important artifacts, items, resources that exist at book start]

## What Reader Knows at Start

### Information Available to Reader

[List what information the reader has at the beginning of this book]

### Mysteries and Unknowns

[What the reader does NOT know yet - future reveals]

## What AI Needs to Know

### Full Context (Not Yet Revealed to Reader)

[Complete information the AI needs for consistent writing, even if reader doesn't know it yet]

### Future Plot Points

[Major reveals planned for later - AI needs to avoid contradicting these]

### Character Secrets

[Hidden information about characters that will be revealed later]

## Constraints for This Book

### World Facts That Apply

[List of world facts (by ID) that are relevant to this book]

### Facts Not Yet Established

[What doesn't exist yet in the world at this point in the timeline]

### Canon Boundaries

[What must stay consistent with previous books if this is a series]

## Context Loading Strategy

### Essential Context (Always Load)

Priority 1 - Critical facts:
- [Fact ID]: [Brief description]
- [Fact ID]: [Brief description]

### Standard Context (Load for Most Scenes)

Priority 2 - Important background:
- [Fact ID]: [Brief description]
- [Fact ID]: [Brief description]

### Optional Context (Load on Demand)

Priority 3 - Nice to have:
- [Fact ID]: [Brief description]

### Token Budget Allocation

- Character states: ~400 tokens
- World state: ~600 tokens
- Magic/rules: ~500 tokens
- History relevant to plot: ~500 tokens
- **Total:** ~2000 tokens

---

## Summary (400 tokens max)

<!-- BASELINE-SUMMARY: START -->
[Compact baseline summary for token-efficient loading. Include:
- When and where the book begins
- Key character positions
- Active conflicts
- What reader knows vs. what AI knows
- Critical constraints

This summary should be sufficient for the AI to start writing the book with correct context.]
<!-- BASELINE-SUMMARY: END -->

---

## Validation Checklist

- [ ] All character states defined
- [ ] World state accurately reflects timeline
- [ ] Reader knowledge vs. AI knowledge clearly separated
- [ ] Token budget allocation realistic
- [ ] All referenced world facts exist
- [ ] Constraints documented
- [ ] Summary captures essential information
- [ ] No contradictions with previous books (if series)

## Update Log

[Track updates to this baseline as the book is written]

| Date | Change | Reason |
|------|--------|--------|
| {{date}} | Initial baseline | Book planning |
