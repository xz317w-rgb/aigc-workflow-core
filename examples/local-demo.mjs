import {
  MemoryWorkflowStore,
  WorkflowEngine,
  videoAssetWorkflowDefinition,
} from "../src/index.mjs";

const operations = Object.fromEntries(
  videoAssetWorkflowDefinition.steps.map((step) => [
    step.operation,
    async ({ idempotencyKey, step: currentStep }) => ({
      ok: true,
      outputRef: `demo://${idempotencyKey}`,
      summary: { stage: currentStep.id },
    }),
  ]),
);

const engine = new WorkflowEngine({
  definition: videoAssetWorkflowDefinition,
  operations,
  store: new MemoryWorkflowStore(),
});

const result = await engine.execute({
  requestId: "demo-001",
  brief: "Demo only; no provider is called.",
  mode: "full",
  needsCharacter: true,
  needsProduct: true,
});

console.log(JSON.stringify(result, null, 2));
