export class WorkflowError extends Error {
  constructor(code, message, details = null) {
    super(message);
    this.name = "WorkflowError";
    this.code = code;
    this.details = details;
  }
}
