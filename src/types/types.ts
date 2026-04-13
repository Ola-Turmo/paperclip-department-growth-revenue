import { z } from "zod";

export const ChannelSchema = z.enum([
  "organic_search", "paid_search", "organic_social", "paid_social",
  "email", "referral", "direct", "display", "affiliate",
  "video", "podcast", "partner",
]);
export type Channel = z.infer<typeof ChannelSchema>;

export interface Touchpoint {
  channel: Channel;
  campaignId?: string;
  timestamp: string;
  userId: string;
  sessionId: string;
  event: "impression" | "click" | "conversion" | "engagement";
  value?: number;
  metadata?: Record<string, unknown>;
}

export interface FunnelStage {
  name: string;
  usersEntering: number;
  usersExiting: number;
  conversionRate: number;
  dropOffRate: number;
  avgTimeInStageSeconds?: number;
  topExitNextStage?: string;
  dropOffReasons?: string[];
}

export interface FunnelAnalysis {
  funnelId: string;
  stages: FunnelStage[];
  overallConversionRate: number;
  revenueAtEachStage: number[];
  periodStart: string;
  periodEnd: string;
  totalUsers: number;
  convertedUsers: number;
}

export type AttributionModel =
  | "first_touch" | "last_touch" | "linear" | "time_decay"
  | "u_shaped" | "position_based" | "data_driven";

export interface AttributionResult {
  model: AttributionModel;
  channelAttribution: Record<Channel, number>;
  channelValue: Record<Channel, number>;
  conversionsAttributed: Record<Channel, number>;
  confidence: number;
  explanations: Record<Channel, string>;
}

export interface AttributionConfig {
  model: AttributionModel;
  lookbackWindowDays: number;
  touchpointDecayHalfLifeDays?: number;
  uShapedFirstLastWeight?: number;
}

export type ExperimentStatus = "draft" | "running" | "paused" | "concluded" | "archived";
export type ExperimentVariant = "control" | "treatment_a" | "treatment_b" | "treatment_c";

export interface ExperimentHypothesis {
  id: string;
  text: string;
  hypothesis: string;
  confidence: number;
  expectedLift: number;
  effort: "low" | "medium" | "high";
  impact: "low" | "medium" | "high";
  priority: number;
  funnelStage: string;
  relatedChannels: Channel[];
  generatedAt: string;
}

export interface ABTest {
  id: string;
  name: string;
  hypothesisId?: string;
  hypothesis?: ExperimentHypothesis;
  status: ExperimentStatus;
  variant: ExperimentVariant;
  metric: string;
  secondaryMetrics: string[];
  controlValue: number;
  treatmentValue: number;
  controlSampleSize: number;
  treatmentSampleSize: number;
  startedAt?: string;
  concludedAt?: string;
  result?: {
    statisticalSignificance: number;
    winner: ExperimentVariant | "no_winner";
    lift: number;
    revenueImpact: number;
    recommendedAction: "ship" | "iterate" | "kill";
  };
}

export interface SampleSizeResult {
  requiredSampleSizePerVariant: number;
  totalSampleSize: number;
  detectableEffectSize: number;
  power: number;
  confidenceLevel: number;
}

export interface CohortData {
  cohortId: string;
  cohortPeriod: string;
  initialSize: number;
  retentionByPeriod: number[];
  revenueByPeriod: number[];
  cumulativeRevenuePerUser: number[];
  churnByPeriod: number[];
}

export interface LTVModel {
  customerId: string;
  predictedLTV: number;
  confidence: number;
  modelType: "cohort_based" | "regression" | "bayesian";
  factors: Record<string, number>;
  projectionMonths: number;
  cohorts?: CohortData[];
}

export interface RevenueForecast {
  period: string;
  predictedRevenue: number;
  confidenceInterval: [number, number];
  actualRevenue?: number;
  forecastError?: number;
  modelType: string;
  factors: Record<string, number>;
}

export interface LeadScore {
  leadId: string;
  score: number;
  grade: "hot" | "warm" | "cool" | "cold";
  factors: Record<string, number>;
  predictedConversionProbability: number;
  recommendedAction: string;
  updatedAt: string;
}

export interface GrowthRecipe {
  id: string;
  name: string;
  description: string;
  hypothesis: string;
  expectedImpact: string;
  implementationSteps: string[];
  requiredChannels: Channel[];
  successMetrics: string[];
  difficulty: "beginner" | "intermediate" | "advanced";
  applicableFunnelStages: string[];
  communityContributed?: boolean;
  contributor?: string;
  tags: string[];
  source: "internal" | "growth_framework" | "community";
  createdAt: string;
}
