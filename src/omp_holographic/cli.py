"""omp-holographic CLI: JSON-in/JSON-out front end for the vendored Hermes holographic fact store.

Usage: omp-holographic <fact_store|fact_feedback> '<json args>'
DB path: $OMP_HOLOGRAPHIC_DB, default ~/.omp/agent/holographic/memory_store.db
"""
from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from .retrieval import FactRetriever
from .store import MemoryStore

DEFAULT_DB = Path.home() / ".omp" / "agent" / "holographic" / "memory_store.db"
HRR_DIM = int(os.environ.get("OMP_HOLOGRAPHIC_HRR_DIM", "1024"))
MIN_TRUST = float(os.environ.get("OMP_HOLOGRAPHIC_MIN_TRUST", "0.3"))


def _results(items, key="results"):
    return {key: items, "count": len(items)}


def _dispatch(tool: str, a: dict, store: MemoryStore, retriever: FactRetriever):
    limit = int(a.get("limit", 10))
    if tool == "fact_feedback":
        return store.record_feedback(int(a["fact_id"]), helpful=a["action"] == "helpful")
    if tool != "fact_store":
        raise ValueError(f"Unknown tool: {tool}")
    action = a["action"]
    cat = a.get("category")
    if action == "add":
        return {"fact_id": store.add_fact(a["content"], category=cat or "general", tags=a.get("tags", "")),
                "status": "added"}
    if action == "search":
        return _results(retriever.search(a["query"], category=cat,
                                         min_trust=float(a.get("min_trust", MIN_TRUST)), limit=limit))
    if action in ("probe", "related"):
        return _results(getattr(retriever, action)(a["entity"], category=cat, limit=limit))
    if action == "reason":
        if not a.get("entities"):
            raise ValueError("reason requires 'entities' list")
        return _results(retriever.reason(a["entities"], category=cat, limit=limit))
    if action == "contradict":
        return _results(retriever.contradict(category=cat, limit=limit))
    if action == "update":
        return {"updated": store.update_fact(
            int(a["fact_id"]), content=a.get("content"),
            trust_delta=float(a["trust_delta"]) if "trust_delta" in a else None,
            tags=a.get("tags"), category=cat)}
    if action == "remove":
        return {"removed": store.remove_fact(int(a["fact_id"]))}
    if action == "list":
        return _results(store.list_facts(category=cat, min_trust=float(a.get("min_trust", 0.0)), limit=limit),
                        key="facts")
    raise ValueError(f"Unknown action: {action}")


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if len(argv) != 2:
        print(__doc__, file=sys.stderr)
        return 2
    tool, raw = argv
    db_path = Path(os.environ.get("OMP_HOLOGRAPHIC_DB", DEFAULT_DB)).expanduser()
    db_path.parent.mkdir(parents=True, exist_ok=True)
    store = MemoryStore(db_path=str(db_path), default_trust=0.5, hrr_dim=HRR_DIM)
    try:
        retriever = FactRetriever(store=store, hrr_dim=HRR_DIM, hrr_weight=0.3, temporal_decay_half_life=0)
        print(json.dumps(_dispatch(tool, json.loads(raw), store, retriever)))
        return 0
    except (KeyError, ValueError) as exc:
        print(f"error: {exc}", file=sys.stderr)
        return 1
    finally:
        store.close()


if __name__ == "__main__":
    raise SystemExit(main())
