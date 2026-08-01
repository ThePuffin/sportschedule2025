# File: `frontend/app/_layout.tsx`

## Purpose

The **RootLayout** component is the root navigator of the Expo Router app. It loads custom fonts, manages the splash screen, and provides the navigation theme (light/dark) to the entire application.

## Key Features

- **Font loading** — loads the `SpaceMono` font before rendering the app
- **Splash screen management** — prevents auto-hide until fonts are loaded, then hides
- **Theme provider** — applies `DarkTheme` or `DefaultTheme` based on the system color scheme
- **Stack navigator** — defines the app's top-level screens
- **Status bar** — renders with `auto` style

## Key Functions

### `RootLayout()`

Main layout component that:

1. Gets the current color scheme via `useColorScheme()`
2. Loads the `SpaceMono` font via `useFonts()`
3. Hides the splash screen once fonts are loaded (via `useEffect`)
4. Returns `null` until fonts are loaded
5. Renders `ThemeProvider` wrapping a `Stack` navigator and `StatusBar`

## Stack Screens

| Name         | Options                  | Description                        |
| ------------ | ------------------------ | ---------------------------------- |
| `(tabs)`     | `{ headerShown: false }` | Main tab navigator (hidden header) |
| `refresh`    | —                        | Refresh screen                     |
| `+not-found` | —                        | 404 fallback screen                |

## Data Flow

1. App starts → `SplashScreen.preventAutoHideAsync()` is called immediately
2. Fonts load asynchronously → `loaded` becomes `true`
3. `useEffect` triggers → `SplashScreen.hideAsync()` hides the splash
4. Root layout renders the navigation theme + stack screens
