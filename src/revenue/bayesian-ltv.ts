/**
 * Bayesian LTV Model — survival analysis with prior updating.
 * More principled than simple cohort arithmetic.
 */
export interface BayesianLTVResult {
  customerId: string;
  predictedLTV: number;
  confidence: number;
  confidenceInterval: [number, number];
  expectedRemainingMonths: number;
  churnProbability: number;
  modelType: "bayesian";
  prior: string;
}

export class BayesianLTVModel {
  /**
   * Predict LTV using Bayesian survival analysis with Beta-Binomial updating.
   */
  predict(params: {
    customerId: string;
    transactionHistory: Array<{ periodIndex: number; revenue: number }>;
    churnHistory: Array<{ periodIndex: number; churned: boolean }>;
    projectionMonths?: number;
    priorAlpha?: number;
    priorBeta?: number;
  }): BayesianLTVResult {
    const { customerId, transactionHistory, churnHistory, projectionMonths = 12, priorAlpha = 1, priorBeta = 1 } = params;
    const avgMonthlyRevenue = transactionHistory.length > 0
      ? transactionHistory.reduce((s, t) => s + t.revenue, 0) / transactionHistory.length
      : 0;
    const churnedPeriods = churnHistory.filter(c => c.churned).length;
    const totalPeriods = churnHistory.length || 1;
    // Beta-Binomial posterior for churn rate
    const postAlpha = priorAlpha + churnedPeriods;
    const postBeta = priorBeta + totalPeriods - churnedPeriods;
    // Posterior mean churn rate
    const churnRate = postAlpha / (postAlpha + postBeta);
    // Discount factor
    const discountPerMonth = 0.01;
    const discountFactor = 1 - discountPerMonth;
    // Expected remaining months until churn
    const expectedRemainingMonths = churnRate > 0 ? 1 / churnRate : projectionMonths;
    const monthsToProject = Math.min(projectionMonths, expectedRemainingMonths);
    // PV of future revenue
    let totalLTV = 0;
    for (let m = 1; m <= monthsToProject; m++) {
      totalLTV += avgMonthlyRevenue * Math.pow(discountFactor, m) * (1 - churnRate);
    }
    // Confidence interval (approximate)
    const variance = (postAlpha * postBeta) / ((postAlpha + postBeta) ** 2 * (postAlpha + postBeta + 1));
    const stdChurn = Math.sqrt(variance);
    const ciLower = Math.max(0, churnRate - 1.96 * stdChurn);
    const ciUpper = Math.min(1, churnRate + 1.96 * stdChurn);
    return {
      customerId,
      predictedLTV: Math.max(0, totalLTV),
      confidence: Math.min(1, totalPeriods / 6), // More periods = higher confidence
      confidenceInterval: [totalLTV * (1 - 1.96 * stdChurn), totalLTV * (1 + 1.96 * stdChurn)],
      expectedRemainingMonths: Math.round(monthsToProject * 10) / 10,
      churnProbability: churnRate,
      modelType: "bayesian",
      prior: `Beta(${postAlpha.toFixed(1)}, ${postBeta.toFixed(1)})`,
    };
  }
}
