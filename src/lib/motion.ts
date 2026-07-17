/**
 * Mirrors the `--ease-out-strong` token in src/styles.css. Motion needs a
 * JS-native easing value, not a CSS custom property reference.
 */
export const easeOutStrong = [0.23, 1, 0.32, 1] as const
