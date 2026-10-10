# File: `frontend/components/FilterAccordion.tsx`

## Purpose

The **FilterAccordion** component provides a collapsible section for filter controls. It renders as an accordion on screens **narrower than `ACCORDION_MAX_WIDTH` (1024px)** — phones and tablets in portrait — and as a simple static section with a separator label on larger screens.

## Key Features

- **Responsive** — accordion below 1024px (phones + tablets), static section at 1024px and above
- **Breakpoint** — `ACCORDION_MAX_WIDTH` is exported from this module and is the single source of truth for the accordion threshold; screens import it to compute their own `useFilterAccordion` flag (`width < ACCORDION_MAX_WIDTH`), so layout branches stay consistent with what the accordion actually renders
- **Collapsible** — expand/collapse via chevron icon
- **Expanded state callback** — notifies parent when expanded state changes
- **Theme-aware** — colors adapt to light/dark mode
- **Label animation** — the label (including the dynamic filter value after the colon) fades in and slides down whenever the accordion is opened or closed, via a CSS keyframe animation
- **Unified background** — both mobile and desktop modes wrap the accordion/separator in `ThemedElements` so the filter band shares the same background (`#F0F0F0`/`#121212`) as the filter content below it

## Props

| Prop               | Type                          | Default | Description                          |
| ------------------ | ----------------------------- | ------- | ------------------------------------ |
| `label`            | `string`                      | —       | Section title (uppercased)           |
| `children`         | `React.ReactNode`             | —       | Filter controls to render inside     |
| `isSmallDevice`    | `boolean`                     | —       | Whether the screen uses the compact/accordion filter layout (phones and tablets). Kept for API compatibility: the actual render decision is now made internally from the window width against `ACCORDION_MAX_WIDTH` |
| `defaultOpen`      | `boolean`                     | `false` | Initial expanded state               |
| `expanded`         | `boolean`                     | `null`  | **Controlled** expanded value. When provided, the accordion uses this value (instead of internal state) and `onExpandedChange` is called on toggle, letting the parent force open/close. Omit for uncontrolled mode |
| `onExpandedChange` | `(expanded: boolean) => void` | —       | Callback when expanded state changes |

## Key Functions

### `useEffect` — expanded state notification

```typescript
useEffect(() => {
  if (!isControlled) {
    onExpandedChange?.(internalExpanded);
  }
}, [internalExpanded, onExpandedChange, isControlled]);
```

Notifies the parent whenever the expanded state changes (**uncontrolled mode only**). When the `expanded` prop is provided (controlled mode), the parent is responsible for calling `onExpandedChange` on toggle, and the accordion simply reflects the passed value.

## Data Flow

1. Receives label, children, and device size via props
2. Reads the window width via `useWindowDimensions` and computes `useAccordion = width < ACCORDION_MAX_WIDTH`
3. If `useAccordion`: renders a `ListItem.Accordion` with chevron toggle
4. Otherwise: renders a `Separator` label + children directly
5. Parent components use `onExpandedChange` to track open/close state
