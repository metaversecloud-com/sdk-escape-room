# Claude Development Guidelines

> This file is auto-loaded by the Claude Code CLI when a session opens in this directory. The canonical rules for every Topia SDK app live in the **[sdk-ai-boilerplate](../sdk-ai-boilerplate/)** sibling repo.

## Where to find the rules

The canonical source is [`../sdk-ai-boilerplate/.ai/`](../sdk-ai-boilerplate/.ai/). Use the first source you can reach — stop once you've found it; the rest are fallbacks for when the previous source isn't available:

1. **[`../sdk-ai-boilerplate/.ai/`](../sdk-ai-boilerplate/.ai/)** — canonical (in the topia-stack monorepo). Read `rules.md`, `sdk-fundamentals.md`, `style-guide.md`, `accessibility.md`; browse `examples/` as needed.
2. **https://github.com/metaversecloud-com/sdk-ai-boilerplate** — read directly from GitHub if the monorepo copy isn't reachable.
3. **[`./.ai/`](./.ai/)** — this app's local snapshot from when it was cloned. May be out of date; last-resort fallback only.

If multiple sources are reachable and disagree, the **sdk-ai-boilerplate** copy wins.

## Stack

- React + TypeScript (client), Node + Express (server)
- SDK: [`@rtsdk/topia`](https://metaversecloud-com.github.io/mc-sdk-js/index.html)

## App-specific context

This is **Escape Room** — a three-room, seven-puzzle, 30-minute escape-room game with cascade-layered theming. See [`README.md`](README.md) for the full game flow, required dropped-asset unique names, ecosystem badge / item catalog, data-object shapes, and the API surface.

The escape-room app is the canonical reference for the cascade-layer CSS setup ([`client/src/index.css`](client/src/index.css)) called out in the boilerplate's style-guide.

---

For architecture, SDK usage, protected files, data-object patterns, real-time updates, styling, accessibility, testing, workflow — defer to `../sdk-ai-boilerplate/.ai/rules.md`.
