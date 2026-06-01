# UIKit Patterns

Modern UIKit patterns for iOS development. Use UIKit when SwiftUI doesn't meet requirements or for legacy projects.

---

## When to Use UIKit

- Complex custom layouts not expressible in SwiftUI
- Heavy use of UIKit-only components
- Legacy app maintenance
- Performance-critical list rendering
- Complex gesture handling
- Custom view controller transitions

---

## Modern Collection Views

### Diffable Data Sources

Type-safe, crash-free data management for collection views.

```swift
// MARK: - Setup
class ItemListViewController: UIViewController {
    enum Section { case main }

    typealias DataSource = UICollectionViewDiffableDataSource<Section, Item>
    typealias Snapshot = NSDiffableDataSourceSnapshot<Section, Item>

    private var collectionView: UICollectionView!
    private var dataSource: DataSource!

    override func viewDidLoad() {
        super.viewDidLoad()
        configureCollectionView()
        configureDataSource()
    }

    private func configureCollectionView() {
        collectionView = UICollectionView(
            frame: view.bounds,
            collectionViewLayout: createLayout()
        )
        collectionView.autoresizingMask = [.flexibleWidth, .flexibleHeight]
        view.addSubview(collectionView)
    }

    private func configureDataSource() {
        // Cell Registration (iOS 14+)
        let cellRegistration = UICollectionView.CellRegistration<UICollectionViewListCell, Item> {
            cell, indexPath, item in
            var config = cell.defaultContentConfiguration()
            config.text = item.name
            config.secondaryText = item.description
            cell.contentConfiguration = config
            cell.accessories = [.disclosureIndicator()]
        }

        dataSource = DataSource(collectionView: collectionView) {
            collectionView, indexPath, item in
            collectionView.dequeueConfiguredReusableCell(
                using: cellRegistration,
                for: indexPath,
                item: item
            )
        }
    }

    // MARK: - Apply Snapshot
    func updateItems(_ items: [Item], animated: Bool = true) {
        var snapshot = Snapshot()
        snapshot.appendSections([.main])
        snapshot.appendItems(items)
        dataSource.apply(snapshot, animatingDifferences: animated)
    }
}
```

### Compositional Layout

Flexible, powerful layouts with minimal code.

```swift
// MARK: - List Layout
private func createListLayout() -> UICollectionViewLayout {
    var config = UICollectionLayoutListConfiguration(appearance: .insetGrouped)
    config.headerMode = .supplementary
    config.trailingSwipeActionsConfigurationProvider = { indexPath in
        let deleteAction = UIContextualAction(style: .destructive, title: "Delete") {
            [weak self] _, _, completion in
            self?.deleteItem(at: indexPath)
            completion(true)
        }
        return UISwipeActionsConfiguration(actions: [deleteAction])
    }
    return UICollectionViewCompositionalLayout.list(using: config)
}

// MARK: - Grid Layout
private func createGridLayout() -> UICollectionViewLayout {
    let itemSize = NSCollectionLayoutSize(
        widthDimension: .fractionalWidth(0.5),
        heightDimension: .fractionalHeight(1.0)
    )
    let item = NSCollectionLayoutItem(layoutSize: itemSize)
    item.contentInsets = NSDirectionalEdgeInsets(top: 8, leading: 8, bottom: 8, trailing: 8)

    let groupSize = NSCollectionLayoutSize(
        widthDimension: .fractionalWidth(1.0),
        heightDimension: .fractionalWidth(0.5)
    )
    let group = NSCollectionLayoutGroup.horizontal(layoutSize: groupSize, subitems: [item])

    let section = NSCollectionLayoutSection(group: group)
    section.contentInsets = NSDirectionalEdgeInsets(top: 16, leading: 16, bottom: 16, trailing: 16)

    return UICollectionViewCompositionalLayout(section: section)
}

// MARK: - Orthogonal Scrolling (Horizontal in Vertical)
private func createCarouselLayout() -> UICollectionViewLayout {
    let itemSize = NSCollectionLayoutSize(
        widthDimension: .fractionalWidth(0.85),
        heightDimension: .fractionalHeight(1.0)
    )
    let item = NSCollectionLayoutItem(layoutSize: itemSize)

    let groupSize = NSCollectionLayoutSize(
        widthDimension: .fractionalWidth(0.85),
        heightDimension: .absolute(200)
    )
    let group = NSCollectionLayoutGroup.horizontal(layoutSize: groupSize, subitems: [item])

    let section = NSCollectionLayoutSection(group: group)
    section.orthogonalScrollingBehavior = .groupPagingCentered
    section.interGroupSpacing = 16

    return UICollectionViewCompositionalLayout(section: section)
}
```

### Multiple Sections

```swift
enum Section: Int, CaseIterable {
    case featured
    case categories
    case items
}

private func createMultiSectionLayout() -> UICollectionViewLayout {
    UICollectionViewCompositionalLayout { sectionIndex, environment in
        guard let section = Section(rawValue: sectionIndex) else { return nil }

        switch section {
        case .featured:
            return self.createFeaturedSection()
        case .categories:
            return self.createCategoriesSection()
        case .items:
            return self.createItemsSection()
        }
    }
}
```

---

## Cell Configuration

### Content Configuration (iOS 14+)

```swift
// MARK: - Standard Configurations
let cellRegistration = UICollectionView.CellRegistration<UICollectionViewListCell, Item> {
    cell, indexPath, item in

    var config = cell.defaultContentConfiguration()
    config.text = item.name
    config.secondaryText = item.subtitle
    config.image = UIImage(systemName: item.iconName)

    // Customize appearance
    config.textProperties.font = .preferredFont(forTextStyle: .headline)
    config.secondaryTextProperties.color = .secondaryLabel

    cell.contentConfiguration = config
}

// MARK: - Custom Content Configuration
struct ItemContentConfiguration: UIContentConfiguration {
    var item: Item?

    func makeContentView() -> UIView & UIContentView {
        ItemContentView(configuration: self)
    }

    func updated(for state: UIConfigurationState) -> ItemContentConfiguration {
        var updated = self
        // Adjust for state (highlighted, selected, etc.)
        return updated
    }
}

class ItemContentView: UIView, UIContentView {
    var configuration: UIContentConfiguration {
        didSet { apply(configuration: configuration) }
    }

    private let titleLabel = UILabel()
    private let iconView = UIImageView()

    init(configuration: ItemContentConfiguration) {
        self.configuration = configuration
        super.init(frame: .zero)
        setupViews()
        apply(configuration: configuration)
    }

    private func setupViews() {
        // Layout setup
    }

    private func apply(configuration: UIContentConfiguration) {
        guard let config = configuration as? ItemContentConfiguration else { return }
        titleLabel.text = config.item?.name
    }
}
```

---

## View Controller Lifecycle

### Lifecycle Methods

```swift
class DetailViewController: UIViewController {

    // MARK: - Lifecycle

    override func loadView() {
        // Only for programmatic view creation
        // Don't call super.loadView()
        view = CustomView()
    }

    override func viewDidLoad() {
        super.viewDidLoad()
        // One-time setup
        // Views are loaded but not sized
        setupNavigationBar()
        setupSubviews()
        configureDataSource()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        // Called every time view appears
        // Update UI with latest data
        refreshData()
    }

    override func viewDidAppear(_ animated: Bool) {
        super.viewDidAppear(animated)
        // View is visible and interactive
        // Start animations, analytics
        startAnimations()
    }

    override func viewWillDisappear(_ animated: Bool) {
        super.viewWillDisappear(animated)
        // Clean up before leaving
        stopAnimations()
    }

    override func viewDidDisappear(_ animated: Bool) {
        super.viewDidDisappear(animated)
        // View is no longer visible
        pauseExpensiveOperations()
    }

    // MARK: - Trait Changes

    override func traitCollectionDidChange(_ previousTraitCollection: UITraitCollection?) {
        super.traitCollectionDidChange(previousTraitCollection)
        // Respond to trait changes (size class, dark mode, etc.)
        if traitCollection.hasDifferentColorAppearance(comparedTo: previousTraitCollection) {
            updateColors()
        }
    }
}
```

---

## Programmatic UI

### Auto Layout DSL

```swift
class ProfileView: UIView {
    private let avatarImageView = UIImageView()
    private let nameLabel = UILabel()
    private let bioLabel = UILabel()
    private let stackView = UIStackView()

    override init(frame: CGRect) {
        super.init(frame: frame)
        setupViews()
        setupConstraints()
    }

    private func setupViews() {
        avatarImageView.translatesAutoresizingMaskIntoConstraints = false
        avatarImageView.contentMode = .scaleAspectFill
        avatarImageView.clipsToBounds = true
        avatarImageView.layer.cornerRadius = 40

        nameLabel.translatesAutoresizingMaskIntoConstraints = false
        nameLabel.font = .preferredFont(forTextStyle: .headline)
        nameLabel.adjustsFontForContentSizeCategory = true

        bioLabel.translatesAutoresizingMaskIntoConstraints = false
        bioLabel.font = .preferredFont(forTextStyle: .body)
        bioLabel.textColor = .secondaryLabel
        bioLabel.numberOfLines = 0
        bioLabel.adjustsFontForContentSizeCategory = true

        stackView.translatesAutoresizingMaskIntoConstraints = false
        stackView.axis = .vertical
        stackView.spacing = 8
        stackView.addArrangedSubview(nameLabel)
        stackView.addArrangedSubview(bioLabel)

        addSubview(avatarImageView)
        addSubview(stackView)
    }

    private func setupConstraints() {
        NSLayoutConstraint.activate([
            avatarImageView.topAnchor.constraint(equalTo: topAnchor, constant: 16),
            avatarImageView.leadingAnchor.constraint(equalTo: leadingAnchor, constant: 16),
            avatarImageView.widthAnchor.constraint(equalToConstant: 80),
            avatarImageView.heightAnchor.constraint(equalToConstant: 80),

            stackView.topAnchor.constraint(equalTo: avatarImageView.topAnchor),
            stackView.leadingAnchor.constraint(equalTo: avatarImageView.trailingAnchor, constant: 16),
            stackView.trailingAnchor.constraint(equalTo: trailingAnchor, constant: -16),
            stackView.bottomAnchor.constraint(lessThanOrEqualTo: bottomAnchor, constant: -16)
        ])
    }
}
```

### Stack Views

```swift
class FormView: UIView {
    private lazy var stackView: UIStackView = {
        let stack = UIStackView()
        stack.axis = .vertical
        stack.spacing = 16
        stack.alignment = .fill
        stack.distribution = .fill
        stack.translatesAutoresizingMaskIntoConstraints = false
        return stack
    }()

    func addField(_ field: UIView) {
        stackView.addArrangedSubview(field)
    }

    func addSpacing(_ spacing: CGFloat) {
        let spacer = UIView()
        spacer.heightAnchor.constraint(equalToConstant: spacing).isActive = true
        stackView.addArrangedSubview(spacer)
    }
}
```

---

## Coordinator Pattern

```swift
protocol Coordinator: AnyObject {
    var childCoordinators: [Coordinator] { get set }
    var navigationController: UINavigationController { get }
    func start()
}

class AppCoordinator: Coordinator {
    var childCoordinators: [Coordinator] = []
    var navigationController: UINavigationController

    init(navigationController: UINavigationController) {
        self.navigationController = navigationController
    }

    func start() {
        let homeVC = HomeViewController()
        homeVC.coordinator = self
        navigationController.pushViewController(homeVC, animated: false)
    }

    func showDetail(for item: Item) {
        let detailVC = DetailViewController(item: item)
        detailVC.coordinator = self
        navigationController.pushViewController(detailVC, animated: true)
    }

    func showSettings() {
        let settingsCoordinator = SettingsCoordinator(navigationController: navigationController)
        childCoordinators.append(settingsCoordinator)
        settingsCoordinator.start()
    }
}
```

---

## Accessibility

```swift
class AccessibleButton: UIButton {
    override init(frame: CGRect) {
        super.init(frame: frame)
        setupAccessibility()
    }

    private func setupAccessibility() {
        isAccessibilityElement = true
        accessibilityTraits = .button
        accessibilityLabel = "Action button"
        accessibilityHint = "Double-tap to perform action"
    }

    func updateAccessibility(label: String, hint: String? = nil) {
        accessibilityLabel = label
        accessibilityHint = hint
    }
}

// Dynamic Type Support
label.font = .preferredFont(forTextStyle: .body)
label.adjustsFontForContentSizeCategory = true
```

---

## Best Practices

1. **Use Diffable Data Sources** - Type-safe, no crashes
2. **Use Compositional Layout** - Flexible, powerful
3. **Use Cell Registration** - Type-safe cell configuration
4. **Use Content Configuration** - Modern cell content
5. **Programmatic UI** - Better version control, no merge conflicts
6. **Coordinator Pattern** - Decouple navigation
7. **Support Dynamic Type** - Accessibility requirement
8. **Use semantic colors** - Dark Mode support

---

**See Also:**
- [SKILL.md](./SKILL.md) - Main skill overview
- [SWIFTUI-PATTERNS.md](./SWIFTUI-PATTERNS.md) - SwiftUI patterns
- [HIG-COMPLIANCE.md](./HIG-COMPLIANCE.md) - Design guidelines
