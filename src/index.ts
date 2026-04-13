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

// LLM-powered capabilities
export { LLMGateway, llmGateway } from "./llm/llm-gateway.js";
export type {
  LLMConfig,
  LLMChainInput,
  AIConfidenceScore,
  ExperimentInsight,
  AttributionDiagnostic,
} from "./llm/llm-gateway.js";

// ML Models
export {
  SimpleMovingAverageModel,
  ExponentialSmoothingModel,
  KMeansClustering,
  LeadScoringModel,
  ChurnPredictionModel,
  ModelRegistry,
  smaModel,
  expSmoothModel,
  leadScoringModel,
  churnPredictionModel,
  kmeans,
  modelRegistry,
} from "./ml/models.js";
export type { SegmentCluster, ModelMetadata, ForecastConfig, ClusterConfig } from "./ml/models.js";
