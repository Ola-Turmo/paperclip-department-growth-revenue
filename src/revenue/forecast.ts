import type { RevenueForecast } from "../types/types.js";

export interface Anomaly {
  period: string;
  actualRevenue: number;
  predictedRevenue: number;
  deviationPercent: number;
  severity: "low" | "medium" | "high";
  possibleCauses: string[];
}

export interface ScenarioParams {
  trendAdjustment: number;
  seasonalityMultiplier: number;
  marketingSpendMultiplier: number;
  economicFactor: number;
}

export class RevenueForecaster {
  forecast(params: {
    historicalRevenue: number[];
    periods: number;
    seasonality?: number[];
    trendFactor?: number;
    confidenceLevel?: number;
  }): RevenueForecast[] {
    const { historicalRevenue, periods, seasonality = [], trendFactor = 1.0, confidenceLevel = 0.95 } = params;
    
    if (historicalRevenue.length === 0) {
      return [];
    }
    
    const forecasts: RevenueForecast[] = [];
    const avg = historicalRevenue.reduce((s, r) => s + r, 0) / historicalRevenue.length;
    const variance = historicalRevenue.reduce((s, r) => s + Math.pow(r - avg, 2), 0) / historicalRevenue.length;
    const stdDev = Math.sqrt(variance);
    
    let lastValue = historicalRevenue[historicalRevenue.length - 1];
    
    for (let i = 0; i < periods; i++) {
      const seasonal = seasonality[i % (seasonality.length || 1)] ?? 1;
      const trend = Math.pow(trendFactor, i + 1);
      const predicted = lastValue * seasonal * trend;
      const zScore = 1.96; // ~95% confidence
      const margin = zScore * stdDev * Math.sqrt(i + 1);
      
      forecasts.push({
        period: `2024-${String(i + 1).padStart(2, "0")}`,
        predictedRevenue: predicted,
        confidenceInterval: [Math.max(0, predicted - margin), predicted + margin],
        modelType: "time_series_simulation",
        factors: { trendFactor, seasonality: seasonal, baseRevenue: lastValue },
      });
    }
    
    return forecasts;
  }

  detectAnomalies(params: {
    forecasts: RevenueForecast[];
    actualRevenue?: number[];
  }): Anomaly[] {
    const { forecasts, actualRevenue = [] } = params;
    const anomalies: Anomaly[] = [];
    
    for (let i = 0; i < Math.min(forecasts.length, actualRevenue.length); i++) {
      const forecast = forecasts[i];
      const actual = actualRevenue[i];
      
      if (forecast && actual !== undefined) {
        const deviationPercent = forecast.predictedRevenue > 0 
          ? ((actual - forecast.predictedRevenue) / forecast.predictedRevenue) * 100 
          : 0;
        
        if (Math.abs(deviationPercent) > 10) {
          const severity: Anomaly["severity"] = 
            Math.abs(deviationPercent) > 30 ? "high" : 
            Math.abs(deviationPercent) > 20 ? "medium" : "low";
          
          anomalies.push({
            period: forecast.period,
            actualRevenue: actual,
            predictedRevenue: forecast.predictedRevenue,
            deviationPercent,
            severity,
            possibleCauses: this.suggestCauses(deviationPercent),
          });
        }
      }
    }
    
    return anomalies;
  }

  scenarioAnalysis(params: {
    baseRevenue: number;
    scenarios: ScenarioParams[];
    periods: number;
  }): Map<string, RevenueForecast[]> {
    const { baseRevenue, scenarios, periods } = params;
    const results = new Map<string, RevenueForecast[]>();
    
    for (const scenario of scenarios) {
      const forecasts: RevenueForecast[] = [];
      let revenue = baseRevenue;
      
      for (let i = 0; i < periods; i++) {
        const adjusted = revenue 
          * scenario.trendAdjustment 
          * scenario.seasonalityMultiplier 
          * scenario.marketingSpendMultiplier 
          * scenario.economicFactor;
        
        forecasts.push({
          period: `scenario-${i}`,
          predictedRevenue: adjusted,
          confidenceInterval: [adjusted * 0.85, adjusted * 1.15],
          modelType: "scenario_analysis",
          factors: {
            trendAdjustment: scenario.trendAdjustment,
            seasonalityMultiplier: scenario.seasonalityMultiplier,
            marketingSpendMultiplier: scenario.marketingSpendMultiplier,
            economicFactor: scenario.economicFactor,
          },
        });
        
        revenue = adjusted;
      }
      
      results.set(JSON.stringify(scenario), forecasts);
    }
    
    return results;
  }

  private suggestCauses(deviationPercent: number): string[] {
    if (deviationPercent > 20) {
      return [
        "Unexpected viral growth or marketing campaign success",
        "Supply chain issues causing inventory constraints",
        "Seasonal anomaly or holiday effect",
        "Competitor outage driving unexpected traffic",
      ];
    } else if (deviationPercent < -20) {
      return [
        "Website or service outage",
        "Competitor promotional activity",
        "Economic factor or market downturn",
        "Pricing change or negative customer sentiment",
      ];
    }
    return [
      "Normal variance within expected range",
      "Minor seasonality shift",
      "Small marketing campaign deviation",
    ];
  }
}

export const revenueForecaster = new RevenueForecaster();
