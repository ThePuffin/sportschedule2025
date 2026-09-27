# Color catalog validation checklist

General maintenance guidance, not a current per-team audit.

- Check that both color maps parse and contain no duplicate keys.
- Verify matching frontend/backend values and valid hexadecimal strings.
- Flag identical colors, invalid values, and unresolved defaults. Preserve defaults when reliable replacements are unavailable.
- Order college additions as lighter text over darker background using weighted RGB brightness. Check accessibility contrast separately.
- Confirm university identity before copying colors across leagues.
- Test fallback resolution for missing, default, and degenerate pairs.
- Run relevant tests and builds after code or catalog changes.

## Runtime behavior
The backend resolver treats degenerate pairs as unknown and attempts a college-league fallback before returning default colors. This does not repair stored entries. Database-driven color generation preserves keys not emitted but can update existing values.
