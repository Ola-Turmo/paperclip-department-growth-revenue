export interface SampleSizeResult {
  requiredSampleSizePerVariant: number;
  totalSampleSize: number;
  detectableEffectSize: number;
  power: number;
  confidenceLevel: number;
}

export class SampleSizeCalculator {
  calculate(params: {
    controlConversionRate: number;
    treatmentConversionRate: number;
    power?: number;
    significanceLevel?: number;
  }): SampleSizeResult {
    const { controlConversionRate, treatmentConversionRate, power = 0.8, significanceLevel = 0.05 } = params;
    const p1 = controlConversionRate;
    const p2 = treatmentConversionRate;
    const effectSize = Math.abs(p2 - p1);
    const pooledP = (p1 + p2) / 2;
    const seDiff = Math.sqrt(2 * pooledP * (1 - pooledP));
    const zAlpha = this.inverseNormalCDF(1 - significanceLevel / 2);
    const zBeta = this.inverseNormalCDF(power);
    const n = Math.ceil(2 * Math.pow((zAlpha + zBeta) * seDiff / effectSize, 2));
    return {
      requiredSampleSizePerVariant: n,
      totalSampleSize: n * 2,
      detectableEffectSize: effectSize,
      power,
      confidenceLevel: 1 - significanceLevel,
    };
  }

  calculateFromEffectSize(params: {
    baselineValue: number;
    minimumDetectableEffect: number;
    standardDeviation: number;
    power?: number;
    significanceLevel?: number;
  }): SampleSizeResult {
    const { baselineValue, minimumDetectableEffect, standardDeviation, power = 0.8, significanceLevel = 0.05 } = params;
    const effectSize = standardDeviation > 0 ? Math.abs(minimumDetectableEffect) / standardDeviation : 0.01;
    const zAlpha = this.inverseNormalCDF(1 - significanceLevel / 2);
    const zBeta = this.inverseNormalCDF(power);
    const n = Math.ceil(2 * Math.pow((zAlpha + zBeta) / effectSize, 2));
    return {
      requiredSampleSizePerVariant: n,
      totalSampleSize: n * 2,
      detectableEffectSize: minimumDetectableEffect,
      power,
      confidenceLevel: 1 - significanceLevel,
    };
  }

  getConfidenceSequenceBoundary(params: {
    totalSampleSize: number;
    currentSample: number;
    confidenceLevel?: number;
  }): number {
    const { totalSampleSize, currentSample, confidenceLevel = 0.95 } = params;
    const information = currentSample / totalSampleSize;
    const alpha = 1 - confidenceLevel;
    return this.inverseNormalCDF(1 - alpha / 2) * Math.sqrt(information);
  }

  isSignificant(params: {
    controlConversions: number;
    controlSample: number;
    treatmentConversions: number;
    treatmentSample: number;
    significanceLevel?: number;
  }): { significant: boolean; pValue: number; confidence: number } {
    const { controlConversions, controlSample, treatmentConversions, treatmentSample, significanceLevel = 0.05 } = params;
    
    const p1 = controlSample > 0 ? controlConversions / controlSample : 0;
    const p2 = treatmentSample > 0 ? treatmentConversions / treatmentSample : 0;
    const pooledP = controlSample + treatmentSample > 0 
      ? (controlConversions + treatmentConversions) / (controlSample + treatmentSample) 
      : 0;
    
    const se = Math.sqrt(pooledP * (1 - pooledP) * (1/controlSample + 1/treatmentSample));
    const z = se > 0 ? (p2 - p1) / se : 0;
    const pValue = 2 * (1 - this.normalCDF(Math.abs(z)));
    const confidence = this.normalCDF(Math.abs(z));
    
    return {
      significant: pValue < significanceLevel,
      pValue,
      confidence,
    };
  }

  computePower(params: {
    effectSize: number;
    sampleSize: number;
    significanceLevel?: number;
  }): number {
    const { effectSize, sampleSize, significanceLevel = 0.05 } = params;
    const zAlpha = this.inverseNormalCDF(1 - significanceLevel / 2);
    const se = Math.sqrt(2 / sampleSize);
    const zBeta = (effectSize / se) - zAlpha;
    return this.normalCDF(zBeta);
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
    let q: number;
    
    if (p < pLow) {
      q = Math.sqrt(-2 * Math.log(p));
      return (((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
              ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    } else if (p <= pHigh) {
      q = p - 0.5;
      const r = q * q;
      return (((((a[0]*r+a[1])*r+a[2])*r+a[3])*r+a[4])*r+a[5])*q /
              (((((b[0]*r+b[1])*r+b[2])*r+b[3])*r+b[4])*r+1);
    } else {
      q = Math.sqrt(-2 * Math.log(1 - p));
      return -(((((c[0]*q+c[1])*q+c[2])*q+c[3])*q+c[4])*q+c[5]) /
              ((((d[0]*q+d[1])*q+d[2])*q+d[3])*q+1);
    }
  }
}

export const sampleSizeCalculator = new SampleSizeCalculator();
