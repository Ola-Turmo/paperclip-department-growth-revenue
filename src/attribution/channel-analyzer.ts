import type { Channel, Touchpoint } from "../types/types.js";

export interface ChannelInteraction {
  channelA: Channel;
  channelB: Channel;
  interactionType: "synergy" | "cannibalization" | "independent" | "suppression";
  synergyScore: number;
  conversionLift: number;
  statisticalSignificance: number;
  sampleSize: number;
  explanation: string;
}

export interface ChannelPairAnalysis {
  pair: [Channel, Channel];
  interaction: ChannelInteraction;
  recommendedAction: "amplify_both" | "reduce_one" | "keep_separate" | "reallocate_budget";
  budgetRecommendation?: { channel: Channel; suggestedBudgetChangePercent: number };
}

export interface ChannelPerformanceSummary {
  channel: Channel;
  totalTouchpoints: number;
  uniqueUsersReached: number;
  conversionsAttributed: number;
  totalRevenueAttributed: number;
  avgTouchpointsPerConversion: number;
  synergyPartners: Channel[];
  cannibalizationRisk: Channel[];
  efficiency: number;
  roas: number;
  trend: "growing" | "stable" | "declining";
  trendMagnitude: number;
}

export class ChannelInteractionAnalyzer {
  analyzeAllPairs(params: {
    touchpoints: Touchpoint[];
    conversions: Array<{ userId: string; revenue: number }>;
    minSampleSize?: number;
  }): ChannelPairAnalysis[] {
    const { touchpoints, conversions, minSampleSize = 30 } = params;
    const touchpointsByUser = new Map<string, Channel[]>();
    for (const tp of touchpoints) {
      const channels = touchpointsByUser.get(tp.userId) ?? [];
      channels.push(tp.channel);
      touchpointsByUser.set(tp.userId, channels);
    }
    const pairs: ChannelPairAnalysis[] = [];
    const allChannels = Array.from(new Set(touchpoints.map(tp => tp.channel)));
    for (let i = 0; i < allChannels.length; i++) {
      for (let j = i + 1; j < allChannels.length; j++) {
        const chA = allChannels[i];
        const chB = allChannels[j];
        let bothCount = 0, onlyACount = 0, onlyBCount = 0;
        for (const [, channels] of touchpointsByUser) {
          const hasA = channels.includes(chA);
          const hasB = channels.includes(chB);
          if (hasA && hasB) bothCount++;
          else if (hasA) onlyACount++;
          else if (hasB) onlyBCount++;
        }
        const total = bothCount + onlyACount + onlyBCount;
        if (total < minSampleSize) continue;
        const expectedBoth = total > 0 ? ((onlyACount + bothCount) / total) * ((onlyBCount + bothCount) / total) * total : 0;
        const synergyScore = expectedBoth > 0 ? (bothCount - expectedBoth) / expectedBoth : 0;
        const zScore = expectedBoth > 0 && bothCount > 0
          ? (bothCount - expectedBoth) / Math.sqrt(expectedBoth * (1 - bothCount / total))
          : 0;
        const significance = this.normalCDF(Math.abs(zScore));
        const interactionType = this.computeInteractionType(synergyScore, significance);
        const lift = expectedBoth > 0 ? (bothCount / expectedBoth) - 1 : 0;
        pairs.push({
          pair: [chA, chB],
          interaction: {
            channelA: chA, channelB: chB, interactionType,
            synergyScore, conversionLift: lift,
            statisticalSignificance: significance, sampleSize: total,
            explanation: `${chA} + ${chB}: ${interactionType === "synergy" ? `${(lift * 100).toFixed(1)}% lift when combined` : synergyScore < -0.1 ? "cannibalization detected" : "no significant interaction"}.`,
          },
          recommendedAction: interactionType === "synergy" ? "amplify_both"
            : interactionType === "cannibalization" ? "reduce_one" : "keep_separate",
        });
      }
    }
    return pairs;
  }

  getChannelPerformance(params: {
    touchpoints: Touchpoint[];
    conversions: Array<{ userId: string; revenue: number; conversionDate: string }>;
    periodStart: string;
    periodEnd: string;
  }): ChannelPerformanceSummary[] {
    const { touchpoints, conversions } = params;
    const touchpointsByChannel = new Map<Channel, Touchpoint[]>();
    for (const tp of touchpoints) {
      const existing = touchpointsByChannel.get(tp.channel) ?? [];
      existing.push(tp);
      touchpointsByChannel.set(tp.channel, existing);
    }
    const results: ChannelPerformanceSummary[] = [];
    for (const [channel, tps] of touchpointsByChannel) {
      const uniqueUsers = new Set(tps.map(tp => tp.userId)).size;
      const convUsers = new Set(tps.filter(tp => tp.event === "conversion").map(tp => tp.userId));
      const revenue = tps.filter(tp => tp.event === "conversion").reduce((s, tp) => s + (tp.value ?? 0), 0);
      const efficiency = tps.length > 0 ? (convUsers.size / tps.length) * 1000 : 0;
      results.push({
        channel, totalTouchpoints: tps.length, uniqueUsersReached: uniqueUsers,
        conversionsAttributed: convUsers.size, totalRevenueAttributed: revenue,
        avgTouchpointsPerConversion: convUsers.size > 0 ? tps.length / convUsers.size : 0,
        synergyPartners: [], cannibalizationRisk: [], efficiency,
        roas: revenue / Math.max(1, tps.filter(t => t.campaignId).length),
        trend: "stable", trendMagnitude: 0,
      });
    }
    return results;
  }

  findOptimalMix(params: {
    touchpoints: Touchpoint[];
    conversions: Array<{ userId: string; revenue: number }>;
    totalBudget: number;
    channelCosts: Partial<Record<Channel, number>>;
  }): { channel: Channel; budgetPercent: number; expectedRoas: number }[] {
    const { conversions, totalBudget } = params;
    const convByUser = new Map(conversions.map(c => [c.userId, c]));
    const revenues = new Map(Array.from(convByUser.values()).map(c => [c.userId, c.revenue]));
    const sorted = Array.from(revenues.entries()).sort((a, b) => b[1] - a[1]);
    const top = sorted.slice(0, 5);
    const total = top.reduce((s, [, r]) => s + r, 0);
    return top.map(([userId, rev]) => ({ channel: "organic_search" as Channel, budgetPercent: total > 0 ? (rev / total) * 100 : 0, expectedRoas: totalBudget > 0 ? rev / totalBudget : 0 }));
  }

  detectSequencePatterns(params: {
    touchpoints: Touchpoint[];
    conversions: Array<{ userId: string; revenue: number }>;
    maxSequenceLength?: number;
  }): { sequence: Channel[]; conversionRate: number; sampleSize: number; revenue: number }[] {
    const { touchpoints, conversions, maxSequenceLength = 4 } = params;
    const convUserIds = new Set(conversions.map(c => c.userId));
    const sequences = new Map<string, { count: number; revenue: number }>();
    for (const [userId, userTps] of new Map(Array.from(new Set(touchpoints.map(tp => tp.userId))).map(uid => {
      const userTpList = touchpoints.filter(tp => tp.userId === uid).sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      );
      return [uid, userTpList] as [string, Touchpoint[]];
    }))) {
      const hasConversion = convUserIds.has(userId);
      const revenue = hasConversion ? (conversions.find(c => c.userId === userId)?.revenue ?? 0) : 0;
      for (let len = 1; len <= Math.min(userTps.length, maxSequenceLength); len++) {
        for (let start = 0; start <= userTps.length - len; start++) {
          const seq = userTps.slice(start, start + len).map(tp => tp.channel).join("→");
          const existing = sequences.get(seq) ?? { count: 0, revenue: 0 };
          sequences.set(seq, { count: existing.count + 1, revenue: existing.revenue + revenue });
        }
      }
    }
    const convCount = convUserIds.size;
    return Array.from(sequences.entries())
      .map(([seqStr, { count, revenue }]) => ({
        sequence: seqStr.split("→") as Channel[],
        conversionRate: convCount > 0 ? count / convCount : 0,
        sampleSize: count, revenue,
      }))
      .filter(s => s.sampleSize >= 3)
      .sort((a, b) => b.conversionRate * Math.sqrt(b.sampleSize) - a.conversionRate * Math.sqrt(a.sampleSize))
      .slice(0, 10);
  }

  private normalCDF(z: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);
    const t = 1 / (1 + p * z);
    return 0.5 * (1 + sign * (1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z)));
  }

  private computeInteractionType(score: number, significance: number): ChannelInteraction["interactionType"] {
    if (significance < 0.7) return "independent";
    if (score > 0.15) return "synergy";
    if (score < -0.15) return "cannibalization";
    return "independent";
  }
}
