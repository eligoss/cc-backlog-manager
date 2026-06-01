# Apple Human Interface Guidelines (HIG) Compliance

Essential HIG requirements for iOS applications. Compliance ensures excellent user experience and App Store approval.

---

## Core Design Principles

### The Four Pillars

1. **Clarity** - Clean layouts, ample white space, uncluttered UI
2. **Deference** - UI supports content, doesn't distract
3. **Depth** - Layers and motion create hierarchy
4. **Consistency** - Uniform design language throughout

---

## Touch Targets

### Size Requirements

| Element Type | Minimum Size |
|--------------|-------------|
| Buttons | 44x44 points |
| Icons | 44x44 points touch area |
| List rows | 44 points height |
| Text links | 44x44 points touch area |

### Implementation

```swift
// SwiftUI - Expand touch target
Button(action: action) {
    Image(systemName: "gear")
        .frame(width: 44, height: 44)
}

// UIKit - Expand hit area
class LargeTouchButton: UIButton {
    override func point(inside point: CGPoint, with event: UIEvent?) -> Bool {
        let margin: CGFloat = 10
        let area = bounds.insetBy(dx: -margin, dy: -margin)
        return area.contains(point)
    }
}
```

### Spacing

- Minimum 8 points between adjacent touch targets
- Consider thumb zones for primary actions
- Place destructive actions away from common actions

---

## Accessibility

### VoiceOver

```swift
// SwiftUI
Button(action: playVideo) {
    Image(systemName: "play.fill")
}
.accessibilityLabel("Play video")
.accessibilityHint("Double-tap to start playback")
.accessibilityAddTraits(.startsMediaSession)

// Group related elements
VStack {
    Text(item.title)
    Text(item.subtitle)
}
.accessibilityElement(children: .combine)

// Custom actions
.accessibilityAction(named: "Delete") {
    deleteItem()
}

// UIKit
button.accessibilityLabel = "Play video"
button.accessibilityHint = "Double-tap to start playback"
button.accessibilityTraits = [.button, .startsMediaSession]
```

### Accessibility Traits

| Trait | Use Case |
|-------|----------|
| `.button` | Tappable elements |
| `.link` | Opens external content |
| `.header` | Section headers |
| `.image` | Decorative images |
| `.selected` | Currently selected item |
| `.notEnabled` | Disabled controls |
| `.adjustable` | Sliders, steppers |
| `.startsMediaSession` | Media playback |

### Dynamic Type

```swift
// SwiftUI - Automatic scaling
Text("Title")
    .font(.title)  // Scales with system settings

// Custom font that scales
@ScaledMetric var iconSize: CGFloat = 24

Image(systemName: "star")
    .font(.system(size: iconSize))

// UIKit
label.font = .preferredFont(forTextStyle: .body)
label.adjustsFontForContentSizeCategory = true
label.numberOfLines = 0  // Allow wrapping

// Minimum/maximum scaling
let metrics = UIFontMetrics(forTextStyle: .body)
label.font = metrics.scaledFont(for: customFont, maximumPointSize: 24)
```

### Reduce Motion

```swift
// SwiftUI
@Environment(\.accessibilityReduceMotion) var reduceMotion

var body: some View {
    content
        .animation(reduceMotion ? nil : .spring(), value: isExpanded)
}

// UIKit
if UIAccessibility.isReduceMotionEnabled {
    // Use simple transitions
} else {
    // Use full animations
}

// Listen for changes
NotificationCenter.default.addObserver(
    self,
    selector: #selector(reduceMotionChanged),
    name: UIAccessibility.reduceMotionStatusDidChangeNotification,
    object: nil
)
```

### Increase Contrast

```swift
// SwiftUI
@Environment(\.accessibilityDifferentiateWithoutColor) var differentiateWithoutColor

var body: some View {
    if differentiateWithoutColor {
        // Add icons or patterns, not just color
    }
}

// UIKit
if UIAccessibility.isDarkerSystemColorsEnabled {
    // Use higher contrast colors
}
```

---

## Color and Dark Mode

### Semantic Colors

```swift
// SwiftUI
Color(.systemBackground)    // Primary background
Color(.secondarySystemBackground)  // Secondary background
Color(.tertiarySystemBackground)   // Tertiary background

Color(.label)               // Primary text
Color(.secondaryLabel)      // Secondary text
Color(.tertiaryLabel)       // Tertiary text
Color(.quaternaryLabel)     // Quaternary text

Color(.systemFill)          // Fill colors
Color(.secondarySystemFill)
Color(.tertiarySystemFill)

Color(.separator)           // Separators
Color(.opaqueSeparator)

// System tints (adapt to appearance)
Color(.systemBlue)
Color(.systemRed)
Color(.systemGreen)
```

### Custom Colors with Dark Mode

```swift
// In Asset Catalog:
// 1. Create Color Set
// 2. Set "Appearances" to "Any, Dark"
// 3. Define colors for each appearance

// Usage in SwiftUI
Color("CustomAccent")  // From asset catalog

// Usage in UIKit
UIColor(named: "CustomAccent")
```

### Color Contrast Requirements (WCAG)

| Content Type | AA Level | AAA Level |
|--------------|----------|-----------|
| Normal text | 4.5:1 | 7:1 |
| Large text (18pt+) | 3:1 | 4.5:1 |
| UI components | 3:1 | 3:1 |
| Graphics | 3:1 | 3:1 |

```swift
// Test contrast programmatically
extension UIColor {
    func contrastRatio(with color: UIColor) -> CGFloat {
        let luminance1 = self.luminance
        let luminance2 = color.luminance
        let lighter = max(luminance1, luminance2)
        let darker = min(luminance1, luminance2)
        return (lighter + 0.05) / (darker + 0.05)
    }

    var luminance: CGFloat {
        var red: CGFloat = 0
        var green: CGFloat = 0
        var blue: CGFloat = 0
        getRed(&red, green: &green, blue: &blue, alpha: nil)

        func adjust(_ component: CGFloat) -> CGFloat {
            component <= 0.03928 ? component / 12.92 : pow((component + 0.055) / 1.055, 2.4)
        }

        return 0.2126 * adjust(red) + 0.7152 * adjust(green) + 0.0722 * adjust(blue)
    }
}
```

---

## SF Symbols

### Usage Guidelines

```swift
// SwiftUI
Image(systemName: "star.fill")
    .symbolRenderingMode(.hierarchical)
    .foregroundStyle(.yellow)

// With configuration
Image(systemName: "arrow.up.circle")
    .symbolVariant(.fill)
    .symbolEffect(.bounce, value: triggerValue)

// UIKit
let config = UIImage.SymbolConfiguration(pointSize: 24, weight: .medium)
let image = UIImage(systemName: "star.fill", withConfiguration: config)
```

### Symbol Variants

| Variant | Use Case |
|---------|----------|
| Outline | Toolbars, navigation bars |
| Fill | Tab bars, selection states |
| Circle/Square | Standalone icons |
| Slash | Disabled/unavailable states |

### Rendering Modes

```swift
// Monochrome - Single color
.symbolRenderingMode(.monochrome)

// Hierarchical - Primary color with opacity layers
.symbolRenderingMode(.hierarchical)

// Palette - Custom colors per layer
.symbolRenderingMode(.palette)
.foregroundStyle(.red, .blue, .green)

// Multicolor - Built-in colors
.symbolRenderingMode(.multicolor)
```

---

## Haptic Feedback

### Feedback Types

```swift
// Impact - Physical collisions
let impact = UIImpactFeedbackGenerator(style: .medium)
impact.prepare()  // Reduce latency
impact.impactOccurred()

// Styles: .light, .medium, .heavy, .soft, .rigid

// Selection - UI selection changes
let selection = UISelectionFeedbackGenerator()
selection.prepare()
selection.selectionChanged()

// Notification - Task completion
let notification = UINotificationFeedbackGenerator()
notification.prepare()
notification.notificationOccurred(.success)  // .success, .warning, .error
```

### When to Use

| Feedback Type | Use Case |
|---------------|----------|
| Light impact | Subtle UI changes |
| Medium impact | Standard interactions |
| Heavy impact | Significant actions |
| Selection | Scrolling through options |
| Success | Task completed |
| Warning | Attention needed |
| Error | Action failed |

### SwiftUI Integration

```swift
struct HapticButton: View {
    var body: some View {
        Button(action: {
            let impact = UIImpactFeedbackGenerator(style: .medium)
            impact.impactOccurred()
            performAction()
        }) {
            Text("Tap Me")
        }
        .sensoryFeedback(.impact, trigger: tapCount)  // iOS 17+
    }
}
```

---

## Navigation Patterns

### Standard Patterns

| Pattern | Use Case |
|---------|----------|
| Tab Bar | Top-level navigation (3-5 items) |
| Navigation Stack | Hierarchical content |
| Modal/Sheet | Self-contained tasks |
| Sidebar | iPad/Mac primary navigation |

### Tab Bar Guidelines

- 3-5 items maximum
- Use filled icons
- Consistent across app
- Don't hide based on content
- Tab bar stays at bottom

### Navigation Bar

- Back button always in top-left
- Title centered or large
- Actions on right side
- Avoid too many bar buttons

---

## Layout and Spacing

### Safe Areas

```swift
// SwiftUI - Automatic
struct ContentView: View {
    var body: some View {
        Text("Content")
            .padding()  // Respects safe area
    }
}

// Ignore safe area for backgrounds
Color.blue
    .ignoresSafeArea()

// UIKit
view.safeAreaLayoutGuide
view.safeAreaInsets
```

### Layout Margins

| Context | Margin |
|---------|--------|
| Standard | 16 points |
| Readable content | Adaptive (44-128 points) |
| Compact width | 8-16 points |
| Regular width | 20+ points |

```swift
// SwiftUI
Text("Long form content")
    .frame(maxWidth: .readableContentWidth)

// UIKit
view.readableContentGuide
```

### Grid System

- Use 8-point grid for spacing
- Consistent padding (8, 16, 24, 32)
- Align elements to grid
- Maintain visual rhythm

---

## Widgets and Live Activities

### Widget Guidelines

- Glanceable information
- No scrolling content
- Tap opens app to relevant content
- Support all sizes
- Test in StandBy mode

### Live Activities

- Time-sensitive information
- Compact Dynamic Island layouts
- Lock Screen optimized
- Remove promptly when done

---

## App Store Requirements

### Required Elements

- [ ] App icon (all sizes)
- [ ] Launch screen
- [ ] Privacy manifest
- [ ] App Tracking Transparency (if tracking)
- [ ] Default keyboard support
- [ ] Standard gestures work

### Common Rejection Reasons

1. Incomplete functionality
2. Broken links/features
3. Placeholder content
4. Missing privacy policy
5. Inaccurate screenshots
6. Performance issues
7. Crashes

---

## Checklist

### Before Submission

- [ ] Touch targets >= 44pt
- [ ] VoiceOver labels on all interactive elements
- [ ] Dynamic Type supported
- [ ] Dark Mode tested
- [ ] Reduce Motion alternatives
- [ ] Color contrast WCAG AA
- [ ] Safe areas respected
- [ ] Standard navigation patterns
- [ ] Haptic feedback appropriate
- [ ] SF Symbols used correctly
- [ ] Works in all orientations (or locked appropriately)

---

**See Also:**
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [SKILL.md](./SKILL.md) - Main skill overview
- [ANTI-PATTERNS.md](./ANTI-PATTERNS.md) - Common mistakes
