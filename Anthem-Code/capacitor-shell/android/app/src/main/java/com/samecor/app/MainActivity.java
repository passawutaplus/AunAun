package com.samecor.app;

import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.os.Bundle;
import android.view.View;
import android.webkit.JavascriptInterface;
import androidx.core.content.pm.PackageInfoCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getBridge().getWebView().addJavascriptInterface(new ShellBridge(), "SamecorShell");
    }

    /**
     * Bridge used by the site (src/lib/appShell.ts): setSystemBarColor on theme changes, getAppVersion for Settings. The status and
     * gesture bars sit over the decor view's padding, so its background is the bar colour.
     */
    private class ShellBridge {

        /** "versionName (versionCode)" for the Settings page, e.g. "1.0.2 (3)". */
        @JavascriptInterface
        public String getAppVersion() {
            try {
                PackageInfo info = getPackageManager().getPackageInfo(getPackageName(), 0);
                return info.versionName + " (" + PackageInfoCompat.getLongVersionCode(info) + ")";
            } catch (Exception e) {
                return "";
            }
        }

        @JavascriptInterface
        public void setSystemBarColor(String hex, boolean dark) {
            final int color;
            try {
                color = Color.parseColor(hex);
            } catch (IllegalArgumentException e) {
                return;
            }
            runOnUiThread(() -> {
                View decor = getWindow().getDecorView();
                decor.setBackgroundColor(color);
                WindowInsetsControllerCompat controller = new WindowInsetsControllerCompat(getWindow(), decor);
                controller.setAppearanceLightStatusBars(!dark);
                controller.setAppearanceLightNavigationBars(!dark);
            });
        }
    }
}
