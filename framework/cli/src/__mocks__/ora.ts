/**
 * Mock for ora spinner library
 * Used in tests to avoid ESM import issues
 */

interface SpinnerInstance {
  start: (text?: string) => SpinnerInstance;
  stop: () => SpinnerInstance;
  succeed: (text?: string) => SpinnerInstance;
  fail: (text?: string) => SpinnerInstance;
  warn: (text?: string) => SpinnerInstance;
  info: (text?: string) => SpinnerInstance;
  text: string;
  color: string;
  isSpinning: boolean;
}

function createSpinnerInstance(text?: string): SpinnerInstance {
  const instance: SpinnerInstance = {
    text: text || '',
    color: 'cyan',
    isSpinning: false,
    start(newText?: string) {
      if (newText) this.text = newText;
      this.isSpinning = true;
      return this;
    },
    stop() {
      this.isSpinning = false;
      return this;
    },
    succeed(newText?: string) {
      if (newText) this.text = newText;
      this.isSpinning = false;
      return this;
    },
    fail(newText?: string) {
      if (newText) this.text = newText;
      this.isSpinning = false;
      return this;
    },
    warn(newText?: string) {
      if (newText) this.text = newText;
      this.isSpinning = false;
      return this;
    },
    info(newText?: string) {
      if (newText) this.text = newText;
      this.isSpinning = false;
      return this;
    },
  };
  return instance;
}

function ora(options?: string | { text?: string }): SpinnerInstance {
  const text = typeof options === 'string' ? options : options?.text;
  return createSpinnerInstance(text);
}

export default ora;
