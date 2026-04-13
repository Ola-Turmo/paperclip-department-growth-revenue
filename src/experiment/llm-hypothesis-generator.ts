import { callMiniMaxLLM } from "../llm-client.js";
import type { ExperimentHypothesis, Channel } from "../types/types.js";

interface FunnelGap {
  stageName: string;
  currentConversionRate: number;
  industryBenchmark: number;
  gapPercent: number;
}

interface ChannelPerf {
  channel: Channel;
  currentROI: number;
  saturation: "undersaturated" | "optimal" | "oversaturated";
}

/**
 * LLM-powered hypothesis generator — replaces static templates.
 * Uses MiniMax to generate creative, data-driven experiment hypotheses.
 */
export class LLMHypothesisGenerator {
  async generate(params: {
    funnelGaps: FunnelGap[];
    channelData: ChannelPerf[];
    topChannels: Channel[];
    businessContext?: string;
  }): Promise<ExperimentHypothesis[]> {
    const { funnelGaps, channelData, topChannels, businessContext } = params;
    const prompt = `Generate specific, testable A/B experiment hypotheses from this data.

Funnel gaps:
${funnelGaps.map(g => `- ${g.stageName}: ${(g.currentConversionRate*100).toFixed(1)}% vs ${(g.industryBenchmark*100).toFixed(1)}% benchmark (${(g.gapPercent*100).toFixed(1)}% gap)`).join("\n")}

Channel performance:
${channelData.map(c => `- ${c.channel}: ROI=${c.currentROI.toFixed(2)}, saturation=${c.saturation}`).join("\n")}

Return JSON array of {id, text, hypothesis, confidence, expectedLift, effort, impact, priority, funnelStage, relatedChannels}:
- confidence: 0.0-1.0 based on evidence strength
- expectedLift: estimated % lift (e.g. 0.15 for 15%)
- effort: "low"|"medium"|"high"
- impact: "low"|"medium"|"high"
- priority: 0-100 (higher = more important)`;

    const response = await callMiniMaxLLM({
      prompt,
      system: "You are a growth expert. Generate creative, actionable A/B test hypotheses. Return valid JSON array only.",
      maxTokens: 1000,
      temperature: 0.7,
    });

    if (!response) return this.templateFallback(params);

    try {
      const hypotheses = JSON.parse(response) as ExperimentHypothesis[];
      return hypotheses.map((h, i) => ({
        ...h,
        id: h.id || `hyp-llm-${Date.now()}-${i}`,
        expectedLift: typeof h.expectedLift === "number" ? h.expectedLift : 0.1,
        confidence: Math.max(0, Math.min(1, h.confidence ?? 0.6)),
        effort: (h.effort === "low" || h.effort === "medium" || h.effort === "high") ? h.effort : "medium",
        impact: (h.impact === "low" || h.impact === "medium" || h.impact === "high") ? h.impact : "high",
        priority: typeof h.priority === "number" ? h.priority : 50,
        funnelStage: h.funnelStage || funnelGaps[0]?.stageName || "all",
        relatedChannels: Array.isArray(h.relatedChannels) && h.relatedChannels.length > 0 ? h.relatedChannels : topChannels.slice(0, 2),
        generatedAt: new Date().toISOString(),
      }));
    } catch { return this.templateFallback(params); }
  }

  private templateFallback(params: { funnelGaps: FunnelGap[]; channelData: ChannelPerf[]; topChannels: Channel[] }): ExperimentHypothesis[] {
    const hypotheses: ExperimentHypothesis[] = [];
    let id = 1;
    for (const gap of params.funnelGaps.filter(g => g.gapPercent > 0.05)) {
      hypotheses.push({
        id: `hyp-tpl-${Date.now()}-${id++}`,
        text: `Close ${(gap.gapPercent * 100).toFixed(0)}% gap at ${gap.stageName}`,
        hypothesis: `Optimizing ${gap.stageName} from ${(gap.currentConversionRate*100).toFixed(1)}% to ${(gap.industryBenchmark*100).toFixed(1)}% will increase conversions by ${(gap.gapPercent*100).toFixed(1)}%`,
        confidence: Math.min(0.7, gap.gapPercent * 3),
        expectedLift: gap.gapPercent,
        effort: "medium",
        impact: "high",
        priority: Math.round(gap.gapPercent * 500),
        funnelStage: gap.stageName,
        relatedChannels: params.topChannels.slice(0, 2),
        generatedAt: new Date().toISOString(),
      });
    }
    return hypotheses.sort((a, b) => b.priority - a.priority).slice(0, 10);
  }
}
