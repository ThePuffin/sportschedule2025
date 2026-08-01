# File: `frontend/components/TeamFilter.tsx`

## Purpose

The **TeamFilter** component combines a search icon (with a hidden `Selector` modal) and a horizontal `FilterSlider` for filtering teams. It's used in the Schedule and Game of the Day tabs.

## Key Features

- **Search icon** — opens a `Selector` modal for searching/finding teams
- **Filter slider** — horizontal chips for quick team selection
- **Favorite highlighting** — favorite teams appear first in the slider
- **Theme-aware** — colors adapt to light/dark mode
- **Masked edges** — gradient mask on the slider edges

## Props

| Prop                  | Type                                 | Description                                 |
| --------------------- | ------------------------------------ | ------------------------------------------- |
| `icon`                | `React.ReactNode`                    | Icon to display (e.g., search icon or "VS") |
| `selectorData`        | `any`                                | Data for the `Selector` modal               |
| `onSelectorChange`    | `(item: string \| string[]) => void` | Callback when selector changes              |
| `selectorPlaceholder` | `string`                             | Placeholder for the selector                |
| `isClearable`         | `boolean`                            | Whether selector is clearable               |
| `filterData`          | `{ label, value }[]`                 | Data for the `FilterSlider`                 |
| `selectedFilter`      | `string`                             | Currently selected filter value             |
| `onFilterChange`      | `(filter: string) => void`           | Callback when filter changes                |
| `favoriteValues`      | `string[]`                           | Favorite team values for highlighting       |

## Data Flow

1. Receives icon, selector data, and filter data via props
2. Clones the icon with theme-aware color
3. Renders a circular icon button with an invisible `Selector` overlay
4. Renders a `FilterSlider` with the filter data
5. User interactions trigger `onSelectorChange` or `onFilterChange`
