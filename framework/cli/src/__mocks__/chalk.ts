/**
 * Mock for chalk module
 *
 * Supports chained methods like chalk.green.bold()
 */

type ChalkMock = ((str: string) => string) & {
  [key: string]: ChalkMock;
};

const createChalkMock = (): ChalkMock => {
  const mockFn: ChalkMock = ((str: string) => str) as ChalkMock;

  // Create a proxy that returns the mock for any property access
  return new Proxy(mockFn, {
    get(_target, prop) {
      if (prop === 'call' || prop === 'apply' || prop === 'bind') {
        return mockFn[prop as keyof typeof mockFn];
      }
      // Return a new mock for chaining (e.g., chalk.green.bold)
      return createChalkMock();
    },
  });
};

export default createChalkMock();
