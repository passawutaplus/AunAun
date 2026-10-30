/**
 * Synchronous guess at "is someone signed in?" from the stored Supabase session, used only while
 * `useAuth().loading` is still true so the home hero neither flashes for members nor jumps in for guests.
 * Not an authority: the real `user` replaces it as soon as the session is resolved.
 */
export function hasStoredSession(): boolean {
  try {
    for (let i = 0; i < window.localStorage.length; i++) {
      const key = window.localStorage.key(i);
      if (key && /^sb-.+-auth-token$/.test(key) && window.localStorage.getItem(key)) return true;
    }
  } catch {
    /* storage blocked — treat as a guest */
  }
  return false;
}
