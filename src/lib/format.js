// Display helper: turn "deep-dish" → "Deep Dish"
export function formatSlugDisplay(slug = "") {
  return String(slug)
    .split("-")
    .filter(Boolean)
    .map(w => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ")
}
