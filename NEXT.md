# Next Increments

- **Sync Square's internal 60s timer with GameBoard's `timeLeft`.** Square.js runs its own
  independent `setTimeout(endGame, 60 * 1000)` and sets a local `isGameOver` state that is
  still never read after this change (it's set but has no effect on rendering). Since
  GameBoard now remounts Square via the `key={round}` trick, both timers restart together,
  but it would be cleaner to drive game-over purely from GameBoard's timer (e.g. pass
  `isGameOver` down as a prop) and delete the redundant per-Square timer/state entirely.

- **Fix the `npm install` peer-dependency conflict.** The repo pins `react@18.2.0` but
  `react-redux@^7.2.1` only supports `react@^16.8.3` as a peer, so a plain `npm install`
  fails with ERESOLVE on npm 7+ (confirmed on the unmodified repo, unrelated to this
  change). `npm install --legacy-peer-deps` works around it. Worth either bumping
  `react-redux` to a v8/v9 release that supports React 18, or documenting the flag in a
  README so future contributors aren't surprised.

- **Difficulty scaling / round counter surfacing.** Now that `round` exists in GameBoard,
  it could be used for more than remounting — e.g. show "Round {round}" in the UI, or
  shorten `randomTime` in Square as rounds increase for a difficulty curve.

- **Persist a high score.** `score` resets to 0 on Play Again with no memory of the best
  run; a `bestScore` field in the reducer (untouched by `RESET_SCORE`) would let the
  Game Over screen show "Best: X" alongside the final score.
