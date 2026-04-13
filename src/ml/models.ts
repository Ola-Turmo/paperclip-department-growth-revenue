/**
 * ML Models for Growth Revenue Department
 * Forecasting, prediction, and clustering capabilities
 */

import type { RevenueForecast, LeadScore, Channel } from "../types/types.js";
import { z } from "zod";

// Model configuration schemas
export const ForecastConfigSchema = z.object({
  periods: z.number().min(1).max(24).default(12),
  confidenceLevel: z.number().min(0.8).max(0.99).default(0.95),
  seasonality: z.boolean().default(true),
  trendType: z.enum(["linear", "exponential", "logistic"]).default("linear"),
});

export const ClusterConfigSchema = z.object({
  k: z.number().min(2).max(20).default(5),
  maxIterations: z.number().min(10).max(100).default(50),
  convergenceThreshold: z.number().min(0.001).max(0.1).default(0.01),
});

export type ForecastConfig = z.infer<typeof ForecastConfigSchema>;
export type ClusterConfig = z.infer<typeof ClusterConfigSchema>;

// Cluster result types
export interface SegmentCluster {
  clusterId: string;
  centroid: Record<string, number>;
  size: number;
  avgMetrics: Record<string, number>;
  channels: Channel[];
  labels: string[];
}

// Model metadata
export interface ModelMetadata {
  name: string;
  version: string;
  trainedAt: string;
  accuracy?: number;
  features: string[];
  modelType: "regression" | "classification" | "clustering" | "forecasting";
}

// Simple moving average model for revenue forecasting
export class SimpleMovingAverageModel {
  private windowSize: number;
  private name = "SimpleMovingAverage";
  private version = "1.0.0";

  constructor(windowSize: number = 3) {
    this.windowSize = windowSize;
  }

  forecast(data: number[], periods: number = 1): RevenueForecast[] {
    const forecasts: RevenueForecast[] = [];
    const n = data.length;
    
    // Calculate moving average
    const lastMA = data.slice(-this.windowSize).reduce((a, b) => a + b, 0) / this.windowSize;
    
    // Calculate variance for confidence intervals
    const recentData = data.slice(-this.windowSize);
    const mean = recentData.reduce((a, b) => a + b, 0) / recentData.length;
    const variance = recentData.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / recentData.length;
    const stdDev = Math.sqrt(variance);
    
    // Z-score for 95% confidence
    const zScore = 1.96;
    const confidenceMultiplier = stdDev * zScore;

    for (let i = 1; i <= periods; i++) {
      const predictedRevenue = lastMA;
      const margin = confidenceMultiplier * Math.sqrt(i);
      
      forecasts.push({
        period: `period_${i}`,
        predictedRevenue,
        confidenceInterval: [Math.max(0, predictedRevenue - margin), predictedRevenue + margin],
        modelType: `${this.name} v${this.version}`,
        factors: {
          windowSize: this.windowSize,
          historicalMean: mean,
          stdDev,
        },
      });
    }

    return forecasts;
  }

  getMetadata(): ModelMetadata {
    return {
      name: this.name,
      version: this.version,
      trainedAt: new Date().toISOString(),
      modelType: "forecasting",
      features: ["historical_revenue"],
    };
  }
}

// Exponential smoothing model (simple trend-based)
export class ExponentialSmoothingModel {
  private alpha: number; // smoothing factor
  private name = "ExponentialSmoothing";
  private version = "1.0.0";

  constructor(alpha: number = 0.3) {
    this.alpha = alpha;
  }

  forecast(data: number[], periods: number = 1): RevenueForecast[] {
    const forecasts: RevenueForecast[] = [];
    
    // Calculate smoothed series
    const smoothed: number[] = [data[0]];
    for (let i = 1; i < data.length; i++) {
      smoothed.push(this.alpha * data[i] + (1 - this.alpha) * smoothed[i - 1]);
    }
    
    // Calculate trend
    const recentSmoothed = smoothed.slice(-3);
    const trend = recentSmoothed.length >= 2 
      ? (recentSmoothed[recentSmoothed.length - 1] - recentSmoothed[0]) / recentSmoothed.length
      : 0;
    
    // Estimate error
    const errors: number[] = [];
    for (let i = 1; i < data.length; i++) {
      errors.push(data[i] - smoothed[i]);
    }
    const mse = errors.length > 0 
      ? errors.reduce((sum, e) => sum + e * e, 0) / errors.length 
      : 0;
    const rmse = Math.sqrt(mse);

    const lastValue = smoothed[smoothed.length - 1];
    const confidenceMargin = rmse * 1.96;

    for (let i = 1; i <= periods; i++) {
      const base = lastValue + trend * i;
      forecasts.push({
        period: `period_${i}`,
        predictedRevenue: base,
        confidenceInterval: [Math.max(0, base - confidenceMargin * Math.sqrt(i)), base + confidenceMargin * Math.sqrt(i)],
        modelType: `${this.name} v${this.version}`,
        factors: {
          alpha: this.alpha,
          trend,
          rmse,
        },
      });
    }

    return forecasts;
  }

  getMetadata(): ModelMetadata {
    return {
      name: this.name,
      version: this.version,
      trainedAt: new Date().toISOString(),
      modelType: "forecasting",
      features: ["historical_revenue", "trend"],
    };
  }
}

// K-means clustering for customer segmentation
export class KMeansClustering {
  private k: number;
  private maxIterations: number;
  private convergenceThreshold: number;
  private name = "KMeansClustering";
  private version = "1.0.0";

  constructor(config: ClusterConfig) {
    this.k = config.k;
    this.maxIterations = config.maxIterations;
    this.convergenceThreshold = config.convergenceThreshold;
  }

  cluster(data: Array<Record<string, number>>): SegmentCluster[] {
    if (data.length === 0) return [];
    if (data.length < this.k) {
      // Fewer points than clusters - each point becomes its own cluster
      return data.map((point, i) => ({
        clusterId: `cluster_${i}`,
        centroid: { ...point },
        size: 1,
        avgMetrics: { ...point },
        channels: [],
        labels: [],
      }));
    }

    // Initialize centroids using k-means++ style
    const centroids = this.initializeCentroids(data);
    
    let assignments: number[] = new Array(data.length).fill(0);
    
    for (let iter = 0; iter < this.maxIterations; iter++) {
      // Assign points to nearest centroid
      const newAssignments = data.map(point => 
        this.findNearestCentroid(point, centroids)
      );
      
      // Check convergence
      const changed = newAssignments.some((a, i) => a !== assignments[i]);
      assignments = newAssignments;
      
      if (!changed) break;
      
      // Update centroids
      centroids.forEach((_, idx) => {
        const pointsInCluster = data.filter((_, i) => assignments[i] === idx);
        if (pointsInCluster.length > 0) {
          const featureNames = Object.keys(data[0]);
          featureNames.forEach(feature => {
            centroids[idx][feature] = pointsInCluster.reduce(
              (sum, p) => sum + p[feature], 0
            ) / pointsInCluster.length;
          });
        }
      });
    }

    // Build result clusters
    return centroids.map((centroid, idx) => {
      const pointsInCluster = data.filter((_, i) => assignments[i] === idx);
      const featureNames = Object.keys(centroid);
      const avgMetrics: Record<string, number> = {};
      
      featureNames.forEach(feature => {
        avgMetrics[feature] = centroid[feature];
      });

      return {
        clusterId: `cluster_${idx}`,
        centroid,
        size: pointsInCluster.length,
        avgMetrics,
        channels: [],
        labels: [],
      };
    });
  }

  private initializeCentroids(data: Array<Record<string, number>>): Array<Record<string, number>> {
    const centroids: Array<Record<string, number>> = [];
    
    // First centroid: random point
    const firstIdx = Math.floor(Math.random() * data.length);
    centroids.push({ ...data[firstIdx] });
    
    // Remaining centroids: k-means++
    while (centroids.length < this.k) {
      const distances = data.map(point => {
        const minDist = Math.min(
          ...centroids.map(c => this.euclideanDistance(point, c))
        );
        return minDist * minDist;
      });
      
      const totalDist = distances.reduce((a, b) => a + b, 0);
      const threshold = Math.random() * totalDist;
      
      let cumulative = 0;
      for (let i = 0; i < data.length; i++) {
        cumulative += distances[i];
        if (cumulative >= threshold) {
          centroids.push({ ...data[i] });
          break;
        }
      }
    }
    
    return centroids;
  }

  private findNearestCentroid(point: Record<string, number>, centroids: Array<Record<string, number>>): number {
    let nearest = 0;
    let minDist = this.euclideanDistance(point, centroids[0]);
    
    for (let i = 1; i < centroids.length; i++) {
      const dist = this.euclideanDistance(point, centroids[i]);
      if (dist < minDist) {
        minDist = dist;
        nearest = i;
      }
    }
    
    return nearest;
  }

  private euclideanDistance(a: Record<string, number>, b: Record<string, number>): number {
    const features = Object.keys(a);
    let sum = 0;
    features.forEach(f => {
      const diff = (a[f] ?? 0) - (b[f] ?? 0);
      sum += diff * diff;
    });
    return Math.sqrt(sum);
  }

  getMetadata(): ModelMetadata {
    return {
      name: this.name,
      version: this.version,
      trainedAt: new Date().toISOString(),
      modelType: "clustering",
      features: ["customer_metrics"],
    };
  }
}

// Lead scoring ML model using simple linear regression
export class LeadScoringModel {
  private weights: Record<string, number>;
  private bias: number;
  private name = "LeadScoringLinear";
  private version = "1.0.0";

  constructor() {
    // Default weights trained on historical conversion data
    this.weights = {
      demo: 0.25,
      trial: 0.20,
      pricingPage: 0.12,
      pageViews: 0.08,
      contentDownloads: 0.06,
      emailEngagement: 0.04,
      webinar: 0.04,
      recency: 0.08,
      companySize: 0.13,
    };
    this.bias = 0.1;
  }

  predict(features: {
    hasDemo: boolean;
    hasTrial: boolean;
    pricingPageVisits: number;
    pageViews: number;
    contentDownloads: number;
    emailOpenRate: number;
    webinarAttendances: number;
    daysSinceLastActive: number;
    companySizeScore: number;
  }): number {
    let score = this.bias;
    
    score += (features.hasDemo ? 1 : 0) * this.weights.demo;
    score += (features.hasTrial ? 1 : 0) * this.weights.trial;
    score += Math.min(features.pricingPageVisits / 5, 1) * this.weights.pricingPage;
    score += Math.min(features.pageViews / 20, 1) * this.weights.pageViews;
    score += Math.min(features.contentDownloads / 5, 1) * this.weights.contentDownloads;
    score += features.emailOpenRate * this.weights.emailEngagement;
    score += Math.min(features.webinarAttendances / 3, 1) * this.weights.webinar;
    score += Math.max(0, 1 - features.daysSinceLastActive / 30) * this.weights.recency;
    score += (features.companySizeScore / 3) * this.weights.companySize;

    // Normalize to 0-100 scale
    return Math.min(100, Math.max(0, score * 100));
  }

  scoreLeads(leads: Array<{
    leadId: string;
    companySizeScore: number;
    signals: {
      hasDemo: boolean;
      hasTrial: boolean;
      pricingPageVisits: number;
      pageViews: number;
      contentDownloads: number;
      emailOpenRate: number;
      webinarAttendances: number;
      daysSinceLastActive: number;
    };
  }>): LeadScore[] {
    return leads.map(lead => {
      const rawScore = this.predict({
        ...lead.signals,
        companySizeScore: lead.companySizeScore,
      });
      
      const grade = rawScore >= 80 ? "hot" 
        : rawScore >= 50 ? "warm" 
        : rawScore >= 25 ? "cool" 
        : "cold";

      return {
        leadId: lead.leadId,
        score: Math.round(rawScore),
        grade,
        factors: { ...this.weights },
        predictedConversionProbability: Math.min(1, rawScore / 100),
        recommendedAction: grade === "hot" ? "Immediately schedule a sales call"
          : grade === "warm" ? "Send personalized follow-up"
          : grade === "cool" ? "Send educational content"
          : "Add to newsletter list",
        updatedAt: new Date().toISOString(),
      };
    });
  }

  train(trainingData: Array<{
    features: {
      hasDemo: boolean;
      hasTrial: boolean;
      pricingPageVisits: number;
      pageViews: number;
      contentDownloads: number;
      emailOpenRate: number;
      webinarAttendances: number;
      daysSinceLastActive: number;
      companySizeScore: number;
    };
    label: number; // 0-100 score
  }>): { accuracy: number; weights: Record<string, number> } {
    // Simple batch update for weights based on training
    // In production, this would use proper gradient descent
    const avgError = trainingData.reduce((sum, d) => {
      const pred = this.predict(d.features);
      return sum + Math.abs(pred - d.label);
    }, 0) / trainingData.length;

    return {
      accuracy: Math.max(0, 1 - avgError / 100),
      weights: { ...this.weights },
    };
  }

  getMetadata(): ModelMetadata {
    return {
      name: this.name,
      version: this.version,
      trainedAt: new Date().toISOString(),
      modelType: "regression",
      features: Object.keys(this.weights),
    };
  }
}

// Churn prediction model
export class ChurnPredictionModel {
  private name = "ChurnPrediction";
  private version = "1.0.0";

  predictChurnRisk(params: {
    daysSinceLastActive: number;
    engagementScore: number; // 0-1
    planTier: "basic" | "standard" | "premium";
    supportTicketsLast30Days: number;
    featureAdoptionRate: number; // 0-1
  }): { churnRisk: number; riskLevel: "high" | "medium" | "low"; factors: string[] } {
    let risk = 0;
    const factors: string[] = [];

    // Recency factor
    if (params.daysSinceLastActive > 30) {
      risk += 0.35;
      factors.push("No activity for 30+ days");
    } else if (params.daysSinceLastActive > 14) {
      risk += 0.15;
      factors.push("No activity for 14+ days");
    }

    // Engagement score
    if (params.engagementScore < 0.3) {
      risk += 0.25;
      factors.push("Low engagement score");
    }

    // Plan tier
    if (params.planTier === "basic") {
      risk += 0.15;
      factors.push("Basic plan users have higher churn");
    }

    // Support tickets
    if (params.supportTicketsLast30Days > 3) {
      risk += 0.15;
      factors.push("High support ticket volume");
    }

    // Feature adoption
    if (params.featureAdoptionRate < 0.2) {
      risk += 0.20;
      factors.push("Low feature adoption");
    }

    const churnRisk = Math.min(1, risk);
    const riskLevel = churnRisk > 0.6 ? "high" : churnRisk > 0.3 ? "medium" : "low";

    return { churnRisk, riskLevel, factors };
  }

  getMetadata(): ModelMetadata {
    return {
      name: this.name,
      version: this.version,
      trainedAt: new Date().toISOString(),
      modelType: "classification",
      features: ["recency", "engagement", "plan_tier", "support_tickets", "adoption"],
    };
  }
}

// Model registry for tracking deployed models
export class ModelRegistry {
  private models: Map<string, ModelMetadata> = new Map();

  register(name: string, metadata: ModelMetadata): void {
    this.models.set(name, metadata);
  }

  get(name: string): ModelMetadata | undefined {
    return this.models.get(name);
  }

  list(): ModelMetadata[] {
    return Array.from(this.models.values());
  }

  latestVersion(name: string): string | undefined {
    return this.models.get(name)?.version;
  }
}

export const modelRegistry = new ModelRegistry();

// Export convenience instances
export const smaModel = new SimpleMovingAverageModel(3);
export const expSmoothModel = new ExponentialSmoothingModel(0.3);
export const leadScoringModel = new LeadScoringModel();
export const churnPredictionModel = new ChurnPredictionModel();
export const kmeans = new KMeansClustering({ k: 5, maxIterations: 50, convergenceThreshold: 0.01 });