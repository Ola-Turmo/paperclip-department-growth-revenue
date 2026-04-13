import { describe, it, expect } from "vitest";
import { AttributionEngine } from "../src/attribution/models.js";
import { SampleSizeCalculator } from "../src/experiment/sample-size-calculator.js";
import { LTVModeler } from "../src/revenue/ltv-model.js";
import { LeadScorer } from "../src/revenue/lead-score.js";
import { ExperimentLeaderboard } from "../src/dashboard/experiment-leaderboard.js";
import type { Touchpoint, ABTest, ExperimentVariant } from "../src/types/types.js";

const attributionEngine = new AttributionEngine();
const sampleSizeCalculator = new SampleSizeCalculator();
const ltvModeler = new LTVModeler();
const leadScorer = new LeadScorer();
const experimentLeaderboard = new ExperimentLeaderboard();

function createTouchpoint(userId: string, channel: string, timestamp: string): Touchpoint {
  return {
    userId,
    channel: channel as Touchpoint["channel"],
    timestamp,
    sessionId: `session-${Math.random()}`,
    event: "engagement",
    value: 1,
  };
}

describe("AttributionEngine", () => {
  it("first_touch → unwrap results[0], expect channelAttribution.paid_search ≈ 1", () => {
    const touchpoints: Touchpoint[] = [
      createTouchpoint("u1", "paid_search", "2024-01-01T10:00:00Z"),
      createTouchpoint("u1", "organic_social", "2024-01-01T11:00:00Z"),
      createTouchpoint("u1", "email", "2024-01-01T12:00:00Z"),
    ];
    const conversions = [{ userId: "u1", revenue: 100, conversionDate: "2024-01-01T12:00:00Z" }];
    const results = attributionEngine.computeAttribution({
      touchpoints,
      conversions,
      config: { model: "first_touch", lookbackWindowDays: 30 },
    });
    const result = results[0];
    expect(result).toBeDefined();
    expect(result.channelAttribution.paid_search).toBeCloseTo(1, 1);
  });

  it("last_touch → unwrap results[0], expect channelAttribution.organic_search ≈ 1", () => {
    const touchpoints: Touchpoint[] = [
      createTouchpoint("u1", "paid_search", "2024-01-01T10:00:00Z"),
      createTouchpoint("u1", "organic_social", "2024-01-01T11:00:00Z"),
      createTouchpoint("u1", "organic_search", "2024-01-01T12:00:00Z"),
    ];
    const conversions = [{ userId: "u1", revenue: 100, conversionDate: "2024-01-01T12:00:00Z" }];
    const results = attributionEngine.computeAttribution({
      touchpoints,
      conversions,
      config: { model: "last_touch", lookbackWindowDays: 30 },
    });
    const result = results[0];
    expect(result).toBeDefined();
    expect(result.channelAttribution.organic_search).toBeCloseTo(1, 1);
  });

  it("linear → unwrap results[0], expect each of 3 channels ≈ 1/3", () => {
    const touchpoints: Touchpoint[] = [
      createTouchpoint("u1", "paid_search", "2024-01-01T10:00:00Z"),
      createTouchpoint("u1", "organic_social", "2024-01-01T11:00:00Z"),
      createTouchpoint("u1", "email", "2024-01-01T12:00:00Z"),
    ];
    const conversions = [{ userId: "u1", revenue: 300, conversionDate: "2024-01-01T12:00:00Z" }];
    const results = attributionEngine.computeAttribution({
      touchpoints,
      conversions,
      config: { model: "linear", lookbackWindowDays: 30 },
    });
    const result = results[0];
    expect(result).toBeDefined();
    expect(result.channelAttribution.paid_search).toBeCloseTo(1 / 3, 1);
    expect(result.channelAttribution.organic_social).toBeCloseTo(1 / 3, 1);
    expect(result.channelAttribution.email).toBeCloseTo(1 / 3, 1);
  });
});

describe("SampleSizeCalculator", () => {
  it("calculate → requiredSampleSizePerVariant > 0", () => {
    const result = sampleSizeCalculator.calculate({
      controlConversionRate: 0.05,
      treatmentConversionRate: 0.07,
    });
    expect(result.requiredSampleSizePerVariant).toBeGreaterThan(0);
  });

  it("isSignificant → p < 0.05 when difference is large (50/1000 vs 75/1000)", () => {
    const result = sampleSizeCalculator.isSignificant({
      controlConversions: 50,
      controlSample: 1000,
      treatmentConversions: 75,
      treatmentSample: 1000,
    });
    expect(result.pValue).toBeLessThan(0.05);
  });

  it("is NOT significant → p > 0.05 when difference is small (50/1000 vs 52/1000)", () => {
    const result = sampleSizeCalculator.isSignificant({
      controlConversions: 50,
      controlSample: 1000,
      treatmentConversions: 52,
      treatmentSample: 1000,
    });
    expect(result.pValue).toBeGreaterThan(0.05);
  });
});

describe("LTVModeler", () => {
  it("buildCohortAnalysis → initialSize, retentionByPeriod correct", () => {
    const result = ltvModeler.buildCohortAnalysis({
      customerId: "c1",
      periods: 3,
      initialRevenue: 100,
      retentionRates: [0.9, 0.85, 0.8],
    });
    expect(result.initialSize).toBe(1);
    expect(result.retentionByPeriod).toHaveLength(3);
    expect(result.retentionByPeriod[0]).toBeCloseTo(0.9, 2);
    expect(result.retentionByPeriod[1]).toBeCloseTo(0.9 * 0.85, 2);
    expect(result.retentionByPeriod[2]).toBeCloseTo(0.9 * 0.85 * 0.8, 2);
  });

  it("predictLTV → modelType MUST be 'cohort_based'", () => {
    const result = ltvModeler.predictLTV({
      customerId: "c1",
      revenueHistory: [100, 100, 100],
    });
    expect(result.modelType).toBe("cohort_based");
  });

  it("segmentByLTV → with 3 customers: tierS=1, tierA=1, tierB=1, tierC=0", () => {
    const customers = [
      { customerId: "c1", predictedLTV: 1000 },
      { customerId: "c2", predictedLTV: 500 },
      { customerId: "c3", predictedLTV: 100 },
    ];
    const result = ltvModeler.segmentByLTV(customers);
    expect(result.tierS).toHaveLength(1);
    expect(result.tierA).toHaveLength(1);
    expect(result.tierB).toHaveLength(1);
    expect(result.tierC).toHaveLength(0);
  });
});

describe("LeadScorer", () => {
  it("hot lead → grade 'hot', score > 50", () => {
    const result = leadScorer.scoreLeads([
      {
        leadId: "l1",
        companySize: "enterprise",
        industry: "tech",
        signals: {
          hasDemo: true,
          hasTrial: true,
          pricingPageVisits: 5,
          pageViews: 15,
          contentDownloads: 5,
          emailOpenRate: 0.7,
          webinarAttendances: 2,
          daysSinceLastActive: 3,
        },
      },
    ]);
    expect(result[0].grade).toBe("hot");
    expect(result[0].score).toBeGreaterThan(50);
  });

  it("cold lead → grade 'cold', score < 20", () => {
    const result = leadScorer.scoreLeads([
      {
        leadId: "l1",
        companySize: "smb",
        industry: "other",
        signals: {
          hasDemo: false,
          hasTrial: false,
          pricingPageVisits: 0,
          pageViews: 2,
          contentDownloads: 0,
          emailOpenRate: 0.1,
          webinarAttendances: 0,
          daysSinceLastActive: 60,
        },
      },
    ]);
    expect(result[0].grade).toBe("cold");
    expect(result[0].score).toBeLessThan(20);
  });

  it("getTopLeads → returns highest score first", () => {
    const leads = leadScorer.scoreLeads([
      {
        leadId: "l1",
        companySize: "smb",
        industry: "other",
        signals: {
          hasDemo: false,
          hasTrial: false,
          pricingPageVisits: 0,
          pageViews: 2,
          contentDownloads: 0,
          emailOpenRate: 0.1,
          webinarAttendances: 0,
          daysSinceLastActive: 60,
        },
      },
      {
        leadId: "l2",
        companySize: "enterprise",
        industry: "tech",
        signals: {
          hasDemo: true,
          hasTrial: true,
          pricingPageVisits: 5,
          pageViews: 15,
          contentDownloads: 5,
          emailOpenRate: 0.7,
          webinarAttendances: 2,
          daysSinceLastActive: 3,
        },
      },
    ]);
    const topLeads = leadScorer.getTopLeads(leads, 2);
    expect(topLeads[0].leadId).toBe("l2");
    expect(topLeads[1].leadId).toBe("l1");
  });
});

describe("ExperimentLeaderboard", () => {
  it("rank by revenue_impact → e1 (5000 impact) before e2 (2000)", () => {
    const experiments: ABTest[] = [
      {
        id: "e2",
        name: "Experiment 2",
        status: "concluded",
        variant: "treatment_a",
        metric: "conversion",
        secondaryMetrics: [],
        controlValue: 0,
        treatmentValue: 0,
        controlSampleSize: 0,
        treatmentSampleSize: 0,
        result: {
          statisticalSignificance: 0.95,
          winner: "treatment_a" as ExperimentVariant,
          lift: 0.1,
          revenueImpact: 2000,
          recommendedAction: "ship",
        },
      },
      {
        id: "e1",
        name: "Experiment 1",
        status: "concluded",
        variant: "treatment_a",
        metric: "conversion",
        secondaryMetrics: [],
        controlValue: 0,
        treatmentValue: 0,
        controlSampleSize: 0,
        treatmentSampleSize: 0,
        result: {
          statisticalSignificance: 0.95,
          winner: "treatment_a" as ExperimentVariant,
          lift: 0.2,
          revenueImpact: 5000,
          recommendedAction: "ship",
        },
      },
    ];
    const ranked = experimentLeaderboard.rank({ experiments, sortBy: "revenue_impact", sortOrder: "desc" });
    expect(ranked[0].experimentId).toBe("e1");
    expect(ranked[1].experimentId).toBe("e2");
  });

  it("getAggregateStats → winnerRate = 1 when 1/1 concluded had winner", () => {
    const experiments: ABTest[] = [
      {
        id: "e1",
        name: "Experiment 1",
        status: "concluded",
        variant: "treatment_a",
        metric: "conversion",
        secondaryMetrics: [],
        controlValue: 0,
        treatmentValue: 0,
        controlSampleSize: 0,
        treatmentSampleSize: 0,
        result: {
          statisticalSignificance: 0.95,
          winner: "treatment_a" as ExperimentVariant,
          lift: 0.2,
          revenueImpact: 5000,
          recommendedAction: "ship",
        },
      },
    ];
    const stats = experimentLeaderboard.getAggregateStats(experiments);
    expect(stats.concludedCount).toBe(1);
    expect(stats.winningExperiments).toBe(1);
    expect(stats.winningExperiments / stats.concludedCount).toBe(1);
  });
});
