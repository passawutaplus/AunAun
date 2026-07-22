/**
 * Previously assigned a random pool avatar when `avatar_url` was empty.
 * Default is now initials (2 letters + orange gradient) via `UserAvatar` —
 * no DB write needed for new accounts.
 */
export function useAssignDefaultAvatar() {
  // no-op — keep hook so AvatarPoolBootstrap import stays stable
}
