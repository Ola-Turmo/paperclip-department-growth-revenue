/**
 * Causal Impact Analysis — interrupted time-series for marketing attribution.
 * Estimates the true causal revenue effect of a channel.
 */
import type { Channel } from "../types/types.js";

export interface CausalImpactResult {
  channel: Channel;
  counterfactualRevenue: number;
  actualRevenue: number;
  causalEffect: number;
  relativeEffect: number;
  probabilityOfCausality: number;
  confidenceInterval: [number, number];
  weeklyEffects: number[];
  interpretation: string;
}

export class CausalImpactAnalyzer {
  analyze(params: {
    channel: Channel;
    prePeriod: Array<{ period: string; revenue: number }>;
    postPeriod: Array<{ period: string; revenue: number }>;
  }): CausalImpactResult {
    const { channel, prePeriod, postPeriod } = params;
    if (prePeriod.length < 4 || postPeriod.length < 2) {
      return this.insufficient(channel, prePeriod, postPeriod);
    }
    const preMean = prePeriod.reduce((s, p) => s + p.revenue, 0) / prePeriod.length;
    const preStd = Math.sqrt(prePeriod.reduce((s, p) => s + (p.revenue - preMean) ** 2, 0) / prePeriod.length);
    const trend = this.estimateTrend(prePeriod);
    let totalCounter = 0, totalActual = 0;
    const weeklyEffects: number[] = [];
    for (const point of postPeriod) {
      const idx = postPeriod.indexOf(point);
      const predicted = preMean + trend * idx;
      totalCounter += predicted;
      totalActual += point.revenue;
      weeklyEffects.push(point.revenue - predicted);
    }
    const causalEffect = totalActual - totalCounter;
    const relEffect = totalCounter > 0 ? causalEffect / totalCounter : 0;
    const probCaus = this.bayesianProb(causalEffect, preStd, postPeriod.length);
    const margin = 1.96 * preStd * Math.sqrt(postPeriod.length);
    return {
      channel,
      counterfactualRevenue: totalCounter,
      actualRevenue: totalActual,
      causalEffect,
      relativeEffect: relEffect,
      probabilityOfCausality: probCaus,
      confidenceInterval: [causalEffect - margin, causalEffect + margin],
      weeklyEffects,
      interpretation: relEffect > 0.05 && probCaus > 0.85 ? "Strong positive causal impact" : relEffect > 0 ? "Moderate positive impact" : relEffect < -0.05 ? "Negative impact — reduce investment" : "Insufficient evidence of causation",
    };
  }

  private estimateTrend(points: Array<{ revenue: number }>): number {
    const n = points.length;
    const xMean = (n - 1) / 2;
    const yMean = points.reduce((s, p) => s + p.revenue, 0) / n;
    let num = 0, den = 0;
    for (let i = 0; i < n; i++) { num += (i - xMean) * (points[i].revenue - yMean); den += (i - xMean) ** 2; }
    return den > 0 ? num / den : 0;
  }

  private bayesianProb(effect: number, std: number, n: number): number {
    const z = std > 0 ? effect / (std * Math.sqrt(n)) : 0;
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const az = Math.abs(z), t2 = 1 / (1 + p * az);
    const cdf = 1 - 0.5 * Math.exp(-az * az * 0.5) * (((((a5 * t2 + a4) * t2) + a3) * t2 + a2) * t2 + a1);
    return z > 0 ? cdf : 1 - cdf;
  }

  private insufficient(channel: Channel, pre: Array<{ revenue: number }>, post: Array<{ revenue: number }>): CausalImpactResult {
    const actual = post.reduce((s, p) => s + p.revenue, 0);
    return { channel, counterfactualRevenue: actual, actualRevenue: actual, causalEffect: 0, relativeEffect: 0, probabilityOfCausality: 0, confidenceInterval: [0, 0], weeklyEffects: [], interpretation: "Insufficient data for causal analysis" };
  }
}
