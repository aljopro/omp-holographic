# AGENTS.md

Guidance for AI agents and contributors working in this repo.

## What this is

A port of the Hermes Agent holographic memory provider to oh-my-pi (`omp`). Python CLI (`omp-holographic`) holds the logic; a small TypeScript extension exposes it as the `fact_store` and `fact_feedback` tools.

## Layout

| Path | Role |
|---|---|
| `src/omp_holographic/store.py` | SQLite fact store, entity resolution, trust. Vendored from Hermes, lightly modified |
| `src/omp_holographic/retrieval.py` | Search, probe, related, reason, contradict. Vendored |
| `src/omp_holographic/holographic.py` | HRR vector algebra (numpy optional). Vendored |
| `src/omp_holographic/cli.py` | Ours. JSON-in/JSON-out dispatch used by the extension |
| `src/index.ts` | Ours. omp extension; spawns the CLI per tool call |
| `skills/holographic/SKILL.md` | Ours. Usage guidance shown to the agent |
| `THIRD_PARTY_LICENSE` | Nous Research MIT notice for the vendored files. Keep it |

## Rules

- **Keep the vendored files close to upstream.** The only intentional changes are in `store.py`: no `hermes_*` imports, default DB path under `~/.omp`. Do not reintroduce Hermes-only imports. Check with `grep -rn hermes_ src/`.
- **No third-party Python dependencies** beyond optional `numpy`. The core must run on stdlib `sqlite3`.
- **CLI contract:** `omp-holographic <tool> '<json>'` prints one JSON object on stdout, exit 0; errors go to stderr, exit 1. The extension depends on this.
- **Tool schemas** in `src/index.ts` must stay in step with the actions handled in `cli.py`.
- **Never test against the real database.** Set `OMP_HOLOGRAPHIC_DB` to a temp file. The default DB holds the user's memory.

## Verify a change

```bash
export OMP_HOLOGRAPHIC_DB=$(mktemp -d)/t.db
omp-holographic fact_store '{"action":"add","content":"Jensen prefers vitest over jest","category":"user_pref"}'
omp-holographic fact_store '{"action":"search","query":"vitest"}'
omp-holographic fact_store '{"action":"probe","entity":"Jensen"}'
omp-holographic fact_store '{"action":"reason","entities":["Jensen","vitest"]}'
omp-holographic fact_feedback '{"action":"helpful","fact_id":1}'
omp-holographic fact_store '{"action":"bogus"}'   # must exit 1
```

End to end through omp (headless):

```bash
omp -p --no-session --auto-approve "Use fact_store to add a test fact, then probe it."
```

## Install for local use

`uv tool install --editable ".[hrr]"` then `omp plugin link "$PWD"`. `omp plugin install` requires `bun`.

## Known gaps

No per-turn automatic recall and no session-end auto-extraction (both exist in Hermes). Adding recall depends on omp's extension hook API.
