# Mobile APK – What You Have vs What You Need

## Backend (this project) – **Ready**

| Item | Status | Notes |
|------|--------|--------|
| **Auth** | ✅ | `POST /api/login` (server/auth.ts); JWT/session; CORS allows requests with no `Origin` (mobile). |
| **Incidents** | ✅ | `GET/POST /api/incidents`, `POST /api/incidents/:id/attachments` (multipart). |
| **Assignments** | ✅ | `GET /api/responders/assignments?type=kinetic\|non_kinetic` (auth required). |
| **Health** | ✅ | `GET /api/health` for connection checks. |
| **CORS** | ✅ | Configured so mobile clients (no Origin or listed origins) can call the API. |
| **File upload** | ✅ | Incident attachments supported. |

**Conclusion:** The server has everything needed for a field-agent mobile app (login, assignments, report incidents, upload photos).

---

## Mobile app (`apps/field-agent`) – **Incomplete**

After the last wipe, the app is only partially there.

### Currently present

| Item | Status |
|------|--------|
| `src/api/client.ts` | ✅ API client (base URL, token, health check). |
| `src/storage/offlineQueue.ts` | ✅ Offline queue (if present). |
| `src/sync/syncWorker.ts` | ✅ Sync worker (if present). |
| `node_modules` | ✅ Dependencies on disk (but no `package.json` to define them). |

### Missing (required to design, develop, and compile an APK)

| Item | Purpose |
|------|--------|
| **`package.json`** | Scripts (`start`, `android`), dependencies (react-native, navigation, etc.). |
| **`index.js`** | Entry; registers the root component with `AppRegistry`. |
| **`App.tsx`** | Root UI (navigation, auth vs main flow). |
| **`app.json`** | App name for React Native CLI. |
| **Screens** | Login, Home/Assignments, Report Incident, Map, Profile (and any others). |
| **Auth context** | Login state, token storage, logout. |
| **`android/`** | Full Android project: `build.gradle`, `settings.gradle`, `app/`, Gradle wrapper, `local.properties` (sdk.dir). |
| **`babel.config.js`** | Babel config for React Native. |
| **`metro.config.js`** | Metro bundler config. |
| **`tsconfig.json`** | TypeScript config for the app. |

Without these, you cannot run the app or run `gradlew assembleDebug` to produce an APK.

---

## Your machine – **Ready for building an APK**

| Item | Status |
|------|--------|
| **Android SDK** | ✅ (used for previous builds). |
| **NDK** | ✅ 26, 27, 29 installed. |
| **Java** | ✅ (e.g. JDK 21). |
| **Long paths (Windows)** | ⚠️ Use `subst W: "C:\...\apps\field-agent"` and build from `W:\android` to avoid 260‑char path limit. |

---

## Summary

- **Backend:** You have everything needed to support a field-agent mobile app and to call it from an APK.
- **Mobile app:** You do **not** have everything needed to design, develop, and compile an APK. The app is missing:
  - Root project files (`package.json`, `index.js`, `App.tsx`, `app.json`, Babel/Metro/TS config).
  - Full set of screens and auth context.
  - The entire **`android/`** project (so there is nothing for Gradle to build into an APK).

To get to a state where you can design, develop, and compile an APK you need to either:

1. **Recreate the mobile app** (e.g. `npx @react-native-community/cli init` then move/copy your `src` and wire up the existing API), or  
2. **Restore** a full `apps/field-agent` tree (including `package.json`, `App.tsx`, and `android/`) from backup or from a previous commit.

After that, building the APK is: `cd apps/field-agent/android` (or `W:\android` if using `subst`) and run `.\gradlew.bat assembleDebug`.
