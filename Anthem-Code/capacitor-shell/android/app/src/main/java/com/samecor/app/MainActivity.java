package com.samecor.app;

import android.app.DownloadManager;
import android.content.ActivityNotFoundException;
import android.content.ContentResolver;
import android.content.ContentValues;
import android.content.Intent;
import android.content.pm.PackageInfo;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.CancellationSignal;
import android.os.Environment;
import android.os.ParcelFileDescriptor;
import android.os.SystemClock;
import android.print.PageRange;
import android.print.PrintAttributes;
import android.print.PrintDocumentAdapter;
import android.print.PrintManager;
import android.provider.MediaStore;
import android.util.Base64;
import android.view.View;
import android.webkit.JavascriptInterface;
import android.webkit.MimeTypeMap;
import android.webkit.URLUtil;
import android.webkit.WebView;
import android.widget.Toast;
import androidx.activity.OnBackPressedCallback;
import androidx.browser.customtabs.CustomTabsIntent;
import androidx.core.content.FileProvider;
import androidx.core.content.pm.PackageInfoCompat;
import androidx.core.view.WindowInsetsControllerCompat;
import androidx.webkit.WebViewCompat;
import androidx.webkit.WebViewFeature;
import com.getcapacitor.BridgeActivity;
import com.google.android.play.core.review.ReviewManager;
import com.google.android.play.core.review.ReviewManagerFactory;
import java.io.ByteArrayOutputStream;
import java.io.File;
import java.io.FileOutputStream;
import java.io.InputStream;
import java.io.OutputStream;
import java.nio.charset.StandardCharsets;
import java.util.Collections;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.json.JSONObject;

public class MainActivity extends BridgeActivity {

    /** Second back press within this window (at the first page, nothing left to go back to) leaves the app. */
    private static final long EXIT_WINDOW_MS = 2000;
    /** Time Escape needs to close an open dialog/sheet before we check that it really went away. */
    private static final long OVERLAY_CLOSE_CHECK_MS = 180;

    /** The site the shell loads (capacitor.config.json → server.url). */
    private static final String SITE_HOST = "samecor.com";
    private static final String SITE_ORIGIN = "https://" + SITE_HOST;
    /** Sign-in coming back from the phone's browser: com.samecor.app://auth/... (public/app-return.js). */
    private static final String AUTH_SCHEME = "com.samecor.app";
    private static final String AUTH_HOST = "auth";

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

    /** Moves the single-page app to a same-site URL without a reload (same as src/lib/nativePush.ts); false otherwise. */
    private static final String SOFT_NAVIGATE_JS =
        "(function(u){try{var t=new URL(u);if(t.origin!==location.origin)return false;"
            + "history.pushState(null,'',t.pathname+t.search+t.hash);dispatchEvent(new PopStateEvent('popstate'));return true;}"
            + "catch(e){return false;}})";

    private final ExecutorService fileWorker = Executors.newSingleThreadExecutor();
    private long lastBackAt = 0;
    /** True once assets/samecor-shell.js runs on every page (print, share and download need it). */
    private boolean pageScriptInstalled = false;
    /** Restored after the system closed the app: the launch intent was already handled once. */
    private boolean restoring = false;

    @Override
    public void onCreate(Bundle savedInstanceState) {
        restoring = savedInstanceState != null;
        super.onCreate(savedInstanceState);
        WebView web = getBridge().getWebView();
        web.addJavascriptInterface(new ShellBridge(), "SamecorShell");
        installPageScript(web);
        web.setDownloadListener((url, userAgent, contentDisposition, mimeType, contentLength) ->
            onDownload(url, contentDisposition, mimeType)
        );

        // Back button / back gesture: close an open popup first, then go back a page, then "press again to exit".
        // Without this Android finishes the activity and the app closes from any page.
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                handleBack();
            }
        });
    }

    @Override
    public void onDestroy() {
        fileWorker.shutdown();
        super.onDestroy();
    }

    /**
     * App Links (samecor.com pages, see AndroidManifest.xml) and sign-in coming back from the browser. BridgeActivity
     * also calls this with the launch intent while the activity starts, so cold starts land on the right page too.
     */
    @Override
    protected void onNewIntent(Intent intent) {
        super.onNewIntent(intent);
        if (intent == null || getBridge() == null) return;
        boolean fromHistory = (intent.getFlags() & Intent.FLAG_ACTIVITY_LAUNCHED_FROM_HISTORY) != 0;
        if (fromHistory || (restoring && intent == getIntent())) return;

        Uri data = Intent.ACTION_VIEW.equals(intent.getAction()) ? intent.getData() : null;
        if (data == null) return;
        String authTarget = authReturnTarget(data);
        if (authTarget != null) {
            // A full load: the callback page exchanges the code with the verifier this WebView stored.
            WebView web = getBridge().getWebView();
            web.post(() -> web.loadUrl(authTarget));
            return;
        }
        if ("https".equalsIgnoreCase(data.getScheme()) && SITE_HOST.equalsIgnoreCase(data.getHost())) {
            openInPage(data.toString());
        }
    }

    /** com.samecor.app://auth/callback?code=… → https://samecor.com/auth/callback?code=… (only these two pages). */
    private static String authReturnTarget(Uri data) {
        if (!AUTH_SCHEME.equalsIgnoreCase(data.getScheme()) || !AUTH_HOST.equalsIgnoreCase(data.getHost())) return null;
        String path = data.getPath() == null ? "" : data.getPath();
        String page;
        if (path.equals("/callback") || path.isEmpty() || path.equals("/")) page = "/auth/callback";
        else if (path.equals("/reset-password")) page = "/reset-password";
        else return null;
        String query = data.getEncodedQuery();
        String fragment = data.getEncodedFragment();
        return SITE_ORIGIN + page + (query != null ? "?" + query : "") + (fragment != null ? "#" + fragment : "");
    }

    private void openInPage(String url) {
        WebView web = getBridge().getWebView();
        web.post(() ->
            web.evaluateJavascript(SOFT_NAVIGATE_JS + "(" + JSONObject.quote(url) + ")", moved -> {
                if (!"true".equals(moved)) web.loadUrl(url);
            })
        );
    }

    private void installPageScript(WebView web) {
        if (!WebViewFeature.isFeatureSupported(WebViewFeature.DOCUMENT_START_SCRIPT)) return;
        try (InputStream in = getAssets().open("samecor-shell.js")) {
            ByteArrayOutputStream buffer = new ByteArrayOutputStream();
            byte[] chunk = new byte[8192];
            int n;
            while ((n = in.read(chunk)) != -1) buffer.write(chunk, 0, n);
            String script = new String(buffer.toByteArray(), StandardCharsets.UTF_8);
            WebViewCompat.addDocumentStartJavaScript(web, script, Collections.singleton(SITE_ORIGIN));
            pageScriptInstalled = true;
        } catch (Exception e) {
            pageScriptInstalled = false;
        }
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

    /** Runs the action only while the WebView shows samecor.com (CSP frame-src keeps other sites out of its frames). */
    private void onSitePage(Runnable action) {
        runOnUiThread(() -> {
            if (isFinishing() || getBridge() == null) return;
            String current = getBridge().getWebView().getUrl();
            Uri uri = current == null ? null : Uri.parse(current);
            if (uri != null && "https".equalsIgnoreCase(uri.getScheme()) && SITE_HOST.equalsIgnoreCase(uri.getHost())) {
                action.run();
            }
        });
    }

    private void toast(String message) {
        runOnUiThread(() -> Toast.makeText(this, message, Toast.LENGTH_SHORT).show());
    }

    // region Downloads

    private void onDownload(String url, String contentDisposition, String mimeType) {
        if (url == null) return;
        String lower = url.toLowerCase();
        if (lower.startsWith("blob:") || lower.startsWith("data:")) {
            // A page-made file the page script did not catch: read it in the page and hand it over.
            String name = URLUtil.guessFileName(url, contentDisposition, mimeType);
            getBridge()
                .getWebView()
                .evaluateJavascript(
                    "window.__samecorShellSaveBlob&&window.__samecorShellSaveBlob(" + JSONObject.quote(url) + "," + JSONObject.quote(name) + ")",
                    null
                );
            return;
        }
        if (lower.startsWith("http://") || lower.startsWith("https://")) {
            enqueueDownload(url, URLUtil.guessFileName(url, contentDisposition, mimeType), mimeType);
        }
    }

    /** Web files: Android's download manager saves them to Downloads with a notification (Android 10+). */
    private void enqueueDownload(String url, String name, String mimeType) {
        Uri uri = Uri.parse(url);
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.Q) {
            // Android 9 and older need a storage permission for Downloads; let the browser fetch the file instead.
            try {
                startActivity(new Intent(Intent.ACTION_VIEW, uri));
            } catch (ActivityNotFoundException e) {
                toast("ดาวน์โหลดไม่สำเร็จ ลองใหม่อีกครั้ง");
            }
            return;
        }
        try {
            String fileName = safeFileName(name, mimeType);
            DownloadManager.Request request = new DownloadManager.Request(uri)
                .setTitle(fileName)
                .setNotificationVisibility(DownloadManager.Request.VISIBILITY_VISIBLE_NOTIFY_COMPLETED)
                .setDestinationInExternalPublicDir(Environment.DIRECTORY_DOWNLOADS, fileName);
            if (mimeType != null && !mimeType.isEmpty()) request.setMimeType(mimeType);
            DownloadManager manager = getSystemService(DownloadManager.class);
            manager.enqueue(request);
            toast("กำลังดาวน์โหลด " + fileName);
        } catch (Exception e) {
            toast("ดาวน์โหลดไม่สำเร็จ ลองใหม่อีกครั้ง");
        }
    }

    /** Page-made files (CSV, PDF, QR image, data export): Downloads on Android 10+, the share sheet before that. */
    private void saveFile(String name, String mimeType, String base64) {
        fileWorker.execute(() -> {
            String fileName = safeFileName(name, mimeType);
            String type = mimeType == null || mimeType.isEmpty() ? "application/octet-stream" : mimeType;
            try {
                byte[] bytes = Base64.decode(base64, Base64.DEFAULT);
                if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                    ContentResolver resolver = getContentResolver();
                    ContentValues values = new ContentValues();
                    values.put(MediaStore.Downloads.DISPLAY_NAME, fileName);
                    values.put(MediaStore.Downloads.MIME_TYPE, type);
                    values.put(MediaStore.Downloads.IS_PENDING, 1);
                    Uri item = resolver.insert(MediaStore.Downloads.EXTERNAL_CONTENT_URI, values);
                    if (item == null) throw new IllegalStateException("no MediaStore item");
                    try (OutputStream out = resolver.openOutputStream(item)) {
                        if (out == null) throw new IllegalStateException("no output stream");
                        out.write(bytes);
                    }
                    values.clear();
                    values.put(MediaStore.Downloads.IS_PENDING, 0);
                    resolver.update(item, values, null, null);
                    toast("บันทึก " + fileName + " ไว้ในโฟลเดอร์ Download แล้ว");
                } else {
                    File folder = new File(getCacheDir(), "downloads");
                    if (!folder.isDirectory() && !folder.mkdirs()) throw new IllegalStateException("no cache folder");
                    File file = new File(folder, fileName);
                    try (FileOutputStream out = new FileOutputStream(file)) {
                        out.write(bytes);
                    }
                    Uri shared = FileProvider.getUriForFile(this, getPackageName() + ".fileprovider", file);
                    Intent send = new Intent(Intent.ACTION_SEND)
                        .setType(type)
                        .putExtra(Intent.EXTRA_STREAM, shared)
                        .addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                    runOnUiThread(() -> startActivity(Intent.createChooser(send, fileName)));
                }
            } catch (Exception e) {
                toast("บันทึกไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง");
            }
        });
    }

    private static String safeFileName(String name, String mimeType) {
        String cleaned = name == null ? "" : name.replaceAll("[\\\\/:*?\"<>|\\p{Cntrl}]", "-").trim();
        if (cleaned.isEmpty() || cleaned.startsWith(".")) cleaned = "samecor-file" + cleaned;
        if (!cleaned.contains(".") && mimeType != null) {
            String ext = MimeTypeMap.getSingleton().getExtensionFromMimeType(mimeType);
            if (ext != null) cleaned = cleaned + "." + ext;
        }
        return cleaned.length() > 120 ? cleaned.substring(cleaned.length() - 120) : cleaned;
    }

    // endregion

    // region Print

    private void printPage(String title) {
        WebView web = getBridge().getWebView();
        String jobName = title == null || title.trim().isEmpty() ? "SAMECOR" : title.trim();
        PrintManager manager = getSystemService(PrintManager.class);
        if (manager == null) return;
        PrintDocumentAdapter adapter = new AfterPrintAdapter(web.createPrintDocumentAdapter(jobName), web);
        manager.print(jobName, adapter, new PrintAttributes.Builder().build());
    }

    /** WebView's print adapter, plus `afterprint` for the page when the dialog is done (printDocument.ts cleans up then). */
    private static final class AfterPrintAdapter extends PrintDocumentAdapter {

        private final PrintDocumentAdapter inner;
        private final WebView web;

        AfterPrintAdapter(PrintDocumentAdapter inner, WebView web) {
            this.inner = inner;
            this.web = web;
        }

        @Override
        public void onStart() {
            inner.onStart();
        }

        @Override
        public void onLayout(
            PrintAttributes oldAttributes,
            PrintAttributes newAttributes,
            CancellationSignal cancellationSignal,
            LayoutResultCallback callback,
            Bundle extras
        ) {
            inner.onLayout(oldAttributes, newAttributes, cancellationSignal, callback, extras);
        }

        @Override
        public void onWrite(PageRange[] pages, ParcelFileDescriptor destination, CancellationSignal cancellationSignal, WriteResultCallback callback) {
            inner.onWrite(pages, destination, cancellationSignal, callback);
        }

        @Override
        public void onFinish() {
            inner.onFinish();
            web.post(() -> web.evaluateJavascript("window.dispatchEvent(new Event('afterprint'))", null));
        }
    }

    // endregion

    /**
     * Bridge used by the site (src/lib/appShell.ts, src/lib/nativeShell.ts, assets/samecor-shell.js). The status and
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

        /** What this build can do natively (src/lib/nativeShell.ts). "push" only when google-services.json was built in. */
        @JavascriptInterface
        public String getFeatures() {
            StringBuilder features = new StringBuilder("auth,review");
            if (pageScriptInstalled) features.append(",print,share,download");
            if (getResources().getIdentifier("google_app_id", "string", getPackageName()) != 0) features.append(",push");
            return features.toString();
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

        /** Google / LINE / Facebook sign-in in a Custom Tab: Google refuses sign-in inside a WebView. */
        @JavascriptInterface
        public void openAuth(String url) {
            Uri uri = url == null ? null : Uri.parse(url);
            if (uri == null || !"https".equalsIgnoreCase(uri.getScheme())) return;
            onSitePage(() -> {
                try {
                    new CustomTabsIntent.Builder().setShowTitle(true).build().launchUrl(MainActivity.this, uri);
                } catch (ActivityNotFoundException e) {
                    toast("ไม่พบเบราว์เซอร์สำหรับเข้าสู่ระบบ");
                }
            });
        }

        /** Google Play's own rating sheet. Play decides whether it shows; nothing reports back. */
        @JavascriptInterface
        public void requestReview() {
            onSitePage(() -> {
                ReviewManager manager = ReviewManagerFactory.create(MainActivity.this);
                manager
                    .requestReviewFlow()
                    .addOnCompleteListener(task -> {
                        if (task.isSuccessful() && !isFinishing()) manager.launchReviewFlow(MainActivity.this, task.getResult());
                    });
            });
        }

        @JavascriptInterface
        public void share(String title, String text, String url) {
            StringBuilder body = new StringBuilder();
            if (text != null && !text.trim().isEmpty()) body.append(text.trim());
            if (url != null && !url.trim().isEmpty()) {
                if (body.length() > 0) body.append('\n');
                body.append(url.trim());
            }
            if (body.length() == 0 && title != null) body.append(title.trim());
            if (body.length() == 0) return;
            onSitePage(() -> {
                Intent send = new Intent(Intent.ACTION_SEND).setType("text/plain").putExtra(Intent.EXTRA_TEXT, body.toString());
                if (title != null && !title.trim().isEmpty()) send.putExtra(Intent.EXTRA_SUBJECT, title.trim());
                startActivity(Intent.createChooser(send, null));
            });
        }

        @JavascriptInterface
        public void print(String title) {
            onSitePage(() -> printPage(title));
        }

        @JavascriptInterface
        public void saveFile(String name, String mimeType, String base64) {
            if (base64 == null || base64.isEmpty()) return;
            onSitePage(() -> MainActivity.this.saveFile(name, mimeType, base64));
        }

        @JavascriptInterface
        public void saveFailed() {
            toast("บันทึกไฟล์ไม่สำเร็จ ลองใหม่อีกครั้ง");
        }

        @JavascriptInterface
        public void downloadUrl(String url, String name) {
            Uri uri = url == null ? null : Uri.parse(url);
            if (uri == null || uri.getScheme() == null) return;
            String scheme = uri.getScheme().toLowerCase();
            if (!scheme.equals("https") && !scheme.equals("http")) return;
            String guessed = name == null || name.trim().isEmpty() ? URLUtil.guessFileName(url, null, null) : name;
            onSitePage(() -> enqueueDownload(url, guessed, MimeTypeMap.getSingleton().getMimeTypeFromExtension(MimeTypeMap.getFileExtensionFromUrl(url))));
        }
    }
}
