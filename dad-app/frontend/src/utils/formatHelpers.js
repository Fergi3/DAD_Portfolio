// formatHelpers.js
// Small, reusable utility functions for formatting display text.
// None of these functions have side effects or dependencies.

/** Returns a color string for a given confidence level label. */
export function confidenceColor(confidence, colors) {
  if (confidence === 'High') return colors.success;
  if (confidence === 'Low')  return colors.danger;
  return colors.warning;
}
