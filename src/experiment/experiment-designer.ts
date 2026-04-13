import type { ABTest, ExperimentVariant, ExperimentStatus, ExperimentHypothesis } from "../types/types.js";
import type { SampleSizeResult } from "../types/types.js";

export interface ExperimentDesign {
  experiment: ABTest;
  sampleSizeResult: SampleSizeResult;
  estimatedDurationDays: number;
  sequentialMonitoringBoundaries?: number[];
}

export interface RebalanceSuggestion {
  currentAllocation: Record<ExperimentVariant, number>;
  suggestedAllocation: Record<ExperimentVariant, number>;
  reason: string;
}

export class ExperimentDesigner {
  designExperiment(params: {
    name: string;
    hypothesis: ExperimentHypothesis;
    metric: string;
    controlValue: number;
    minimumDetectableEffect: number;
    power?: number;
    significanceLevel?: number;
    variant?: ExperimentVariant;
  }): ExperimentDesign {
    const {
      name,
      hypothesis,
      metric,
      controlValue,
      minimumDetectableEffect,
      power = 0.8,
      significanceLevel = 0.05,
      variant = "treatment_a",
    } = params;

    const effectSize = Math.abs(minimumDetectableEffect / controlValue);
    const sampleSize = this.calculateSampleSize(effectSize, power, significanceLevel);
    
    const experiment: ABTest = {
      id: `exp-${Date.now()}`,
      name,
      hypothesisId: hypothesis.id,
      hypothesis,
      status: "draft",
      variant,
      metric,
      secondaryMetrics: [],
      controlValue,
      treatmentValue: controlValue * (1 + minimumDetectableEffect),
      controlSampleSize: sampleSize.requiredSampleSizePerVariant,
      treatmentSampleSize: sampleSize.requiredSampleSizePerVariant,
    };

    return {
      experiment,
      sampleSizeResult: sampleSize,
      estimatedDurationDays: Math.ceil(sampleSize.totalSampleSize / 100),
    };
  }

  estimateRuntime(params: {
    sampleSize: number;
    dailyTraffic: number;
    trafficAllocation: number;
  }): number {
    const { sampleSize, dailyTraffic, trafficAllocation } = params;
    const dailyUsers = dailyTraffic * trafficAllocation;
    return Math.ceil(sampleSize / dailyUsers);
  }

  checkEarlySignificance(params: {
    controlConversions: number;
    controlSample: number;
    treatmentConversions: number;
    treatmentSample: number;
    significanceThreshold?: number;
  }): { isSignificant: boolean; confidence: number; recommendation: "continue" | "stop" | "ship" } {
    const { controlConversions, controlSample, treatmentConversions, treatmentSample, significanceThreshold = 0.95 } = params;
    
    const p1 = controlSample > 0 ? controlConversions / controlSample : 0;
    const p2 = treatmentSample > 0 ? treatmentConversions / treatmentSample : 0;
    const pooledP = controlSample + treatmentSample > 0 
      ? (controlConversions + treatmentConversions) / (controlSample + treatmentSample) 
      : 0;
    
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/controlSample + 1/treatmentSample));
    const z = se > 0 ? (p2 - p1) / se : 0;
    const confidence = this.normalCDF(Math.abs(z));
    
    const lift = p1 > 0 ? (p2 - p1) / p1 : 0;
    
    if (confidence >= significanceThreshold) {
      return {
        isSignificant: true,
        confidence,
        recommendation: lift > 0 ? "ship" : "stop",
      };
    }
    return { isSignificant: false, confidence, recommendation: "continue" };
  }

  suggestRebalance(params: {
    currentAllocation: Record<ExperimentVariant, number>;
    performance: Partial<Record<ExperimentVariant, { conversions: number; sample: number }>>;
  }): RebalanceSuggestion {
    const { currentAllocation, performance } = params;
    const totalPerf = Object.values(performance).reduce(
      (sum, p) => sum + (p?.conversions ?? 0) / Math.max(1, p?.sample ?? 1), 
      0
    );
    
    const suggestedAllocation = { ...currentAllocation };
    for (const [variant, perf] of Object.entries(performance)) {
      if (perf) {
        const rate = perf.sample > 0 ? perf.conversions / perf.sample : 0;
        const adjustment = (rate / Math.max(0.001, totalPerf)) * 0.1;
        suggestedAllocation[variant as ExperimentVariant] = Math.max(
          0.05,
          Math.min(0.95, (suggestedAllocation[variant as ExperimentVariant] ?? 0.5) + adjustment)
        );
      }
    }
    
    return {
      currentAllocation,
      suggestedAllocation,
      reason: "Rebalancing towards better performing variants based on early data.",
    };
  }

  getSequentialBoundaries(params: {
    totalSampleSize: number;
    numInterims?: number;
    alpha?: number;
  }): number[] {
    const { totalSampleSize, numInterims = 3, alpha = 0.05 } = params;
    const boundaries: number[] = [];
    for (let i = 1; i <= numInterims; i++) {
      const fraction = i / (numInterims + 1);
      const information = fraction;
      const boundary = this.inverseNormalCDF(1 - alpha / (2 * (numInterims + 1))) * Math.sqrt(information);
      boundaries.push(Math.floor(totalSampleSize * fraction));
    }
    return boundaries;
  }

  private calculateSampleSize(effectSize: number, power: number, significance: number): SampleSizeResult {
    const zAlpha = this.inverseNormalCDF(1 - significance / 2);
    const zBeta = this.inverseNormalCDF(power);
    const n = Math.ceil(2 * Math.pow((zAlpha + zBeta) / effectSize, 2));
    return {
      requiredSampleSizePerVariant: n,
      totalSampleSize: n * 2,
      detectableEffectSize: effectSize,
      power,
      confidenceLevel: 1 - significance,
    };
  }

  private normalCDF(z: number): number {
    const a1 = 0.254829592, a2 = -0.284496736, a3 = 1.421413741, a4 = -1.453152027, a5 = 1.061405429, p = 0.3275911;
    const sign = z < 0 ? -1 : 1;
    z = Math.abs(z) / Math.sqrt(2);
    const t = 1 / (1 + p * z);
    return 0.5 * (1 + sign * (1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-z * z)));
  }

  private inverseNormalCDF(p: number): number {
    if (p <= 0) return -Infinity;
    if (p >= 1) return Infinity;
    if (p === 0.5) return 0;
    
    const a = [
      -3.969683028665376e1, 2.209460984245205e2,
      -2.759285104469687e2, 1.383577518672690e2,
      -3.066479806614716e1, 2.506628277459239e0
    ];
    const b = [
      -5.447609879822406e1, 1.615858368580409e2,
      -1.556989798598866e2, 6.680131188771972e1,
      -1.328068155288572e1
    ];
    const c = [
      -7.784894002430293e-3, -3.223964580411365e-1,
      -2.400758277161838e0, -2.549732539343734e0,
      4.374664141464968e0, 2.938163982698783e0
    ];
    const d = [
      7.784695709041462e-3, 3.224671290700398e-1,
      2.445134137142996e0, 3.754408661907416e0
    ];
    
    const pLow = 0.02425;
    const pHigh = 1 - pLow;
    let q: number, r: number;
    
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
              ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      r = q * q;
      return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
              (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
              ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }
  }
}

export const experimentDesigner = new ExperimentDesigner();
