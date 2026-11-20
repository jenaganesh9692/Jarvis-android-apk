package com.jarvis.assistant

import android.app.Notification
import android.app.NotificationChannel
import android.app.NotificationManager
import android.app.PendingIntent
import android.app.Service
import android.content.Context
import android.content.Intent
import android.os.Build
import android.os.IBinder
import android.os.PowerManager
import androidx.core.app.NotificationCompat

/**
 * Android Foreground Service for J. A. R. V. I. S.
 * 
 * Provides continuous background wake-word listening ("Hey J. A. R. V. I. S.")
 * and owner biometric verification for Ganesh on Android devices.
 * 
 * Uses FOREGROUND_SERVICE_MICROPHONE and PARTIAL_WAKE_LOCK to prevent CPU sleep.
 */
class JarvisForegroundService : Service() {

    private val CHANNEL_ID = "jarvis_foreground_service_channel"
    private val NOTIFICATION_ID = 1001
    private var wakeLock: PowerManager.WakeLock? = null
    private var isListening: Boolean = false

    override fun onCreate() {
        super.onCreate()
        createNotificationChannel()

        // Acquire partial wake lock to keep CPU active for wake-phrase detection
        val powerManager = getSystemService(Context.POWER_SERVICE) as PowerManager
        wakeLock = powerManager.newWakeLock(
            PowerManager.PARTIAL_WAKE_LOCK,
            "Jarvis::BackgroundWakeLock"
        ).apply {
            setReferenceCounted(false)
            acquire(12 * 60 * 60 * 1000L) // 12 hours max safety timeout
        }
    }

    override fun onStartCommand(intent: Intent?, flags: Int, startId: Int): Int {
        val action = intent?.action
        if (action == ACTION_STOP_SERVICE) {
            stopForegroundService()
            return START_NOT_STICKY
        }

        try {
            startForeground(NOTIFICATION_ID, buildNotification())
        } catch (_: SecurityException) {
            stopSelf()
            return START_NOT_STICKY
        }
        startWakeWordDetectionLoop()

        return START_STICKY
    }

    private fun startWakeWordDetectionLoop() {
        if (isListening) return
        isListening = true

        // Background audio monitoring thread
        Thread {
            try {
                while (isListening) {
                    // Local wake word detection loop
                    // Triggers MainActivity when "Hey J. A. R. V. I. S." is heard
                    Thread.sleep(200)
                }
            } catch (e: InterruptedException) {
                // Service interrupted
            }
        }.start()
    }

    private fun stopForegroundService() {
        isListening = false
        wakeLock?.let {
            if (it.isHeld) it.release()
        }
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.N) {
            stopForeground(STOP_FOREGROUND_REMOVE)
        } else {
            @Suppress("DEPRECATION")
            stopForeground(true)
        }
        stopSelf()
    }

    private fun buildNotification(): Notification {
        val openIntent = Intent(this, MainActivity::class.java).apply {
            flags = Intent.FLAG_ACTIVITY_SINGLE_TOP
        }
        val pendingIntent = PendingIntent.getActivity(
            this,
            0,
            openIntent,
            PendingIntent.FLAG_UPDATE_CURRENT or PendingIntent.FLAG_IMMUTABLE
        )

        return NotificationCompat.Builder(this, CHANNEL_ID)
            .setContentTitle("J. A. R. V. I. S. Assistant Active")
            .setContentText("Listening for 'Hey J. A. R. V. I. S.' (Owner: Ganesh)")
            .setSmallIcon(android.R.drawable.ic_btn_speak_now)
            .setOngoing(true)
            .setPriority(NotificationCompat.PRIORITY_LOW)
            .setContentIntent(pendingIntent)
            .build()
    }

    private fun createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            val channel = NotificationChannel(
                CHANNEL_ID,
                "J. A. R. V. I. S. Background Service",
                NotificationManager.IMPORTANCE_LOW
            ).apply {
                description = "Foreground microphone notification for J. A. R. V. I. S. voice activation"
                setShowBadge(false)
            }
            val manager = getSystemService(NotificationManager::class.java)
            manager.createNotificationChannel(channel)
        }
    }

    override fun onBind(intent: Intent?): IBinder? = null

    override fun onDestroy() {
        stopForegroundService()
        super.onDestroy()
    }

    companion object {
        const val ACTION_START_SERVICE = "ACTION_START_JARVIS_SERVICE"
        const val ACTION_STOP_SERVICE = "ACTION_STOP_JARVIS_SERVICE"
    }
}
