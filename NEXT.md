# NEXT — Follow-up increments

Small, scoped items for the next micro-improver run against this repo.

1. **Bump `react-redux` to `^8.1.3`.** It's React-18-compatible and keeps
   `redux@4`, so this removes the `ERESOLVE` peer-dependency conflict that
   currently forces `npm install --legacy-peer-deps` (see README's Setup &
   Run section). Update `my-project/package.json`, reinstall, and smoke-test
   the app still starts and scores correctly.

2. **Untrack committed `node_modules` and add a `.gitignore`.** The repo has
   no `.gitignore` anywhere and `my-project/node_modules` (26k+ files) is
   checked into git. Add a `.gitignore` (root and/or `my-project/`) covering
   `node_modules/`, `.expo/`, and standard Expo/RN build artifacts, then
   `git rm -r --cached my-project/node_modules` in a dedicated commit.

3. **`Square.js` never clears its `setInterval`/`setTimeout` on unmount.**
   The mole timers keep running (and can call `setState` on unmounted
   components) if a `Square` unmounts mid-round. Clear the interval/timeout
   in a cleanup function (`useEffect` return, or `componentWillUnmount`).

4. **`randomTime = Math.random() * 20000` gives wildly uneven spawn
   rates.** Each `Square` picks one unbounded interval in `[0, 20000)` ms at
   mount and keeps it for the whole round. The tails are both bad: a hole
   that draws ~20s only pops two or three times in a 60-second round (near
   dead), while a hole that draws a few dozen ms fires `setInterval` many
   times per second, so its mole is effectively always up and it thrashes
   the render loop. Clamp the range (e.g. 800–3000ms) so every hole gets a
   fair, playable number of chances. Note `randomTime` is also recomputed
   on every render even though the `[]`-dep effect only ever reads the
   mount-time value — worth tidying at the same time.

5. **Add accessibility labels to the mole `TouchableOpacity`.** The
   tappable mole elements currently have no `accessibilityLabel` /
   `accessibilityRole`, so screen readers can't announce them. Add labels
   (e.g. "Mole, hole 3" / "Empty hole 3") so the game is usable with
   assistive tech.
