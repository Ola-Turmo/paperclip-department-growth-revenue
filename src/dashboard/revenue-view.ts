import type { RevenueForecast } from "../types/types.js";

export interface MRRSummary {
  currentMRR: number;
  previousMRR: number;
  mrrGrowthRate: number;
  mrrForecast: number;
  churnRate: number;
  netNewMRR: number;
}

export interface SegmentBreakdown {
  segmentName: string;
  revenue: number;
  percentage: number;
  growthRate: number;
  customerCount: number;
  avgRevenuePerCustomer: number;
}

export interface PipelineStage {
  stageName: string;
  deals: number;
  value: number;
  avgDealSize: number;
  conversionRateToNext: number;
  expectedCloseDate: string;
}

export interface PipelineView {
  totalPipelineValue: number;
  weightedPipelineValue: number;
  stages: PipelineStage[];
  projectedRevenue: Record<string, number>;
}

export class RevenueIntelligenceView {
  getMRRSummary(params: {
    currentRevenue: number;
    previousRevenue: number;
    churnedRevenue: number;
    forecasts: RevenueForecast[];
  }): MRRSummary {
    const { currentRevenue, previousRevenue, churnedRevenue, forecasts } = params;
    const mrrGrowthRate = previousRevenue > 0 
      ? ((currentRevenue - previousRevenue) / previousRevenue) * 100 
      : 0;
    const netNewMRR = currentRevenue - previousRevenue + churnedRevenue;
    const avgForecast = forecasts.length > 0 
      ? forecasts.reduce((s, f) => s + f.predictedRevenue, 0) / forecasts.length 
      : currentRevenue;
    
    return {
      currentMRR: currentRevenue,
      previousMRR: previousRevenue,
      mrrGrowthRate,
      mrrForecast: avgForecast,
      churnRate: previousRevenue > 0 ? (churnedRevenue / previousRevenue) * 100 : 0,
      netNewMRR,
    };
  }

  getSegmentBreakdown(params: {
    segments: Array<{
      name: string;
      revenue: number;
      customerCount: number;
      previousRevenue?: number;
    }>;
  }): SegmentBreakdown[] {
    const { segments } = params;
    const totalRevenue = segments.reduce((s, seg) => s + seg.revenue, 0);
    
    return segments.map(seg => {
      const prevRev = seg.previousRevenue ?? seg.revenue * 0.9;
      const growthRate = prevRev > 0 ? ((seg.revenue - prevRev) / prevRev) * 100 : 0;
      
      return {
        segmentName: seg.name,
        revenue: seg.revenue,
        percentage: totalRevenue > 0 ? (seg.revenue / totalRevenue) * 100 : 0,
        growthRate,
        customerCount: seg.customerCount,
        avgRevenuePerCustomer: seg.customerCount > 0 ? seg.revenue / seg.customerCount : 0,
      };
    });
  }

  buildPipelineView(params: {
    stages: Array<{
      name: string;
      deals: Array<{
        value: number;
        closeProbability: number;
        expectedCloseDate: string;
      }>;
    }>;
  }): PipelineView {
    const { stages } = params;
    const pipelineStages: PipelineStage[] = [];
    let totalPipelineValue = 0;
    let weightedPipelineValue = 0;
    const projectedRevenue: Record<string, number> = {};
    
    for (const stage of stages) {
      const stageValue = stage.deals.reduce((s, d) => s + d.value, 0);
      const weightedValue = stage.deals.reduce((s, d) => s + d.value * d.closeProbability, 0);
      const avgDealSize = stage.deals.length > 0 ? stageValue / stage.deals.length : 0;
      
      const conversionRateToNext = 0.25; // Simplified
      
      const projected = stage.deals
        .filter(d => {
          const closeDate = new Date(d.expectedCloseDate);
          return closeDate >= new Date();
        })
        .reduce((s, d) => s + d.value * d.closeProbability, 0);
      
      const monthKey = stage.name.toLowerCase().includes("q1") ? "Q1" : 
                       stage.name.toLowerCase().includes("q2") ? "Q2" :
                       stage.name.toLowerCase().includes("q3") ? "Q3" : "Q4";
      projectedRevenue[monthKey] = (projectedRevenue[monthKey] ?? 0) + projected;
      
      pipelineStages.push({
        stageName: stage.name,
        deals: stage.deals.length,
        value: stageValue,
        avgDealSize,
        conversionRateToNext,
        expectedCloseDate: stage.deals[0]?.expectedCloseDate ?? new Date().toISOString(),
      });
      
      totalPipelineValue += stageValue;
      weightedPipelineValue += weightedValue;
    }
    
    return {
      totalPipelineValue,
      weightedPipelineValue,
      stages: pipelineStages,
      projectedRevenue,
    };
  }
}

export const revenueIntelligenceView = new RevenueIntelligenceView();
