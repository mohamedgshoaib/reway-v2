// jsdom implements neither `window.matchMedia` nor the Web Audio API. Several
// primitives under test read `matchMedia` directly (motion/react's
// `useReducedMotion`, @web-kits/audio's `useSound`), and `useSound` only
// touches `AudioContext` when reduced motion is *off* — reporting `matches:
// true` here keeps both deterministic without faking an entire audio graph.
// Real animation/sound behavior is verified live in the browser (see
// plans/002-component-consistency-pass.md), not by this suite.
Object.defineProperty(window, "matchMedia", {
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
