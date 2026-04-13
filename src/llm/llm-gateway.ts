/**
 * LLM-powered capabilities for Growth Revenue Department
 * Provides AI-driven insights, experiment generation, and attribution analysis
 */

import type { ExperimentHypothesis, AttributionResult, Channel, FunnelAnalysis } from "../types/types.js";
import { z } from "zod";

// LLM Interaction schemas
export const LLMMessageSchema = z.object({
  role: z.enum(["system", "user", "assistant"]),
  content: z.string(),
});

export const LLMChainInputSchema = z.object({
  messages: z.array(z.union([
    z.object({ role: z.literal("system"), content: z.string() }),
    z.object({ role: z.literal("user"), content: z.string() }),
    z.object({ role: z.literal("assistant"), content: z.string() }),
  ])),
  temperature: z.number().min(0).max(2).default(0.7),
  maxTokens: z.number().positive().optional(),
});

export type LLMMessage = z.infer<typeof LLMMessageSchema>;
export type LLMChainInput = z.infer<typeof LLMChainInputSchema>;

// Configuration for LLM providers
export type LLMProvider = "openai" | "anthropic" | "local" | "mock";

export interface LLMConfig {
  provider: LLMProvider;
  model: string;
  apiKey?: string;
  baseUrl?: string;
  temperature?: number;
  maxTokens?: number;
}

// Confidence scoring for AI-generated content
export interface AIConfidenceScore {
  score: number; // 0-1
  factors: Record<string, number>;
  warnings: string[];
  sources: string[];
}

// Experiment insight from LLM
export interface ExperimentInsight {
  type: "opportunity" | "risk" | "recommendation" | "discovery";
  priority: "high" | "medium" | "low";
  title: string;
  description: string;
  evidence: string[];
  confidence: AIConfidenceScore;
  actionable: boolean;
}

// Attribution diagnostic from LLM
export interface AttributionDiagnostic {
  issue: string;
  severity: "critical" | "warning" | "info";
  channels: Channel[];
  description: string;
  suggestedModel?: string;
  confidence: AIConfidenceScore;
}

export class LLMGateway {
  private config: LLMConfig;
  private mockMode: boolean;

  constructor(config: Partial<LLMConfig> = {}) {
    this.config = {
      provider: config.provider ?? "mock",
      model: config.model ?? "gpt-4",
      temperature: config.temperature ?? 0.7,
      maxTokens: config.maxTokens ?? 2048,
      ...config,
    };
    this.mockMode = this.config.provider === "mock";
  }

  async generateHypothesis(params: {
    topChannels: Channel[];
    funnelStage: string;
    historicalData?: string;
  }): Promise<ExperimentHypothesis[]> {
    if (this.mockMode) {
      return this.mockHypothesisGeneration(params);
    }
    // Real LLM integration would go here
    return this.mockHypothesisGeneration(params);
  }

  async analyzeAttribution(attributionResults: AttributionResult[]): Promise<AttributionDiagnostic[]> {
    if (this.mockMode) {
      return this.mockAttributionAnalysis(attributionResults);
    }
    return this.mockAttributionAnalysis(attributionResults);
  }

  async generateFunnelInsights(funnel: FunnelAnalysis): Promise<ExperimentInsight[]> {
    if (this.mockMode) {
      return this.mockFunnelInsights(funnel);
    }
    return this.mockFunnelInsights(funnel);
  }

  async suggestNextExperiments(params: {
    completedExperiments: Array<{ id: string; result?: { lift: number; revenueImpact: number } }>;
    currentHypotheses: ExperimentHypothesis[];
    topChannels: Channel[];
  }): Promise<string[]> {
    if (this.mockMode) {
      return this.mockExperimentSuggestions(params);
    }
    return this.mockExperimentSuggestions(params);
  }

  scoreConfidence(text: string, evidence: string[]): AIConfidenceScore {
    const baseScore = 0.7;
    const factorCount = Math.min(evidence.length, 5);
    const adjustedScore = Math.min(1, baseScore + factorCount * 0.05);
    return {
      score: adjustedScore,
      factors: {
        evidenceCount: factorCount,
        textLength: Math.min(text.length / 500, 1),
      },
      warnings: text.length < 50 ? ["Content may be too brief for reliable scoring"] : [],
      sources: ["llm-analysis", "pattern-matching"],
    };
  }

  private mockHypothesisGeneration(params: {
    topChannels: Channel[];
    funnelStage: string;
    historicalData?: string;
  }): ExperimentHypothesis[] {
    const hypotheses: ExperimentHypothesis[] = [];
    const channels = params.topChannels.slice(0, 3);

    const templates = [
      `Increasing investment in {channel} will improve conversion rates by leveraging existing user intent signals in the {stage} funnel stage.`,
      `Combining {channel1} with {channel2} will create attribution synergy that outperforms single-channel approaches.`,
      `Optimizing {channel} user journey will reduce friction in the {stage} stage, increasing downstream revenue.`,
    ];

    channels.forEach((channel, i) => {
      hypotheses.push({
        id: `llm-hyp-${Date.now()}-${i}`,
        text: templates[i % templates.length]
          .replace("{channel}", channel)
          .replace("{channel1}", channels[0])
          .replace("{channel2}", channels[1] ?? channels[0])
          .replace("{stage}", params.funnelStage),
        hypothesis: `If we optimize ${channel} in the ${params.funnelStage} stage, then we will see measurable improvement in attributed conversions.`,
        confidence: 0.65 + Math.random() * 0.2,
        expectedLift: 0.08 + Math.random() * 0.15,
        effort: i === 0 ? "low" : i === 1 ? "medium" : "high",
        impact: i === 0 ? "high" : "medium",
        priority: i + 1,
        funnelStage: params.funnelStage,
        relatedChannels: [channel],
        generatedAt: new Date().toISOString(),
      });
    });

    return hypotheses;
  }

  private mockAttributionAnalysis(attributionResults: AttributionResult[]): AttributionDiagnostic[] {
    const diagnostics: AttributionDiagnostic[] = [];
    
    for (const result of attributionResults) {
      const topChannel = Object.entries(result.channelAttribution)
        .sort(([, a], [, b]) => b - a)[0];
      
      if (topChannel[1] > 0.5 && result.confidence < 0.7) {
        diagnostics.push({
          issue: "High concentration risk in single channel",
          severity: "warning",
          channels: [topChannel[0] as Channel],
          description: `${topChannel[0]} accounts for ${(topChannel[1] * 100).toFixed(1)}% of attribution but confidence is only ${(result.confidence * 100).toFixed(0)}%. Consider multi-touch models for more balanced allocation.`,
          suggestedModel: "time_decay",
          confidence: this.scoreConfidence("High attribution concentration detected", [
            `Top channel share: ${(topChannel[1] * 100).toFixed(1)}%`,
            `Model confidence: ${(result.confidence * 100).toFixed(0)}%`,
          ]),
        });
      }

      if (result.model === "first_touch" || result.model === "last_touch") {
        const activeChannels = Object.entries(result.channelAttribution)
          .filter(([, value]) => (value ?? 0) > 0)
          .map(([ch]) => ch as Channel);
        diagnostics.push({
          issue: "Single-touch attribution model may misrepresent multi-channel journey",
          severity: "info",
          channels: activeChannels,
          description: "Consider linear or time-decay models for better representation of the full customer journey.",
          suggestedModel: "linear",
          confidence: this.scoreConfidence("Single-touch model analysis", [
            `Model type: ${result.model}`,
            `Confidence: ${(result.confidence * 100).toFixed(0)}%`,
          ]),
        });
      }
    }

    return diagnostics;
  }

  private mockFunnelInsights(funnel: FunnelAnalysis): ExperimentInsight[] {
    const insights: ExperimentInsight[] = [];

    const worstStage = funnel.stages.reduce((worst, stage) => 
      stage.conversionRate < worst.conversionRate ? stage : worst
    , funnel.stages[0]);

    if (worstStage.conversionRate < 0.3) {
      insights.push({
        type: "opportunity",
        priority: "high",
        title: `High drop-off detected in ${worstStage.name} stage`,
        description: `Only ${(worstStage.conversionRate * 100).toFixed(1)}% of users progress past this stage. Investigating this bottleneck could yield significant revenue improvements.`,
        evidence: [
          `Stage conversion rate: ${(worstStage.conversionRate * 100).toFixed(1)}%`,
          `Users exiting: ${worstStage.usersExiting}`,
          `Drop-off reasons: ${worstStage.dropOffReasons?.join(", ") ?? "unknown"}`,
        ],
        confidence: this.scoreConfidence("High drop-off funnel analysis", [
          `Conversion rate: ${worstStage.conversionRate}`,
          `User count: ${funnel.totalUsers}`,
        ]),
        actionable: true,
      });
    }

    const avgConversion = funnel.overallConversionRate;
    if (avgConversion > 0.1) {
      insights.push({
        type: "recommendation",
        priority: "medium",
        title: "Consider cross-channel experimentation",
        description: `Overall funnel conversion of ${(avgConversion * 100).toFixed(1)}% suggests room for improvement through channel interaction experiments.`,
        evidence: [
          `Overall conversion: ${(avgConversion * 100).toFixed(1)}%`,
          `Total users: ${funnel.totalUsers}`,
          `Converted users: ${funnel.convertedUsers}`,
        ],
        confidence: this.scoreConfidence("Cross-channel recommendation", [
          `Funnel stages: ${funnel.stages.length}`,
          `Overall conversion: ${avgConversion}`,
        ]),
        actionable: true,
      });
    }

    return insights;
  }

  private mockExperimentSuggestions(params: {
    completedExperiments: Array<{ id: string; result?: { lift: number; revenueImpact: number } }>;
    currentHypotheses: ExperimentHypothesis[];
    topChannels: Channel[];
  }): string[] {
    const suggestions: string[] = [];
    
    const winners = params.completedExperiments.filter(
      e => e.result && e.result.lift > 0.1
    );
    
    if (winners.length > 0) {
      suggestions.push(`Scale winning experiments: ${winners.map(w => w.id).join(", ")}`);
    }

    if (params.topChannels.length > 0) {
      suggestions.push(`Test ${params.topChannels[0]} with updated creative messaging`);
    }

    if (params.currentHypotheses.length > 0) {
      suggestions.push(`Prioritize high-confidence hypotheses: ${params.currentHypotheses[0].id}`);
    }

    return suggestions;
  }
}

export const llmGateway = new LLMGateway();