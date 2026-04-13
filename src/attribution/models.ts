import type { AttributionResult, AttributionConfig, AttributionModel, Channel, Touchpoint } from "../types/types.js";

const ALL_CHANNELS: Channel[] = [
  "organic_search", "paid_search", "organic_social", "paid_social",
  "email", "referral", "direct", "display", "affiliate",
  "video", "podcast", "partner",
];

export class AttributionEngine {
  computeAttribution(params: {
    touchpoints: Touchpoint[];
    conversions: Array<{ userId: string; revenue: number; conversionDate: string }>;
    config: AttributionConfig;
  }): AttributionResult[] {
    const { touchpoints, conversions, config } = params;
    const model = config.model;
    const touchpointsByUser = new Map<string, Touchpoint[]>();
    for (const tp of touchpoints) {
      const existing = touchpointsByUser.get(tp.userId) ?? [];
      existing.push(tp);
      touchpointsByUser.set(tp.userId, existing);
    }
    for (const [userId, tps] of touchpointsByUser) {
      touchpointsByUser.set(userId, tps.sort(
        (a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime()
      ));
    }
    const channelRevenue: Partial<Record<Channel, number>> = {};
    const channelConversions: Partial<Record<Channel, number>> = {};
    for (const conversion of conversions) {
      const userTouchpoints = touchpointsByUser.get(conversion.userId) ?? [];
      if (userTouchpoints.length === 0) continue;
      const attribution = this.getAttributionForModel(userTouchpoints, conversion.revenue, model, config);
      for (const ch of ALL_CHANNELS) {
        const value = attribution[ch] ?? 0;
        channelRevenue[ch] = (channelRevenue[ch] ?? 0) + value;
        if (value > 0) channelConversions[ch] = (channelConversions[ch] ?? 0) + 1;
      }
    }
    const totalRevenue = Object.values(channelRevenue).reduce((sum, v) => sum + (v ?? 0), 0);
    const channelAttribution = this.buildChannelTotals(channelRevenue, totalRevenue);
    const explanations = this.generateExplanations(model, channelAttribution, channelRevenue);
    const confidence = this.computeConfidence(channelAttribution, totalRevenue);
    return [{
      model,
      channelAttribution: channelAttribution as Record<Channel, number>,
      channelValue: channelRevenue as Record<Channel, number>,
      conversionsAttributed: channelConversions as Record<Channel, number>,
      confidence,
      explanations,
    }];
  }

  compareModels(params: {
    touchpoints: Touchpoint[];
    conversions: Array<{ userId: string; revenue: number; conversionDate: string }>;
    models: AttributionModel[];
  }): AttributionResult[] {
    return params.models.map(model =>
      this.computeAttribution({ touchpoints: params.touchpoints, conversions: params.conversions, config: { model, lookbackWindowDays: 30 } })[0]
    );
  }

  validateAgainstGroundTruth(params: {
    touchpoints: Touchpoint[];
    conversions: Array<{ userId: string; revenue: number; conversionDate: string }>;
    groundTruthAttribution: Record<Channel, number>;
    model: AttributionModel;
  }): { accuracy: number; mae: number; rmse: number } {
    const result = this.computeAttribution({ touchpoints: params.touchpoints, conversions: params.conversions, config: { model: params.model, lookbackWindowDays: 30 } })[0];
    let mae = 0, sumTruth = 0;
    for (const ch of ALL_CHANNELS) {
      const computed = result.channelAttribution[ch] ?? 0;
      const truth = params.groundTruthAttribution[ch] ?? 0;
      mae += Math.abs(computed - truth);
      sumTruth += truth;
    }
    mae /= ALL_CHANNELS.length;
    const accuracy = Math.max(0, 1 - mae / (sumTruth / ALL_CHANNELS.length || 1));
    return { accuracy, mae, rmse: Math.sqrt(mae) };
  }

  private getAttributionForModel(tps: Touchpoint[], revenue: number, model: AttributionModel, config: AttributionConfig): Partial<Record<Channel, number>> {
    switch (model) {
      case "first_touch": return this.firstTouch(tps, revenue);
      case "last_touch": return this.lastTouch(tps, revenue);
      case "linear": return this.linear(tps, revenue);
      case "time_decay": return this.timeDecay(tps, revenue, config.touchpointDecayHalfLifeDays ?? 7);
      case "u_shaped": return this.uShaped(tps, revenue);
      case "position_based": return this.positionBased(tps, revenue, config.uShapedFirstLastWeight ?? 0.4, config.uShapedFirstLastWeight ?? 0.4);
      case "data_driven": return this.dataDriven(tps);
      default: return this.linear(tps, revenue);
    }
  }

  private firstTouch(tps: Touchpoint[], revenue: number): Partial<Record<Channel, number>> {
    if (tps.length === 0) return {};
    return { [tps[0].channel]: revenue };
  }

  private lastTouch(tps: Touchpoint[], revenue: number): Partial<Record<Channel, number>> {
    if (tps.length === 0) return {};
    return { [tps[tps.length - 1].channel]: revenue };
  }

  private linear(tps: Touchpoint[], revenue: number): Partial<Record<Channel, number>> {
    const result: Partial<Record<Channel, number>> = {};
    const share = revenue / tps.length;
    for (const tp of tps) result[tp.channel] = (result[tp.channel] ?? 0) + share;
    return result;
  }

  private timeDecay(tps: Touchpoint[], revenue: number, halfLifeDays: number): Partial<Record<Channel, number>> {
    const result: Partial<Record<Channel, number>> = {};
    const msPerDay = 86400000;
    const latest = new Date(tps[tps.length - 1].timestamp).getTime();
    let totalWeight = 0;
    const weights: number[] = [];
    for (const tp of tps) {
      const days = Math.max(0, (latest - new Date(tp.timestamp).getTime()) / msPerDay);
      const w = Math.pow(2, -days / halfLifeDays);
      weights.push(w);
      totalWeight += w;
    }
    for (let i = 0; i < tps.length; i++) {
      const share = revenue * (weights[i] / totalWeight);
      result[tps[i].channel] = (result[tps[i].channel] ?? 0) + share;
    }
    return result;
  }

  private uShaped(tps: Touchpoint[], revenue: number): Partial<Record<Channel, number>> {
    if (tps.length === 1) return { [tps[0].channel]: revenue };
    if (tps.length === 2) {
      return { [tps[0].channel]: revenue / 2, [tps[1].channel]: revenue / 2 };
    }
    const result: Partial<Record<Channel, number>> = {};
    result[tps[0].channel] = (result[tps[0].channel] ?? 0) + revenue * 0.4;
    result[tps[tps.length - 1].channel] = (result[tps[tps.length - 1].channel] ?? 0) + revenue * 0.4;
    const middleShare = revenue * 0.2 / (tps.length - 2);
    for (let i = 1; i < tps.length - 1; i++) {
      result[tps[i].channel] = (result[tps[i].channel] ?? 0) + middleShare;
    }
    return result;
  }

  private positionBased(tps: Touchpoint[], revenue: number, first: number, last: number): Partial<Record<Channel, number>> {
    if (tps.length === 1) return { [tps[0].channel]: revenue };
    const result: Partial<Record<Channel, number>> = {};
    result[tps[0].channel] = (result[tps[0].channel] ?? 0) + revenue * first;
    result[tps[tps.length - 1].channel] = (result[tps[tps.length - 1].channel] ?? 0) + revenue * last;
    const middle = 1 - first - last;
    const middleShare = tps.length > 2 ? middle / (tps.length - 2) : 0;
    for (let i = 1; i < tps.length - 1; i++) {
      result[tps[i].channel] = (result[tps[i].channel] ?? 0) + revenue * middleShare;
    }
    return result;
  }

  private dataDriven(tps: Touchpoint[]): Partial<Record<Channel, number>> {
    const result: Partial<Record<Channel, number>> = {};
    const marginals: Map<Channel, number> = new Map();
    let total = 0;
    for (let i = 0; i < tps.length; i++) {
      const marginal = Math.abs((tps[i].value ?? 0) - (tps[Math.max(0, i - 1)].value ?? 0));
      marginals.set(tps[i].channel, (marginals.get(tps[i].channel) ?? 0) + marginal);
      total += marginal;
    }
    if (total === 0) {
      for (const tp of tps) result[tp.channel] = (result[tp.channel] ?? 0) + 1 / tps.length;
    } else {
      for (const [ch, val] of marginals) result[ch] = val / total;
    }
    return result;
  }

  private buildChannelTotals(channelRevenue: Partial<Record<Channel, number>>, totalRevenue: number): Partial<Record<Channel, number>> {
    const result: Partial<Record<Channel, number>> = {};
    for (const ch of ALL_CHANNELS) {
      result[ch] = totalRevenue > 0 ? (channelRevenue[ch] ?? 0) / totalRevenue : 0;
    }
    return result;
  }

  private generateExplanations(model: AttributionModel, channelAttribution: Partial<Record<Channel, number>>, channelValue: Partial<Record<Channel, number>>): Record<Channel, string> {
    const explanations: Record<Channel, string> = {} as Record<Channel, string>;
    const desc: Record<AttributionModel, string> = {
      first_touch: "First-touch: all credit to the first channel.",
      last_touch: "Last-touch: all credit to the final channel.",
      linear: "Linear: equal credit across all touchpoints.",
      time_decay: "Time decay: exponential decay by recency.",
      u_shaped: "U-shaped: 40% first, 20% middle, 40% last.",
      position_based: "Position-based: custom weights for first, middle, last.",
      data_driven: "Data-driven: Shapley-value inspired marginal contribution.",
    };
    for (const ch of ALL_CHANNELS) {
      const fraction = channelAttribution[ch] ?? 0;
      const value = channelValue[ch] ?? 0;
      explanations[ch] = fraction > 0
        ? `${desc[model]} Channel ${ch}: ${(fraction * 100).toFixed(1)}% ($${(value).toFixed(2)})`
        : `Channel ${ch}: 0% attribution.`;
    }
    return explanations;
  }

  private computeConfidence(channelAttribution: Partial<Record<Channel, number>>, totalRevenue: number): number {
    if (totalRevenue === 0) return 0.5;
    const nonZero = Object.values(channelAttribution).filter(v => (v ?? 0) > 0).length;
    return Math.max(0.5, Math.min(1.0, nonZero / ALL_CHANNELS.length + 0.3));
  }
}

export const attributionEngine = new AttributionEngine();
