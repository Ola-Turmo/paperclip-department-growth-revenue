// Public API — re-export all classes and types from each module
export * from "./types/types.js";

// Attribution module
export { AttributionEngine, attributionEngine } from "./attribution/models.js";
export { ChannelInteractionAnalyzer } from "./attribution/channel-analyzer.js";
export { AttributionReportGenerator } from "./attribution/report-generator.js";

// Experiment module
export { HypothesisGenerator } from "./experiment/hypothesis-generator.js";
export { ExperimentDesigner } from "./experiment/experiment-designer.js";
export { SampleSizeCalculator, sampleSizeCalculator } from "./experiment/sample-size-calculator.js";

// Revenue module
export { LTVModeler, ltvModeler } from "./revenue/ltv-model.js";
export { RevenueForecaster } from "./revenue/forecast.js";
export { LeadScorer, BehavioralSignals } from "./revenue/lead-score.js";

// Dashboard module
export { FunnelVizEngine } from "./dashboard/funnel-viz.js";
export { RevenueIntelligenceView } from "./dashboard/revenue-view.js";
export { ExperimentLeaderboard, experimentLeaderboard } from "./dashboard/experiment-leaderboard.js";
