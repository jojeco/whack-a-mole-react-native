# Whack-a-Mole (React Native / Expo)

A classic whack-a-mole game built with Expo and React Native. Moles pop up at
random positions on a grid; tap them before they disappear to score points
against the clock.

## How to Play

1. Start the app (see **Setup & Run** below) and open it in Expo Go, a web
   browser, or a simulator.
2. Each hole pops its mole on its own randomized interval; a mole stays
   visible for about 0.8 seconds before it drops back down.
3. Tap ("whack") a mole while it's visible to score a point.
4. Keep whacking moles until the 60-second round timer runs out — try to
   beat your previous score.

## Tech Stack

- **Expo** ~50
- **React Native** 0.73.4
- **React** 18.2.0
- **Redux** 4 + **react-redux** 7.2.1 for game state (score, active moles,
  timer)

## Project Layout

```
.
└── my-project/          # the actual Expo app lives here
    ├── App.js           # app entry point
    ├── app.json         # Expo config
    ├── components/      # UI components (board, moles, etc.)
    ├── redux/           # Redux store, actions, reducers
    ├── assets/          # images/icons
    └── package.json
```

All app code, dependencies, and scripts are rooted in `my-project/`, not the
repo root.

## Setup & Run

The app dependencies live in `my-project/`, so `cd` into it first.

**Important:** a plain `npm install` fails with an `ERESOLVE` peer-dependency
conflict. The repo pins `react@18.2.0`, but `react-redux@^7.2.1` only
declares a peer dependency on `react@^16.8.3`, so npm's default resolver
refuses to install. Use `--legacy-peer-deps` to skip strict peer-dependency
checking (this has been verified to work):

```bash
cd my-project
npm install --legacy-peer-deps
```

Then start the app:

```bash
npm start        # opens Expo dev tools / QR code (Expo Go, iOS, Android)
npm run web      # runs directly in a browser
```

See `NEXT.md` for known follow-up work (dependency upgrade path, cleanup,
and a few gameplay/accessibility fixes).
