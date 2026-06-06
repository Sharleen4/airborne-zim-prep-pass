# Android Wrapper

This project uses Capacitor to wrap the Vite/PWA build as an Android app.

## App IDs

- App name: Zamaai Primary
- Android package ID: `com.zamaai.primary`
- Web build directory: `dist`

## Local Workflow

From the project directory:

```powershell
npm install
npm run cap:sync
npm run cap:open
```

`npm run cap:sync` builds the web app and copies `dist` into the Android project.

`npm run cap:open` opens the native project in Android Studio.

## Build APK For Testing

After installing Android Studio and a JDK:

```powershell
npm run android:build
```

The debug APK will be created under:

```text
android/app/build/outputs/apk/debug/
```

## Play Store Build

For Play Store, build a signed Android App Bundle from Android Studio:

1. Open Android Studio.
2. Open the `android` folder.
3. Choose Build > Generate Signed Bundle / APK.
4. Select Android App Bundle.
5. Create or select a release signing key.
6. Upload the generated `.aab` file to Google Play Console.

## Important Notes

- Run `npm run cap:sync` after every web app change before building Android.
- The offline app data uses the same IndexedDB and service worker logic from the web app.
- Real online login still depends on the hosted Base44 configuration.
