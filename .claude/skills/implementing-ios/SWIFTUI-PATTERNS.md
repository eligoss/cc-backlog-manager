# SwiftUI Patterns (iOS 17+)

Comprehensive SwiftUI patterns for modern iOS development targeting iOS 17+.

---

## State Management

### Property Wrapper Selection Guide

| Wrapper | Use Case | Example |
|---------|----------|---------|
| `@State` | Local view state, simple values | Toggle, text input |
| `@Binding` | Two-way binding from parent | Child modifying parent state |
| `@Observable` | Shared state across views | ViewModel, app state |
| `@Bindable` | Create bindings to @Observable | Form fields with @Observable |
| `@Environment` | System or custom environment values | Color scheme, dismiss |
| `@AppStorage` | UserDefaults persistence | User preferences |
| `@SceneStorage` | State restoration | Scroll position |

### @Observable Pattern (iOS 17+)

```swift
@Observable
class ProfileViewModel {
    var user: User?
    var isLoading = false
    var error: ProfileError?

    // Computed properties work naturally
    var displayName: String {
        user?.name ?? "Guest"
    }

    // No @Published needed - changes tracked automatically
    func updateName(_ name: String) {
        user?.name = name
    }
}

struct ProfileView: View {
    @State private var viewModel = ProfileViewModel()

    var body: some View {
        // View automatically updates when viewModel properties change
        Text(viewModel.displayName)
    }
}
```

### @Bindable for Forms

```swift
@Observable
class SettingsViewModel {
    var notificationsEnabled = true
    var soundEnabled = true
    var hapticEnabled = true
}

struct SettingsView: View {
    @Bindable var viewModel: SettingsViewModel

    var body: some View {
        Form {
            Toggle("Notifications", isOn: $viewModel.notificationsEnabled)
            Toggle("Sound", isOn: $viewModel.soundEnabled)
            Toggle("Haptic Feedback", isOn: $viewModel.hapticEnabled)
        }
    }
}
```

### Environment for Dependency Injection

```swift
// Define environment key
struct DataServiceKey: EnvironmentKey {
    static let defaultValue: DataServiceProtocol = DataService()
}

extension EnvironmentValues {
    var dataService: DataServiceProtocol {
        get { self[DataServiceKey.self] }
        set { self[DataServiceKey.self] = newValue }
    }
}

// Use in view
struct ContentView: View {
    @Environment(\.dataService) private var dataService

    var body: some View {
        // Use dataService
    }
}

// Inject in app
@main
struct MyApp: App {
    var body: some Scene {
        WindowGroup {
            ContentView()
                .environment(\.dataService, MockDataService())  // For testing
        }
    }
}
```

---

## Navigation Patterns

### NavigationStack Basics

```swift
struct ContentView: View {
    @State private var path = NavigationPath()

    var body: some View {
        NavigationStack(path: $path) {
            HomeView(path: $path)
                .navigationDestination(for: Route.self) { route in
                    destinationView(for: route)
                }
        }
    }

    @ViewBuilder
    private func destinationView(for route: Route) -> some View {
        switch route {
        case .itemList:
            ItemListView(path: $path)
        case .itemDetail(let item):
            ItemDetailView(item: item)
        case .settings:
            SettingsView()
        }
    }
}

enum Route: Hashable {
    case itemList
    case itemDetail(Item)
    case settings
}
```

### Programmatic Navigation

```swift
struct HomeView: View {
    @Binding var path: NavigationPath

    var body: some View {
        VStack {
            Button("Go to Settings") {
                path.append(Route.settings)
            }

            Button("Go to Item") {
                path.append(Route.itemDetail(Item(name: "Example")))
            }

            Button("Pop to Root") {
                path.removeLast(path.count)
            }
        }
    }
}
```

### Tab-Based Navigation

```swift
struct MainTabView: View {
    @State private var selectedTab = Tab.home

    var body: some View {
        TabView(selection: $selectedTab) {
            HomeView()
                .tabItem {
                    Label("Home", systemImage: "house")
                }
                .tag(Tab.home)

            SearchView()
                .tabItem {
                    Label("Search", systemImage: "magnifyingglass")
                }
                .tag(Tab.search)

            ProfileView()
                .tabItem {
                    Label("Profile", systemImage: "person")
                }
                .tag(Tab.profile)
        }
    }

    enum Tab { case home, search, profile }
}
```

### Modal Presentation

```swift
struct ItemListView: View {
    @State private var itemToEdit: Item?
    @State private var showAddSheet = false

    var body: some View {
        List(items) { item in
            Button(item.name) {
                itemToEdit = item
            }
        }
        .sheet(item: $itemToEdit) { item in
            EditItemView(item: item)
        }
        .sheet(isPresented: $showAddSheet) {
            AddItemView()
        }
    }
}
```

---

## View Composition

### @ViewBuilder for Custom Components

```swift
struct Card<Content: View>: View {
    let title: String
    @ViewBuilder let content: () -> Content

    var body: some View {
        VStack(alignment: .leading, spacing: 12) {
            Text(title)
                .font(.headline)

            content()
        }
        .padding()
        .background(.regularMaterial)
        .clipShape(RoundedRectangle(cornerRadius: 12))
    }
}

// Usage
Card(title: "Statistics") {
    HStack {
        StatView(value: 42, label: "Items")
        StatView(value: 3, label: "Categories")
    }
}
```

### Custom View Modifiers

```swift
struct CardStyle: ViewModifier {
    func body(content: Content) -> some View {
        content
            .padding()
            .background(.regularMaterial)
            .clipShape(RoundedRectangle(cornerRadius: 12))
            .shadow(radius: 2)
    }
}

extension View {
    func cardStyle() -> some View {
        modifier(CardStyle())
    }
}

// Usage
Text("Hello")
    .cardStyle()
```

### Extracting Subviews

```swift
// Before - Large view
struct ProfileView: View {
    var body: some View {
        VStack {
            // 50 lines of header code
            // 30 lines of stats code
            // 40 lines of actions code
        }
    }
}

// After - Extracted subviews
struct ProfileView: View {
    var body: some View {
        VStack {
            ProfileHeader()
            ProfileStats()
            ProfileActions()
        }
    }
}

struct ProfileHeader: View {
    var body: some View {
        // Header code
    }
}
```

---

## Performance Optimization

### Lazy Containers

```swift
// Use LazyVStack for long lists
ScrollView {
    LazyVStack {
        ForEach(items) { item in
            ItemRow(item: item)
        }
    }
}

// Use List for native performance
List(items) { item in
    ItemRow(item: item)
}
```

### Equatable Views

```swift
struct ExpensiveView: View, Equatable {
    let data: ComplexData

    static func == (lhs: ExpensiveView, rhs: ExpensiveView) -> Bool {
        lhs.data.id == rhs.data.id
    }

    var body: some View {
        // Expensive rendering
    }
}

// Usage with .equatable()
ForEach(items) { item in
    ExpensiveView(data: item)
        .equatable()
}
```

### Avoid Recomputation

```swift
@Observable
class ViewModel {
    var items: [Item] = []
    var filter: String = ""

    // Cache computed value
    private var _filteredItems: [Item]?
    private var _lastFilter: String?

    var filteredItems: [Item] {
        if filter == _lastFilter, let cached = _filteredItems {
            return cached
        }
        let result = items.filter { $0.name.contains(filter) }
        _filteredItems = result
        _lastFilter = filter
        return result
    }
}
```

### Task Management

```swift
struct ItemListView: View {
    @State private var viewModel = ItemListViewModel()

    var body: some View {
        List(viewModel.items) { item in
            ItemRow(item: item)
        }
        // .task cancels automatically when view disappears
        .task {
            await viewModel.loadItems()
        }
        // .task(id:) restarts when id changes
        .task(id: viewModel.filter) {
            await viewModel.loadItems()
        }
    }
}
```

---

## Async/Await Patterns

### Loading States

```swift
enum LoadingState<T> {
    case idle
    case loading
    case loaded(T)
    case failed(Error)
}

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

struct DataView: View {
    @State private var viewModel = DataViewModel()

    var body: some View {
        Group {
            switch viewModel.state {
            case .idle:
                Color.clear
            case .loading:
                ProgressView()
            case .loaded(let items):
                ItemList(items: items)
            case .failed(let error):
                ErrorView(error: error) {
                    Task { await viewModel.load() }
                }
            }
        }
        .task { await viewModel.load() }
    }
}
```

### Cancellation Handling

```swift
@Observable
class SearchViewModel {
    var results: [SearchResult] = []
    private var searchTask: Task<Void, Never>?

    func search(query: String) {
        // Cancel previous search
        searchTask?.cancel()

        searchTask = Task {
            // Debounce
            try? await Task.sleep(for: .milliseconds(300))

            guard !Task.isCancelled else { return }

            do {
                results = try await service.search(query)
            } catch {
                if !Task.isCancelled {
                    // Handle error
                }
            }
        }
    }
}
```

---

## Animation Patterns

### Basic Animations

```swift
struct AnimatedButton: View {
    @State private var isPressed = false

    var body: some View {
        Button("Press Me") {
            // Action
        }
        .scaleEffect(isPressed ? 0.95 : 1.0)
        .animation(.spring(response: 0.3), value: isPressed)
        .onLongPressGesture(minimumDuration: .infinity, pressing: { pressing in
            isPressed = pressing
        }) { }
    }
}
```

### Transitions

```swift
struct ContentView: View {
    @State private var showDetail = false

    var body: some View {
        VStack {
            if showDetail {
                DetailView()
                    .transition(.asymmetric(
                        insertion: .move(edge: .trailing).combined(with: .opacity),
                        removal: .move(edge: .leading).combined(with: .opacity)
                    ))
            }
        }
        .animation(.easeInOut, value: showDetail)
    }
}
```

### Reduce Motion Support

```swift
struct AnimatedView: View {
    @Environment(\.accessibilityReduceMotion) var reduceMotion
    @State private var isExpanded = false

    var body: some View {
        content
            .animation(reduceMotion ? nil : .spring(), value: isExpanded)
    }
}
```

---

## Gestures

### Combined Gestures

```swift
struct DraggableCard: View {
    @State private var offset = CGSize.zero
    @State private var isDragging = false

    var body: some View {
        CardView()
            .offset(offset)
            .gesture(
                DragGesture()
                    .onChanged { value in
                        offset = value.translation
                        isDragging = true
                    }
                    .onEnded { value in
                        withAnimation(.spring()) {
                            offset = .zero
                            isDragging = false
                        }
                    }
            )
    }
}
```

### Simultaneous Gestures

```swift
struct ZoomableImage: View {
    @State private var scale: CGFloat = 1.0
    @State private var offset = CGSize.zero

    var body: some View {
        Image("photo")
            .resizable()
            .scaledToFit()
            .scaleEffect(scale)
            .offset(offset)
            .gesture(
                MagnificationGesture()
                    .onChanged { value in
                        scale = value
                    }
                    .simultaneously(with:
                        DragGesture()
                            .onChanged { value in
                                offset = value.translation
                            }
                    )
            )
    }
}
```

---

## Best Practices Summary

1. **Use @Observable** over ObservableObject for iOS 17+
2. **Use NavigationStack** over NavigationView
3. **Break large views** into smaller components
4. **Use lazy containers** for lists
5. **Handle cancellation** in async operations
6. **Support Reduce Motion** for animations
7. **Use .task** for async work, not .onAppear
8. **Extract view modifiers** for reusable styling

---

**See Also:**
- [SKILL.md](./SKILL.md) - Main skill overview
- [ARCHITECTURE-PATTERNS.md](./ARCHITECTURE-PATTERNS.md) - Architecture guide
- [ANTI-PATTERNS.md](./ANTI-PATTERNS.md) - Common mistakes
