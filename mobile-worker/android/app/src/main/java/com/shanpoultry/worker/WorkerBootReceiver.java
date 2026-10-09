package com.shanpoultry.worker;

import android.content.BroadcastReceiver;
import android.content.Context;
import android.content.Intent;
import android.content.SharedPreferences;
import android.location.LocationManager;
import android.os.Build;
import android.util.Log;

/**
 * BroadcastReceiver to keep worker GPS tracking active 24/7.
 * Triggers on phone reboot, app updates, power connection, keep-alive alarms,
 * and whenever mobile location (GPS) is turned ON/OFF in device settings.
 */
public class WorkerBootReceiver extends BroadcastReceiver {

    private static final String TAG = "WorkerBootReceiver";

    @Override
    public void onReceive(Context context, Intent intent) {
        String action = intent != null ? intent.getAction() : "";
        Log.d(TAG, "WorkerBootReceiver triggered with action: " + action);

        SharedPreferences prefs = context.getSharedPreferences(WorkerLocationService.PREFS_NAME, Context.MODE_PRIVATE);
        boolean isTrackingEnabled = prefs.getBoolean(WorkerLocationService.KEY_TRACKING_ENABLED, false);
        String workerId = prefs.getString(WorkerLocationService.KEY_WORKER_ID, "");

        if (!isTrackingEnabled || workerId.isEmpty()) {
            Log.d(TAG, "Tracking is disabled or no worker ID configured. Skipping service restart.");
            return;
        }

        // If triggered by Location Providers toggle (GPS turned on/off)
        if (LocationManager.PROVIDERS_CHANGED_ACTION.equals(action)) {
            LocationManager lm = (LocationManager) context.getSystemService(Context.LOCATION_SERVICE);
            boolean isGpsEnabled = lm != null && (lm.isProviderEnabled(LocationManager.GPS_PROVIDER) || lm.isProviderEnabled(LocationManager.NETWORK_PROVIDER));
            if (!isGpsEnabled) {
                Log.d(TAG, "Mobile location is currently disabled by user. Waiting for it to be turned back ON.");
                return;
            }
            Log.d(TAG, "Mobile location is ON! Ensuring background service is active.");
        }

        // Start Foreground Service to ensure uninterrupted 24/7 location sync
        try {
            Intent serviceIntent = new Intent(context, WorkerLocationService.class);
            serviceIntent.setAction(WorkerLocationService.ACTION_START);

            if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
                context.startForegroundService(serviceIntent);
            } else {
                context.startService(serviceIntent);
            }
            Log.d(TAG, "WorkerLocationService started successfully from receiver.");
        } catch (Exception e) {
            Log.e(TAG, "Error starting WorkerLocationService from receiver: " + e.getMessage());
        }
    }
}
