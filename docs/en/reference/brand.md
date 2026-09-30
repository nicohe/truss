# TRUSS Brand Guide

## Concept

TRUSS takes its name from the engineering structure: simple members connected in a deliberate geometry create a strong whole. The mark uses a structural triangle as the primary symbol.

## Primary mark

Use `assets/logo/truss-gradient.svg` for GitHub, README, documentation, websites and product surfaces where color is available.

### Palette

| Role | Color | Hex | Approx. share in identity |
|---|---|---:|---:|
| Primary | Blue | `#3B82F6` | 40% |
| Secondary | Purple | `#8B5CF6` | 25% |
| Supporting | Cyan | `#06B6D4` | 20% |
| Accent | Emerald | `#10B981` | 15% |

Blue should remain visually dominant. Purple, cyan and emerald differentiate the mark; do not give all four colors equal visual weight.

## Variants

- `truss-gradient.svg`: default on dark/neutral surfaces.
- `truss-blue.svg`: flat-color fallback and small UI contexts.
- `truss-white.svg`: dark monochrome backgrounds.
- `truss-black.svg`: light monochrome backgrounds.

Do not recolor the primary mark arbitrarily, rotate it, stretch it, add drop shadows, or place text inside the triangle.

## Small sizes

At 32px and below prefer the flat blue or monochrome mark if the gradient loses definition. At 16px, prioritize silhouette over internal color detail.

## CLI identity

Do not render the SVG or a large ASCII banner on every command. Use the compact terminal signature:

```text
△ TRUSS · status
```

State vocabulary:

```text
● complete / ready
◐ active
○ pending
× failed
```

Terminal color is optional. If supported, use Blue for the TRUSS signature, Cyan for active work, Emerald for success, neutral gray for pending and red only for failure.

## Wordmark

Use uppercase `TRUSS` with generous tracking in brand surfaces. In commands and package names use lowercase `truss`.
