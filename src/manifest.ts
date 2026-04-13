/**
 * Growth Revenue Department — Paperclip Plugin Manifest
 * Stub manifest for @uos/department-growth-revenue
 */
import type { PaperclipPluginManifestV1 } from "@paperclipai/plugin-sdk";

const manifest: PaperclipPluginManifestV1 = {
  id: "uos.department-growth-revenue",
  apiVersion: 1,
  version: "0.1.0",
  displayName: "Growth Intelligence Engine",
  description: "Multi-touch attribution, AI experiment generation, growth dashboard, and revenue intelligence.",
  author: "turmo.dev",
  categories: ["automation", "analytics", "growth"],
  capabilities: [],
  entrypoints: {
    worker: "./dist/worker.js",
  },
};

export default manifest;
