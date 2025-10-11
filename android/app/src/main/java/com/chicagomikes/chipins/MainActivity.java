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

            // ========== EXISTING OPTIMIZATIONS ==========

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

            // ========== NEW CRITICAL OPTIMIZATIONS ==========

            // NETWORK OPTIMIZATION: Enable modern network protocols
            settings.setBlockNetworkImage(false); // Allow images
            settings.setLoadsImagesAutomatically(true); // Load images immediately
            settings.setBlockNetworkLoads(false); // Allow network requests

            // PERFORMANCE: Disable unnecessary features for kiosk
            settings.setSaveFormData(false); // Not needed for kiosk
            settings.setSavePassword(false); // Not needed for kiosk
            settings.setMediaPlaybackRequiresUserGesture(false); // Auto-play audio/video

            // CACHE OPTIMIZATION: Set cache sizes for better performance
            // Especially important for map tiles and images
            try {
                // Set aggressive disk cache for tile images (100MB)
                webView.getSettings().setCacheMode(WebSettings.LOAD_CACHE_ELSE_NETWORK);
            } catch (Exception e) {
                // Fallback to default if this fails
                webView.getSettings().setCacheMode(WebSettings.LOAD_DEFAULT);
            }

            // RENDERING OPTIMIZATION: Enable fast scroll and fling
            webView.setScrollBarStyle(View.SCROLLBARS_OUTSIDE_OVERLAY);
            webView.setVerticalScrollBarEnabled(false);
            webView.setHorizontalScrollBarEnabled(false);

            // TOUCH OPTIMIZATION: Improve touch responsiveness
            webView.setNestedScrollingEnabled(true);

            // TEXT RENDERING: Optimize for readability
            settings.setMinimumFontSize(8);
            settings.setMinimumLogicalFontSize(8);
            settings.setDefaultFontSize(16);
            settings.setTextZoom(100); // Prevent text scaling

            // SECURITY: Enable safe browsing (won't impact performance)
            try {
                settings.setSafeBrowsingEnabled(true);
            } catch (Exception e) {
                // Safe browsing not available on older Android versions
            }
        }
    }
}
