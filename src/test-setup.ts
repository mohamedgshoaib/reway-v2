// jsdom implements neither `window.matchMedia` nor the Web Audio API. Several
// primitives under test read `matchMedia` directly (motion/react's
// `useReducedMotion`, @web-kits/audio's `useSound`), and `useSound` only
// touches `AudioContext` when reduced motion is *off* — reporting `matches:
// true` here keeps both deterministic without faking an entire audio graph.
// Real animation/sound behavior is verified live in the browser (see
// plans/002-component-consistency-pass.md), not by this suite.
Object.defineProperty(globalThis, "matchMedia", {
  value: (query: string) => ({
    addEventListener: () => {},
    addListener: () => {},
    dispatchEvent: () => false,
    matches: true,
    media: query,
    onchange: null,
    removeEventListener: () => {},
    removeListener: () => {},
  }),
  writable: true,
})

class TestResizeObserver implements ResizeObserver {
  disconnect(): void {}
  observe(): void {}
  unobserve(): void {}
}

class TestIntersectionObserver implements IntersectionObserver {
  readonly root = null
  readonly rootMargin = "0px"
  readonly scrollMargin = "0px"
  readonly thresholds = [0]

  disconnect(): void {}
  observe(): void {}
  takeRecords(): IntersectionObserverEntry[] {
    return []
  }
  unobserve(): void {}
}

Object.defineProperty(globalThis, "ResizeObserver", {
  configurable: true,
  value: TestResizeObserver,
  writable: true,
})

Object.defineProperty(globalThis, "IntersectionObserver", {
  configurable: true,
  value: TestIntersectionObserver,
  writable: true,
})

Object.defineProperty(HTMLElement.prototype, "getAnimations", {
  configurable: true,
  value: () => [],
  writable: true,
})

Object.defineProperty(Document.prototype, "getAnimations", {
  configurable: true,
  value: () => [],
  writable: true,
})
