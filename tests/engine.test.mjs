import assert from "node:assert/strict";
import test from "node:test";
import {
  MemoryWorkflowStore,
  WorkflowEngine,
  WorkflowError,
  videoAssetWorkflowDefinition,
} from "../src/index.mjs";

function operationSet({ failAt = null, blockAt = null, calls = [] } = {}) {
  return Object.fromEntries(videoAssetWorkflowDefinition.steps.map((step) => [
    step.operation,
    async ({ idempotencyKey, priorReceipts }) => {
      calls.push({ operation: step.operation, idempotencyKey, priorReceipts });
      if (step.id === failAt) return { ok: false, status: "failed", code: "TEST_FAILURE" };
      if (step.id === blockAt) return { ok: false, status: "blocked", code: "TEST_BLOCK" };
      return { ok: true, outputRef: `opaque://${step.id}`, summary: { completed: true } };
    },
  ]));
}

test("executes the full workflow in declared order", async () => {
  const calls = [];
  const engine = new WorkflowEngine({
    definition: videoAssetWorkflowDefinition,
    operations: operationSet({ calls }),
    store: new MemoryWorkflowStore(),
    idFactory: () => "task-1",
  });
  const result = await engine.execute({
    requestId: "request-1",
    mode: "full",
    needsCharacter: true,
    needsProduct: true,
  });
  assert.equal(result.status, "COMPLETE");
  assert.deepEqual(calls.map((call) => call.operation), videoAssetWorkflowDefinition.steps.map((step) => step.operation));
  assert.equal(result.steps.every((step) => step.status === "COMPLETED"), true);
});

test("prompt-only mode skips asset and generation stages", async () => {
  const calls = [];
  const engine = new WorkflowEngine({
    definition: videoAssetWorkflowDefinition,
    operations: operationSet({ calls }),
    store: new MemoryWorkflowStore(),
  });
  const result = await engine.execute({ requestId: "request-2", mode: "prompt_only" });
  assert.equal(result.status, "PARTIAL");
  assert.deepEqual(calls.map((call) => call.operation), ["requirements.plan", "prompt.validate"]);
  assert.equal(result.steps.filter((step) => step.status === "SKIPPED").length, 5);
});

test("reuses a completed task for an identical input", async () => {
  const calls = [];
  const store = new MemoryWorkflowStore();
  const engine = new WorkflowEngine({
    definition: videoAssetWorkflowDefinition,
    operations: operationSet({ calls }),
    store,
  });
  const input = { requestId: "request-3", mode: "full", needsCharacter: false, needsProduct: false };
  await engine.execute(input);
  const count = calls.length;
  const reused = await engine.execute(input);
  assert.equal(reused.reused, true);
  assert.equal(calls.length, count);
});

test("blocks without silently continuing", async () => {
  const engine = new WorkflowEngine({
    definition: videoAssetWorkflowDefinition,
    operations: operationSet({ blockAt: "asset_audit" }),
    store: new MemoryWorkflowStore(),
  });
  const result = await engine.execute({ requestId: "request-4", mode: "full" });
  assert.equal(result.status, "BLOCKED");
  assert.equal(result.error.code, "TEST_BLOCK");
  assert.equal(result.steps.some((step) => step.id === "frame_batch"), false);
});

test("fails preflight when a host operation is missing", async () => {
  const operations = operationSet();
  delete operations["delivery.audit"];
  const engine = new WorkflowEngine({
    definition: videoAssetWorkflowDefinition,
    operations,
    store: new MemoryWorkflowStore(),
  });
  await assert.rejects(
    engine.execute({ requestId: "request-5" }),
    (error) => error instanceof WorkflowError && error.code === "HOST_OPERATION_MISSING",
  );
});

test("persists only opaque receipts", async () => {
  const operations = operationSet();
  operations["requirements.plan"] = async () => ({
    ok: true,
    outputRef: "opaque://requirements",
    summary: { count: 1 },
    protectedPrompt: "must not persist",
    internalReasoning: "must not persist",
  });
  const engine = new WorkflowEngine({
    definition: videoAssetWorkflowDefinition,
    operations,
    store: new MemoryWorkflowStore(),
  });
  const result = await engine.execute({ requestId: "request-6", mode: "prompt_only" });
  const serialized = JSON.stringify(result);
  assert.equal(serialized.includes("must not persist"), false);
  assert.equal(result.outputs.requirements.outputRef, "opaque://requirements");
});
