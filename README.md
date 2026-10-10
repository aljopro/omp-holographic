# omp-holographic

Persistent, structured memory for [oh-my-pi](https://github.com/can1357/oh-my-pi) (`omp`) and Pi-compatible agents, ported from the **holographic memory provider** in [Hermes Agent](https://github.com/NousResearch/hermes-agent).

It gives your coding agent a local fact store it can write to and query across sessions:

- **SQLite + FTS5** keyword search, no server and no network.
- **Entity resolution**: facts are linked to the people, projects and tools they mention.
- **Trust scoring**: facts the agent rates `helpful` rise; `unhelpful` ones sink and drop out of results.
- **HRR retrieval**: [Holographic Reduced Representations](https://en.wikipedia.org/wiki/Holographic_reduced_representation) support compositional queries such as "facts connected to *both* Jensen and vitest".
- **Contradiction detection** to find facts making conflicting claims.

Everything stays on your machine in one SQLite file.

## How it works

```
omp  ──►  extension (src/index.ts)  ──►  omp-holographic CLI  ──►  SQLite
          fact_store, fact_feedback       JSON in / JSON out       ~/.omp/agent/holographic/memory_store.db
```

The extension is a thin wrapper. The Python CLI does the work, so the store can also be used from scripts or any other agent.

## Install

Requirements: `omp`, [`uv`](https://docs.astral.sh/uv/), and [`bun`](https://bun.sh) (omp's plugin manager needs it).

```bash
git clone git@github.com:aljopro/omp-holographic.git
cd omp-holographic

# 1. the CLI (numpy is optional but enables the HRR vector ops)
uv tool install --editable ".[hrr]"

# 2. the omp extension + skill
omp plugin link "$PWD"
```

Restart omp. The agent now has the `fact_store` and `fact_feedback` tools and a `holographic` skill.

## Tools

### `fact_store`

| Action | Purpose |
|---|---|
| `add` | Store a durable fact (`content`, optional `category`, `tags`) |
| `search` | Keyword lookup (`query`) |
| `probe` | All facts about one entity (`entity`) |
| `related` | What connects to an entity |
| `reason` | Facts connected to several entities at once (`entities`) |
| `contradict` | Find facts that conflict |
| `update` / `remove` / `list` | CRUD by `fact_id` |

Categories: `user_pref`, `project`, `tool`, `general`.

### `fact_feedback`

`helpful` / `unhelpful` on a `fact_id`. This is what trains the trust scores.

## CLI

```bash
omp-holographic fact_store '{"action":"add","content":"Jensen prefers vitest over jest","category":"user_pref"}'
omp-holographic fact_store '{"action":"probe","entity":"Jensen"}'
omp-holographic fact_feedback '{"action":"helpful","fact_id":1}'
```

Output is JSON on stdout. Errors go to stderr with exit code 1.

## Configuration

| Environment variable | Default | Meaning |
|---|---|---|
| `OMP_HOLOGRAPHIC_DB` | `~/.omp/agent/holographic/memory_store.db` | Database path |
| `OMP_HOLOGRAPHIC_HRR_DIM` | `1024` | HRR vector dimensions |
| `OMP_HOLOGRAPHIC_MIN_TRUST` | `0.3` | Minimum trust for search results |
| `OMP_HOLOGRAPHIC_BIN` | `omp-holographic` | CLI the extension runs |

The database is separate from Hermes. To share facts with a Hermes install, point `OMP_HOLOGRAPHIC_DB` at its `memory_store.db`.

## Differences from the Hermes plugin

This is a port, not a drop-in:

- **No automatic recall.** Hermes injects top facts into every turn. Here the agent calls `fact_store` itself, guided by the bundled skill.
- **No session-end auto-extraction.**
- `store.py` no longer imports Hermes internals; WAL setup and schema migration use plain SQLite.

## Development

```bash
uv tool install --editable ".[hrr]"      # CLI picks up source edits immediately
export OMP_HOLOGRAPHIC_DB=$(mktemp -d)/test.db
omp-holographic fact_store '{"action":"list"}'
```

See [AGENTS.md](AGENTS.md) for contributor and agent notes.

## Credits and license

Released under the [MIT License](LICENSE).

`src/omp_holographic/{store,retrieval,holographic}.py` are derived from the holographic memory plugin in [NousResearch/hermes-agent](https://github.com/NousResearch/hermes-agent) (MIT, Copyright (c) 2025 Nous Research; original plugin by dusterbloom, PR #2351). Their license is preserved in [THIRD_PARTY_LICENSE](THIRD_PARTY_LICENSE).
