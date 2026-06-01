---
id: implementing-ios
name: iOS Development Standards
description: iOS development patterns, SwiftUI/UIKit best practices, and Apple HIG compliance. Use when implementing iOS features, designing iOS architecture, or reviewing iOS code for quality and platform compliance.
scope: generic
applicable-projects: any
module: coding
capabilities-provided:
  - ios-development
  - ios-testing
  - hig-compliance
---

# iOS Development Standards

Modern iOS development patterns, SwiftUI/UIKit best practices, and Apple Human Interface Guidelines (HIG) compliance for iOS 17+.

---

## When to Use This Skill

Use this skill when:
- Implementing iOS features (SwiftUI or UIKit)
- Designing iOS app architecture (MVVM, TCA, Clean Architecture)
- Writing iOS tests (XCTest unit tests, XCUITest UI tests, snapshot tests)
- Reviewing iOS code for HIG compliance
- Implementing accessibility (VoiceOver, Dynamic Type, Reduced Motion)
- Ensuring App Store submission readiness

**Agents using this skill:**
- `ai-ios-developer` (primary)
- `ai-architect` (when designing iOS systems)

---

## Quick Start - iOS Implementation Checklist

### Before Coding

- [ ] Check min iOS version (impacts API availability)
- [ ] Verify Swift version (5.9+ for modern features)
- [ ] Confirm architecture pattern (MVVM/@Observable, TCA, Clean)
- [ ] Review existing component patterns in project

### While Coding

- [ ] Use `@Observable` for state management (iOS 17+)
- [ ] Use `NavigationStack` for navigation (not NavigationView)
- [ ] Apply accessibility modifiers (`.accessibilityLabel`, `.accessibilityHint`)
- [ ] Support Dynamic Type (use `.font(.body)`, not fixed sizes)
- [ ] Handle Dark Mode (use semantic colors)
- [ ] Use SF Symbols for icons

### Before Submitting

- [ ] Run SwiftLint (if configured)
- [ ] Build for all targets (iPhone, iPad if applicable)
- [ ] Run unit tests (Cmd+U)
- [ ] Test VoiceOver navigation
- [ ] Verify on multiple screen sizes
- [ ] Check memory usage with Instruments

---

## Related Coding Standards - Quick Reference

When developing iOS features, also verify compliance with these platform-agnostic essentials:

### Architecture Essentials
> From: `designing-architecture`
- [ ] Document architectural decisions (MVVM vs TCA vs Clean) with rationale
- [ ] Validate design against non-functional requirements (performance, battery)
- [ ] Ensure no circular dependencies between ViewModels/Services

### Implementation Essentials
> From: `implementing-code`
- [ ] Functions: single responsibility, <50 lines, <=4 parameters
- [ ] Tests: cover happy path, edge cases, error conditions (AAA pattern)
- [ ] Error handling: specific exceptions, user-friendly messages
- [ ] Self-review: tests pass (Cmd+U), SwiftLint clean, no debug code

### Structure Essentials
> From: `structuring-code`
- [ ] One responsibility per file; file name matches type
- [ ] File size under 500 lines (hard limit - split Massive View/Controller)
- [ ] Functions: 20-50 lines typical, max 3 nesting levels
- [ ] Feature-based directory organization (not type-based)

<!-- SYNC-NOTE: Keep in sync with source skills. Last synced: 2026-01-04 -->

---

## Architecture Decision Tree

Choose architecture based on project complexity and team preferences:

### MVVM with @Observable (Default for SwiftUI)

**When to use:**
- Standard UI apps with moderate complexity
- Teams familiar with reactive patterns
- iOS 17+ deployment target

**Pattern:**
```swift
@Observable
class FeatureViewModel {
    var items: [Item] = []
    var isLoading = false
    var error: Error?

    func loadItems() async {
        isLoading = true
        defer { isLoading = false }
        // Load data...
    }
}

struct FeatureView: View {
    @State private var viewModel = FeatureViewModel()

    var body: some View {
        List(viewModel.items) { item in
            ItemRow(item: item)
        }
        .task { await viewModel.loadItems() }
    }
}
```

### TCA (The Composable Architecture)

**When to use:**
- Complex state management needs
- Exhaustive testing requirements
- Large teams with specialized roles

**See [ARCHITECTURE-PATTERNS.md](./ARCHITECTURE-PATTERNS.md) for detailed TCA patterns.**

### Clean Architecture

**When to use:**
- Enterprise applications
- Multiple data sources
- Long-term maintainability priority

**See [ARCHITECTURE-PATTERNS.md](./ARCHITECTURE-PATTERNS.md) for detailed Clean Architecture patterns.**

---

## SwiftUI Quick Reference (iOS 17+)

### State Management

| Property Wrapper | Use Case |
|-----------------|----------|
| `@State` | Local view state (simple values) |
| `@Binding` | Two-way binding from parent |
| `@Observable` class | Shared state (replaces ObservableObject) |
| `@Bindable` | Create bindings to @Observable properties |
| `@Environment` | Inject environment values |

### Navigation (NavigationStack)

```swift
struct ContentView: View {
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            List(items) { item in
                NavigationLink(value: item) {
                    Text(item.title)
                }
            }
            .navigationDestination(for: Item.self) { item in
                ItemDetailView(item: item)
            }
        }
    }
}
```

### View Composition

```swift
@ViewBuilder
func contentSection(title: String, @ViewBuilder content: () -> some View) -> some View {
    VStack(alignment: .leading, spacing: 8) {
        Text(title)
            .font(.headline)
        content()
    }
}
```

**See [SWIFTUI-PATTERNS.md](./SWIFTUI-PATTERNS.md) for comprehensive SwiftUI patterns.**

---

## UIKit Quick Reference

### Modern Collection Views

**Diffable Data Sources:**
```swift
enum Section { case main }
typealias DataSource = UICollectionViewDiffableDataSource<Section, Item>

var dataSource: DataSource!

func configureDataSource() {
    dataSource = DataSource(collectionView: collectionView) {
        collectionView, indexPath, item in
        // Configure cell
    }
}

func applySnapshot(items: [Item]) {
    var snapshot = NSDiffableDataSourceSnapshot<Section, Item>()
    snapshot.appendSections([.main])
    snapshot.appendItems(items)
    dataSource.apply(snapshot, animatingDifferences: true)
}
```

**Compositional Layout:**
```swift
func createLayout() -> UICollectionViewLayout {
    let itemSize = NSCollectionLayoutSize(widthDimension: .fractionalWidth(1.0),
                                          heightDimension: .estimated(44))
    let item = NSCollectionLayoutItem(layoutSize: itemSize)

    let groupSize = NSCollectionLayoutSize(widthDimension: .fractionalWidth(1.0),
                                           heightDimension: .estimated(44))
    let group = NSCollectionLayoutGroup.horizontal(layoutSize: groupSize, subitems: [item])

    let section = NSCollectionLayoutSection(group: group)
    return UICollectionViewCompositionalLayout(section: section)
}
```

**See [UIKIT-PATTERNS.md](./UIKIT-PATTERNS.md) for comprehensive UIKit patterns.**

---

## HIG Compliance Checklist

### Touch Targets

- **Minimum size:** 44x44 points for all tappable elements
- **Spacing:** At least 8 points between adjacent touch targets
- **Thumb zones:** Place primary actions within easy thumb reach

### Accessibility

```swift
// VoiceOver labels
Button(action: playVideo) {
    Image(systemName: "play.fill")
}
.accessibilityLabel("Play video")
.accessibilityHint("Double-tap to start playback")

// Dynamic Type
Text("Title")
    .font(.title)  // Scales automatically

// Reduce Motion
@Environment(\.accessibilityReduceMotion) var reduceMotion

var body: some View {
    content
        .animation(reduceMotion ? nil : .default, value: isExpanded)
}
```

### Color & Dark Mode

```swift
// Use semantic colors
Color(.systemBackground)  // Adapts to light/dark
Color(.label)             // Primary text color
Color(.secondaryLabel)    // Secondary text color

// System tint colors
Color(.systemBlue)        // Adapts to appearance
```

### Color Contrast (WCAG)

| Text Type | Minimum Ratio |
|-----------|--------------|
| Normal text | 4.5:1 |
| Large text (18pt+) | 3:1 |
| UI components | 3:1 |

**See [HIG-COMPLIANCE.md](./HIG-COMPLIANCE.md) for complete HIG guidelines.**

---

## Testing Strategy

### Test Pyramid

1. **Unit Tests (Most)** - XCTest for ViewModels and business logic
2. **Integration Tests** - Test data layer with mocked services
3. **UI Tests (Least)** - XCUITest for critical user flows only
4. **Snapshot Tests** - Visual regression with swift-snapshot-testing

### Unit Testing ViewModels

```swift
@MainActor
final class FeatureViewModelTests: XCTestCase {
    var sut: FeatureViewModel!
    var mockService: MockDataService!

    override func setUp() {
        mockService = MockDataService()
        sut = FeatureViewModel(service: mockService)
    }

    func testLoadItems_success() async {
        mockService.itemsToReturn = [Item(id: 1, name: "Test")]

        await sut.loadItems()

        XCTAssertEqual(sut.items.count, 1)
        XCTAssertFalse(sut.isLoading)
    }
}
```

### UI Testing

```swift
final class FeatureUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUp() {
        app = XCUIApplication()
        app.launch()
    }

    func testAddItem_showsInList() {
        app.buttons["addButton"].tap()
        app.textFields["itemNameField"].typeText("New Item")
        app.buttons["saveButton"].tap()

        XCTAssertTrue(app.staticTexts["New Item"].exists)
    }
}
```

**See [TESTING-PATTERNS.md](./TESTING-PATTERNS.md) for comprehensive testing patterns.**

---

## Common Patterns

### Pattern 1: Implementing New SwiftUI View

1. Create View struct with clear responsibility
2. Create ViewModel with @Observable (if state needed)
3. Inject dependencies via Environment or init
4. Add accessibility modifiers
5. Write unit tests for ViewModel

```swift
// 1. ViewModel
@Observable
class ItemListViewModel {
    var items: [Item] = []
    private let service: ItemService

    init(service: ItemService = .shared) {
        self.service = service
    }

    func loadItems() async { /* ... */ }
}

// 2. View
struct ItemListView: View {
    @State private var viewModel: ItemListViewModel

    init(viewModel: ItemListViewModel = ItemListViewModel()) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        List(viewModel.items) { item in
            ItemRow(item: item)
                .accessibilityElement(children: .combine)
        }
        .task { await viewModel.loadItems() }
    }
}
```

### Pattern 2: Handling Async Operations

```swift
@Observable
class DataViewModel {
    var state: LoadingState<[Item]> = .idle

    func load() async {
        state = .loading
        do {
            let items = try await service.fetchItems()
            state = .loaded(items)
        } catch {
            state = .failed(error)
        }
    }
}

enum LoadingState<T> {
    case idle
    case loading
    case loaded(T)
    case failed(Error)
}
```

### Pattern 3: Navigation with Type Safety

```swift
enum AppRoute: Hashable {
    case itemList
    case itemDetail(Item)
    case settings
}

struct AppNavigator: View {
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            HomeView()
                .navigationDestination(for: AppRoute.self) { route in
                    switch route {
                    case .itemList:
                        ItemListView()
                    case .itemDetail(let item):
                        ItemDetailView(item: item)
                    case .settings:
                        SettingsView()
                    }
                }
        }
    }
}
```

---

## Anti-Patterns Overview

### Architecture
- **Massive View** - Break into smaller, focused views
- **Business logic in Views** - Move to ViewModels
- **Tight coupling** - Use dependency injection

### SwiftUI
- **Using NavigationView** - Use NavigationStack (iOS 16+)
- **Using ObservableObject** - Use @Observable (iOS 17+)
- **Force unwrapping optionals** - Use safe unwrapping

### Accessibility
- **Skipping VoiceOver labels** - Always add .accessibilityLabel
- **Fixed font sizes** - Use .font(.body), not .font(.system(size:))
- **Hardcoded colors** - Use semantic colors

**See [ANTI-PATTERNS.md](./ANTI-PATTERNS.md) for complete anti-patterns guide.**

---

## See Also

### Supporting Files
- [ARCHITECTURE-PATTERNS.md](./ARCHITECTURE-PATTERNS.md) - MVVM, TCA, Clean Architecture deep dive
- [SWIFTUI-PATTERNS.md](./SWIFTUI-PATTERNS.md) - State management, navigation, performance
- [UIKIT-PATTERNS.md](./UIKIT-PATTERNS.md) - Modern UIKit patterns
- [HIG-COMPLIANCE.md](./HIG-COMPLIANCE.md) - Apple HIG, accessibility, SF Symbols
- [TESTING-PATTERNS.md](./TESTING-PATTERNS.md) - XCTest, XCUITest, snapshot testing
- [ANTI-PATTERNS.md](./ANTI-PATTERNS.md) - Common mistakes and fixes

### External Resources
- [Apple Human Interface Guidelines](https://developer.apple.com/design/human-interface-guidelines/)
- [SwiftUI Documentation](https://developer.apple.com/documentation/swiftui)
- [WWDC Videos](https://developer.apple.com/videos/)
- [Swift.org Documentation](https://docs.swift.org/)

### Related Skills
- `verifying-quality` - Quality validation
- `committing-code` - Git operations
- `implementing-code` - Generic coding patterns

---

**Version:** 1.0.0
**Target:** iOS 17+, Swift 5.9+
**Last Updated:** 2025-12-26
