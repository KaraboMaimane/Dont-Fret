# Don't Fret 🎸

[![Build All Platforms](https://github.com/KaraboMaimane/Dont-Fret/actions/workflows/build.yml/badge.svg)](https://github.com/KaraboMaimane/Dont-Fret/actions/workflows/build.yml)
[![Build iOS (manual)](https://github.com/KaraboMaimane/Dont-Fret/actions/workflows/build-ios.yml/badge.svg)](https://github.com/KaraboMaimane/Dont-Fret/actions/workflows/build-ios.yml)

**Don't Fret** is a mobile-first music theory learning app for guitarists. It uses adaptive difficulty, spaced repetition, and a structured 7-stage learning path to help you master keys, scales, and intervals — one drill at a time.

---

## Features

- **Structured Learning Path** — 7 progressive stages covering key signatures, scale degrees, and melodic intervals. Each stage unlocks the next.
- **Adaptive Difficulty** — The engine tracks your accuracy per key/interval cell and surfaces your weak spots automatically.
- **Spaced Repetition** — Struggling with F# major? The app will queue it more often until your accuracy improves.
- **Milestone Badges** — Earn achievements for streaks, accuracy thresholds, session counts, and boss-round victories.
- **Daily Goals & Streaks** — Set a daily question target. Build and maintain a practice streak.
- **Mastery Heatmap** — Visual overview of accuracy across every key × interval combination.
- **Session History** — Sparkline chart of your last N sessions, with accuracy and speed data.
- **Needs Work** — Dashboard section that surfaces your two weakest key/interval cells for quick drilling.

---

## Game Modes

| Mode | Description | Unlocks at |
|---|---|---|
| **Foundations** | Stage-gated drills: Scale Fill (fill in the scale degrees) and Key Signatures (identify key sigs). Drives the main learning path. | Always available |
| **Practice** | Open-ended interval identification. Choose a key or go random. Includes scale hints and interval clues. | Always available |
| **Scale Builder** | Build and visualize major/minor scales interactively. Sessions are saved to history. | Always available |
| **Timed Challenge** | Race against the clock — answer as many interval questions as possible before time runs out. | Stage 5 |
| **Worksheet Challenge** | Fixed-question worksheet format. Answer all, then review your score. | Stage 6 |
| **Blitz Mode** | Rapid-fire, no delay between questions. Pure speed and muscle memory. | Stage 7 |
| **Exam** | 10-question timed exam with a pass/fail grade. Interval clues available. Abandoning forfeits the attempt. | Stage 7 |

---

## Tech Stack

| Layer | Technology |
|---|---|
| Framework | Angular 21 (standalone components) |
| UI | Ionic 8 |
| Mobile | Capacitor 8 |
| Styling | SCSS with CSS custom properties |
| Testing | Vitest |
| CI/CD | GitHub Actions — Web (GitHub Pages) + Android APK + iOS (manual) |

---

## Project Structure

```
src/app/
├── pages/
│   ├── dashboard/           # Home screen: continue card, mode grid, stage, needs work, history
│   ├── foundations/         # Scale fill & key signature drills (learning path driver)
│   ├── practice/            # Free interval practice
│   ├── scale-builder/       # Interactive scale visualization
│   ├── timed-challenge/     # Speed round
│   ├── worksheet-challenge/ # Fixed-sheet format
│   ├── blitz-mode/          # Rapid-fire drills
│   ├── exam/                # Formal 10-question exam
│   ├── learning-path/       # Stage map and progress view
│   └── settings/            # Preferences (sharp/flat display, daily goal)
└── services/
    ├── music-theory.service.ts   # Scale/interval calculations, question generation
    ├── learning-path.service.ts  # Stage progression, unlock logic, drill routing
    ├── adaptive.service.ts       # Per-cell accuracy tracking, question weighting
    ├── progress.service.ts       # Session history, heatmap data, mastery levels
    ├── milestone.service.ts      # Badge definitions and award logic
    └── streak.service.ts         # Daily streak and goal tracking
```

---

## Getting Started (Local Development)

### Prerequisites

- Node.js 22 (LTS)
- npm 10+

### Install & Run

```bash
npm install
npm start
# → http://localhost:4200
```

### Run Tests

```bash
npm test
```

---

## Building the Android APK

### One-time setup (macOS)

1. Install [Android Studio](https://developer.android.com/studio) — the SDK will land at `~/Library/Android/sdk`
2. Install JDK 21: `brew install openjdk@21`

### Every build

```bash
npm run build && npx cap sync android && \
  JAVA_HOME=/opt/homebrew/opt/openjdk@21 \
  ANDROID_HOME=~/Library/Android/sdk \
  ./android/gradlew -p android assembleDebug
```

APK output: `android/app/build/outputs/apk/debug/`

### Sideload to device

With USB debugging enabled on your Android phone:

```bash
adb install android/app/build/outputs/apk/debug/app-debug.apk
```

Or copy the APK to the phone and open it (requires *Install unknown apps* enabled in Settings).

---

## CI/CD

### Workflows at a glance

| Workflow | File | Trigger | Output |
|---|---|---|---|
| **Build All Platforms** | `build.yml` | Push or PR to `master` | Unit tests + GitHub Pages deploy + debug APK (unlocked) + release unsigned APK (locked) |
| **Build iOS** | `build-ios.yml` | Manual (`workflow_dispatch`) | Simulator validation (signed IPA when secrets configured) |

### How it works

Every push (or PR) to `master` runs these jobs in `build.yml`:

1. **`test`** — Runs the unit test suite (`npm test -- --watch=false`) and gates downstream build jobs.
2. **`build-web`** — Installs dependencies, builds for GitHub Pages with `--base-href /Dont-Fret/`, validates output, and uploads the Pages artifact.
3. **`deploy-web`** *(push to master only)* — Deploys the Pages artifact to **https://karabomaimane.github.io/Dont-Fret/**. Pull requests build but do not deploy.
4. **`build-android`** — Builds two Android variants:
  - **Debug APK (unlocked)** using the `debug-unlocked` Angular configuration.
  - **Release unsigned APK (locked)** using the production Angular configuration.

### Versioning

- **`versionName`** — `<package.json version>-build.<run_number>` e.g. `1.0.0-build.7`
- **`versionCode`** — the GitHub Actions run number (always-increasing integer Android uses to determine update order)

Both values are injected into `android/app/build.gradle` at build time — no manual edits needed.

### Downloading Android artifacts

1. Go to the **Actions** tab on this repo
2. Click the latest **Build All Platforms** run
3. Download one (or both) artifacts from the **Artifacts** section:
  - `dont-fret-debug-unlocked-<version>`
  - `dont-fret-release-unsigned-<version>`

### Lock behavior by APK type

- **Debug APK**: lesson/stage locks can be overridden from **Settings → Developer Tools**.
- **Release unsigned APK**: dev overrides are disabled; normal lesson locking is always enforced.

### Running the iOS build manually

1. Go to **Actions → Build iOS**
2. Click **Run workflow** → **Run workflow**
3. The workflow runs unit tests first, then validates against the iOS Simulator with no code-signing required
4. To export a real-device IPA, add the four secrets below and uncomment the export steps in `build-ios.yml`

| Secret | How to generate |
|---|---|
| `APPLE_CERTIFICATE` | `base64 -i YourCert.p12` |
| `APPLE_CERTIFICATE_PASSWORD` | Password for the `.p12` |
| `APPLE_PROVISIONING_PROFILE` | `base64 -i Profile.mobileprovision` |
| `APPLE_TEAM_ID` | Your 10-character Apple Developer Team ID |

### One-time GitHub Pages setup

1. Go to **Settings → Pages** on this repo
2. Set **Source** to **GitHub Actions**
3. Push to `master` — the `deploy-web` job publishes automatically

### Bumping the base version

For a major feature release, bump the version in `package.json` and push:

```bash
npm version minor   # 1.0.0 → 1.1.0
npm version major   # 1.0.0 → 2.0.0
npm version patch   # 1.0.0 → 1.0.1
git push --follow-tags
```

The next CI run will pick up the new base and name the build accordingly (e.g. `1.1.0-build.12`).

---

## Contributing

1. Fork the repo and create a feature branch off `master`
2. Make your changes and run `npm test` to verify nothing is broken
3. Open a pull request — CI will run tests, build web for GitHub Pages, and produce both Android artifacts automatically
