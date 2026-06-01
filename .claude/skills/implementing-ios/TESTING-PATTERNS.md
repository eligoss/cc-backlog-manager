# iOS Testing Patterns

Comprehensive testing patterns for iOS applications including unit tests, UI tests, and snapshot tests.

---

## Test Pyramid

Distribute tests for optimal coverage and speed:

```
        /\
       /UI\        <- Few: Critical paths only
      /----\
     /Integ.\      <- Some: Data layer, networking
    /--------\
   /  Unit    \    <- Many: ViewModels, business logic
  /-----------\
```

| Level | Quantity | Speed | Scope |
|-------|----------|-------|-------|
| Unit | Many | Fast | ViewModels, services, utilities |
| Integration | Some | Medium | Data layer, API mocking |
| UI | Few | Slow | Critical user flows |
| Snapshot | As needed | Fast | Visual regression |

---

## Unit Testing with XCTest

### ViewModel Testing

```swift
import XCTest
@testable import MyApp

@MainActor
final class ItemListViewModelTests: XCTestCase {
    var sut: ItemListViewModel!
    var mockService: MockItemService!

    override func setUp() {
        super.setUp()
        mockService = MockItemService()
        sut = ItemListViewModel(service: mockService)
    }

    override func tearDown() {
        sut = nil
        mockService = nil
        super.tearDown()
    }

    // MARK: - Load Items

    func test_loadItems_success_updatesItems() async {
        // Given
        let expectedItems = [Item(id: UUID(), name: "Test")]
        mockService.itemsToReturn = expectedItems

        // When
        await sut.loadItems()

        // Then
        XCTAssertEqual(sut.items, expectedItems)
        XCTAssertFalse(sut.isLoading)
        XCTAssertNil(sut.error)
    }

    func test_loadItems_failure_setsError() async {
        // Given
        mockService.shouldThrowError = true

        // When
        await sut.loadItems()

        // Then
        XCTAssertTrue(sut.items.isEmpty)
        XCTAssertFalse(sut.isLoading)
        XCTAssertNotNil(sut.error)
    }

    func test_loadItems_setsLoadingState() async {
        // Given
        mockService.delay = 0.1

        // When
        let loadTask = Task { await sut.loadItems() }

        // Then - Loading state
        try? await Task.sleep(for: .milliseconds(50))
        XCTAssertTrue(sut.isLoading)

        // Wait for completion
        await loadTask.value
        XCTAssertFalse(sut.isLoading)
    }

    // MARK: - Filter Items

    func test_filterItems_matchingQuery_returnsFiltered() {
        // Given
        sut.items = [
            Item(id: UUID(), name: "Apple"),
            Item(id: UUID(), name: "Banana"),
            Item(id: UUID(), name: "Apricot")
        ]

        // When
        sut.searchText = "Ap"

        // Then
        XCTAssertEqual(sut.filteredItems.count, 2)
        XCTAssertTrue(sut.filteredItems.allSatisfy { $0.name.contains("Ap") })
    }

    func test_filterItems_emptyQuery_returnsAll() {
        // Given
        sut.items = [Item(id: UUID(), name: "Test")]

        // When
        sut.searchText = ""

        // Then
        XCTAssertEqual(sut.filteredItems.count, 1)
    }
}

// MARK: - Mock Service

class MockItemService: ItemServiceProtocol {
    var itemsToReturn: [Item] = []
    var shouldThrowError = false
    var delay: TimeInterval = 0

    func fetchItems() async throws -> [Item] {
        if delay > 0 {
            try? await Task.sleep(for: .seconds(delay))
        }
        if shouldThrowError {
            throw ItemError.networkError
        }
        return itemsToReturn
    }
}
```

### Testing Async Code

```swift
final class AsyncServiceTests: XCTestCase {

    func test_asyncOperation_completesSuccessfully() async throws {
        // Given
        let service = DataService()

        // When
        let result = try await service.fetchData()

        // Then
        XCTAssertFalse(result.isEmpty)
    }

    func test_asyncOperation_throwsOnError() async {
        // Given
        let service = DataService(shouldFail: true)

        // When/Then
        do {
            _ = try await service.fetchData()
            XCTFail("Expected error to be thrown")
        } catch {
            XCTAssertEqual(error as? DataError, .networkError)
        }
    }

    func test_asyncOperation_withExpectation() {
        // For callbacks or publishers
        let expectation = expectation(description: "Data loaded")
        var receivedData: [Item]?

        service.fetchData { result in
            receivedData = try? result.get()
            expectation.fulfill()
        }

        waitForExpectations(timeout: 5)
        XCTAssertNotNil(receivedData)
    }

    func test_asyncOperation_cancellation() async {
        // Given
        let task = Task {
            try await service.longRunningOperation()
        }

        // When
        task.cancel()

        // Then
        do {
            _ = try await task.value
            XCTFail("Expected cancellation error")
        } catch {
            XCTAssertTrue(Task.isCancelled)
        }
    }
}
```

### Testing @Observable ViewModels

```swift
@MainActor
final class ObservableViewModelTests: XCTestCase {

    func test_stateChange_triggersUpdate() async {
        // Given
        let viewModel = CounterViewModel()
        XCTAssertEqual(viewModel.count, 0)

        // When
        viewModel.increment()

        // Then
        XCTAssertEqual(viewModel.count, 1)
    }

    func test_asyncStateChange() async {
        // Given
        let viewModel = DataViewModel(service: MockService())

        // When
        await viewModel.loadData()

        // Then
        XCTAssertEqual(viewModel.state, .loaded(["Test"]))
    }
}
```

---

## UI Testing with XCUITest

### Basic UI Tests

```swift
import XCTest

final class ItemListUITests: XCTestCase {
    var app: XCUIApplication!

    override func setUp() {
        super.setUp()
        continueAfterFailure = false
        app = XCUIApplication()
        app.launchArguments = ["UI_TESTING"]
        app.launch()
    }

    override func tearDown() {
        app = nil
        super.tearDown()
    }

    // MARK: - List Tests

    func test_itemList_displaysItems() {
        // Given - Items loaded from mock data

        // When
        let list = app.collectionViews["itemList"]

        // Then
        XCTAssertTrue(list.waitForExistence(timeout: 5))
        XCTAssertGreaterThan(list.cells.count, 0)
    }

    func test_tapItem_navigatesToDetail() {
        // Given
        let list = app.collectionViews["itemList"]
        XCTAssertTrue(list.waitForExistence(timeout: 5))

        // When
        list.cells.firstMatch.tap()

        // Then
        let detailTitle = app.navigationBars["Item Detail"]
        XCTAssertTrue(detailTitle.waitForExistence(timeout: 2))
    }

    // MARK: - Add Item Tests

    func test_addItem_showsInList() {
        // Given
        let addButton = app.buttons["addItem"]
        XCTAssertTrue(addButton.waitForExistence(timeout: 5))

        // When
        addButton.tap()

        let nameField = app.textFields["itemName"]
        XCTAssertTrue(nameField.waitForExistence(timeout: 2))
        nameField.tap()
        nameField.typeText("New Test Item")

        app.buttons["save"].tap()

        // Then
        let newItem = app.staticTexts["New Test Item"]
        XCTAssertTrue(newItem.waitForExistence(timeout: 2))
    }

    // MARK: - Delete Item Tests

    func test_swipeToDelete_removesItem() {
        // Given
        let list = app.collectionViews["itemList"]
        XCTAssertTrue(list.waitForExistence(timeout: 5))
        let initialCount = list.cells.count

        // When
        list.cells.firstMatch.swipeLeft()
        app.buttons["Delete"].tap()

        // Then
        XCTAssertEqual(list.cells.count, initialCount - 1)
    }
}
```

### Accessibility Identifiers

```swift
// SwiftUI
Button("Add") { }
    .accessibilityIdentifier("addItem")

List {
    ForEach(items) { item in
        ItemRow(item: item)
            .accessibilityIdentifier("item_\(item.id)")
    }
}
.accessibilityIdentifier("itemList")

// UIKit
button.accessibilityIdentifier = "addItem"
collectionView.accessibilityIdentifier = "itemList"
```

### Accessibility Testing

```swift
func test_voiceOver_readsElements() {
    // Given
    app.launch()

    // When
    let playButton = app.buttons["Play video"]

    // Then
    XCTAssertTrue(playButton.exists)
    XCTAssertEqual(playButton.label, "Play video")

    // Check accessibility traits
    XCTAssertTrue(playButton.isEnabled)
}

func test_dynamicType_layoutsCorrectly() {
    // Launch with accessibility size
    app.launchArguments = ["-UIPreferredContentSizeCategoryName", "UICTContentSizeCategoryAccessibilityXXXL"]
    app.launch()

    // Verify layout doesn't break
    let title = app.staticTexts["mainTitle"]
    XCTAssertTrue(title.exists)
    XCTAssertTrue(title.frame.height > 0)
}
```

---

## Snapshot Testing

### Setup with swift-snapshot-testing

```swift
import XCTest
import SnapshotTesting
@testable import MyApp

final class ItemRowSnapshotTests: XCTestCase {

    override class func setUp() {
        super.setUp()
        // Uncomment to record new snapshots
        // isRecording = true
    }

    func test_itemRow_standard() {
        let view = ItemRow(item: .sample)
            .frame(width: 375)

        assertSnapshot(of: view, as: .image)
    }

    func test_itemRow_completed() {
        let view = ItemRow(item: .sampleCompleted)
            .frame(width: 375)

        assertSnapshot(of: view, as: .image)
    }

    func test_itemRow_darkMode() {
        let view = ItemRow(item: .sample)
            .frame(width: 375)
            .environment(\.colorScheme, .dark)

        assertSnapshot(of: view, as: .image)
    }

    func test_itemRow_accessibility() {
        let view = ItemRow(item: .sample)
            .frame(width: 375)
            .environment(\.sizeCategory, .accessibilityExtraLarge)

        assertSnapshot(of: view, as: .image)
    }

    func test_itemRow_allDevices() {
        let view = ItemRow(item: .sample)

        assertSnapshot(of: view, as: .image(layout: .device(config: .iPhone13)))
        assertSnapshot(of: view, as: .image(layout: .device(config: .iPhone13Mini)))
        assertSnapshot(of: view, as: .image(layout: .device(config: .iPhoneSe)))
    }
}

// Sample data
extension Item {
    static var sample: Item {
        Item(id: UUID(), name: "Test Item", isCompleted: false)
    }

    static var sampleCompleted: Item {
        Item(id: UUID(), name: "Completed Item", isCompleted: true)
    }
}
```

### UIKit Snapshot Tests

```swift
func test_viewController_standardLayout() {
    let vc = ItemListViewController()
    vc.viewModel = ItemListViewModel(items: .sampleItems)

    assertSnapshot(of: vc, as: .image(on: .iPhone13))
}
```

---

## Test Data Factories

```swift
// MARK: - Factories

enum TestFactory {
    static func makeItem(
        id: UUID = UUID(),
        name: String = "Test Item",
        isCompleted: Bool = false
    ) -> Item {
        Item(id: id, name: name, isCompleted: isCompleted)
    }

    static func makeItems(count: Int) -> [Item] {
        (0..<count).map { i in
            makeItem(name: "Item \(i)")
        }
    }

    static func makeUser(
        id: UUID = UUID(),
        name: String = "Test User",
        email: String = "test@example.com"
    ) -> User {
        User(id: id, name: name, email: email)
    }
}

// Usage
let items = TestFactory.makeItems(count: 10)
let user = TestFactory.makeUser(name: "John")
```

---

## Mocking Patterns

### Protocol-Based Mocking

```swift
// Protocol
protocol NetworkClientProtocol {
    func fetch<T: Decodable>(_ endpoint: Endpoint) async throws -> T
}

// Production
class NetworkClient: NetworkClientProtocol {
    func fetch<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        // Real implementation
    }
}

// Mock
class MockNetworkClient: NetworkClientProtocol {
    var mockData: Any?
    var mockError: Error?
    var fetchCallCount = 0

    func fetch<T: Decodable>(_ endpoint: Endpoint) async throws -> T {
        fetchCallCount += 1
        if let error = mockError { throw error }
        guard let data = mockData as? T else {
            throw MockError.invalidData
        }
        return data
    }
}
```

### URL Protocol Mocking

```swift
class MockURLProtocol: URLProtocol {
    static var mockResponses: [URL: (Data, HTTPURLResponse)] = [:]

    override class func canInit(with request: URLRequest) -> Bool {
        true
    }

    override class func canonicalRequest(for request: URLRequest) -> URLRequest {
        request
    }

    override func startLoading() {
        guard let url = request.url,
              let (data, response) = Self.mockResponses[url] else {
            client?.urlProtocol(self, didFailWithError: URLError(.badURL))
            return
        }

        client?.urlProtocol(self, didReceive: response, cacheStoragePolicy: .notAllowed)
        client?.urlProtocol(self, didLoad: data)
        client?.urlProtocolDidFinishLoading(self)
    }

    override func stopLoading() {}
}

// Setup in tests
let config = URLSessionConfiguration.ephemeral
config.protocolClasses = [MockURLProtocol.self]
let session = URLSession(configuration: config)
```

---

## Test Organization

### Naming Conventions

```swift
// Pattern: test_methodName_scenario_expectedResult

func test_loadItems_success_updatesItems() { }
func test_loadItems_failure_setsError() { }
func test_addItem_validInput_appendsToList() { }
func test_addItem_emptyName_showsError() { }
```

### Test File Structure

```
Tests/
├── UnitTests/
│   ├── ViewModels/
│   │   ├── ItemListViewModelTests.swift
│   │   └── ItemDetailViewModelTests.swift
│   ├── Services/
│   │   └── ItemServiceTests.swift
│   └── Mocks/
│       └── MockItemService.swift
├── IntegrationTests/
│   └── DataLayerTests.swift
├── UITests/
│   ├── ItemListUITests.swift
│   └── Page Objects/
│       └── ItemListPage.swift
└── SnapshotTests/
    └── ItemRowSnapshotTests.swift
```

---

## Best Practices

1. **Fast tests** - Unit tests should run in milliseconds
2. **Isolated tests** - No dependencies between tests
3. **Deterministic** - Same result every time
4. **Readable** - Clear Given/When/Then structure
5. **Maintainable** - Use factories and helpers
6. **CI integration** - Run on every PR

---

**See Also:**
- [SKILL.md](./SKILL.md) - Main skill overview
- [ARCHITECTURE-PATTERNS.md](./ARCHITECTURE-PATTERNS.md) - Testable architecture
- [SWIFTUI-PATTERNS.md](./SWIFTUI-PATTERNS.md) - SwiftUI testing
