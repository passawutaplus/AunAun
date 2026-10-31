package com.samecor.app;

import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.os.Bundle;
import android.os.SystemClock;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import androidx.core.content.pm.PackageInfoCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    /** Second back press within this window (at the first page, nothing left to go back to) leaves the app. */
    private static final long EXIT_WINDOW_MS = 2000;
    /** Time Escape needs to close an open dialog/sheet before we check that it really went away. */
    private static final long OVERLAY_CLOSE_CHECK_MS = 180;

    /** Visible dialog / sheet / popup of the site (Radix dialogs, vaul drawers, the feedback composer). */
    private static final String OVERLAY_VISIBLE_JS =
        "(function(){var s='[role=\"dialog\"],[role=\"alertdialog\"],[aria-modal=\"true\"],[data-feedback-ui],[data-vaul-drawer]';"
            + "return [].slice.call(document.querySelectorAll(s)).some(function(e){var r=e.getBoundingClientRect(),c=getComputedStyle(e);"
            + "return r.width>0&&r.height>0&&c.visibility!=='hidden'&&c.display!=='none';});})()";

    /** Asks the site to close the open overlay the way its own Esc key would; true if there was one. */
    private static final String CLOSE_OVERLAY_JS =
        "(function(){if(!" + OVERLAY_VISIBLE_JS + ")return false;"
            + "(document.activeElement||document.body).dispatchEvent(new KeyboardEvent('keydown',{key:'Escape',code:'Escape',bubbles:true,cancelable:true}));"
            + "return true;})()";

    private long lastBackAt = 0;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        getBridge().getWebView().addJavascriptInterface(new ShellBridge(), "SamecorShell");

        // Back button / back gesture: close an open popup first, then go back a page, then "press again to exit".
        // Without this Android finishes the activity and the app closes from any page.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                handleBack();
            }
        });
    }

    private void handleBack() {
        final WebView web = getBridge().getWebView();
        web.evaluateJavascript(CLOSE_OVERLAY_JS, closed -> {
            if (!"true".equals(closed)) {
                goBackOrExit(web);
                return;
            }
            // Escape was sent; if the overlay ignores it (not every popup listens) fall through to normal back.
            web.postDelayed(
                () -> web.evaluateJavascript(OVERLAY_VISIBLE_JS, stillOpen -> {
                    if ("true".equals(stillOpen)) goBackOrExit(web);
                }),
                OVERLAY_CLOSE_CHECK_MS
            );
        });
    }

    private void goBackOrExit(WebView web) {
        if (web.canGoBack()) {
            web.goBack();
            return;
        }
        long now = SystemClock.elapsedRealtime();
        if (now - lastBackAt < EXIT_WINDOW_MS) {
            finish();
            return;
        }
        lastBackAt = now;
        Toast.makeText(this, "กดอีกครั้งเพื่อออก", Toast.LENGTH_SHORT).show();
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
