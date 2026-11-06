/** Ask the profile header to open its avatar file picker (same user gesture, so the picker is allowed). */
export const PICK_AVATAR_EVENT = "samecor:pick-avatar";

export function requestAvatarPick() {
  window.dispatchEvent(new Event(PICK_AVATAR_EVENT));
}
