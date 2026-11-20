package com.jarvis.assistant

import android.content.Context
import android.database.Cursor
import android.media.AudioAttributes
import android.media.AudioManager
import android.net.Uri
import android.os.Build
import android.provider.ContactsContract
import android.speech.tts.TextToSpeech
import android.telecom.Call
import android.telecom.CallAudioState
import android.telecom.InCallService
import android.telecom.VideoProfile
import org.json.JSONObject
import java.util.Locale

/**
 * Native Android InCallService for J. A. R. V. I. S. Advanced AI Call Assistant.
 *
 * Security & Control Guarantees:
 * 1. Never answers an incoming call unless the user explicitly authorized call answering.
 * 2. Never speaks AI audio to caller unless explicitly authorized by the user.
 * 3. User can take immediate manual human control at any instant ("JARVIS, mujhe baat karni hai").
 * 4. Never records, stores, or uploads call audio without explicit user consent.
 *
 * Important Android OS Constraint:
 * Standard Android unrooted devices restrict third-party apps from injecting TTS directly into
 * the cellular baseband TX uplink stream. When AI voice speaks during an active call on Android,
 * JARVIS routes via loudspeaker acoustic coupling (or Telecom VoIP audio session when applicable)
 * and transparently informs the user and caller.
 */
class JarvisInCallService : InCallService() {

    private var tts: TextToSpeech? = null
    private var audioManager: AudioManager? = null

    private val callCallback = object : Call.Callback() {
        override fun onStateChanged(call: Call, state: Int) {
            super.onStateChanged(call, state)
            notifyStateChanged()
            if (state == Call.STATE_DISCONNECTED) {
                stopAiSpeech()
                restoreHumanAudioRouting()
                activeCall = null
                currentMode = "human"
                notifyStateChanged()
            }
        }

        override fun onDetailsChanged(call: Call, details: Call.Details) {
            super.onDetailsChanged(call, details)
            notifyStateChanged()
        }
    }

    override fun onCreate() {
        super.onCreate()
        instance = this
        audioManager = getSystemService(Context.AUDIO_SERVICE) as AudioManager
        tts = TextToSpeech(this) { status ->
            if (status == TextToSpeech.SUCCESS) {
                tts?.language = Locale("hi", "IN")
            }
        }
    }

    override fun onCallAdded(call: Call) {
        super.onCallAdded(call)
        activeCall = call
        call.registerCallback(callCallback)

        // Default every new call safely to manual human awareness until authorized
        currentMode = "human"
        notifyStateChanged()

        // Do NOT auto-answer unless user explicitly pre-authorized auto-answering
        if (call.state == Call.STATE_RINGING && isAnswerAuthorized) {
            // Even when authorized, we surface the caller info and clear AI indicator immediately
            notifyStateChanged()
        }
    }

    override fun onCallRemoved(call: Call) {
        super.onCallRemoved(call)
        call.unregisterCallback(callCallback)
        if (activeCall == call) {
            stopAiSpeech()
            restoreHumanAudioRouting()
            activeCall = null
            currentMode = "human"
        }
        notifyStateChanged()
    }

    fun answerWithAuthorization(useAiMode: Boolean): Boolean {
        val call = activeCall ?: return false
        if (!isAnswerAuthorized && useAiMode) {
            return false
        }
        call.answer(VideoProfile.STATE_AUDIO_ONLY)
        if (useAiMode && isAiVoiceAuthorized) {
            switchToAiControl()
        } else {
            switchToHumanControl()
        }
        return true
    }

    fun switchToHumanControl(): Boolean {
        // Immediate takeover: stop AI speech, unmute human microphone, restore earpiece/normal route
        stopAiSpeech()
        restoreHumanAudioRouting()
        currentMode = "human"
        notifyStateChanged()
        return true
    }

    fun switchToAiControl(): Boolean {
        if (!isAiVoiceAuthorized) {
            return false
        }
        currentMode = "ai"
        // Mute human mic during AI speech if user chose AI takeover, keeping manual override 1-tap away
        audioManager?.let { am ->
            am.mode = AudioManager.MODE_IN_COMMUNICATION
            am.isMicrophoneMute = true
            // Enable speakerphone so AI TTS can be heard clearly & acoustically coupled when hardware allows
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                setAudioRoute(CallAudioState.ROUTE_SPEAKER)
            } else {
                @Suppress("DEPRECATION")
                am.isSpeakerphoneOn = true
            }
        }
        announceAiPresence("Namaste, main J. A. R. V. I. S. AI assistant bol rahi hoon, Ganesh ji ki anumati se. Kripya apna sandesh batayein.")
        notifyStateChanged()
        return true
    }

    fun speakAiResponseToCaller(text: String): Boolean {
        if (!isAiVoiceAuthorized || currentMode != "ai") {
            return false
        }
        announceAiPresence(text)
        return true
    }

    fun disconnectActiveCall(): Boolean {
        val call = activeCall ?: return false
        stopAiSpeech()
        restoreHumanAudioRouting()
        call.disconnect()
        return true
    }

    private fun announceAiPresence(message: String) {
        val attrs = AudioAttributes.Builder()
            .setUsage(AudioAttributes.USAGE_ASSISTANCE_ACCESSIBILITY)
            .setContentType(AudioAttributes.CONTENT_TYPE_SPEECH)
            .build()
        tts?.setAudioAttributes(attrs)
        tts?.speak(message, TextToSpeech.QUEUE_FLUSH, null, "jarvis_call_ai_${System.currentTimeMillis()}")
    }

    private fun stopAiSpeech() {
        try {
            tts?.stop()
        } catch (_: Exception) {}
    }

    private fun restoreHumanAudioRouting() {
        audioManager?.let { am ->
            am.isMicrophoneMute = false
            am.mode = AudioManager.MODE_IN_CALL
            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.P) {
                setAudioRoute(CallAudioState.ROUTE_EARPIECE)
            } else {
                @Suppress("DEPRECATION")
                am.isSpeakerphoneOn = false
            }
        }
    }

    private fun resolveCallerName(phoneNumber: String?, fallbackName: String?): String {
        if (!fallbackName.isNullOrBlank()) return fallbackName
        if (phoneNumber.isNullOrBlank()) return "Unknown Caller"
        return try {
            val uri = Uri.withAppendedPath(ContactsContract.PhoneLookup.CONTENT_FILTER_URI, Uri.encode(phoneNumber))
            val cursor: Cursor? = contentResolver.query(uri, arrayOf(ContactsContract.PhoneLookup.DISPLAY_NAME), null, null, null)
            cursor?.use {
                if (it.moveToFirst()) {
                    return it.getString(0) ?: phoneNumber
                }
            }
            phoneNumber
        } catch (_: SecurityException) {
            phoneNumber
        } catch (_: Exception) {
            phoneNumber
        }
    }

    fun buildCallSnapshotJson(): String {
        val call = activeCall
        val number = call?.details?.handle?.schemeSpecificPart ?: latestScreenedNumber
        val displayName = resolveCallerName(number, call?.details?.callerDisplayName ?: latestScreenedName)
        val statusStr = when (call?.state) {
            Call.STATE_RINGING -> "ringing"
            Call.STATE_ACTIVE -> "active"
            Call.STATE_DIALING, Call.STATE_CONNECTING -> "connecting"
            Call.STATE_HOLDING -> "holding"
            Call.STATE_DISCONNECTED -> "ended"
            else -> if (latestScreenedNumber.isNotBlank()) "ringing" else "idle"
        }

        return JSONObject().apply {
            put("isNativeBridge", true)
            put("status", statusStr)
            put("mode", currentMode)
            put("callerName", displayName)
            put("callerNumber", number)
            put("answerAuthorized", isAnswerAuthorized)
            put("aiVoiceAuthorized", isAiVoiceAuthorized)
            put("recordingConsent", isRecordingConsentGranted)
            put("osAudioNote", "Android OS restricts direct baseband uplink TTS injection on unrooted phones; AI speech routes via Speaker/Telecom audio while preserving instant human mic takeover.")
        }.toString()
    }

    private fun notifyStateChanged() {
        onStateChangedListener?.invoke(buildCallSnapshotJson())
    }

    override fun onDestroy() {
        stopAiSpeech()
        tts?.shutdown()
        instance = null
        super.onDestroy()
    }

    companion object {
        @Volatile
        var instance: JarvisInCallService? = null

        @Volatile
        var activeCall: Call? = null

        @Volatile
        var currentMode: String = "human"

        @Volatile
        var isAnswerAuthorized: Boolean = false

        @Volatile
        var isAiVoiceAuthorized: Boolean = false

        @Volatile
        var isRecordingConsentGranted: Boolean = false

        @Volatile
        var latestScreenedNumber: String = ""

        @Volatile
        var latestScreenedName: String = ""

        var onStateChangedListener: ((String) -> Unit)? = null
    }
}
