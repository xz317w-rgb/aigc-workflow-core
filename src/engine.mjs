import { createHash, randomUUID } from "node:crypto";
import {
  shouldRunStep,
  validateDefinition,
  validateOperationReceipt,
} from "./contracts.mjs";
import { WorkflowError } from "./errors.mjs";

export class WorkflowEngine {
  constructor({
    definition,
    operations,
    store,
    now = () => new Date().toISOString(),
    idFactory = () => randomUUID(),
  }) {
    validateDefinition(definition);
    if (!store || typeof store.save !== "function") {
      throw new WorkflowError("STORE_INVALID", "A workflow store with save() is required.");
    }
    this.definition = structuredClone(definition);
    this.operations = { ...operations };
    this.store = store;
    this.now = now;
    this.idFactory = idFactory;
  }

  async execute(input) {
    assertInput(input);
    this.#preflightOperations();

    const fingerprint = fingerprintInput(this.definition, input);
    const existing = await this.store.findByFingerprint?.(fingerprint);
    if (existing?.status === "COMPLETE" || existing?.status === "PARTIAL") {
      return { ...existing, reused: true };
    }

    const state = existing ?? createInitialState({
      definition: this.definition,
      input,
      fingerprint,
      workflowTaskId: input.workflowTaskId ?? this.idFactory(),
      now: this.now(),
    });

    state.status = "RUNNING";
    state.updatedAt = this.now();
    await this.store.save(state);

    for (const step of this.definition.steps) {
      const previous = state.steps.find((item) => item.id === step.id);
      if (previous?.status === "COMPLETED" || previous?.status === "SKIPPED") continue;

      if (!shouldRunStep(step, input)) {
        upsertStep(state, step, {
          status: "SKIPPED",
          reason: "CONDITION_NOT_MET",
          completedAt: this.now(),
        });
        await this.#checkpoint(state);
        continue;
      }

      upsertStep(state, step, {
        status: "RUNNING",
        reason: "OPERATION_STARTED",
        startedAt: this.now(),
      });
      await this.#checkpoint(state);

      let receipt;
      try {
        receipt = await this.operations[step.operation](freezeContext(state, input, step));
        validateOperationReceipt(receipt, step.operation);
      } catch (error) {
        return this.#finishFailure(state, step, "FAILED", errorCode(error), safeDetails(error));
      }

      if (!receipt.ok) {
        const status = receipt.status === "blocked" ? "BLOCKED" : "FAILED";
        return this.#finishFailure(
          state,
          step,
          status,
          receipt.code ?? "OPERATION_FAILED",
          receipt.details ?? null,
        );
      }

      upsertStep(state, step, {
        status: "COMPLETED",
        reason: "OPERATION_COMPLETED",
        completedAt: this.now(),
        receipt: sanitizeReceipt(receipt),
      });
      state.outputs[step.id] = sanitizeReceipt(receipt);
      await this.#checkpoint(state);
    }

    state.status = input.mode === "prompt_only" ? "PARTIAL" : "COMPLETE";
    state.completedAt = this.now();
    state.updatedAt = state.completedAt;
    state.error = null;
    await this.store.save(state);
    return structuredClone(state);
  }

  #preflightOperations() {
    const missing = [...new Set(this.definition.steps.map((step) => step.operation))]
      .filter((operation) => typeof this.operations[operation] !== "function");
    if (missing.length > 0) {
      throw new WorkflowError(
        "HOST_OPERATION_MISSING",
        "The host has not implemented every required workflow operation.",
        { missing },
      );
    }
  }

  async #checkpoint(state) {
    state.updatedAt = this.now();
    await this.store.save(state);
  }

  async #finishFailure(state, step, status, code, details) {
    upsertStep(state, step, {
      status,
      reason: code,
      completedAt: this.now(),
    });
    state.status = status;
    state.completedAt = this.now();
    state.updatedAt = state.completedAt;
    state.error = { stepId: step.id, code, details: details ?? null };
    await this.store.save(state);
    return structuredClone(state);
  }
}

export function fingerprintInput(definition, input) {
  const stable = stableStringify({ workflow: `${definition.id}@${definition.version}`, input });
  return createHash("sha256").update(stable).digest("hex");
}

function createInitialState({ definition, input, fingerprint, workflowTaskId, now }) {
  return {
    workflowTaskId,
    workflowId: definition.id,
    workflowVersion: definition.version,
    inputFingerprint: fingerprint,
    requestId: input.requestId,
    status: "RUNNING",
    createdAt: now,
    updatedAt: now,
    completedAt: null,
    steps: [],
    outputs: {},
    error: null,
  };
}

function upsertStep(state, step, patch) {
  const index = state.steps.findIndex((item) => item.id === step.id);
  const current = index >= 0 ? state.steps[index] : {
    id: step.id,
    operation: step.operation,
    status: "PENDING",
    reason: null,
    startedAt: null,
    completedAt: null,
    receipt: null,
  };
  const next = { ...current, ...patch };
  if (index >= 0) state.steps[index] = next;
  else state.steps.push(next);
}

function freezeContext(state, input, step) {
  return Object.freeze({
    workflowTaskId: state.workflowTaskId,
    idempotencyKey: `${state.workflowTaskId}:${step.id}`,
    step: Object.freeze({ ...step }),
    input: Object.freeze(structuredClone(input)),
    priorReceipts: Object.freeze(structuredClone(state.outputs)),
  });
}

function sanitizeReceipt(receipt) {
  return {
    ok: true,
    status: receipt.status ?? "completed",
    outputRef: String(receipt.outputRef),
    summary: isPlainObject(receipt.summary) ? structuredClone(receipt.summary) : {},
  };
}

function assertInput(input) {
  if (!input || typeof input !== "object" || !String(input.requestId ?? "").trim()) {
    throw new WorkflowError("INPUT_INVALID", "requestId is required.");
  }
}

function errorCode(error) {
  return typeof error?.code === "string" ? error.code : "OPERATION_EXCEPTION";
}

function safeDetails(error) {
  if (isPlainObject(error?.details)) return structuredClone(error.details);
  return { message: String(error?.message ?? "Operation failed.").slice(0, 500) };
}

function isPlainObject(value) {
  return value != null && typeof value === "object" && !Array.isArray(value);
}

function stableStringify(value) {
  if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
  if (value && typeof value === "object") {
    return `{${Object.keys(value).sort().map((key) => `${JSON.stringify(key)}:${stableStringify(value[key])}`).join(",")}}`;
  }
  return JSON.stringify(value);
}
