# File: `frontend/components/FilterAccordion.tsx`

## Purpose

The **FilterAccordion** component provides a collapsible section for filter controls. It renders as an accordion on **every** screen size — phones, tablets and desktop. The only screen-size-dependent behaviour is the *default* open state, which each screen decides (see below); the component itself always renders the collapsible `ListItem.Accordion`.

## Key Features

- **Accordion everywhere** — the section is always a collapsible accordion, on phones, tablets and desktop
- **Default open state** — controlled per screen: large screens (`width >= ACCORDION_MAX_WIDTH`) default every filter open, medium screens (`width < ACCORDION_MAX_WIDTH`) default a single relevant filter open (see each screen's docs)
- **Breakpoint** — `ACCORDION_MAX_WIDTH` (1024px) is exported from this module and is the single source of truth for the medium/large threshold. Screens import it to compute their own default open states (`width >= ACCORDION_MAX_WIDTH`), so the initial expanded state stays consistent with the screen layout
- **Collapsible** — expand/collapse via chevron icon
- **Expanded state callback** — notifies parent when expanded state changes
- **Theme-aware** — colors adapt to light/dark mode
- **Label animation** — the label (including the dynamic filter value after the colon) fades in and slides down whenever the accordion is opened or closed, via a CSS keyframe animation
- **Unified background** — the accordion is wrapped in `ThemedElements` so the filter band shares the same background (`#F0F0F0`/`#121212`) as the filter content below it

## Props

| Prop               | Type                          | Default | Description                          |
| ------------------ | ----------------------------- | ------- | ------------------------------------ |
| `label`            | `string`                      | —       | Section title (uppercased)           |
| `children`         | `React.ReactNode`             | —       | Filter controls to render inside     |
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

1. Receives label and children via props
2. Renders a `ListItem.Accordion` with chevron toggle (no width branch — always an accordion)
3. Parent components use `onExpandedChange` to track open/close state and choose their default open state from `width >= ACCORDION_MAX_WIDTH`
