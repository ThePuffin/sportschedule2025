# File: `frontend/components/FilterAccordion.tsx`

## Purpose

The **FilterAccordion** component provides a collapsible section for filter controls. On mobile, it renders as an accordion; on desktop, it renders as a simple section with a separator label.

## Key Features

- **Responsive** — accordion on mobile, static section on desktop
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
| `isSmallDevice`    | `boolean`                     | —       | Whether on mobile                    |
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
2. If `isSmallDevice`: renders a `ListItem.Accordion` with chevron toggle
3. If not `isSmallDevice`: renders a `Separator` label + children directly
4. Parent components use `onExpandedChange` to track open/close state
