package com.jarvis.assistant

import android.app.Activity
import android.app.role.RoleManager
import android.content.Context
import android.content.Intent
import android.os.Build
import android.telecom.TelecomManager
import android.webkit.JavascriptInterface
import android.webkit.WebView
import org.json.JSONObject

/**
 * JavaScript Bridge connecting J. A. R. V. I. S. Web UI with Native Android Telephony Services.
 * Exposed in WebView as `window.JarvisAndroidCallBridge`.
 */
class JarvisCallBridge(
    private val activity: Activity,
    private val webView: WebView
) {

    init {
        JarvisInCallService.onStateChangedListener = { snapshotJson ->
            webView.post {
                val escaped = JSONObject.quote(snapshotJson)
                webView.evaluateJavascript(
                    "window.dispatchEvent(new CustomEvent('jarvis-native-call', { detail: JSON.parse($escaped) }));",
                    null
                )
            }
        }
    }

    @JavascriptInterface
    fun isNativeAndroidTelephonySupported(): Boolean = true

    @JavascriptInterface
    fun setAuthorizations(answerAuth: Boolean, aiVoiceAuth: Boolean, recordingConsent: Boolean) {
        JarvisInCallService.isAnswerAuthorized = answerAuth
        JarvisInCallService.isAiVoiceAuthorized = aiVoiceAuth
        JarvisInCallService.isRecordingConsentGranted = recordingConsent
    }

    @JavascriptInterface
    fun requestDialerAndScreeningRoles(): Boolean {
        try {
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                val roleManager = activity.getSystemService(Context.ROLE_SERVICE) as RoleManager
                if (roleManager.isRoleAvailable(RoleManager.ROLE_DIALER) && !roleManager.isRoleHeld(RoleManager.ROLE_DIALER)) {
                    activity.startActivityForResult(roleManager.createRequestRoleIntent(RoleManager.ROLE_DIALER), 3011)
                    return true
                }
                if (roleManager.isRoleAvailable(RoleManager.ROLE_CALL_SCREENING) && !roleManager.isRoleHeld(RoleManager.ROLE_CALL_SCREENING)) {
                    activity.startActivityForResult(roleManager.createRequestRoleIntent(RoleManager.ROLE_CALL_SCREENING), 3012)
                    return true
                }
            } else {
                val intent = Intent(TelecomManager.ACTION_CHANGE_DEFAULT_DIALER).apply {
                    putExtra(TelecomManager.EXTRA_CHANGE_DEFAULT_DIALER_PACKAGE_NAME, activity.packageName)
                }
                activity.startActivity(intent)
                return true
            }
        } catch (e: Exception) {
            e.printStackTrace()
        }
        return false
    }

    @JavascriptInterface
    fun answerIncomingCall(useAiMode: Boolean): String {
        val service = JarvisInCallService.instance
            ?: return """{"ok":false,"reason":"InCallService not bound. Set J. A. R. V. I. S. as Default Phone/Dialer app."}"""
        val ok = service.answerWithAuthorization(useAiMode)
        return """{"ok":$ok,"mode":"${JarvisInCallService.currentMode}"}"""
    }

    @JavascriptInterface
    fun switchToHumanControl(): String {
        val service = JarvisInCallService.instance
        if (service != null) {
            service.switchToHumanControl()
            return """{"ok":true,"mode":"human"}"""
        }
        JarvisInCallService.currentMode = "human"
        return """{"ok":true,"mode":"human"}"""
    }

    @JavascriptInterface
    fun switchToAiControl(): String {
        val service = JarvisInCallService.instance
            ?: return """{"ok":false,"reason":"InCallService not bound."}"""
        val ok = service.switchToAiControl()
        return """{"ok":$ok,"mode":"${JarvisInCallService.currentMode}"}"""
    }

    @JavascriptInterface
    fun speakAiReply(text: String): Boolean {
        val service = JarvisInCallService.instance ?: return false
        return service.speakAiResponseToCaller(text)
    }

    @JavascriptInterface
    fun endActiveCall(): Boolean {
        val service = JarvisInCallService.instance ?: return false
        return service.disconnectActiveCall()
    }

    @JavascriptInterface
    fun getActiveCallSnapshotJson(): String {
        return JarvisInCallService.instance?.buildCallSnapshotJson() ?: JSONObject().apply {
            put("isNativeBridge", true)
            put("status", "idle")
            put("mode", JarvisInCallService.currentMode)
            put("callerName", JarvisInCallService.latestScreenedName)
            put("callerNumber", JarvisInCallService.latestScreenedNumber)
            put("answerAuthorized", JarvisInCallService.isAnswerAuthorized)
            put("aiVoiceAuthorized", JarvisInCallService.isAiVoiceAuthorized)
            put("recordingConsent", JarvisInCallService.isRecordingConsentGranted)
        }.toString()
    }
}
