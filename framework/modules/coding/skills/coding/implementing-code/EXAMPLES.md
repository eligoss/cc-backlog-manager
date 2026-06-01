# Coding Implementation Standards - Examples

This file contains detailed code examples referenced from SKILL.md.

## Code Quality Examples

### Good vs Bad Function Design

**Good Example: Small, Focused, Clear Responsibility**
```javascript
function calculateDiscountedPrice(price, discountPercent) {
  if (price <= 0) return 0;
  if (discountPercent <= 0) return price;

  const discount = price * (discountPercent / 100);
  return price - discount;
}

function formatCurrency(amount) {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD'
  }).format(amount);
}

function applyDiscountAndFormat(price, discountPercent) {
  const discountedPrice = calculateDiscountedPrice(price, discountPercent);
  return formatCurrency(discountedPrice);
}
```

**Bad Example: Complex, Multiple Responsibilities**
```javascript
function process(data, type, flag, opts) {
  if (type === 'A') {
    if (flag) {
      // nested logic for case A with flag
      let result = data * 2;
      if (opts.format) {
        return '$' + result.toFixed(2);
      }
      return result;
    } else {
      // nested logic for case A without flag
      let result = data + 10;
      if (opts.format) {
        return '$' + result.toFixed(2);
      }
      return result;
    }
  } else if (type === 'B') {
    // completely different logic
    let result = data / 2;
    if (opts.format) {
      return '$' + result.toFixed(2);
    }
    return result;
  }
}
```

### Good vs Bad Comments

**Good Comments: Explain Why**
```javascript
// Debounce search to avoid overwhelming the API with requests
// while user is still typing. 300ms chosen based on UX testing.
const debouncedSearch = debounce(searchFunction, 300);

// Use exponential backoff to handle transient network failures
// Max 3 retries with delays: 1s, 2s, 4s
async function fetchWithRetry(url, maxRetries = 3) {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      return await fetch(url);
    } catch (error) {
      if (attempt === maxRetries - 1) throw error;
      await delay(Math.pow(2, attempt) * 1000);
    }
  }
}
```

**Bad Comments: State the Obvious**
```javascript
// Increment counter by 1
counter = counter + 1;

// Loop through users
for (let i = 0; i < users.length; i++) {
  // Get user at index i
  const user = users[i];
  // Print user name
  console.log(user.name);
}
```

## Testing Examples

### Unit Test Examples (AAA Pattern)

```javascript
describe('calculateDiscountedPrice', () => {
  test('returns correct discounted price for valid inputs', () => {
    // Arrange
    const price = 100;
    const discount = 20;

    // Act
    const result = calculateDiscountedPrice(price, discount);

    // Assert
    expect(result).toBe(80);
  });

  test('returns 0 for negative price', () => {
    // Arrange
    const price = -50;
    const discount = 20;

    // Act
    const result = calculateDiscountedPrice(price, discount);

    // Assert
    expect(result).toBe(0);
  });

  test('returns original price for 0 discount', () => {
    // Arrange
    const price = 100;
    const discount = 0;

    // Act
    const result = calculateDiscountedPrice(price, discount);

    // Assert
    expect(result).toBe(100);
  });

  test('returns original price for negative discount', () => {
    // Arrange
    const price = 100;
    const discount = -10;

    // Act
    const result = calculateDiscountedPrice(price, discount);

    // Assert
    expect(result).toBe(100);
  });

  test('returns 0 for 100% discount', () => {
    // Arrange
    const price = 100;
    const discount = 100;

    // Act
    const result = calculateDiscountedPrice(price, discount);

    // Assert
    expect(result).toBe(0);
  });
});
```

### Integration Test Example

```javascript
describe('User API Integration', () => {
  beforeEach(async () => {
    // Set up test database
    await setupTestDatabase();
    // Seed test data
    await seedTestUsers([
      { id: 'user-1', email: 'test1@example.com', name: 'Test User 1' },
      { id: 'user-2', email: 'test2@example.com', name: 'Test User 2' }
    ]);
  });

  afterEach(async () => {
    // Clean up
    await cleanupTestDatabase();
  });

  describe('GET /users/:id', () => {
    test('returns user when ID exists', async () => {
      // Arrange
      const userId = 'user-1';

      // Act
      const response = await request(app).get(`/users/${userId}`);

      // Assert
      expect(response.status).toBe(200);
      expect(response.body).toEqual({
        id: 'user-1',
        email: 'test1@example.com',
        name: 'Test User 1'
      });
    });

    test('returns 404 when user not found', async () => {
      // Arrange
      const nonExistentId = 'does-not-exist';

      // Act
      const response = await request(app).get(`/users/${nonExistentId}`);

      // Assert
      expect(response.status).toBe(404);
      expect(response.body).toEqual({
        error: 'User not found'
      });
    });

    test('returns 400 for invalid ID format', async () => {
      // Arrange
      const invalidId = 'invalid-!@#-id';

      // Act
      const response = await request(app).get(`/users/${invalidId}`);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid user ID format');
    });
  });

  describe('POST /users', () => {
    test('creates new user with valid data', async () => {
      // Arrange
      const newUser = {
        email: 'newuser@example.com',
        name: 'New User'
      };

      // Act
      const response = await request(app)
        .post('/users')
        .send(newUser);

      // Assert
      expect(response.status).toBe(201);
      expect(response.body).toMatchObject({
        email: 'newuser@example.com',
        name: 'New User'
      });
      expect(response.body.id).toBeDefined();

      // Verify user exists in database
      const createdUser = await getUserById(response.body.id);
      expect(createdUser).toMatchObject(newUser);
    });

    test('returns 400 for duplicate email', async () => {
      // Arrange
      const duplicateUser = {
        email: 'test1@example.com', // Already exists
        name: 'Duplicate User'
      };

      // Act
      const response = await request(app)
        .post('/users')
        .send(duplicateUser);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Email already exists');
    });

    test('returns 400 for invalid email format', async () => {
      // Arrange
      const invalidUser = {
        email: 'not-an-email',
        name: 'Invalid User'
      };

      // Act
      const response = await request(app)
        .post('/users')
        .send(invalidUser);

      // Assert
      expect(response.status).toBe(400);
      expect(response.body.error).toContain('Invalid email format');
    });
  });
});
```

### Test-Driven Development (TDD) Example

**Scenario: Implementing a simple shopping cart**

```javascript
// Step 1: Write failing test
describe('ShoppingCart', () => {
  test('new cart is empty', () => {
    const cart = new ShoppingCart();
    expect(cart.getItemCount()).toBe(0);
  });
});

// Step 2: Write minimal code to pass
class ShoppingCart {
  constructor() {
    this.items = [];
  }

  getItemCount() {
    return this.items.length;
  }
}

// Step 3: Next test
test('can add item to cart', () => {
  const cart = new ShoppingCart();
  cart.addItem({ id: '1', name: 'Book', price: 10 });
  expect(cart.getItemCount()).toBe(1);
});

// Step 4: Implement
class ShoppingCart {
  constructor() {
    this.items = [];
  }

  addItem(item) {
    this.items.push(item);
  }

  getItemCount() {
    return this.items.length;
  }
}

// Step 5: Next test - calculate total
test('calculates total price correctly', () => {
  const cart = new ShoppingCart();
  cart.addItem({ id: '1', name: 'Book', price: 10 });
  cart.addItem({ id: '2', name: 'Pen', price: 5 });
  expect(cart.getTotal()).toBe(15);
});

// Step 6: Implement
class ShoppingCart {
  constructor() {
    this.items = [];
  }

  addItem(item) {
    this.items.push(item);
  }

  getItemCount() {
    return this.items.length;
  }

  getTotal() {
    return this.items.reduce((sum, item) => sum + item.price, 0);
  }
}

// Continue with more tests...
```

## Refactoring Examples

### Extract Method Refactoring

**Before:**
```javascript
function processOrder(order) {
  // Validate order
  if (!order.items || order.items.length === 0) {
    throw new Error('Order must have items');
  }
  if (!order.customer || !order.customer.email) {
    throw new Error('Order must have customer email');
  }

  // Calculate total
  let total = 0;
  for (const item of order.items) {
    total += item.price * item.quantity;
  }
  if (order.discountCode) {
    total = total * 0.9; // 10% discount
  }

  // Send confirmation
  const emailBody = `Thank you for your order!\n\nTotal: $${total}\n\nItems:\n`;
  for (const item of order.items) {
    emailBody += `- ${item.name} x${item.quantity}\n`;
  }
  sendEmail(order.customer.email, 'Order Confirmation', emailBody);

  return { orderId: generateId(), total };
}
```

**After: Extracted Methods**
```javascript
function processOrder(order) {
  validateOrder(order);
  const total = calculateOrderTotal(order);
  sendOrderConfirmation(order, total);
  return { orderId: generateId(), total };
}

function validateOrder(order) {
  if (!order.items || order.items.length === 0) {
    throw new Error('Order must have items');
  }
  if (!order.customer || !order.customer.email) {
    throw new Error('Order must have customer email');
  }
}

function calculateOrderTotal(order) {
  let total = order.items.reduce(
    (sum, item) => sum + item.price * item.quantity,
    0
  );

  if (order.discountCode) {
    total = applyDiscount(total, order.discountCode);
  }

  return total;
}

function applyDiscount(total, discountCode) {
  // Extensible for different discount codes
  const discounts = {
    'SAVE10': 0.9,
    'SAVE20': 0.8
  };
  const multiplier = discounts[discountCode] || 1;
  return total * multiplier;
}

function sendOrderConfirmation(order, total) {
  const emailBody = formatOrderEmail(order, total);
  sendEmail(order.customer.email, 'Order Confirmation', emailBody);
}

function formatOrderEmail(order, total) {
  const itemsList = order.items
    .map(item => `- ${item.name} x${item.quantity}`)
    .join('\n');

  return `Thank you for your order!\n\nTotal: $${total}\n\nItems:\n${itemsList}`;
}
```

### Simplify Conditionals Refactoring

**Before:**
```javascript
function getUserPermissions(user) {
  if (user.role === 'admin') {
    return ['read', 'write', 'delete', 'admin'];
  } else {
    if (user.role === 'editor') {
      return ['read', 'write'];
    } else {
      if (user.role === 'viewer') {
        return ['read'];
      } else {
        return [];
      }
    }
  }
}
```

**After: Early Returns**
```javascript
function getUserPermissions(user) {
  if (user.role === 'admin') {
    return ['read', 'write', 'delete', 'admin'];
  }

  if (user.role === 'editor') {
    return ['read', 'write'];
  }

  if (user.role === 'viewer') {
    return ['read'];
  }

  return [];
}
```

**Better: Configuration Object**
```javascript
const ROLE_PERMISSIONS = {
  admin: ['read', 'write', 'delete', 'admin'],
  editor: ['read', 'write'],
  viewer: ['read']
};

function getUserPermissions(user) {
  return ROLE_PERMISSIONS[user.role] || [];
}
```

## Code Review Examples

### Good Review Comments

```
**Functionality:**
Consider adding validation for negative quantities. What should happen
if quantity is -1? Should we throw an error or clamp to 0?

**Code Quality:**
Nice use of the builder pattern here! One suggestion: consider extracting
the validation logic into a separate `validateProductData()` method to
make this method easier to test.

**Performance:**
This loop runs for every item in the cart. For carts with many items,
consider caching the total and updating it incrementally when items
are added/removed instead of recalculating each time.

**Testing:**
Great test coverage! Could we also add a test for the edge case where
two items with the same ID are added? Should they merge or remain separate?

**Security:**
⚠️ This endpoint doesn't validate that the user owns the order before
allowing deletion. We should add an authorization check here.

**Appreciation:**
The error handling in this function is really well done - clear error
messages that will be helpful for debugging. Nice work!
```

### Bad Review Comments

```
This is wrong.

Use a different pattern.

Why did you do it this way?

I don't like this.

Change this to use [my preferred library].

This won't work. (without explanation)

Too many lines. (without specific guidance)
```

---

**Version:** 1.0
**Created:** 2025-12-24
**Module:** coding
