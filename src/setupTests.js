// jest-dom adds custom jest matchers for asserting on DOM nodes.
// allows you to do things like:
// expect(element).toHaveTextContent(/react/i)
// learn more: https://github.com/testing-library/jest-dom
import '@testing-library/jest-dom';

class MockIntersectionObserver {
  constructor(callback) {
    this.callback = callback;
    this.elements = new Set();
  }

  observe = (element) => {
    this.elements.add(element);
    this.callback([
      {
        isIntersecting: true,
        target: element,
      },
    ]);
  };

  unobserve = (element) => {
    this.elements.delete(element);
  };

  disconnect = () => {
    this.elements.clear();
  };
}

Object.defineProperty(window, 'IntersectionObserver', {
  writable: true,
  configurable: true,
  value: MockIntersectionObserver,
});
