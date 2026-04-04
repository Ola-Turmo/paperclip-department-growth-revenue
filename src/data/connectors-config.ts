/**
 * Connectors Configuration
 * 
 * This module exports the connectors configuration as a TypeScript object
 * to avoid JSON import issues across different module resolution modes.
 */

export const connectorsConfig = {
  requiredToolkits: [
    "gmail",
    "hubspot",
    "mailchimp",
    "googlesheets"
  ],
  roleToolkits: [
    {
      roleKey: "growth",
      toolkits: ["hubspot", "mailchimp", "googlesheets"]
    },
    {
      roleKey: "growth-revops-lead",
      toolkits: ["hubspot", "googlesheets"]
    },
    {
      roleKey: "growth-lifecycle-lead",
      toolkits: ["mailchimp", "hubspot", "gmail"]
    },
    {
      roleKey: "growth-demand-specialist",
      toolkits: ["hubspot", "mailchimp", "gmail"]
    }
  ]
} as const;

export type ConnectorsConfig = typeof connectorsConfig;
