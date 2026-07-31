/** Display name change cooldown — keep in sync with DB trigger enforce_display_name_change_cooldown. */
export const DISPLAY_NAME_COOLDOWN_DAYS = 30;

export const DISPLAY_NAME_COOLDOWN_MS = DISPLAY_NAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
