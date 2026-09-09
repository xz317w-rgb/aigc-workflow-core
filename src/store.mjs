export class MemoryWorkflowStore {
  #byId = new Map();
  #byFingerprint = new Map();

  async findByFingerprint(fingerprint) {
    const id = this.#byFingerprint.get(fingerprint);
    return id ? clone(this.#byId.get(id)) : null;
  }

  async get(workflowTaskId) {
    return clone(this.#byId.get(workflowTaskId) ?? null);
  }

  async save(state) {
    const value = clone(state);
    this.#byId.set(value.workflowTaskId, value);
    this.#byFingerprint.set(value.inputFingerprint, value.workflowTaskId);
    return clone(value);
  }
}

function clone(value) {
  return value == null ? value : structuredClone(value);
}
