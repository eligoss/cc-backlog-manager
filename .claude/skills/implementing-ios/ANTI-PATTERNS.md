# iOS Development Anti-Patterns

Common mistakes in iOS development and how to avoid them.

---

## Architecture Anti-Patterns

### Massive View Controller / Massive View

**Problem:**
```swift
// BAD: View doing everything
struct ItemListView: View {
    @State private var items: [Item] = []
    @State private var isLoading = false
    @State private var searchText = ""
    @State private var sortOrder: SortOrder = .name
    @State private var showFilters = false
    // ... 20 more @State properties

    var body: some View {
        // 500 lines of view code with business logic mixed in
    }

    func loadItems() async {
        // Network call directly in view
    }

    func filterItems() -> [Item] {
        // Complex filtering logic
    }

    func sortItems() {
        // Sorting logic
    }
}
```

**Solution:**
```swift
// GOOD: Separated concerns
@Observable
class ItemListViewModel {
    var items: [Item] = []
    var isLoading = false
    var searchText = ""
    var sortOrder: SortOrder = .name

    var filteredItems: [Item] {
        // Filtering logic here
    }

    func loadItems() async {
        // Business logic here
    }
}

struct ItemListView: View {
    @State private var viewModel = ItemListViewModel()

    var body: some View {
        // Clean, declarative UI only
    }
}
```

---

### Tight Coupling

**Problem:**
```swift
// BAD: Direct dependency
class ItemViewModel {
    let service = ItemService()  // Concrete class

    func loadItems() async {
        items = try? await service.fetch()
    }
}
```

**Solution:**
```swift
// GOOD: Dependency injection
class ItemViewModel {
    private let service: ItemServiceProtocol

    init(service: ItemServiceProtocol = ItemService()) {
        self.service = service
    }

    func loadItems() async {
        items = try? await service.fetch()
    }
}

// Now testable with mocks
let viewModel = ItemViewModel(service: MockItemService())
```

---

## SwiftUI Anti-Patterns

### Using Deprecated APIs

**Problem:**
```swift
// BAD: Deprecated in iOS 16
NavigationView {
    List(items) { item in
        NavigationLink(destination: DetailView(item: item)) {
            Text(item.name)
        }
    }
}

// BAD: Old state management
class ViewModel: ObservableObject {
    @Published var items: [Item] = []
}

struct MyView: View {
    @StateObject var viewModel = ViewModel()
}
```

**Solution:**
```swift
// GOOD: Modern navigation (iOS 16+)
NavigationStack {
    List(items) { item in
        NavigationLink(value: item) {
            Text(item.name)
        }
    }
    .navigationDestination(for: Item.self) { item in
        DetailView(item: item)
    }
}

// GOOD: @Observable (iOS 17+)
@Observable
class ViewModel {
    var items: [Item] = []
}

struct MyView: View {
    @State var viewModel = ViewModel()
}
```

---

### Misusing State Property Wrappers

**Problem:**
```swift
// BAD: @State for reference type
@State var viewModel = ViewModel()  // With ObservableObject

// BAD: @StateObject for passed-in model
struct ChildView: View {
    @StateObject var model: SharedModel  // Should be @ObservedObject
}

// BAD: Recreating model on every render
var body: some View {
    ChildView(model: SharedModel())  // New instance each render!
}
```

**Solution:**
```swift
// GOOD: @State with @Observable (iOS 17+)
@State var viewModel = ViewModel()  // With @Observable

// GOOD: Use appropriate wrapper for passed objects
struct ChildView: View {
    var model: SharedModel  // Just pass it, no wrapper needed with @Observable
}

// GOOD: Create once, pass reference
struct ParentView: View {
    @State private var model = SharedModel()

    var body: some View {
        ChildView(model: model)
    }
}
```

---

### Performance Issues

**Problem:**
```swift
// BAD: Heavy computation in body
var body: some View {
    let sortedItems = items.sorted { $0.date > $1.date }  // Every render!
    let filteredItems = sortedItems.filter { $0.isActive }

    List(filteredItems) { item in
        // ...
    }
}

// BAD: Regular VStack for long lists
ScrollView {
    VStack {  // Renders ALL items immediately
        ForEach(thousandItems) { item in
            ItemRow(item: item)
        }
    }
}
```

**Solution:**
```swift
// GOOD: Computed property in ViewModel
@Observable
class ViewModel {
    var items: [Item] = []

    var filteredSortedItems: [Item] {
        items.filter { $0.isActive }.sorted { $0.date > $1.date }
    }
}

// GOOD: Lazy container
ScrollView {
    LazyVStack {  // Renders only visible items
        ForEach(thousandItems) { item in
            ItemRow(item: item)
        }
    }
}
```

---

## Swift Anti-Patterns

### Force Unwrapping

**Problem:**
```swift
// BAD: Crash waiting to happen
let name = user.name!
let image = UIImage(named: "icon")!
let url = URL(string: urlString)!
```

**Solution:**
```swift
// GOOD: Safe unwrapping
if let name = user.name {
    print(name)
}

guard let image = UIImage(named: "icon") else {
    assertionFailure("Missing required image")
    return
}

guard let url = URL(string: urlString) else {
    throw URLError(.badURL)
}
```

---

### Blocking Main Thread

**Problem:**
```swift
// BAD: Blocks UI
func loadData() {
    let data = try! Data(contentsOf: url)  // Synchronous!
    self.items = parse(data)
}
```

**Solution:**
```swift
// GOOD: Async on background
func loadData() async {
    do {
        let (data, _) = try await URLSession.shared.data(from: url)
        await MainActor.run {
            self.items = parse(data)
        }
    } catch {
        // Handle error
    }
}
```

---

### Retain Cycles

**Problem:**
```swift
// BAD: Strong reference cycle
class ViewModel {
    var onComplete: (() -> Void)?

    func setup(view: MyView) {
        onComplete = {
            view.refresh()  // Captures view strongly
        }
    }
}
```

**Solution:**
```swift
// GOOD: Weak capture
class ViewModel {
    var onComplete: (() -> Void)?

    func setup(view: MyView) {
        onComplete = { [weak view] in
            view?.refresh()
        }
    }
}
```

---

## Accessibility Anti-Patterns

### Missing Labels

**Problem:**
```swift
// BAD: No accessibility info
Button(action: playVideo) {
    Image(systemName: "play.fill")
}

Image("user-avatar")
    .resizable()
```

**Solution:**
```swift
// GOOD: Proper accessibility
Button(action: playVideo) {
    Image(systemName: "play.fill")
}
.accessibilityLabel("Play video")
.accessibilityHint("Double-tap to start playback")

Image("user-avatar")
    .resizable()
    .accessibilityLabel("Profile photo of \(user.name)")
```

---

### Fixed Font Sizes

**Problem:**
```swift
// BAD: Ignores Dynamic Type
Text("Title")
    .font(.system(size: 24))

// UIKit
label.font = UIFont.systemFont(ofSize: 17)
```

**Solution:**
```swift
// GOOD: Scales with user settings
Text("Title")
    .font(.title)

// Or with custom scaling
@ScaledMetric var titleSize: CGFloat = 24
Text("Title")
    .font(.system(size: titleSize))

// UIKit
label.font = .preferredFont(forTextStyle: .body)
label.adjustsFontForContentSizeCategory = true
```

---

### Hardcoded Colors

**Problem:**
```swift
// BAD: Ignores Dark Mode
Text("Hello")
    .foregroundColor(.black)

view.backgroundColor = UIColor.white
```

**Solution:**
```swift
// GOOD: Semantic colors
Text("Hello")
    .foregroundStyle(.primary)

view.backgroundColor = .systemBackground
```

---

## Testing Anti-Patterns

### No Dependency Injection

**Problem:**
```swift
// BAD: Untestable
class ItemService {
    func fetch() async -> [Item] {
        let url = URL(string: "https://api.example.com/items")!
        let (data, _) = try! await URLSession.shared.data(from: url)
        return try! JSONDecoder().decode([Item].self, from: data)
    }
}
```

**Solution:**
```swift
// GOOD: Testable
protocol ItemServiceProtocol {
    func fetch() async throws -> [Item]
}

class ItemService: ItemServiceProtocol {
    private let session: URLSession
    private let baseURL: URL

    init(session: URLSession = .shared, baseURL: URL) {
        self.session = session
        self.baseURL = baseURL
    }

    func fetch() async throws -> [Item] {
        let (data, _) = try await session.data(from: baseURL.appending(path: "items"))
        return try JSONDecoder().decode([Item].self, from: data)
    }
}
```

---

### Testing Implementation Details

**Problem:**
```swift
// BAD: Tests internal state
func test_loadItems() async {
    await viewModel.loadItems()

    XCTAssertEqual(viewModel.internalCache.count, 5)  // Implementation detail
    XCTAssertTrue(viewModel.didCallService)  // Testing mechanics
}
```

**Solution:**
```swift
// GOOD: Tests behavior
func test_loadItems_success_updatesItems() async {
    // Given
    mockService.itemsToReturn = [Item(name: "Test")]

    // When
    await viewModel.loadItems()

    // Then
    XCTAssertEqual(viewModel.items.count, 1)  // Observable behavior
    XCTAssertEqual(viewModel.items.first?.name, "Test")
}
```

---

## Memory Anti-Patterns

### Not Canceling Tasks

**Problem:**
```swift
// BAD: Tasks continue after view disappears
struct ItemView: View {
    @State private var items: [Item] = []

    var body: some View {
        List(items) { item in
            Text(item.name)
        }
        .onAppear {
            Task {
                items = try await service.fetchItems()
            }
        }
    }
}
```

**Solution:**
```swift
// GOOD: .task cancels automatically
struct ItemView: View {
    @State private var items: [Item] = []

    var body: some View {
        List(items) { item in
            Text(item.name)
        }
        .task {
            items = try await service.fetchItems()
        }
    }
}

// Or manual cancellation
@State private var loadTask: Task<Void, Never>?

.onAppear {
    loadTask = Task { await load() }
}
.onDisappear {
    loadTask?.cancel()
}
```

---

## Quick Reference

| Anti-Pattern | Solution |
|-------------|----------|
| Massive View | Extract to ViewModel |
| NavigationView | Use NavigationStack |
| ObservableObject | Use @Observable |
| Force unwrap | Guard/if-let |
| Main thread blocking | async/await |
| Retain cycles | [weak self] |
| Missing a11y labels | .accessibilityLabel |
| Fixed fonts | .preferredFont |
| Hardcoded colors | Semantic colors |
| No DI | Protocol-based injection |
| Uncanceled tasks | Use .task modifier |

---

**See Also:**
- [SKILL.md](./SKILL.md) - Main skill overview
- [SWIFTUI-PATTERNS.md](./SWIFTUI-PATTERNS.md) - Correct patterns
- [TESTING-PATTERNS.md](./TESTING-PATTERNS.md) - Testing best practices
