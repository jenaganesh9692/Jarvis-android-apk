package com.jarvis.assistant

import android.telecom.Call
import android.telecom.CallScreeningService

/**
 * Native Android CallScreeningService for J. A. R. V. I. S.
 *
 * Extracts caller details safely on incoming calls and forwards metadata to JarvisInCallService
 * without ever blocking the user's normal ringtone or manual call controls.
 */
class JarvisCallScreeningService : CallScreeningService() {

    override fun onScreenCall(callDetails: Call.Details) {
        val phoneNumber = callDetails.handle?.schemeSpecificPart ?: ""
        val callerDisplayName = callDetails.callerDisplayName ?: ""

        JarvisInCallService.latestScreenedNumber = phoneNumber
        JarvisInCallService.latestScreenedName = callerDisplayName

        // Always allow incoming calls cleanly (never silently drop or block calls)
        val response = CallResponse.Builder()
            .setDisallowCall(false)
            .setRejectCall(false)
            .setSilenceCall(false)
            .setSkipCallLog(false)
            .setSkipNotification(false)
            .build()

        respondToCall(callDetails, response)
    }
}
