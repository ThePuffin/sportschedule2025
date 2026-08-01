# File: `frontend/app/(tabs)/connection.tsx`

## Purpose

The **Connection** tab (also called "Connexion" / "Mon Profil") handles user authentication. It supports email/password login, registration, Google OAuth login, password reset, sign out, and account deletion.

## Key Features

- **Email/Password authentication** — login and registration
- **Google OAuth** — sign in with Google popup
- **Password reset** — sends reset email
- **Sign out** — logs out the current user
- **Account deletion** — permanently deletes user data from Firestore and Firebase Auth
- **Preferences modal** — opens `FavModal` to manage favorite teams
- **Local data sync** — on registration, syncs local cache data to the new Firestore account

## State Variables

| Variable          | Type           | Description                                |
| ----------------- | -------------- | ------------------------------------------ |
| `email`           | `string`       | Email input value                          |
| `password`        | `string`       | Password input value                       |
| `confirmPassword` | `string`       | Confirm password input (registration only) |
| `errorMessage`    | `string`       | Error message to display                   |
| `successMessage`  | `string`       | Success message to display                 |
| `isRegistering`   | `boolean`      | Whether in registration mode               |
| `user`            | `User \| null` | Current Firebase auth user                 |
| `isFavModalOpen`  | `boolean`      | Favorite teams modal visibility            |
| `favoriteTeams`   | `string[]`     | Favorite team IDs                          |

## Key Functions

### `handleEmailAuth()`

Unified login/registration function:

- **Login**: calls `signInWithEmailAndPassword`, updates `lastLogin` in Firestore
- **Registration**: validates passwords match, calls `createUserWithEmailAndPassword`, then syncs local cache data (favoriteTeams, leaguesSelected, showScores, gameSelected, teamsSelected, etc.) to the new Firestore user document

### `handleForgotPassword()`

Sends a password reset email via `sendPasswordResetEmail`.

### `handleGoogleLogin()`

Signs in with Google via `signInWithPopup`, stores user profile (name, email, photoURL) in Firestore.

### `handleGoogleLogout()`

Signs out via `signOut(auth)`.

### `handleDeleteAccount()`

Deletes the user account:

1. Deletes the user document from Firestore (`deleteDoc`)
2. Deletes the user from Firebase Auth (`deleteUser`)
3. Handles `auth/requires-recent-login` error

### `toggleAuthMode()`

Switches between login and registration modes, clears confirm password.

### `handleOpenFavModal()`

Opens the favorite teams preferences modal.

## Data Flow

1. On mount, subscribes to `onAuthStateChanged` to track user state
2. If not logged in: shows login/registration form
3. If logged in: shows profile info, preferences, sign out, and delete account buttons
4. All auth operations sync relevant data to Firestore
