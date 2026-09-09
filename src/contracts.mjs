import { WorkflowError } from "./errors.mjs";

export const WORKFLOW_STATUSES = Object.freeze([
  "RUNNING",
  "COMPLETE",
  "PARTIAL",
  "BLOCKED",
  "FAILED",
]);

export const STEP_STATUSES = Object.freeze([
  "PENDING",
  "RUNNING",
  "COMPLETED",
  "SKIPPED",
  "BLOCKED",
  "FAILED",
]);

export const CONDITIONS = Object.freeze({
  ALWAYS: "always",
  FULL_MODE: "full_mode",
  NEEDS_CHARACTER: "needs_character",
  NEEDS_PRODUCT: "needs_product",
});

export function validateDefinition(definition) {
  if (!definition || typeof definition !== "object") {
    throw new WorkflowError("DEFINITION_INVALID", "Workflow definition must be an object.");
  }
  if (!nonEmpty(definition.id) || !nonEmpty(definition.version)) {
    throw new WorkflowError("DEFINITION_INVALID", "Workflow id and version are required.");
  }
  if (!Array.isArray(definition.steps) || definition.steps.length === 0) {
    throw new WorkflowError("DEFINITION_INVALID", "Workflow must declare at least one step.");
  }

  const ids = new Set();
  for (const step of definition.steps) {
    if (!nonEmpty(step?.id) || !nonEmpty(step?.operation)) {
      throw new WorkflowError("DEFINITION_INVALID", "Every step needs an id and operation.");
    }
    if (ids.has(step.id)) {
      throw new WorkflowError("DEFINITION_INVALID", `Duplicate step id: ${step.id}`);
    }
    ids.add(step.id);
    if (!Object.values(CONDITIONS).includes(step.condition ?? CONDITIONS.ALWAYS)) {
      throw new WorkflowError("DEFINITION_INVALID", `Unsupported condition: ${step.condition}`);
    }
  }
  return true;
}

export function shouldRunStep(step, input) {
  switch (step.condition ?? CONDITIONS.ALWAYS) {
    case CONDITIONS.ALWAYS:
      return true;
    case CONDITIONS.FULL_MODE:
      return input.mode !== "prompt_only";
    case CONDITIONS.NEEDS_CHARACTER:
      return input.mode !== "prompt_only" && input.needsCharacter === true;
    case CONDITIONS.NEEDS_PRODUCT:
      return input.mode !== "prompt_only" && input.needsProduct === true;
    default:
      return false;
  }
}

export function validateOperationReceipt(receipt, operation) {
  if (!receipt || typeof receipt !== "object" || typeof receipt.ok !== "boolean") {
    throw new WorkflowError(
      "OPERATION_RECEIPT_INVALID",
      `Operation ${operation} returned an invalid receipt.`,
    );
  }
  if (receipt.ok && !nonEmpty(receipt.outputRef)) {
    throw new WorkflowError(
      "OPERATION_RECEIPT_INVALID",
      `Operation ${operation} must return an opaque outputRef on success.`,
    );
  }
  return true;
}

function nonEmpty(value) {
  return typeof value === "string" && value.trim().length > 0;
}
