# Born Slippy music electronica app

This folder contains a standalone React + Vite project for the Born Slippy groove drum sequencer app.

## What is included

- `src/App.jsx` — sequencer UI, Web Audio synthesis, MIDI output, preset save/recall, experimental fade feature
- `src/main.jsx` — React entry point
- `src/index.css` — global reset and typography styles
- `index.html` — Vite app shell
- `package.json` / `vite.config.js` — project configuration
- `public/favicon.svg` — minimal app icon

## Dependencies

- `react` ^19.2.4
- `react-dom` ^19.2.4
- `vite` ^8.0.4
- `@vitejs/plugin-react` ^6.0.1

## Setup

From `/export`:

```bash
npm install
npm run dev
```

Then open the local URL shown by Vite.

## Notes

- The app uses the Web MIDI API for MIDI output.
- On iPhone, open the app in Safari and connect your Elektron device by USB-C.
- MIDI channels are fixed to 1-4 for Bass, Kick, Hats, Clap.
- The experimental fade section transitions slider values between saved presets.
