import { useEffect } from "react";
import { useAuth } from "@/hooks/useAuth";
import { pullCloudPrefs } from "@/lib/settingsCloudPrefs";
import { setRatingPromptOff } from "@/lib/ratingPrompt";

/** Once per sign-in, copy the account's saved settings (profiles.ui_prefs) into this browser. */
export default function CloudPrefsSync() {
  const { user } = useAuth();
  useEffect(() => {
    if (!user?.id) return;
    void pullCloudPrefs(user.id).then((prefs) => {
      if (prefs?.ratingPromptOff !== undefined) setRatingPromptOff(prefs.ratingPromptOff);
    });
  }, [user?.id]);
  return null;
}
