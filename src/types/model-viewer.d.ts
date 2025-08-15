// src/types/model-viewer.d.ts
// Allow using the <model-viewer> web component in JSX

declare global {
  namespace JSX {
    interface IntrinsicElements {
      "model-viewer": any;
    }
  }
}

export {};
