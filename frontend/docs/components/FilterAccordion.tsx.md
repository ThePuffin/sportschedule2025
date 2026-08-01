# File: `frontend/components/FilterAccordion.tsx`

## Purpose

The **FilterAccordion** component provides a collapsible section for filter controls. On mobile, it renders as an accordion; on desktop, it renders as a simple section with a separator label.

## Key Features

- **Responsive** — accordion on mobile, static section on desktop
- **Collapsible** — expand/collapse via chevron icon
- **Expanded state callback** — notifies parent when expanded state changes
- **Theme-aware** — colors adapt to light/dark mode

## Props

| Prop               | Type                          | Default | Description                          |
| ------------------ | ----------------------------- | ------- | ------------------------------------ |
| `label`            | `string`                      | —       | Section title (uppercased)           |
| `children`         | `React.ReactNode`             | —       | Filter controls to render inside     |
| `isSmallDevice`    | `boolean`                     | —       | Whether on mobile                    |
| `defaultOpen`      | `boolean`                     | `false` | Initial expanded state               |
| `onExpandedChange` | `(expanded: boolean) => void` | —       | Callback when expanded state changes |

## Key Functions

### `useEffect` — expanded state notification

```typescript
useEffect(() => {
  onExpandedChange?.(expanded);
}, [expanded, onExpandedChange]);
```

Notifies the parent whenever the expanded state changes. This is used by screens to calculate the sticky filter header height.

## Data Flow

1. Receives label, children, and device size via props
2. If `isSmallDevice`: renders a `ListItem.Accordion` with chevron toggle
3. If not `isSmallDevice`: renders a `Separator` label + children directly
4. Parent components use `onExpandedChange` to track open/close state
