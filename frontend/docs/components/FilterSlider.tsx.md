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
- **Masked edges** — the ScrollView carries a CSS edge-fade (`maskImage`) that makes chips fade as they pass under the adjacent opaque button (loupe/VS/bookmarks). The left fade is **always** applied from the initial render (no scroll needed); the right fade is only drawn while the end of the list is not yet reached. The mask zone is shifted by `fadeLeftInset`/`fadeRightInset` so the visible gradient sits **outside** the button (chips stay fully transparent while sliding under the button), exactly like `SliderDatePicker`.
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
| `scrollPaddingLeft`   | `number`                    | Left padding applied to the ScrollView's content (compensates a negative margin when the slider extends under a button, default `0`) |
| `scrollPaddingRight`  | `number`                    | Right padding applied to the ScrollView's content (compensates a negative margin when the slider extends under a button, default `0`) |
| `fadeLeftInset`       | `number`                    | Width (px) covered by an opaque button at the ScrollView's left edge: the left fade ramps from the ScrollView's left edge (under the button) to full opacity ~15px past the button's right edge (default `0`) |
| `fadeRightInset`      | `number`                    | Same as `fadeLeftInset` but for the right edge (default `0`) |

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

Adds drag-to-scroll listeners: `mousedown` on the slider, but `mousemove`/`mouseup` on `window` while dragging — so the drag keeps working even when the cursor leaves the bar (previously `mouseleave` cancelled the drag, making it feel broken). Sets `isScrollingHorizontally` in the `HorizontalScrollContext` to prevent conflicts with swipe gestures, disables text selection during the drag (`body.userSelect`), and swallows the click that follows a drag (> 5px) so no chip gets selected accidentally on release.

## Data Flow

1. Receives filter data and selection state via props
2. Sorts items based on selection, favorites, and disabled state
3. Renders horizontal `ScrollView` with chips
4. Each chip is a `TouchableOpacity` that calls `onFilterChange` when pressed
5. Selected chips use the favorite team color as background
