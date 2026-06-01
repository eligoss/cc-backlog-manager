---
id: sample-skill
module: sample-module
name: Sample Skill
description: A sample skill for testing purposes
scope: generic
applicable-projects: any
capabilities-provided:
  - sample-capability
  - testing-capability
cli-commands:
  create:
    command: "sample create"
    description: "Create a new sample item"
    options:
      - "--name <name>: Name of the item (required)"
      - "--type <type>: Type of item (default: basic)"
      - "--output <path>: Output directory (default: .)"
    template: "sample.template"
    examples:
      - "agentic-framework sample create --name my-item --type advanced"
      - "agentic-framework sample create --name test --output ./output"
  validate:
    command: "sample validate"
    description: "Validate sample items against schema"
    options:
      - "--path <path>: Path to validate (default: current directory)"
      - "--strict: Enable strict validation mode"
      - "--fix: Auto-fix validation issues when possible"
    schema: "sample.schema.json"
    rules: "sample-rules.ts"
    examples:
      - "agentic-framework sample validate --path ./samples"
      - "agentic-framework sample validate --strict --fix"
---

# Skill: Sample Skill

**Skill Name:** Sample Skill

**Type:** Testing

**Purpose:** This is a sample skill used for testing the skill CLI parser and command factory.

**Auto-Load:** For testing scenarios

---

## Core Principle

This skill demonstrates the structure and format of a properly configured skill with CLI commands.

---

## When to Use This Skill

Use this skill when:
- Testing the skill CLI parser
- Validating command factory functionality
- Creating integration tests

---

## CLI Commands

### create

Creates a new sample item using templates.

**Usage:**
```bash
agentic-framework sample create --name my-item --type advanced
```

### validate

Validates sample items against the defined schema.

**Usage:**
```bash
agentic-framework sample validate --path ./samples --strict
```

---

## Implementation Details

This is a test skill and does not contain actual implementation logic.
