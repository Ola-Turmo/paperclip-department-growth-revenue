import type { CohortData, LTVModel, Channel } from "../types/types.js";

export class LTVModeler {
  buildCohortAnalysis(params: {
    customerId: string;
    periods: number;
    initialRevenue: number;
    retentionRates: number[];
    monthlyCosts?: number[];
  }): CohortData {
    const { customerId, periods, initialRevenue, retentionRates, monthlyCosts = [] } = params;
    const cohortId = `cohort-${Date.now()}-${customerId}`;
    const retentionByPeriod: number[] = [];
    const revenueByPeriod: number[] = [];
    const cumulativeRevenuePerUser: number[] = [];
    const churnByPeriod: number[] = [];
    
    let cumulativeRevenue = 0;
    let retained = 1;
    
    for (let i = 0; i < periods; i++) {
      retained *= retentionRates[i] ?? retentionRates[retentionRates.length - 1] ?? 0.9;
      const cost = monthlyCosts[i] ?? 0;
      const revenue = initialRevenue * retained - cost;
      cumulativeRevenue += revenue;
      
      retentionByPeriod.push(retained);
      revenueByPeriod.push(revenue);
      cumulativeRevenuePerUser.push(cumulativeRevenue);
      churnByPeriod.push(1 - (retentionRates[i] ?? 0.9));
    }
    
    return {
      cohortId,
      cohortPeriod: new Date().toISOString().slice(0, 7),
      initialSize: 1,
      retentionByPeriod,
      revenueByPeriod,
      cumulativeRevenuePerUser,
      churnByPeriod,
    };
  }

  predictLTV(params: {
    customerId: string;
    revenueHistory: number[];
    costHistory?: number[];
    projectionMonths?: number;
    retentionRate?: number;
  }): LTVModel {
    const { customerId, revenueHistory, costHistory = [], projectionMonths = 12, retentionRate = 0.95 } = params;
    
    const avgRevenue = revenueHistory.length > 0 
      ? revenueHistory.reduce((s, r) => s + r, 0) / revenueHistory.length 
      : 0;
    const avgCost = costHistory.length > 0 
      ? costHistory.reduce((s, c) => s + c, 0) / costHistory.length 
      : 0;
    const netRevenuePerMonth = avgRevenue - avgCost;
    
    let totalLTV = 0;
    let retention = 1;
    const factors: Record<string, number> = {
      avgMonthlyRevenue: avgRevenue,
      avgMonthlyCost: avgCost,
      netRevenuePerMonth,
      retentionRate,
    };
    
    for (let i = 0; i < projectionMonths; i++) {
      totalLTV += netRevenuePerMonth * retention;
      retention *= retentionRate;
    }
    
    return {
      customerId,
      predictedLTV: totalLTV,
      confidence: Math.min(0.95, 0.5 + revenueHistory.length * 0.05),
      modelType: "cohort_based",
      factors,
      projectionMonths,
    };
  }

  segmentByLTV(customers: Array<{ customerId: string; predictedLTV: number }>): {
    tierS: Array<{ customerId: string; predictedLTV: number }>;
    tierA: Array<{ customerId: string; predictedLTV: number }>;
    tierB: Array<{ customerId: string; predictedLTV: number }>;
    tierC: Array<{ customerId: string; predictedLTV: number }>;
  } {
    const sorted = [...customers].sort((a, b) => b.predictedLTV - a.predictedLTV);
    const total = sorted.length;
    
    const tierSCutoff = Math.max(1, Math.ceil(total * 0.05));
    const tierACutoff = Math.max(tierSCutoff + 1, Math.ceil(total * 0.20));
    const tierBCutoff = Math.max(tierACutoff + 1, Math.ceil(total * 0.50));
    
    const tierS = sorted.slice(0, tierSCutoff);
    const tierA = sorted.slice(tierSCutoff, tierACutoff);
    const tierB = sorted.slice(tierACutoff, tierBCutoff);
    const tierC = sorted.slice(tierBCutoff);
    
    return { tierS, tierA, tierB, tierC };
  }

  computeRetentionCurve(cohortData: CohortData[]): {
    period: number;
    avgRetention: number;
    avgRevenue: number;
  }[] {
    if (cohortData.length === 0) return [];
    
    const maxPeriods = Math.max(...cohortData.map(c => c.retentionByPeriod.length));
    const result: { period: number; avgRetention: number; avgRevenue: number }[] = [];
    
    for (let i = 0; i < maxPeriods; i++) {
      const retentions = cohortData
        .filter(c => c.retentionByPeriod.length > i)
        .map(c => c.retentionByPeriod[i]);
      const revenues = cohortData
        .filter(c => c.revenueByPeriod.length > i)
        .map(c => c.revenueByPeriod[i]);
      
      const avgRetention = retentions.length > 0 
        ? retentions.reduce((s, r) => s + r, 0) / retentions.length 
        : 0;
      const avgRevenue = revenues.length > 0 
        ? revenues.reduce((s, r) => s + r, 0) / revenues.length 
        : 0;
      
      result.push({ period: i, avgRetention, avgRevenue });
    }
    
    return result;
  }
}

export const ltvModeler = new LTVModeler();
