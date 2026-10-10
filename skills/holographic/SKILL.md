---
name: holographic
description: Use the holographic fact store (fact_store / fact_feedback) for durable structured memory about the user, their projects, preferences and decisions.
---

# Holographic memory

Local SQLite fact store with FTS5 search, entity resolution, trust scoring and HRR compositional queries.

- **Start of a task:** `fact_store` with `probe` (one entity) or `reason` (several entities) before answering questions about the user or their projects.
- **When the user states a durable preference or decision:** `fact_store` `add` with a category (`user_pref`, `project`, `tool`, `general`).
- **After using a fact:** `fact_feedback` `helpful` or `unhelpful` so trust scores adapt.
- **Hygiene:** `contradict` periodically; `update` or `remove` stale facts.
