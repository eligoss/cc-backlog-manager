---
id: designing-ios-ui
module: coding
name: iOS UI Design Standards
description: Apple HIG compliance, visual design patterns, spacing scales, typography hierarchy, and accessibility depth for iOS apps. Use alongside implementing-ios when building SwiftUI views to ensure visual correctness. Trigger when implementing any iOS UI component, creating SwiftUI views, reviewing iOS layouts, or when HIG compliance matters — even if the user doesn't explicitly mention "design" or "HIG".
scope: generic
applicable-projects: any
capabilities-provided:
  - ios-visual-design
---

# iOS UI Design Standards

Visual correctness patterns for iOS apps. This skill complements `implementing-ios` (which owns architecture, MVVM, data flow, testing) — this skill owns **how things look and feel**.

Load this skill alongside `implementing-ios` when building SwiftUI views. Apply these patterns during implementation, not as an afterthought.

---

## Spacing System

iOS uses an 8pt base grid. All spacing should be multiples of this base.

### Standard Spacing Scale

| Token | Value | Use |
|-------|-------|-----|
| 4pt manual | 4pt | Tight internal spacing (icon-to-label) |
| Default padding | 8pt | Standard internal spacing |
| `.padding()` | 16pt | Standard content padding |
| Section spacing | 24pt | Between related groups |
| Screen margins | 16pt | Leading/trailing safe area |
| Large spacing | 32pt | Between unrelated sections |
| Extra large | 48pt | Major visual breaks |

### Rules

- Use `.padding()` (system default) over fixed values — it adapts to context
- Screen edge margins: always 16pt minimum (20pt on larger devices)
- List row height: 44pt minimum (matches touch target)
- Between grouped controls: 8pt
- Between sections in a form: 24-32pt
- Never use odd pixel values (5pt, 7pt, 13pt) — they don't align to the grid

### SwiftUI Patterns

```swift
// Prefer system spacing
VStack(spacing: 16) { ... }

// Use ContentUnavailableView for empty states (iOS 17+)
ContentUnavailableView("No Items", systemImage: "tray")

// Group related items with consistent internal spacing
GroupBox {
    VStack(alignment: .leading, spacing: 8) { ... }
}
```

---

## Typography Hierarchy

iOS provides a semantic type scale that automatically supports Dynamic Type.

### Type Styles (Use These, Not Fixed Sizes)

| Style | Default Size | Weight | Use |
|-------|-------------|--------|-----|
| `.largeTitle` | 34pt | Regular | Screen titles (NavigationStack) |
| `.title` | 28pt | Regular | Section headers |
| `.title2` | 22pt | Regular | Subsection headers |
| `.title3` | 20pt | Regular | Card titles |
| `.headline` | 17pt | Semibold | Emphasized body text |
| `.body` | 17pt | Regular | Primary content |
| `.callout` | 16pt | Regular | Secondary descriptions |
| `.subheadline` | 15pt | Regular | Supporting text |
| `.footnote` | 13pt | Regular | Timestamps, metadata |
| `.caption` | 12pt | Regular | Labels, annotations |
| `.caption2` | 11pt | Regular | Fine print |

### Rules

- Always use `.font(.body)`, `.font(.title)`, etc. — never `.font(.system(size: 17))`
- Fixed font sizes break Dynamic Type accessibility
- Use `.fontWeight()` to adjust weight within a style, not a different style
- Maximum 3 type styles per screen (keeps visual hierarchy clear)
- Body text: `.body` or `.callout`. Never smaller than `.footnote` for readable content

### Dynamic Type Support

```swift
// Correct — scales with user preference
Text("Hello").font(.body)

// Wrong — fixed size, breaks accessibility
Text("Hello").font(.system(size: 17))

// Limit scaling for specific layouts if needed
Text("Tab Label")
    .font(.caption2)
    .dynamicTypeSize(...DynamicTypeSize.xxxLarge)
```

---

## Color Semantics

Use semantic colors that adapt to Dark Mode, contrast settings, and platform context.

### System Colors (Always Prefer These)

| Color | Use |
|-------|-----|
| `.primary` | Primary text, icons |
| `.secondary` | Secondary text, less emphasis |
| `.accentColor` | Interactive elements, tint |
| `Color(.systemBackground)` | View backgrounds |
| `Color(.secondarySystemBackground)` | Grouped content backgrounds |
| `Color(.tertiarySystemBackground)` | Elevated content |
| `Color(.separator)` | Divider lines |
| `Color(.systemGray)` through `.systemGray6` | Gray scale (light-to-dark adaptive) |

### Rules

- Never hardcode colors: `Color.white` fails in Dark Mode, `Color(.systemBackground)` adapts
- Tint color: use `.tint()` or `.accentColor` — one accent per app, set in asset catalog
- Destructive actions: `Color.red` is acceptable (it's a semantic constant)
- Contrast ratio: 4.5:1 minimum for body text, 3:1 for large text (WCAG AA)
- Test with: Settings > Accessibility > Increase Contrast enabled

### Custom Colors

```swift
// Define in Asset Catalog with Light + Dark variants
// Reference by name:
Color("BrandPrimary")

// For programmatic adaptive colors, use UIColor:
Color(uiColor: UIColor { traitCollection in
    traitCollection.userInterfaceStyle == .dark
        ? UIColor(red: 0.3, green: 0.5, blue: 1.0, alpha: 1)
        : UIColor(red: 0.1, green: 0.3, blue: 0.8, alpha: 1)
})
```

---

## Touch Targets

### The 44pt Rule

Every interactive element must have a minimum 44x44pt touch target. This is an Apple accessibility requirement, not a suggestion.

### Common Violations and Fixes

```swift
// Bad — icon button too small (24x24)
Button(action: {}) {
    Image(systemName: "gear")
}

// Good — expand hit area
Button(action: {}) {
    Image(systemName: "gear")
        .frame(minWidth: 44, minHeight: 44)
}

// Good — use contentShape for custom hit areas
Circle()
    .frame(width: 24, height: 24)
    .contentShape(Rectangle())
    .frame(width: 44, height: 44)
    .onTapGesture { }

// Good — padding expands touch target naturally
Button(action: {}) {
    Image(systemName: "xmark")
        .padding(10) // 24pt icon + 10pt padding each side = 44pt
}
```

### Rules

- Toolbar items: automatically 44pt — no action needed
- List rows: default height is 44pt — don't shrink below this
- Adjacent buttons: minimum 8pt spacing between touch targets
- Small icons (SF Symbols): always add padding or frame to reach 44pt

---

## Animation Patterns

### Standard iOS Timing

| Animation | Duration | Curve |
|-----------|----------|-------|
| Simple state change | 0.2s | `.easeInOut` |
| Sheet presentation | 0.3s | `.spring(response: 0.3)` |
| Navigation push | 0.35s | System default (don't override) |
| Feedback pulse | 0.15s | `.easeOut` |
| Content appearance | 0.25s | `.easeIn` |

### Spring Animations (Preferred in iOS 17+)

```swift
// Default spring — use for most animations
withAnimation(.spring) { ... }

// Bouncy — for playful UI (toggles, selections)
withAnimation(.spring(response: 0.3, dampingFraction: 0.6)) { ... }

// Smooth — for serious UI (forms, navigation)
withAnimation(.spring(response: 0.4, dampingFraction: 0.9)) { ... }
```

### Rules

- Prefer `.spring` over `.easeInOut` — springs feel more natural on iOS
- Never animate navigation transitions (system handles them)
- Don't animate more than 2-3 properties simultaneously
- Respect `UIAccessibility.isReduceMotionEnabled` — use `.animation(.default, value:)` which respects this automatically
- Content loading: use `.redacted(reason: .placeholder)` shimmer, not custom spinners

---

## SF Symbols

### Size and Weight Matching

SF Symbols should match the text they sit beside:

```swift
// Correct — symbol inherits text font
Label("Settings", systemImage: "gear")
    .font(.body)

// Correct — explicit matching
HStack {
    Image(systemName: "star.fill")
        .font(.body)
    Text("Favorites")
        .font(.body)
}

// Wrong — mismatched sizes
HStack {
    Image(systemName: "star.fill")
        .font(.title)  // Too big for body text
    Text("Favorites")
        .font(.body)
}
```

### Rendering Modes

| Mode | Use | Example |
|------|-----|---------|
| `.monochrome` | Default, single tint color | Navigation icons |
| `.hierarchical` | Primary + secondary opacity | Complex icons with depth |
| `.palette` | Two+ explicit colors | Status indicators |
| `.multicolor` | Apple's designed colors | Weather, flags, maps |

```swift
Image(systemName: "chart.bar.fill")
    .symbolRenderingMode(.hierarchical)
    .foregroundStyle(.blue)
```

### Rules

- Use SF Symbols over custom icons whenever possible (consistency, accessibility, scaling)
- Symbol weight should match nearby text weight
- Don't mix rendering modes in the same toolbar/section
- Use `.symbolVariant(.fill)` for selected states, `.symbolVariant(.none)` for unselected

---

## Layout Patterns

### Safe Areas

```swift
// Content respects safe areas by default — don't fight it
ScrollView {
    content // Automatically avoids notch, home indicator
}

// Background extends to edges, content stays safe
ZStack {
    Color.blue.ignoresSafeArea()
    VStack {
        content // Still respects safe area
    }
}
```

### List and Form Styles

```swift
// Grouped (default, recommended for settings/forms)
List { ... }
    .listStyle(.insetGrouped)

// Plain (for content feeds, search results)
List { ... }
    .listStyle(.plain)

// Never use .listStyle(.sidebar) outside NavigationSplitView
```

### Scroll Behavior

```swift
// Content hugging — don't put ScrollView around short content
// Only wrap in ScrollView if content can exceed screen height

// Pull-to-refresh
List { ... }
    .refreshable { await loadData() }

// Scroll position tracking (iOS 17+)
ScrollView {
    content
}
.scrollPosition(id: $scrollPosition)
```

### Rules

- Use `NavigationStack` (not deprecated `NavigationView`)
- Use `Form` for settings screens (auto-handles grouping and styling)
- Tab bar: maximum 5 tabs. Use "More" tab if needed
- Sheet presentation: use `.presentationDetents([.medium, .large])` for half-sheets
- Avoid custom navigation — users expect iOS-standard behavior

---

## Accessibility Depth

Beyond the basics (VoiceOver labels, Dynamic Type), these patterns ensure full accessibility:

### Trait Collections

```swift
@Environment(\.dynamicTypeSize) var typeSize
@Environment(\.colorScheme) var colorScheme
@Environment(\.accessibilityReduceMotion) var reduceMotion
@Environment(\.accessibilityReduceTransparency) var reduceTransparency

// Adapt layout for large type
if typeSize >= .accessibility1 {
    VStack { content } // Stack vertically when text is very large
} else {
    HStack { content } // Side by side for normal sizes
}
```

### Custom Accessibility Actions

```swift
// Swipe actions for VoiceOver users
Text("Item")
    .accessibilityAction(.delete) { deleteItem() }
    .accessibilityAction(named: "Archive") { archiveItem() }
```

### Rotor Support

```swift
// Custom rotor for navigating specific content
.accessibilityRotor("Headings") {
    ForEach(headings) { heading in
        AccessibilityRotorEntry(heading.text, id: heading.id)
    }
}
```

### Rules

- Every image needs `.accessibilityLabel()` or `.accessibilityHidden(true)` for decorative images
- Group related elements: `.accessibilityElement(children: .combine)`
- Announce state changes: `UIAccessibility.post(notification: .announcement, argument: "Item deleted")`
- Test with VoiceOver ON — navigate every screen by swiping
- Support both portrait and landscape orientations
- Minimum text size: never disable Dynamic Type scaling entirely

---

## Quick Checklist

Use this during implementation — check each item as you build:

- [ ] All spacing uses 8pt grid multiples
- [ ] Text uses semantic font styles (`.body`, `.title`, not fixed sizes)
- [ ] Colors use semantic tokens (`Color(.systemBackground)`, not `Color.white`)
- [ ] Every interactive element has 44x44pt minimum touch target
- [ ] Animations use `.spring` and respect reduce motion
- [ ] SF Symbols match adjacent text size and weight
- [ ] Layout respects safe areas
- [ ] Lists use appropriate `.listStyle`
- [ ] Dynamic Type supported — tested at Accessibility sizes
- [ ] Dark Mode works — tested with color scheme toggle
- [ ] VoiceOver navigable — tested with VoiceOver on
- [ ] Contrast ratios meet WCAG AA (4.5:1 body, 3:1 large)
