# ADF Conversion Examples

Complete examples for converting markdown to Atlassian Document Format (ADF).

## Example 1: Complete Document

**Markdown Input:**
```markdown
# Welcome

This is a **sample** document with a [link](https://example.com).

## Features
- Feature 1
- Feature 2
  - Nested feature

## Code Example
```typescript
const hello = "world";
console.log(hello);
```
```

**ADF Output:**
```json
{
  "version": 1,
  "type": "doc",
  "content": [
    {
      "type": "heading",
      "attrs": {"level": 1},
      "content": [{"type": "text", "text": "Welcome"}]
    },
    {
      "type": "paragraph",
      "content": [
        {"type": "text", "text": "This is a "},
        {"type": "text", "text": "sample", "marks": [{"type": "strong"}]},
        {"type": "text", "text": " document with a "},
        {
          "type": "text",
          "text": "link",
          "marks": [{"type": "link", "attrs": {"href": "https://example.com"}}]
        },
        {"type": "text", "text": "."}
      ]
    },
    {
      "type": "heading",
      "attrs": {"level": 2},
      "content": [{"type": "text", "text": "Features"}]
    },
    {
      "type": "bulletList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": "Feature 1"}]}
          ]
        },
        {
          "type": "listItem",
          "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": "Feature 2"}]},
            {
              "type": "bulletList",
              "content": [
                {
                  "type": "listItem",
                  "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "Nested feature"}]}
                  ]
                }
              ]
            }
          ]
        }
      ]
    },
    {
      "type": "heading",
      "attrs": {"level": 2},
      "content": [{"type": "text", "text": "Code Example"}]
    },
    {
      "type": "codeBlock",
      "attrs": {"language": "typescript"},
      "content": [
        {"type": "text", "text": "const hello = \"world\";\nconsole.log(hello);"}
      ]
    }
  ]
}
```

## Example 2: Complex Table

**Markdown Input:**
```markdown
| Command | Description | Status |
|---------|-------------|--------|
| **npm install** | Install deps | Done |
| `npm test` | Run [tests](url) | In Progress |
```

**ADF Output:**
```json
{
  "version": 1,
  "type": "doc",
  "content": [
    {
      "type": "table",
      "content": [
        {
          "type": "tableRow",
          "content": [
            {
              "type": "tableHeader",
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {"type": "text", "text": "Command", "marks": [{"type": "strong"}]}
                  ]
                }
              ]
            },
            {
              "type": "tableHeader",
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {"type": "text", "text": "Description", "marks": [{"type": "strong"}]}
                  ]
                }
              ]
            },
            {
              "type": "tableHeader",
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {"type": "text", "text": "Status", "marks": [{"type": "strong"}]}
                  ]
                }
              ]
            }
          ]
        },
        {
          "type": "tableRow",
          "content": [
            {
              "type": "tableCell",
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {"type": "text", "text": "npm install", "marks": [{"type": "strong"}]}
                  ]
                }
              ]
            },
            {
              "type": "tableCell",
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {"type": "text", "text": "Install deps"}
                  ]
                }
              ]
            },
            {
              "type": "tableCell",
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {"type": "text", "text": "Done"}
                  ]
                }
              ]
            }
          ]
        },
        {
          "type": "tableRow",
          "content": [
            {
              "type": "tableCell",
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {"type": "text", "text": "npm test", "marks": [{"type": "code"}]}
                  ]
                }
              ]
            },
            {
              "type": "tableCell",
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {"type": "text", "text": "Run "},
                    {
                      "type": "text",
                      "text": "tests",
                      "marks": [{"type": "link", "attrs": {"href": "url"}}]
                    }
                  ]
                }
              ]
            },
            {
              "type": "tableCell",
              "content": [
                {
                  "type": "paragraph",
                  "content": [
                    {"type": "text", "text": "In Progress"}
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Example 3: Info Panel with Formatting

**ADF:**
```json
{
  "version": 1,
  "type": "doc",
  "content": [
    {
      "type": "panel",
      "attrs": {"panelType": "warning"},
      "content": [
        {
          "type": "paragraph",
          "content": [
            {"type": "text", "text": "Important: ", "marks": [{"type": "strong"}]},
            {"type": "text", "text": "Always validate before publishing."}
          ]
        },
        {
          "type": "bulletList",
          "content": [
            {
              "type": "listItem",
              "content": [
                {"type": "paragraph", "content": [{"type": "text", "text": "Check YAML"}]}
              ]
            },
            {
              "type": "listItem",
              "content": [
                {"type": "paragraph", "content": [{"type": "text", "text": "Validate markdown"}]}
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Example 4: Deeply Nested Lists

**Markdown Input:**
```markdown
1. Level 1 ordered
   - Level 2 bullet
     - Level 3 bullet
       1. Level 4 ordered
          - Level 5 bullet
```

**ADF Output:**
```json
{
  "version": 1,
  "type": "doc",
  "content": [
    {
      "type": "orderedList",
      "content": [
        {
          "type": "listItem",
          "content": [
            {"type": "paragraph", "content": [{"type": "text", "text": "Level 1 ordered"}]},
            {
              "type": "bulletList",
              "content": [
                {
                  "type": "listItem",
                  "content": [
                    {"type": "paragraph", "content": [{"type": "text", "text": "Level 2 bullet"}]},
                    {
                      "type": "bulletList",
                      "content": [
                        {
                          "type": "listItem",
                          "content": [
                            {"type": "paragraph", "content": [{"type": "text", "text": "Level 3 bullet"}]},
                            {
                              "type": "orderedList",
                              "content": [
                                {
                                  "type": "listItem",
                                  "content": [
                                    {"type": "paragraph", "content": [{"type": "text", "text": "Level 4 ordered"}]},
                                    {
                                      "type": "bulletList",
                                      "content": [
                                        {
                                          "type": "listItem",
                                          "content": [
                                            {"type": "paragraph", "content": [{"type": "text", "text": "Level 5 bullet"}]}
                                          ]
                                        }
                                      ]
                                    }
                                  ]
                                }
                              ]
                            }
                          ]
                        }
                      ]
                    }
                  ]
                }
              ]
            }
          ]
        }
      ]
    }
  ]
}
```

## Example 5: Multiple Formatting Marks

**Markdown:** `***bold italic*** and ***[bold italic link](url)***`

**ADF:**
```json
{
  "version": 1,
  "type": "doc",
  "content": [
    {
      "type": "paragraph",
      "content": [
        {
          "type": "text",
          "text": "bold italic",
          "marks": [{"type": "strong"}, {"type": "em"}]
        },
        {"type": "text", "text": " and "},
        {
          "type": "text",
          "text": "bold italic link",
          "marks": [
            {"type": "strong"},
            {"type": "em"},
            {"type": "link", "attrs": {"href": "url"}}
          ]
        }
      ]
    }
  ]
}
```

## Example 6: Expand Section with Content

**ADF:**
```json
{
  "version": 1,
  "type": "doc",
  "content": [
    {
      "type": "expand",
      "attrs": {"title": "Click to see details"},
      "content": [
        {
          "type": "heading",
          "attrs": {"level": 3},
          "content": [{"type": "text", "text": "Details"}]
        },
        {
          "type": "paragraph",
          "content": [
            {"type": "text", "text": "This content is hidden by default."}
          ]
        },
        {
          "type": "codeBlock",
          "attrs": {"language": "bash"},
          "content": [
            {"type": "text", "text": "npm install"}
          ]
        }
      ]
    }
  ]
}
```

---

**Note:** These examples show the exact ADF structure required by Confluence REST API v2.
