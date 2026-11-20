# Keep JavaScriptInterface methods used by JARVIS WebView
-keepclassmembers class com.jarvis.assistant.JarvisCallBridge {
    @android.webkit.JavascriptInterface <methods>;
}
