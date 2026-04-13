import type { ExperimentHypothesis, Channel, GrowthRecipe } from "../types/types.js";

export class HypothesisGenerator {
  generate(params: {
    touchpoints: import("../types/types.js").Touchpoint[];
    conversions: Array<{ userId: string; revenue: number; conversionDate: string }>;
    topChannels?: Channel[];
    funnelStage?: string;
  }): ExperimentHypothesis[] {
    const { topChannels = ["organic_search", "paid_social", "email"] } = params;
    const hypotheses: ExperimentHypothesis[] = [];
    const channels: Channel[] = topChannels;
    
    const channelHypotheses: Record<Channel, string> = {
      organic_search: "Optimizing for organic search rankings will increase first-touch attribution and drive more qualified traffic.",
      paid_search: "Increasing paid search budget on high-intent keywords will improve conversion rates and reduce cost per acquisition.",
      organic_social: "Creating more shareable content on organic social will amplify word-of-mouth and increase referral traffic.",
      paid_social: "Targeted paid social campaigns on lookalike audiences will improve conversion rates from cold audiences.",
      email: "Personalized email campaigns based on user behavior will increase engagement and retention rates.",
      referral: "Referral program incentives will motivate existing customers to bring in new high-value customers.",
      direct: "Direct traffic branding campaigns will strengthen brand recognition and increase repeat visits.",
      display: "Retargeting display ads will remind engaged users to complete their purchase journey.",
      affiliate: "Expanding affiliate partnerships will tap into new audience segments at performance-based cost.",
      video: "Video content marketing will increase engagement time and improve conversion through visual storytelling.",
      podcast: "Podcast sponsorships will build authority and trust, leading to higher organic search volume.",
      partner: "Strategic partner integrations will unlock new distribution channels and co-marketing opportunities.",
    };
    
    const effortMap: Record<number, "low" | "medium" | "high"> = { 0: "low", 1: "medium", 2: "high" };
    const impactMap: Record<number, "low" | "medium" | "high"> = { 0: "low", 1: "medium", 2: "high" };
    
    for (let i = 0; i < channels.length; i++) {
      const ch = channels[i];
      hypotheses.push({
        id: `hyp-${Date.now()}-${i}`,
        text: channelHypotheses[ch],
        hypothesis: `If we invest more in ${ch}, then we will see a measurable increase in attributed conversions.`,
        confidence: 0.5 + Math.random() * 0.4,
        expectedLift: 0.05 + Math.random() * 0.25,
        effort: effortMap[i % 3],
        impact: impactMap[(i + 1) % 3],
        priority: i + 1,
        funnelStage: params.funnelStage ?? "consideration",
        relatedChannels: [ch],
        generatedAt: new Date().toISOString(),
      });
    }
    
    // Cross-channel hypothesis
    if (channels.length >= 2) {
      hypotheses.push({
        id: `hyp-${Date.now()}-cross`,
        text: `Combining ${channels[0]} with ${channels[1]} will create a synergistic effect that outperforms either channel alone.`,
        hypothesis: `If users are exposed to both ${channels[0]} and ${channels[1]} in sequence, then overall conversion rates will increase due to channel synergy.`,
        confidence: 0.6,
        expectedLift: 0.15,
        effort: "medium",
        impact: "high",
        priority: 1,
        funnelStage: params.funnelStage ?? "consideration",
        relatedChannels: [channels[0], channels[1]],
        generatedAt: new Date().toISOString(),
      });
    }
    
    return hypotheses;
  }

  prioritize(hypotheses: ExperimentHypothesis[]): ExperimentHypothesis[] {
    return [...hypotheses].sort((a, b) => {
      const scoreA = a.expectedLift * a.confidence * (a.impact === "high" ? 3 : a.impact === "medium" ? 2 : 1);
      const scoreB = b.expectedLift * b.confidence * (b.impact === "high" ? 3 : b.impact === "medium" ? 2 : 1);
      return scoreB - scoreA;
    });
  }

  expandToMultivariate(hypothesis: ExperimentHypothesis, numVariants: number = 3): ExperimentHypothesis[] {
    const variants: ExperimentHypothesis[] = [];
    for (let i = 0; i < numVariants; i++) {
      variants.push({
        ...hypothesis,
        id: `${hypothesis.id}-mv-${i}`,
        text: `${hypothesis.text} (Variant ${i + 1})`,
        expectedLift: hypothesis.expectedLift * (1 + i * 0.1),
        priority: hypothesis.priority + i * 0.1,
        generatedAt: new Date().toISOString(),
      });
    }
    return variants;
  }

  recipeFromExperiment(experimentId: string, hypothesis: ExperimentHypothesis): GrowthRecipe {
    return {
      id: `recipe-${experimentId}`,
      name: `Growth recipe from experiment ${experimentId}`,
      description: hypothesis.text,
      hypothesis: hypothesis.hypothesis,
      expectedImpact: `Expected lift: ${(hypothesis.expectedLift * 100).toFixed(1)}%`,
      implementationSteps: [
        `Identify target audience for ${hypothesis.relatedChannels.join(" and ")}`,
        "Design experiment with control and treatment groups",
        "Run experiment for statistically significant period",
        "Analyze results and calculate revenue impact",
      ],
      requiredChannels: hypothesis.relatedChannels,
      successMetrics: ["conversion_rate", "revenue_per_user", "cac"],
      difficulty: hypothesis.effort === "low" ? "beginner" : hypothesis.effort === "medium" ? "intermediate" : "advanced",
      applicableFunnelStages: [hypothesis.funnelStage],
      tags: ["experiment-derived", ...hypothesis.relatedChannels],
      source: "internal",
      createdAt: new Date().toISOString(),
    };
  }

  matchRecipes(hypotheses: ExperimentHypothesis[], recipes: GrowthRecipe[]): Map<string, GrowthRecipe[]> {
    const matches = new Map<string, GrowthRecipe[]>();
    for (const hyp of hypotheses) {
      const matched = recipes.filter(recipe =>
        recipe.requiredChannels.some(ch => hyp.relatedChannels.includes(ch)) ||
        recipe.tags.some(tag => hyp.text.toLowerCase().includes(tag.toLowerCase()))
      );
      matches.set(hyp.id, matched);
    }
    return matches;
  }
}

export const hypothesisGenerator = new HypothesisGenerator();
