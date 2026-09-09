import { CONDITIONS } from "./contracts.mjs";

export const videoAssetWorkflowDefinition = Object.freeze({
  id: "portable-video-asset-workflow",
  version: "1.0.0",
  steps: Object.freeze([
    Object.freeze({ id: "requirements", operation: "requirements.plan", condition: CONDITIONS.ALWAYS }),
    Object.freeze({ id: "prompt_validation", operation: "prompt.validate", condition: CONDITIONS.ALWAYS }),
    Object.freeze({ id: "asset_audit", operation: "assets.audit", condition: CONDITIONS.FULL_MODE }),
    Object.freeze({ id: "character_resolution", operation: "characters.resolve", condition: CONDITIONS.NEEDS_CHARACTER }),
    Object.freeze({ id: "product_resolution", operation: "products.resolve", condition: CONDITIONS.NEEDS_PRODUCT }),
    Object.freeze({ id: "frame_batch", operation: "frames.generate", condition: CONDITIONS.FULL_MODE }),
    Object.freeze({ id: "final_audit", operation: "delivery.audit", condition: CONDITIONS.FULL_MODE }),
  ]),
});
