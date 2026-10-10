import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { spawn } from "node:child_process";

/**
 * omp/pi extension exposing the Hermes holographic fact store.
 * Proxies fact_store and fact_feedback to the `omp-holographic` CLI
 * (uv tool install --editable ~/projects/omp-holographic).
 */

const BIN = process.env.OMP_HOLOGRAPHIC_BIN ?? "omp-holographic";

function run(tool: string, args: Record<string, unknown>): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(BIN, [tool, JSON.stringify(args)], { stdio: ["ignore", "pipe", "pipe"] });
    let out = "";
    let err = "";
    child.stdout.on("data", (d: Buffer) => (out += d.toString()));
    child.stderr.on("data", (d: Buffer) => (err += d.toString()));
    child.on("error", (e) => reject(new Error(`Failed to run ${BIN}: ${e.message}`)));
    child.on("close", (code) =>
      code === 0 ? resolve(out.trim()) : reject(new Error(err.trim() || `${BIN} exited with code ${code}`)),
    );
  });
}

const text = (t: string) => ({ content: [{ type: "text" as const, text: t }], details: {} });

export default function (pi: ExtensionAPI) {
  pi.registerTool({
    name: "fact_store",
    label: "Holographic: Fact Store",
    description:
      "Deep structured memory with algebraic reasoning. ACTIONS: add (store a durable fact the user would expect remembered), " +
      "search (keyword lookup), probe (ALL facts about an entity), related (what connects to an entity), " +
      "reason (facts connected to MULTIPLE entities at once), contradict (find conflicting facts), update/remove/list (CRUD). " +
      "Before answering questions about the user or their projects, probe or reason first.",
    parameters: Type.Object({
      action: Type.Union(
        ["add", "search", "probe", "related", "reason", "contradict", "update", "remove", "list"].map((a) => Type.Literal(a)),
      ),
      content: Type.Optional(Type.String({ description: "Fact content (required for 'add')." })),
      query: Type.Optional(Type.String({ description: "Search query (required for 'search')." })),
      entity: Type.Optional(Type.String({ description: "Entity name for 'probe'/'related'." })),
      entities: Type.Optional(Type.Array(Type.String(), { description: "Entity names for 'reason'." })),
      fact_id: Type.Optional(Type.Integer({ description: "Fact ID for 'update'/'remove'." })),
      category: Type.Optional(
        Type.Union(["user_pref", "project", "tool", "general"].map((c) => Type.Literal(c))),
      ),
      tags: Type.Optional(Type.String({ description: "Comma-separated tags." })),
      trust_delta: Type.Optional(Type.Number({ description: "Trust adjustment for 'update'." })),
      min_trust: Type.Optional(Type.Number({ description: "Minimum trust filter (default 0.3)." })),
      limit: Type.Optional(Type.Integer({ description: "Max results (default 10)." })),
    }),
    async execute(_id, params) {
      return text(await run("fact_store", params as Record<string, unknown>));
    },
  });

  pi.registerTool({
    name: "fact_feedback",
    label: "Holographic: Fact Feedback",
    description:
      "Rate a fact after using it. 'helpful' if accurate, 'unhelpful' if outdated. Good facts rise, bad facts sink.",
    parameters: Type.Object({
      action: Type.Union([Type.Literal("helpful"), Type.Literal("unhelpful")]),
      fact_id: Type.Integer({ description: "The fact ID to rate." }),
    }),
    async execute(_id, params) {
      return text(await run("fact_feedback", params as Record<string, unknown>));
    },
  });
}
