package com.shanpoultry.worker;

import android.app.Notification;
import android.app.NotificationChannel;
import android.app.NotificationManager;
import android.app.PendingIntent;
import android.app.Service;
import android.content.Context;
import android.content.Intent;
import android.content.pm.ServiceInfo;
import android.location.Location;
import android.location.LocationListener;
import android.location.LocationManager;
import android.os.Build;
import android.os.Bundle;
import android.os.IBinder;
import android.os.PowerManager;
import android.util.Log;

import androidx.annotation.Nullable;
import androidx.core.app.NotificationCompat;

import org.json.JSONObject;

import java.io.OutputStream;
import java.net.HttpURLConnection;
import java.net.URL;
import java.nio.charset.StandardCharsets;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;
import java.util.TimeZone;

/**
 * Background Foreground Service for 24/7 Realtime GPS Location Tracking of Field Workers.
 * Runs even when the app is minimized, screen locked, or other apps are opened.
 */
public class WorkerLocationService extends Service implements LocationListener {

    private static final String TAG = "WorkerLocationService";
    private static final String CHANNEL_ID = "spp_worker_live_gps_channel";
    private static final int NOTIFICATION_ID = 9001;

    public static final String ACTION_START = "com.shanpoultry.worker.START_TRACKING";
    public static final String ACTION_STOP = "com.shanpoultry.worker.STOP_TRACKING";

    public static final String EXTRA_WORKER_ID = "worker_id";
    public static final String EXTRA_WORKER_NAME = "worker_name";
    public static final String EXTRA_SUPABASE_URL = "supabase_url";
    public static final String EXTRA_SUPABASE_KEY = "supabase_key";

    private LocationManager locationManager;
    private PowerManager.WakeLock wakeLock;

    private String workerId = "";
    private String workerName = "Field Collector";
    private String supabaseUrl = "";
    private String supabaseKey = "";

    private long lastUploadTimestamp = 0;
    private static final long MIN_INTERVAL_MS = 15000; // 15 seconds

    @Override
    public void onCreate() {
        super.onCreate();
        createNotificationChannel();

        PowerManager powerManager = (PowerManager) getSystemService(Context.POWER_SERVICE);
        if (powerManager != null) {
            wakeLock = powerManager.newWakeLock(PowerManager.PARTIAL_WAKE_LOCK, "ShanPoultry:WorkerLocationWakeLock");
            wakeLock.setReferenceCounted(false);
        }

        locationManager = (LocationManager) getSystemService(Context.LOCATION_SERVICE);
    }

    @Override
    public int onStartCommand(Intent intent, int flags, int startId) {
        if (intent != null) {
            String action = intent.getAction();
            if (ACTION_STOP.equals(action)) {
                stopTracking();
                stopSelf();
                return START_NOT_STICKY;
            }

            workerId = intent.getStringExtra(EXTRA_WORKER_ID) != null ? intent.getStringExtra(EXTRA_WORKER_ID) : workerId;
            workerName = intent.getStringExtra(EXTRA_WORKER_NAME) != null ? intent.getStringExtra(EXTRA_WORKER_NAME) : workerName;
            supabaseUrl = intent.getStringExtra(EXTRA_SUPABASE_URL) != null ? intent.getStringExtra(EXTRA_SUPABASE_URL) : supabaseUrl;
            supabaseKey = intent.getStringExtra(EXTRA_SUPABASE_KEY) != null ? intent.getStringExtra(EXTRA_SUPABASE_KEY) : supabaseKey;
        }

        startForegroundNotification();
        startLocationUpdates();

        return START_STICKY;
    }

    private void createNotificationChannel() {
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.O) {
            NotificationChannel channel = new NotificationChannel(
                    CHANNEL_ID,
                    "Shan Poultry Worker Live GPS Tracking",
                    NotificationManager.IMPORTANCE_LOW
            );
            channel.setDescription("Background GPS tracking for field operations and dispatch");
            channel.enableVibration(false);
            channel.setSound(null, null);

            NotificationManager manager = getSystemService(NotificationManager.class);
            if (manager != null) {
                manager.createNotificationChannel(channel);
            }
        }
    }

    private void startForegroundNotification() {
        Intent notificationIntent = new Intent(this, MainActivity.class);
        PendingIntent pendingIntent = PendingIntent.getActivity(
                this,
                0,
                notificationIntent,
                PendingIntent.FLAG_IMMUTABLE | PendingIntent.FLAG_UPDATE_CURRENT
        );

        NotificationCompat.Builder builder = new NotificationCompat.Builder(this, CHANNEL_ID)
                .setContentTitle("شان پولٹری - لائیو لوکیشن ٹریکنگ ایکٹو ہے")
                .setContentText(workerName + " • فیلڈ آپریشنز GPS لوکیشن جاری ہے")
                .setSmallIcon(R.mipmap.ic_launcher)
                .setContentIntent(pendingIntent)
                .setOngoing(true)
                .setPriority(NotificationCompat.PRIORITY_LOW);

        Notification notification = builder.build();

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
            startForeground(NOTIFICATION_ID, notification, ServiceInfo.FOREGROUND_SERVICE_TYPE_LOCATION);
        } else {
            startForeground(NOTIFICATION_ID, notification);
        }

        if (wakeLock != null && !wakeLock.isHeld()) {
            wakeLock.acquire(12 * 60 * 60 * 1000L); // Max 12 hours safety hold
        }
    }

    private void startLocationUpdates() {
        if (locationManager == null) return;

        try {
            // Register GPS Provider (High Accuracy)
            if (locationManager.isProviderEnabled(LocationManager.GPS_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.GPS_PROVIDER,
                        10000L, // 10 seconds
                        5f,     // 5 meters
                        this
                );
            }

            // Register Network Provider as backup
            if (locationManager.isProviderEnabled(LocationManager.NETWORK_PROVIDER)) {
                locationManager.requestLocationUpdates(
                        LocationManager.NETWORK_PROVIDER,
                        15000L,
                        10f,
                        this
                );
            }

            // Also send last known location immediately if fresh and accurate
            Location lastGps = locationManager.getLastKnownLocation(LocationManager.GPS_PROVIDER);
            Location lastNet = locationManager.getLastKnownLocation(LocationManager.NETWORK_PROVIDER);
            Location best = null;
            long now = System.currentTimeMillis();
            if (lastGps != null && (now - lastGps.getTime() < 120000L)) {
                best = lastGps;
            } else if (lastNet != null && (now - lastNet.getTime() < 120000L)) {
                best = lastNet;
            }
            if (best != null && (!best.hasAccuracy() || best.getAccuracy() <= 250f)) {
                onLocationChanged(best);
            }

        } catch (SecurityException se) {
            Log.e(TAG, "Location permission not granted: " + se.getMessage());
        } catch (Exception e) {
            Log.e(TAG, "Error starting location updates: " + e.getMessage());
        }
    }

    @Override
    public void onLocationChanged(Location location) {
        if (location == null) return;

        // 1. Ignore location with zero coordinates
        if (Math.abs(location.getLatitude()) < 0.0001 && Math.abs(location.getLongitude()) < 0.0001) {
            return;
        }

        // 2. Ignore inaccurate locations (> 250 meters)
        if (location.hasAccuracy() && location.getAccuracy() > 250f) {
            Log.d(TAG, "Skipping inaccurate location fix: " + location.getAccuracy() + "m");
            return;
        }

        // 3. Ignore stale cached locations (> 2 minutes old)
        long locationAge = System.currentTimeMillis() - location.getTime();
        if (locationAge > 120000L) {
            Log.d(TAG, "Skipping stale location age: " + locationAge + "ms");
            return;
        }

        long now = System.currentTimeMillis();
        if (now - lastUploadTimestamp < MIN_INTERVAL_MS) {
            return;
        }
        lastUploadTimestamp = now;

        final double lat = location.getLatitude();
        final double lng = location.getLongitude();
        final double acc = location.hasAccuracy() ? location.getAccuracy() : 10.0;

        // Run network sync on background thread
        new Thread(() -> {
            sendLocationToSupabase(lat, lng, acc);
        }).start();
    }

    private void sendLocationToSupabase(double lat, double lng, double accuracy) {
        if (supabaseUrl == null || supabaseUrl.isEmpty() || workerId == null || workerId.isEmpty()) {
            return;
        }

        SimpleDateFormat isoFormat = new SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US);
        isoFormat.setTimeZone(TimeZone.getTimeZone("UTC"));
        String timestamp = isoFormat.format(new Date());

        try {
            // 1. Update profiles table
            String profileUrlStr = supabaseUrl + "/rest/v1/profiles?id=eq." + workerId;
            URL profileUrl = new URL(profileUrlStr);
            HttpURLConnection conn = (HttpURLConnection) profileUrl.openConnection();
            conn.setRequestMethod("PATCH");
            conn.setRequestProperty("Content-Type", "application/json");
            conn.setRequestProperty("apikey", supabaseKey);
            conn.setRequestProperty("Authorization", "Bearer " + supabaseKey);
            conn.setRequestProperty("Prefer", "return=minimal");
            conn.setDoOutput(true);
            conn.setConnectTimeout(10000);
            conn.setReadTimeout(10000);

            JSONObject profilePayload = new JSONObject();
            profilePayload.put("current_latitude", lat);
            profilePayload.put("current_longitude", lng);
            profilePayload.put("location_accuracy", accuracy);
            profilePayload.put("last_location_updated_at", timestamp);
            profilePayload.put("is_online", true);

            try (OutputStream os = conn.getOutputStream()) {
                os.write(profilePayload.toString().getBytes(StandardCharsets.UTF_8));
                os.flush();
            }

            int code = conn.getResponseCode();
            conn.disconnect();

            // 2. Insert into worker_locations breadcrumb trail
            String historyUrlStr = supabaseUrl + "/rest/v1/worker_locations";
            URL historyUrl = new URL(historyUrlStr);
            HttpURLConnection histConn = (HttpURLConnection) historyUrl.openConnection();
            histConn.setRequestMethod("POST");
            histConn.setRequestProperty("Content-Type", "application/json");
            histConn.setRequestProperty("apikey", supabaseKey);
            histConn.setRequestProperty("Authorization", "Bearer " + supabaseKey);
            histConn.setRequestProperty("Prefer", "return=minimal");
            histConn.setDoOutput(true);
            histConn.setConnectTimeout(10000);
            histConn.setReadTimeout(10000);

            JSONObject historyPayload = new JSONObject();
            historyPayload.put("worker_id", workerId);
            historyPayload.put("latitude", lat);
            historyPayload.put("longitude", lng);
            historyPayload.put("accuracy", accuracy);
            historyPayload.put("recorded_at", timestamp);

            try (OutputStream os = histConn.getOutputStream()) {
                os.write(historyPayload.toString().getBytes(StandardCharsets.UTF_8));
                os.flush();
            }

            histConn.getResponseCode();
            histConn.disconnect();

        } catch (Exception e) {
            Log.w(TAG, "Failed to upload location to Supabase: " + e.getMessage());
        }
    }

    private void stopTracking() {
        if (locationManager != null) {
            try {
                locationManager.removeUpdates(this);
            } catch (Exception e) {
                Log.w(TAG, "Error removing location updates: " + e.getMessage());
            }
        }
        if (wakeLock != null && wakeLock.isHeld()) {
            wakeLock.release();
        }
        stopForeground(true);
    }

    @Override
    public void onDestroy() {
        stopTracking();
        super.onDestroy();
    }

    @Nullable
    @Override
    public IBinder onBind(Intent intent) {
        return null;
    }

    @Override
    public void onStatusChanged(String provider, int status, Bundle extras) {}

    @Override
    public void onProviderEnabled(String provider) {}

    @Override
    public void onProviderDisabled(String provider) {}
}
