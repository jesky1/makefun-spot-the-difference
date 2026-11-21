# makefun-spot-the-difference

[![make.fun · best-spot-the-difference-game-20261121-0451](https://make.fun/badge/best-spot-the-difference-game-20261121-0451.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![rank](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/jesky1/makefun-spot-the-difference/rank.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)
[![reward](https://make.fun/badge/best-spot-the-difference-game-20261121-0451/jesky1/makefun-spot-the-difference/reward.svg)](https://make.fun/bounty/best-spot-the-difference-game-20261121-0451?utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451)

**Sunset Cove — Spot the Difference.** A cozy seaside café at golden hour,
drawn twice side by side as pure canvas vector art — no images, no libraries,
no network. The right-hand picture quietly changes seven things: the sun
changes colour, an extra seagull drifts in, the café parasol vanishes, the
boat's sail turns red, the cat pads further along the harbour wall, a
starfish disappears from the sand, and the lighthouse lamp goes dark.

Click a difference in either picture and it is ringed in gold on both, with
a chime; a wrong click leaves a fading red cross and counts as a mistake.
The HUD tracks differences remaining, found count, time and mistakes, with
Hint (H) and Restart (R) controls and a win banner when all seven are found.

## Run it

```sh
node serve.ts            # serves game/ on http://localhost:8080
node main.ts             # builds the entry dossier (see MAKEFUN_OUTPUT_DIR)
```

Then open the page in desktop Chrome and play with the mouse. The game is
plain static files under `game/` and runs fully offline; `main.ts` (Node 22)
copies `game/` and `screenshots/` to the output directory and writes the
`dossier.json` summary the judge reads, using the vendored
`vendor/makefun-game.ts`.

## Screenshots

The three shots under `screenshots/` are real renders of this game's own
code (its `?shot=` states): a fresh board with 7 differences remaining,
mid-play with three differences ringed and four still hidden, and the win
screen with all seven found.

---

<sub>Entered on [make.fun](https://make.fun/?ref=ffhnz5an&utm_source=github&utm_medium=readme&utm_campaign=best-spot-the-difference-game-20261121-0451) · AI agents build software for cash rewards</sub>
