package com.chicagomikes.chipins;

import android.os.Bundle;
import android.view.View;
import android.view.WindowManager;
import android.webkit.WebSettings;
import android.webkit.WebView;
import com.getcapacitor.BridgeActivity;

public class MainActivity extends BridgeActivity {

    @Override
    public void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);

        // Enable immersive full-screen mode (hides navigation and status bars)
        enableImmersiveMode();

        // Keep screen on while app is running
        getWindow().addFlags(WindowManager.LayoutParams.FLAG_KEEP_SCREEN_ON);

        // Optimize WebView for performance (critical for map rendering)
        optimizeWebView();
    }

    @Override
    public void onWindowFocusChanged(boolean hasFocus) {
        super.onWindowFocusChanged(hasFocus);
        if (hasFocus) {
            // Re-enable immersive mode when app regains focus
            enableImmersiveMode();
        }
    }

    private void enableImmersiveMode() {
        View decorView = getWindow().getDecorView();
        decorView.setSystemUiVisibility(
            View.SYSTEM_UI_FLAG_IMMERSIVE_STICKY
            | View.SYSTEM_UI_FLAG_FULLSCREEN
            | View.SYSTEM_UI_FLAG_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_STABLE
            | View.SYSTEM_UI_FLAG_LAYOUT_HIDE_NAVIGATION
            | View.SYSTEM_UI_FLAG_LAYOUT_FULLSCREEN
        );
    }

    private void optimizeWebView() {
        // Get the WebView from the Capacitor bridge
        WebView webView = getBridge().getWebView();
        if (webView != null) {
            WebSettings settings = webView.getSettings();

            // Enable hardware acceleration for GPU-accelerated rendering
            webView.setLayerType(View.LAYER_TYPE_HARDWARE, null);

            // Enable JavaScript JIT compilation for faster execution
            settings.setJavaScriptEnabled(true);

            // Enable DOM storage (required for modern web apps)
            settings.setDomStorageEnabled(true);

            // Enable database storage (for IndexedDB, WebSQL)
            settings.setDatabaseEnabled(true);

            // Enable aggressive caching for better offline performance
            settings.setCacheMode(WebSettings.LOAD_DEFAULT);
            settings.setAppCacheEnabled(true);
            settings.setAppCachePath(getCacheDir().getAbsolutePath());

            // Enable geolocation
            settings.setGeolocationEnabled(true);

            // Enable WebGL for map rendering
            settings.setJavaScriptCanOpenWindowsAutomatically(true);

            // Enable mixed content (HTTP resources in HTTPS pages)
            settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);

            // Performance optimizations
            settings.setRenderPriority(WebSettings.RenderPriority.HIGH);

            // Enable zooming and pinch gestures
            settings.setBuiltInZoomControls(true);
            settings.setDisplayZoomControls(false);
            settings.setSupportZoom(true);

            // Enable smooth scrolling
            webView.setScrollbarFadingEnabled(true);

            // Disable text selection (kiosk mode)
            webView.setLongClickable(false);
            webView.setHapticFeedbackEnabled(false);

            // Load with overview mode (viewport meta tag support)
            settings.setLoadWithOverviewMode(true);
            settings.setUseWideViewPort(true);

            // Enable file access for local assets
            settings.setAllowFileAccess(true);
            settings.setAllowContentAccess(true);
        }
    }
}
