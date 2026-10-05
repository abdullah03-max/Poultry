package com.shanpoultry.worker;

import android.Manifest;
import android.content.ClipData;
import android.content.Intent;
import android.content.pm.PackageManager;
import android.graphics.Color;
import android.net.Uri;
import android.os.Build;
import android.os.Bundle;
import android.os.Environment;
import android.provider.MediaStore;
import android.view.View;
import android.view.Window;
import android.view.WindowInsetsController;
import android.webkit.PermissionRequest;
import android.webkit.ValueCallback;
import android.webkit.WebChromeClient;
import android.webkit.WebResourceRequest;
import android.webkit.WebResourceResponse;
import android.webkit.WebSettings;
import android.webkit.WebView;
import android.webkit.WebViewClient;
import android.widget.ProgressBar;
import android.widget.Toast;

import androidx.activity.OnBackPressedCallback;
import androidx.annotation.NonNull;
import androidx.annotation.Nullable;
import androidx.appcompat.app.AppCompatActivity;
import androidx.core.app.ActivityCompat;
import androidx.core.content.ContextCompat;
import androidx.core.content.FileProvider;
import androidx.webkit.WebViewAssetLoader;

import java.io.File;
import java.io.IOException;
import java.text.SimpleDateFormat;
import java.util.Date;
import java.util.Locale;

public class MainActivity extends AppCompatActivity {

    private static final int FILECHOOSER_RESULTCODE = 1001;
    private static final int PERMISSION_REQUEST_CODE = 2001;

    private WebView webView;
    private ProgressBar progressBar;
    private ValueCallback<Uri[]> mUploadMessage;
    private String mCameraPhotoPath;
    private long backPressedTime = 0;

    @Override
    protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        setContentView(R.layout.activity_main);

        setupStatusBar();
        requestRequiredPermissions();

        webView = findViewById(R.id.webView);
        progressBar = findViewById(R.id.progressBar);

        setupWebView();
        setupBackNavigation();
    }

    private void setupStatusBar() {
        Window window = getWindow();
        window.setStatusBarColor(Color.parseColor("#F8FAFC"));

        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
            WindowInsetsController controller = window.getInsetsController();
            if (controller != null) {
                controller.setSystemBarsAppearance(
                        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS,
                        WindowInsetsController.APPEARANCE_LIGHT_STATUS_BARS
                );
            }
        } else if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.M) {
            View decor = window.getDecorView();
            decor.setSystemUiVisibility(decor.getSystemUiVisibility() | View.SYSTEM_UI_FLAG_LIGHT_STATUS_BAR);
        }
    }

    private void requestRequiredPermissions() {
        java.util.List<String> perms = new java.util.ArrayList<>();
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.CAMERA) != PackageManager.PERMISSION_GRANTED) {
            perms.add(Manifest.permission.CAMERA);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_FINE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            perms.add(Manifest.permission.ACCESS_FINE_LOCATION);
        }
        if (ContextCompat.checkSelfPermission(this, Manifest.permission.ACCESS_COARSE_LOCATION) != PackageManager.PERMISSION_GRANTED) {
            perms.add(Manifest.permission.ACCESS_COARSE_LOCATION);
        }
        if (!perms.isEmpty()) {
            ActivityCompat.requestPermissions(this, perms.toArray(new String[0]), PERMISSION_REQUEST_CODE);
        }
    }

    private void setupWebView() {
        WebSettings settings = webView.getSettings();
        settings.setJavaScriptEnabled(true);
        settings.setDomStorageEnabled(true);
        settings.setDatabaseEnabled(true);
        settings.setGeolocationEnabled(true);
        settings.setAllowFileAccess(true);
        settings.setAllowContentAccess(true);
        settings.setAllowFileAccessFromFileURLs(true);
        settings.setAllowUniversalAccessFromFileURLs(true);
        settings.setMixedContentMode(WebSettings.MIXED_CONTENT_ALWAYS_ALLOW);
        settings.setMediaPlaybackRequiresUserGesture(false);
        settings.setLoadWithOverviewMode(true);
        settings.setUseWideViewPort(true);
        settings.setSupportZoom(false);
        settings.setBuiltInZoomControls(false);
        settings.setDisplayZoomControls(false);

        final WebViewAssetLoader assetLoader = new WebViewAssetLoader.Builder()
                .addPathHandler("/assets/", new WebViewAssetLoader.AssetsPathHandler(this))
                .build();

        webView.setWebViewClient(new WebViewClient() {
            @Override
            public WebResourceResponse shouldInterceptRequest(WebView view, WebResourceRequest request) {
                return assetLoader.shouldInterceptRequest(request.getUrl());
            }

            @Override
            public boolean shouldOverrideUrlLoading(WebView view, WebResourceRequest request) {
                Uri uri = request.getUrl();
                String scheme = uri.getScheme();
                String urlStr = uri.toString();
                if ("tel".equalsIgnoreCase(scheme)) {
                    Intent intent = new Intent(Intent.ACTION_DIAL, uri);
                    startActivity(intent);
                    return true;
                } else if ("mailto".equalsIgnoreCase(scheme) || "whatsapp".equalsIgnoreCase(scheme) ||
                           urlStr.contains("api.whatsapp.com") || urlStr.contains("wa.me")) {
                    try {
                        Intent intent = new Intent(Intent.ACTION_VIEW, uri);
                        startActivity(intent);
                        return true;
                    } catch (Exception e) {
                        Toast.makeText(MainActivity.this, "WhatsApp not installed or could not be opened", Toast.LENGTH_SHORT).show();
                    }
                }
                return false;
            }
        });

        webView.setWebChromeClient(new WebChromeClient() {
            @Override
            public void onProgressChanged(WebView view, int newProgress) {
                if (newProgress < 100) {
                    progressBar.setVisibility(View.VISIBLE);
                    progressBar.setProgress(newProgress);
                } else {
                    progressBar.setVisibility(View.GONE);
                }
            }

            @Override
            public void onGeolocationPermissionsShowPrompt(String origin, android.webkit.GeolocationPermissions.Callback callback) {
                callback.invoke(origin, true, false);
            }

            @Override
            public void onPermissionRequest(PermissionRequest request) {
                request.grant(request.getResources());
            }

            @Override
            public boolean onShowFileChooser(WebView webView, ValueCallback<Uri[]> filePathCallback,
                                            FileChooserParams fileChooserParams) {
                if (mUploadMessage != null) {
                    mUploadMessage.onReceiveValue(null);
                    mUploadMessage = null;
                }

                mUploadMessage = filePathCallback;

                Intent takePictureIntent = new Intent(MediaStore.ACTION_IMAGE_CAPTURE);
                File photoFile = null;
                try {
                    photoFile = createImageFile();
                    if (photoFile != null) {
                        Uri photoURI = FileProvider.getUriForFile(
                                MainActivity.this,
                                "com.shanpoultry.worker.fileprovider",
                                photoFile
                        );
                        takePictureIntent.putExtra(MediaStore.EXTRA_OUTPUT, photoURI);
                    }
                } catch (IOException ex) {
                    takePictureIntent = null;
                }

                Intent contentSelectionIntent = new Intent(Intent.ACTION_GET_CONTENT);
                contentSelectionIntent.addCategory(Intent.CATEGORY_OPENABLE);
                contentSelectionIntent.setType("image/*");

                Intent[] intentArray;
                if (takePictureIntent != null) {
                    intentArray = new Intent[]{takePictureIntent};
                } else {
                    intentArray = new Intent[0];
                }

                Intent chooserIntent = new Intent(Intent.ACTION_CHOOSER);
                chooserIntent.putExtra(Intent.EXTRA_INTENT, contentSelectionIntent);
                chooserIntent.putExtra(Intent.EXTRA_TITLE, "Capture or Select Photo");
                chooserIntent.putExtra(Intent.EXTRA_INITIAL_INTENTS, intentArray);

                startActivityForResult(chooserIntent, FILECHOOSER_RESULTCODE);
                return true;
            }
        });

        // Register Android JavaScript Bridge for Native WhatsApp Image Sharing & Direct Download
        webView.addJavascriptInterface(new AndroidBridge(), "AndroidBridge");

        // Load the local Daylight worker app via WebViewAssetLoader
        webView.loadUrl("https://appassets.androidplatform.net/assets/www/index.html");
    }

    private File createImageFile() throws IOException {
        String timeStamp = new SimpleDateFormat("yyyyMMdd_HHmmss", Locale.getDefault()).format(new Date());
        String imageFileName = "JPEG_" + timeStamp + "_";
        File storageDir = getExternalFilesDir(Environment.DIRECTORY_PICTURES);
        if (storageDir == null) {
            storageDir = getCacheDir();
        }
        File image = File.createTempFile(imageFileName, ".jpg", storageDir);
        mCameraPhotoPath = image.getAbsolutePath();
        return image;
    }

    @Override
    protected void onActivityResult(int requestCode, int resultCode, @Nullable Intent data) {
        super.onActivityResult(requestCode, resultCode, data);

        if (requestCode == FILECHOOSER_RESULTCODE) {
            if (mUploadMessage == null) return;

            Uri[] results = null;

            if (resultCode == RESULT_OK) {
                if (data == null || data.getData() == null) {
                    // Photo was taken with Camera
                    if (mCameraPhotoPath != null) {
                        File file = new File(mCameraPhotoPath);
                        if (file.exists() && file.length() > 0) {
                            results = new Uri[]{Uri.fromFile(file)};
                        }
                    }
                } else {
                    String dataString = data.getDataString();
                    ClipData clipData = data.getClipData();

                    if (clipData != null) {
                        results = new Uri[clipData.getItemCount()];
                        for (int i = 0; i < clipData.getItemCount(); i++) {
                            results[i] = clipData.getItemAt(i).getUri();
                        }
                    } else if (dataString != null) {
                        results = new Uri[]{Uri.parse(dataString)};
                    }
                }
            }

            mUploadMessage.onReceiveValue(results);
            mUploadMessage = null;
        }
    }

    private void setupBackNavigation() {
        getOnBackPressedDispatcher().addCallback(this, new OnBackPressedCallback(true) {
            @Override
            public void handleOnBackPressed() {
                if (webView.canGoBack()) {
                    webView.goBack();
                } else {
                    if (backPressedTime + 2000 > System.currentTimeMillis()) {
                        finish();
                    } else {
                        Toast.makeText(MainActivity.this, "Press back again to exit", Toast.LENGTH_SHORT).show();
                        backPressedTime = System.currentTimeMillis();
                    }
                }
            }
        });
    }

    @Override
    protected void onResume() {
        super.onResume();
        if (webView != null) {
            webView.onResume();
        }
    }

    @Override
    protected void onPause() {
        super.onPause();
        if (webView != null) {
            webView.onPause();
        }
    }

    @Override
    protected void onDestroy() {
        if (webView != null) {
            webView.destroy();
        }
        super.onDestroy();
    }

    public class AndroidBridge {

        @android.webkit.JavascriptInterface
        public boolean isNativeApp() {
            return true;
        }

        @android.webkit.JavascriptInterface
        public void shareReceiptImage(final String base64Data, final String filename, final String phone, final String caption) {
            runOnUiThread(() -> {
                try {
                    String cleanBase64 = base64Data;
                    if (cleanBase64.contains(",")) {
                        cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                    }
                    byte[] decodedBytes = android.util.Base64.decode(cleanBase64, android.util.Base64.DEFAULT);

                    // Save to cache receipts directory
                    File receiptsDir = new File(getCacheDir(), "receipts");
                    if (!receiptsDir.exists()) {
                        receiptsDir.mkdirs();
                    }
                    String safeFilename = (filename != null && !filename.isEmpty()) ? filename : "Receipt_" + System.currentTimeMillis() + ".png";
                    File imageFile = new File(receiptsDir, safeFilename);
                    try (java.io.FileOutputStream fos = new java.io.FileOutputStream(imageFile)) {
                        fos.write(decodedBytes);
                        fos.flush();
                    }

                    Uri contentUri = FileProvider.getUriForFile(
                            MainActivity.this,
                            getPackageName() + ".fileprovider",
                            imageFile
                    );

                    // Normalize phone number (e.g. 923001234567)
                    String cleanPhone = phone != null ? phone.replaceAll("[^0-9]", "") : "";
                    if (cleanPhone.startsWith("03")) {
                        cleanPhone = "92" + cleanPhone.substring(1);
                    } else if (cleanPhone.startsWith("3") && cleanPhone.length() == 10) {
                        cleanPhone = "92" + cleanPhone;
                    }

                    Intent shareIntent = new Intent(Intent.ACTION_SEND);
                    shareIntent.setType("image/png");
                    shareIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                    if (caption != null && !caption.isEmpty()) {
                        shareIntent.putExtra(Intent.EXTRA_TEXT, caption);
                    }
                    shareIntent.setClipData(ClipData.newRawUri("Receipt", contentUri));
                    shareIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);

                    boolean sentDirect = false;
                    if (cleanPhone.length() >= 10) {
                        // Check if standard WhatsApp is installed and launch targeted intent
                        try {
                            Intent waIntent = new Intent(Intent.ACTION_SEND);
                            waIntent.setType("image/png");
                            waIntent.setPackage("com.whatsapp");
                            waIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                            waIntent.putExtra("jid", cleanPhone + "@s.whatsapp.net");
                            if (caption != null && !caption.isEmpty()) {
                                waIntent.putExtra(Intent.EXTRA_TEXT, caption);
                            }
                            waIntent.setClipData(ClipData.newRawUri("Receipt", contentUri));
                            waIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            try {
                                grantUriPermission("com.whatsapp", contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                            } catch (Exception ignored) {}
                            startActivity(waIntent);
                            sentDirect = true;
                        } catch (Exception e1) {
                            // Try WhatsApp Business
                            try {
                                Intent waBizIntent = new Intent(Intent.ACTION_SEND);
                                waBizIntent.setType("image/png");
                                waBizIntent.setPackage("com.whatsapp.w4b");
                                waBizIntent.putExtra(Intent.EXTRA_STREAM, contentUri);
                                waBizIntent.putExtra("jid", cleanPhone + "@s.whatsapp.net");
                                if (caption != null && !caption.isEmpty()) {
                                    waBizIntent.putExtra(Intent.EXTRA_TEXT, caption);
                                }
                                waBizIntent.setClipData(ClipData.newRawUri("Receipt", contentUri));
                                waBizIntent.addFlags(Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                try {
                                    grantUriPermission("com.whatsapp.w4b", contentUri, Intent.FLAG_GRANT_READ_URI_PERMISSION);
                                } catch (Exception ignored) {}
                                startActivity(waBizIntent);
                                sentDirect = true;
                            } catch (Exception e2) {
                                sentDirect = false;
                            }
                        }
                    }

                    if (!sentDirect) {
                        Intent chooser = Intent.createChooser(shareIntent, "واٹس ایپ پر رسید تصویر بھیجیں (Share Receipt Image)");
                        startActivity(chooser);
                    }

                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Error sharing receipt image: " + e.getMessage(), Toast.LENGTH_LONG).show();
                }
            });
        }

        @android.webkit.JavascriptInterface
        public void downloadReceiptImage(final String base64Data, final String filename) {
            runOnUiThread(() -> {
                try {
                    String cleanBase64 = base64Data;
                    if (cleanBase64.contains(",")) {
                        cleanBase64 = cleanBase64.substring(cleanBase64.indexOf(",") + 1);
                    }
                    byte[] decodedBytes = android.util.Base64.decode(cleanBase64, android.util.Base64.DEFAULT);
                    String safeFilename = (filename != null && !filename.isEmpty()) ? filename : "Receipt_" + System.currentTimeMillis() + ".png";

                    if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.Q) {
                        android.content.ContentValues values = new android.content.ContentValues();
                        values.put(MediaStore.Images.Media.DISPLAY_NAME, safeFilename);
                        values.put(MediaStore.Images.Media.MIME_TYPE, "image/png");
                        values.put(MediaStore.Images.Media.RELATIVE_PATH, Environment.DIRECTORY_PICTURES + "/ShanPoultry");
                        Uri uri = getContentResolver().insert(MediaStore.Images.Media.EXTERNAL_CONTENT_URI, values);
                        if (uri != null) {
                            try (java.io.OutputStream out = getContentResolver().openOutputStream(uri)) {
                                if (out != null) {
                                    out.write(decodedBytes);
                                    out.flush();
                                }
                            }
                        }
                    } else {
                        File picturesDir = Environment.getExternalStoragePublicDirectory(Environment.DIRECTORY_PICTURES);
                        File sppDir = new File(picturesDir, "ShanPoultry");
                        if (!sppDir.exists()) sppDir.mkdirs();
                        File destFile = new File(sppDir, safeFilename);
                        try (java.io.FileOutputStream fos = new java.io.FileOutputStream(destFile)) {
                            fos.write(decodedBytes);
                            fos.flush();
                        }
                        android.media.MediaScannerConnection.scanFile(
                                MainActivity.this,
                                new String[]{destFile.getAbsolutePath()},
                                new String[]{"image/png"},
                                null
                        );
                    }

                    Toast.makeText(MainActivity.this, "رسید تصویر گیلری میں محفوظ ہو گئی!\nSaved to Pictures/ShanPoultry", Toast.LENGTH_LONG).show();
                } catch (Exception e) {
                    Toast.makeText(MainActivity.this, "Failed to save image: " + e.getMessage(), Toast.LENGTH_SHORT).show();
                }
            });
        }
    }
}
