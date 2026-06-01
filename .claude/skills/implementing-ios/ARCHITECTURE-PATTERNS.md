# iOS Architecture Patterns

Deep dive into architecture patterns for iOS applications. Choose based on project complexity, team size, and testing requirements.

---

## Architecture Selection Guide

| App Type | Recommended Architecture | Rationale |
|----------|-------------------------|-----------|
| Small/prototype apps | MVC or simple MVVM | Speed and simplicity |
| Standard SwiftUI apps | MVVM with @Observable | Native SwiftUI fit, testable |
| Complex state management | TCA | Exhaustive testing, unidirectional flow |
| Enterprise applications | Clean Architecture | Scalability, maintainability |
| Large teams | VIPER or Clean | Clear separation of concerns |

---

## MVVM with @Observable (iOS 17+)

The recommended default for SwiftUI applications.

### Core Pattern

```swift
// MARK: - Model
struct Item: Identifiable, Codable {
    let id: UUID
    var name: String
    var isCompleted: Bool
}

// MARK: - ViewModel
@Observable
class ItemListViewModel {
    // State
    var items: [Item] = []
    var isLoading = false
    var error: ItemError?
    var searchText = ""

    // Computed
    var filteredItems: [Item] {
        guard !searchText.isEmpty else { return items }
        return items.filter { $0.name.localizedCaseInsensitiveContains(searchText) }
    }

    // Dependencies
    private let service: ItemServiceProtocol

    init(service: ItemServiceProtocol = ItemService()) {
        self.service = service
    }

    // Actions
    func loadItems() async {
        isLoading = true
        error = nil
        defer { isLoading = false }

        do {
            items = try await service.fetchItems()
        } catch let itemError as ItemError {
            error = itemError
        } catch {
            self.error = .unknown(error)
        }
    }

    func addItem(name: String) async {
        let item = Item(id: UUID(), name: name, isCompleted: false)
        items.append(item)

        do {
            try await service.saveItem(item)
        } catch {
            items.removeAll { $0.id == item.id }
            self.error = .saveFailed
        }
    }

    func toggleCompletion(for item: Item) async {
        guard let index = items.firstIndex(where: { $0.id == item.id }) else { return }
        items[index].isCompleted.toggle()

        do {
            try await service.updateItem(items[index])
        } catch {
            items[index].isCompleted.toggle() // Rollback
            error = .updateFailed
        }
    }
}

// MARK: - View
struct ItemListView: View {
    @State private var viewModel: ItemListViewModel
    @State private var showAddSheet = false

    init(viewModel: ItemListViewModel = ItemListViewModel()) {
        _viewModel = State(initialValue: viewModel)
    }

    var body: some View {
        NavigationStack {
            content
                .navigationTitle("Items")
                .toolbar { addButton }
                .searchable(text: $viewModel.searchText)
                .sheet(isPresented: $showAddSheet) { AddItemView(viewModel: viewModel) }
        }
        .task { await viewModel.loadItems() }
    }

    @ViewBuilder
    private var content: some View {
        if viewModel.isLoading {
            ProgressView()
        } else if let error = viewModel.error {
            ErrorView(error: error, retryAction: { Task { await viewModel.loadItems() } })
        } else {
            List(viewModel.filteredItems) { item in
                ItemRow(item: item) {
                    Task { await viewModel.toggleCompletion(for: item) }
                }
            }
        }
    }

    private var addButton: some ToolbarContent {
        ToolbarItem(placement: .primaryAction) {
            Button(action: { showAddSheet = true }) {
                Image(systemName: "plus")
            }
            .accessibilityLabel("Add item")
        }
    }
}
```

### Dependency Injection

```swift
// Protocol for testability
protocol ItemServiceProtocol {
    func fetchItems() async throws -> [Item]
    func saveItem(_ item: Item) async throws
    func updateItem(_ item: Item) async throws
}

// Production implementation
class ItemService: ItemServiceProtocol {
    func fetchItems() async throws -> [Item] {
        // Network call
    }
}

// Test mock
class MockItemService: ItemServiceProtocol {
    var itemsToReturn: [Item] = []
    var shouldThrowError = false

    func fetchItems() async throws -> [Item] {
        if shouldThrowError { throw ItemError.networkError }
        return itemsToReturn
    }
}
```

---

## The Composable Architecture (TCA)

For complex state management with exhaustive testing requirements.

### Core Concepts

1. **State** - Describes the data your feature needs
2. **Action** - Represents all possible user actions and effects
3. **Reducer** - Handles state mutations and returns effects
4. **Store** - Runtime that processes actions and updates state

### Basic Example

```swift
import ComposableArchitecture

// MARK: - Feature
@Reducer
struct ItemListFeature {
    @ObservableState
    struct State: Equatable {
        var items: IdentifiedArrayOf<Item> = []
        var isLoading = false
        @Presents var addItem: AddItemFeature.State?
    }

    enum Action {
        case onAppear
        case itemsLoaded(Result<[Item], Error>)
        case itemTapped(Item)
        case addButtonTapped
        case addItem(PresentationAction<AddItemFeature.Action>)
    }

    @Dependency(\.itemClient) var itemClient

    var body: some ReducerOf<Self> {
        Reduce { state, action in
            switch action {
            case .onAppear:
                state.isLoading = true
                return .run { send in
                    await send(.itemsLoaded(Result {
                        try await itemClient.fetchAll()
                    }))
                }

            case let .itemsLoaded(.success(items)):
                state.isLoading = false
                state.items = IdentifiedArray(uniqueElements: items)
                return .none

            case .itemsLoaded(.failure):
                state.isLoading = false
                // Handle error
                return .none

            case let .itemTapped(item):
                // Navigate to detail
                return .none

            case .addButtonTapped:
                state.addItem = AddItemFeature.State()
                return .none

            case .addItem(.presented(.saved(let item))):
                state.items.append(item)
                return .none

            case .addItem:
                return .none
            }
        }
        .ifLet(\.$addItem, action: \.addItem) {
            AddItemFeature()
        }
    }
}

// MARK: - View
struct ItemListView: View {
    let store: StoreOf<ItemListFeature>

    var body: some View {
        WithViewStore(store, observe: { $0 }) { viewStore in
            NavigationStack {
                List(viewStore.items) { item in
                    Button(action: { viewStore.send(.itemTapped(item)) }) {
                        Text(item.name)
                    }
                }
                .navigationTitle("Items")
                .toolbar {
                    Button(action: { viewStore.send(.addButtonTapped) }) {
                        Image(systemName: "plus")
                    }
                }
            }
            .onAppear { viewStore.send(.onAppear) }
            .sheet(store: store.scope(state: \.$addItem, action: \.addItem)) { store in
                AddItemView(store: store)
            }
        }
    }
}

// MARK: - Testing
@MainActor
func testLoadItems() async {
    let store = TestStore(initialState: ItemListFeature.State()) {
        ItemListFeature()
    } withDependencies: {
        $0.itemClient.fetchAll = { [Item(id: 1, name: "Test")] }
    }

    await store.send(.onAppear) {
        $0.isLoading = true
    }

    await store.receive(\.itemsLoaded.success) {
        $0.isLoading = false
        $0.items = [Item(id: 1, name: "Test")]
    }
}
```

### When to Use TCA

**Pros:**
- Exhaustive testing with `TestStore`
- Unidirectional data flow
- Excellent for complex state
- Great debugging with action logs

**Cons:**
- Steeper learning curve
- More boilerplate for simple features
- Third-party dependency

---

## Clean Architecture

For enterprise applications requiring maximum separation of concerns.

### Layer Structure

```
App/
├── Presentation/        # UI Layer
│   ├── Views/
│   └── ViewModels/
├── Domain/              # Business Logic
│   ├── Entities/
│   ├── UseCases/
│   └── Repositories/    # Protocols only
└── Data/                # Implementation
    ├── Repositories/    # Protocol implementations
    ├── DataSources/
    └── DTOs/
```

### Example Implementation

```swift
// MARK: - Domain Layer

// Entity (pure Swift, no framework dependencies)
struct User: Identifiable {
    let id: UUID
    var name: String
    var email: String
}

// Repository Protocol (defined in Domain)
protocol UserRepositoryProtocol {
    func fetchUsers() async throws -> [User]
    func saveUser(_ user: User) async throws
}

// Use Case
class FetchUsersUseCase {
    private let repository: UserRepositoryProtocol

    init(repository: UserRepositoryProtocol) {
        self.repository = repository
    }

    func execute() async throws -> [User] {
        try await repository.fetchUsers()
    }
}

// MARK: - Data Layer

// DTO (maps to/from API responses)
struct UserDTO: Codable {
    let id: String
    let name: String
    let email: String

    func toDomain() -> User? {
        guard let uuid = UUID(uuidString: id) else { return nil }
        return User(id: uuid, name: name, email: email)
    }
}

// Repository Implementation
class UserRepository: UserRepositoryProtocol {
    private let remoteDataSource: UserRemoteDataSource
    private let localDataSource: UserLocalDataSource

    init(remote: UserRemoteDataSource, local: UserLocalDataSource) {
        self.remoteDataSource = remote
        self.localDataSource = local
    }

    func fetchUsers() async throws -> [User] {
        do {
            let dtos = try await remoteDataSource.fetchUsers()
            let users = dtos.compactMap { $0.toDomain() }
            try await localDataSource.cache(users)
            return users
        } catch {
            return try await localDataSource.getCachedUsers()
        }
    }
}

// MARK: - Presentation Layer

@Observable
class UserListViewModel {
    var users: [User] = []
    var isLoading = false

    private let fetchUsersUseCase: FetchUsersUseCase

    init(fetchUsersUseCase: FetchUsersUseCase) {
        self.fetchUsersUseCase = fetchUsersUseCase
    }

    func loadUsers() async {
        isLoading = true
        defer { isLoading = false }

        do {
            users = try await fetchUsersUseCase.execute()
        } catch {
            // Handle error
        }
    }
}
```

### Dependency Container

```swift
class DependencyContainer {
    static let shared = DependencyContainer()

    // Data Sources
    lazy var userRemoteDataSource = UserRemoteDataSource()
    lazy var userLocalDataSource = UserLocalDataSource()

    // Repositories
    lazy var userRepository: UserRepositoryProtocol = UserRepository(
        remote: userRemoteDataSource,
        local: userLocalDataSource
    )

    // Use Cases
    func makeFetchUsersUseCase() -> FetchUsersUseCase {
        FetchUsersUseCase(repository: userRepository)
    }

    // ViewModels
    func makeUserListViewModel() -> UserListViewModel {
        UserListViewModel(fetchUsersUseCase: makeFetchUsersUseCase())
    }
}
```

---

## Architecture Best Practices

### General Guidelines

1. **Single Responsibility** - Each component has one clear purpose
2. **Dependency Inversion** - Depend on abstractions, not concretions
3. **Testability** - Design for easy unit testing
4. **Separation of Concerns** - UI, business logic, and data are separate

### SwiftUI-Specific

1. **Views should be dumb** - Delegate logic to ViewModels
2. **Use @Observable** (iOS 17+) - More efficient than ObservableObject
3. **Avoid heavy computation in body** - Use computed properties or cache
4. **Break down large views** - Extract subviews for maintainability

### Testing Strategy by Layer

| Layer | Test Type | Focus |
|-------|-----------|-------|
| ViewModel | Unit | State changes, async operations |
| Use Case | Unit | Business rules |
| Repository | Integration | Data flow, caching |
| View | UI/Snapshot | Visual regression |

---

## Migration Guides

### From ObservableObject to @Observable

```swift
// Before (iOS 14+)
class ViewModel: ObservableObject {
    @Published var items: [Item] = []
}

struct MyView: View {
    @StateObject var viewModel = ViewModel()
}

// After (iOS 17+)
@Observable
class ViewModel {
    var items: [Item] = []  // No @Published needed
}

struct MyView: View {
    @State var viewModel = ViewModel()  // @State, not @StateObject
}
```

### From NavigationView to NavigationStack

```swift
// Before (deprecated)
NavigationView {
    List(items) { item in
        NavigationLink(destination: DetailView(item: item)) {
            Text(item.name)
        }
    }
}

// After (iOS 16+)
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
```

---

**See Also:**
- [SKILL.md](./SKILL.md) - Main skill overview
- [SWIFTUI-PATTERNS.md](./SWIFTUI-PATTERNS.md) - SwiftUI deep dive
- [TESTING-PATTERNS.md](./TESTING-PATTERNS.md) - Testing strategies
