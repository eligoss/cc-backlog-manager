import fs from 'fs-extra';
import path from 'path';

/**
 * Copy context templates to project
 */
export async function copyTemplates(
  projectPath: string,
  templateName: string
): Promise<void> {
  const contextPath = path.join(projectPath, 'ai', 'context');
  await fs.ensureDir(contextPath);

  // Create business context template
  await fs.writeFile(
    path.join(contextPath, 'business-basic.md'),
    createBusinessTemplate(templateName)
  );

  // Create technical context template
  await fs.writeFile(
    path.join(contextPath, 'technical-basic.md'),
    createTechnicalTemplate(templateName)
  );

  // Create process context template
  await fs.writeFile(
    path.join(contextPath, 'process-basic.md'),
    createProcessTemplate(templateName)
  );
}

function createBusinessTemplate(templateName: string): string {
  if (templateName === 'minimal') {
    return `# Business Context (Basic)

<!-- TEMPLATE: Fill in your project's business context -->

## Product Overview

<!-- TEMPLATE: What does your product do? Who is it for? -->

## User Roles

<!-- TEMPLATE: List primary user personas and their needs -->

## Key Features

<!-- TEMPLATE: List main features and capabilities -->
`;
  }

  // Full template
  return `# Business Context (Basic)

## Product Overview

<!-- TEMPLATE: Describe your product's core purpose and value proposition -->

**Product Name:** [Your Product Name]

**Description:**
[Brief description of what your product does and the problem it solves]

**Target Users:**
[Who are the primary users of this product?]

---

## User Roles

### Role 1: [Role Name]
<!-- TEMPLATE: Describe this user role -->

**Responsibilities:**
- [Responsibility 1]
- [Responsibility 2]

**Primary Goals:**
- [Goal 1]
- [Goal 2]

---

### Role 2: [Role Name]
<!-- TEMPLATE: Describe this user role -->

**Responsibilities:**
- [Responsibility 1]
- [Responsibility 2]

**Primary Goals:**
- [Goal 1]
- [Goal 2]

---

## Key Features

### Feature 1: [Feature Name]
<!-- TEMPLATE: Describe this feature -->

**Description:** [What does this feature do?]

**User Value:** [Why is this valuable to users?]

---

### Feature 2: [Feature Name]
<!-- TEMPLATE: Describe this feature -->

**Description:** [What does this feature do?]

**User Value:** [Why is this valuable to users?]

---

## Business Rules

<!-- TEMPLATE: Document important business rules and constraints -->

1. [Business Rule 1]
2. [Business Rule 2]
3. [Business Rule 3]
`;
}

function createTechnicalTemplate(templateName: string): string {
  if (templateName === 'minimal') {
    return `# Technical Context (Basic)

<!-- TEMPLATE: Fill in your project's technical context -->

## Tech Stack

<!-- TEMPLATE: List technologies used -->

## Architecture Overview

<!-- TEMPLATE: Describe high-level architecture -->

## Key Patterns

<!-- TEMPLATE: Document important patterns and conventions -->
`;
  }

  // Full template
  return `# Technical Context (Basic)

## Tech Stack

### Frontend
<!-- TEMPLATE: Describe frontend technologies -->

- **Framework:** [React/Vue/Angular/etc.]
- **Language:** [TypeScript/JavaScript]
- **State Management:** [Redux/Zustand/etc.]
- **Styling:** [Tailwind/CSS Modules/etc.]

### Backend
<!-- TEMPLATE: Describe backend technologies -->

- **Framework:** [NestJS/Express/Django/etc.]
- **Language:** [TypeScript/Python/Go/etc.]
- **Database:** [PostgreSQL/MongoDB/etc.]
- **API Style:** [REST/GraphQL/gRPC]

### Infrastructure
<!-- TEMPLATE: Describe infrastructure -->

- **Cloud Provider:** [AWS/GCP/Azure]
- **Containerization:** [Docker/Kubernetes]
- **CI/CD:** [GitHub Actions/Jenkins/etc.]

---

## Architecture Overview

<!-- TEMPLATE: Describe your system architecture -->

### System Diagram

\`\`\`
[Draw or describe your architecture here]
\`\`\`

### Key Components

1. **[Component 1]:** [Description]
2. **[Component 2]:** [Description]
3. **[Component 3]:** [Description]

---

## Key Patterns

### Code Organization
<!-- TEMPLATE: Describe code organization patterns -->

- [Pattern 1]
- [Pattern 2]

### Error Handling
<!-- TEMPLATE: Describe error handling approach -->

### Testing Strategy
<!-- TEMPLATE: Describe testing approach -->

- Unit Tests: [Coverage/approach]
- Integration Tests: [Coverage/approach]
- E2E Tests: [Coverage/approach]

---

## Repository Structure

\`\`\`
<!-- TEMPLATE: Show your repository structure -->
project/
├── src/
├── tests/
└── docs/
\`\`\`
`;
}

function createProcessTemplate(templateName: string): string {
  if (templateName === 'minimal') {
    return `# Process Context (Basic)

<!-- TEMPLATE: Fill in your project's process context -->

## Development Workflow

<!-- TEMPLATE: Describe development process -->

## Team Structure

<!-- TEMPLATE: Describe team organization -->

## Release Process

<!-- TEMPLATE: Describe release workflow -->
`;
  }

  // Full template
  return `# Process Context (Basic)

## Development Workflow

### Branching Strategy
<!-- TEMPLATE: Describe your git workflow -->

- **Main Branch:** [main/master]
- **Feature Branches:** [naming convention]
- **Release Branches:** [naming convention]

### Code Review Process
<!-- TEMPLATE: Describe code review -->

1. [Step 1]
2. [Step 2]
3. [Step 3]

### Definition of Done
<!-- TEMPLATE: What must be true before a task is complete? -->

- [ ] Code reviewed and approved
- [ ] Tests passing
- [ ] Documentation updated
- [ ] [Other criteria]

---

## Team Structure

### Roles
<!-- TEMPLATE: Describe team roles -->

- **[Role 1]:** [Responsibilities]
- **[Role 2]:** [Responsibilities]

### Communication
<!-- TEMPLATE: Describe communication channels -->

- Daily standups: [Time/platform]
- Sprint planning: [Cadence]
- Retrospectives: [Cadence]

---

## Release Process

### Release Cadence
<!-- TEMPLATE: How often do you release? -->

[Weekly/bi-weekly/continuous]

### Release Steps
<!-- TEMPLATE: Describe release process -->

1. [Step 1]
2. [Step 2]
3. [Step 3]

### Environments
<!-- TEMPLATE: Describe deployment environments -->

- Development: [URL/description]
- Staging: [URL/description]
- Production: [URL/description]
`;
}
