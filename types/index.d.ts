export type WorkflowStatus = "RUNNING" | "COMPLETE" | "PARTIAL" | "BLOCKED" | "FAILED";
export type StepStatus = "PENDING" | "RUNNING" | "COMPLETED" | "SKIPPED" | "BLOCKED" | "FAILED";
export type StepCondition = "always" | "full_mode" | "needs_character" | "needs_product";

export interface WorkflowStepDefinition {
  id: string;
  operation: string;
  condition?: StepCondition;
}

export interface WorkflowDefinition {
  id: string;
  version: string;
  steps: readonly WorkflowStepDefinition[];
}

export interface WorkflowInput {
  requestId: string;
  workflowTaskId?: string;
  mode?: "full" | "prompt_only";
  needsCharacter?: boolean;
  needsProduct?: boolean;
  [key: string]: unknown;
}

export interface OperationReceipt {
  ok: boolean;
  status?: "completed" | "failed" | "blocked";
  outputRef?: string;
  summary?: Record<string, unknown>;
  code?: string;
  details?: Record<string, unknown> | null;
}

export interface OperationContext {
  readonly workflowTaskId: string;
  readonly idempotencyKey: string;
  readonly step: Readonly<WorkflowStepDefinition>;
  readonly input: Readonly<WorkflowInput>;
  readonly priorReceipts: Readonly<Record<string, OperationReceipt>>;
}

export type WorkflowOperation = (context: OperationContext) => Promise<OperationReceipt>;

export interface WorkflowStore {
  findByFingerprint(fingerprint: string): Promise<WorkflowState | null>;
  get(workflowTaskId: string): Promise<WorkflowState | null>;
  save(state: WorkflowState): Promise<WorkflowState>;
}

export interface WorkflowState {
  workflowTaskId: string;
  workflowId: string;
  workflowVersion: string;
  inputFingerprint: string;
  requestId: string;
  status: WorkflowStatus;
  createdAt: string;
  updatedAt: string;
  completedAt: string | null;
  steps: Array<Record<string, unknown>>;
  outputs: Record<string, OperationReceipt>;
  error: Record<string, unknown> | null;
  reused?: boolean;
}

export class WorkflowError extends Error {
  code: string;
  details: unknown;
}

export class MemoryWorkflowStore implements WorkflowStore {
  findByFingerprint(fingerprint: string): Promise<WorkflowState | null>;
  get(workflowTaskId: string): Promise<WorkflowState | null>;
  save(state: WorkflowState): Promise<WorkflowState>;
}

export class WorkflowEngine {
  constructor(options: {
    definition: WorkflowDefinition;
    operations: Record<string, WorkflowOperation>;
    store: WorkflowStore;
    now?: () => string;
    idFactory?: () => string;
  });
  execute(input: WorkflowInput): Promise<WorkflowState>;
}

export const videoAssetWorkflowDefinition: WorkflowDefinition;
export function fingerprintInput(definition: WorkflowDefinition, input: WorkflowInput): string;
