/** Username change cooldown — keep in sync with DB trigger enforce_username_change_cooldown. */
export const USERNAME_COOLDOWN_DAYS = 60;

export const USERNAME_COOLDOWN_MS = USERNAME_COOLDOWN_DAYS * 24 * 60 * 60 * 1000;
