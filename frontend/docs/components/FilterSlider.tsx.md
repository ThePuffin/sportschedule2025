# File: `frontend/components/FilterSlider.tsx`

## Purpose

The **FilterSlider** component displays a horizontal scrollable row of filter chips. It's used for league selection, month selection, team selection, and other filter types.

## Key Features

- **Horizontal scroll** — chips scroll horizontally with mouse drag support on web
- **Sorting** — selected item first, then ALL, then BOOKMARKS, then favorites, then others
- **Multiple selection** — supports multi-select mode
- **Disabled items** — dimmed and non-clickable
- **Favorite highlighting** — favorite items appear first
- **Theme-aware** — colors adapt to light/dark mode
- **Auto-scroll** — scrolls to start when items change
- **Custom styling** — supports custom styles for items, selected items, and text

## Props

| Prop                | Type                        | Description                            |
| ------------------- | --------------------------- | -------------------------------------- |
| `data`              | `{ label, value, icon? }[]` | Filter items                           |
| `availableLeagues`  | `string[]`                  | Alternative to `data` for league lists |
| `selectedFilter`    | `string`                    | Currently selected value (single mode) |
| `selectedFilters`   | `string[]`                  | Selected values (multi mode)           |
| `onFilterChange`    | `(value: string) => void`   | Callback when filter changes           |
| `favoriteValues`    | `string[]`                  | Favorite values for sorting            |
| `style`             | `StyleProp<ViewStyle>`      | Container style                        |
| `itemStyle`         | `StyleProp<ViewStyle>`      | Chip style                             |
| `selectedItemStyle` | `StyleProp<ViewStyle>`      | Selected chip style                    |
| `textStyle`         | `StyleProp<TextStyle>`      | Text style                             |
| `selectedTextStyle` | `StyleProp<TextStyle>`      | Selected text style                    |
| `multipleSelection` | `boolean`                   | Enable multi-select mode               |
| `disabledValues`    | `string[]`                  | Values to disable                      |
| `disableSort`       | `boolean`                   | Disable automatic sorting              |

## Key Functions

### `sortedItems` (useMemo)

Sorts items in this order:

1. Currently selected item (first)
2. ALL / all / empty value item
3. BOOKMARKS item
4. Favorite items (alphabetical)
5. Other items (alphabetical)
6. If `disabledValues` provided: active items first, then disabled items

### Mouse drag scrolling (web)

Adds `mousedown`, `mouseleave`, `mouseup`, `mousemove` listeners to enable drag-to-scroll. Sets `isScrollingHorizontally` in the `HorizontalScrollContext` to prevent conflicts with swipe gestures.

## Data Flow

1. Receives filter data and selection state via props
2. Sorts items based on selection, favorites, and disabled state
3. Renders horizontal `ScrollView` with chips
4. Each chip is a `TouchableOpacity` that calls `onFilterChange` when pressed
5. Selected chips use the favorite team color as background
