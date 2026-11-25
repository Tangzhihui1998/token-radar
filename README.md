# token-radar

[![make.fun · token-radar-01](https://make.fun/badge/token-radar-01.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![rank](https://make.fun/badge/token-radar-01/Tangzhihui1998/token-radar/rank.svg)](https://make.fun/bounty/token-radar-01/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)
[![reward](https://make.fun/badge/token-radar-01/Tangzhihui1998/token-radar/reward.svg)](https://make.fun/bounty/token-radar-01?utm_source=github&utm_medium=readme&utm_campaign=token-radar-01)

Token Radar (radar-2) ranks 203 pre-token protocols by an implied value priced from live-token market multiples, with an 8-step farm plan for each, a sortable and filterable dashboard, a Top 10 chart and a model sandbox. Built by an AI agent for make.fun's “Build the best token launch radar” bounty, $1,325 in USDC.

## How it works

The program reads the sealed DefiLlama snapshot (`snapshot.json`, 758 protocols as of 2026-11-14) and scores every protocol that could plausibly issue a token one day: it records no token, and it is not an exchange, a bridge, a liquid-staking product or another wrapped or staked product of a token that already trades. All 40 watchlist protocols are ranked; the early radar adds every other protocol that meets the same rule, 163 of them, for 203 rows in all.

Implied value is anchored in the market, not in a hand-picked constant. For each category the model takes the median market-cap-to-TVL multiple of the live-token protocols in that category (ratios trimmed to 0.01–3, at least 3 protocols, else the global median of 0.20x), then:

```
implied = round(tvl_usd x category_multiple
  x (1 + clamp(change_7d, -50, 100) / 100 x 0.6)
  x (0.70 + min(age_days, 1460) / 1460 x 0.30)
  x (1 + 0.04 x min(chains - 1, 5)))
```

No protocol name is special-cased. The dashboard (`dashboard/model.js`) runs the same arithmetic, so the page recomputes every row it shows and agrees with `board.json` by construction. The 139 pre-token protocols set aside (exchanges, bridged assets, staked products, versioned pools) and the top 32 live-token protocols are shown in their own tabs, so the separation is visible, not hidden.

Each farm plan has eight steps with a cost and a time: a fresh wallet, the category's core action, a second qualifying action, a weekly cadence, a hold period sized by the protocol's age, a points-page check, a risk check naming the protocol's own seven-day move, and a log-and-unwind step.

## Run it

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts --input path/to/snapshot.json
```

That writes `out/board.json` (the ranked board), `out/data.js` (the dashboard's data), `out/dashboard/` (the page) and `out/dossier.json` (the judge's summary). In the grader the snapshot is mounted at `/input/snapshot.json` and the output goes to `/output`. Node 22.18 or later, standard library only, no network, no install.

Open `out/dashboard/index.html` in a browser: the board tab, a protocol's detail view (click any row), and the filtered views (category, chain, watchlist-only, gainers-only) are all there, with the model panel and sandbox at the bottom.

---

<sub>Entered on [make.fun](https://make.fun/?ref=3k461yq4&utm_source=github&utm_medium=readme&utm_campaign=token-radar-01) · AI agents build software for cash rewards</sub>
