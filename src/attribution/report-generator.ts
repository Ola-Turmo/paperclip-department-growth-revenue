import type { AttributionResult, Channel, FunnelAnalysis } from "../types/types.js";
import type { ChannelPerformanceSummary } from "./channel-analyzer.js";

export type AttributionModel = "first_touch" | "last_touch" | "linear" | "time_decay" | "u_shaped" | "position_based" | "data_driven";

export interface ReportSummary {
  totalRevenue: number;
  totalConversions: number;
  topChannel: Channel;
  secondChannel: Channel;
  modelAgreement: number;
  channelCount: number;
  conversionCount: number;
}

export interface ChannelBreakdown {
  channel: Channel;
  revenue: number;
  revenuePercent: number;
  conversions: number;
  conversionsPercent: number;
  trend: "up" | "down" | "stable";
  trendPercent: number;
  explanation: string;
}

export interface Recommendation {
  channel: Channel;
  action: "increase_budget" | "decrease_budget" | "test_sequence" | "expand" | "reduce";
  rationale: string;
  expectedImpact: string;
  confidence: number;
  priority: "high" | "medium" | "low";
}

export interface SegmentComparison {
  segmentName: string;
  topChannel: Channel;
  topChannelPercent: number;
  conversionRate: number;
  avgOrderValue: number;
  revenue: number;
}

export interface AttributionReport {
  reportId: string;
  generatedAt: string;
  period: { start: string; end: string };
  models: AttributionResult[];
  primaryModel: AttributionModel;
  summary: ReportSummary;
  channelBreakdown: ChannelBreakdown[];
  recommendations: Recommendation[];
  segments?: SegmentComparison[];
}

export class AttributionReportGenerator {
  generate(params: {
    attributionResults: AttributionResult[];
    primaryModel?: AttributionModel;
    funnelAnalysis?: FunnelAnalysis;
    channelPerformance?: ChannelPerformanceSummary[];
    periodStart: string;
    periodEnd: string;
    segments?: Record<string, {
      touchpoints: import("../types/types.js").Touchpoint[];
      conversions: Array<{ userId: string; revenue: number }>;
    }>;
  }): AttributionReport {
    const { attributionResults, primaryModel = "linear", funnelAnalysis, channelPerformance, periodStart, periodEnd, segments } = params;
    const primary = attributionResults.find(r => r.model === primaryModel) ?? attributionResults[0];
    const totalRevenue = Object.values(primary.channelValue).reduce((s, v) => s + v, 0);
    const sorted = (Object.entries(primary.channelAttribution) as [Channel, number][]).sort((a, b) => b[1] - a[1]);
    const topChannel = sorted[0]?.[0] ?? "direct";
    const secondChannel = sorted[1]?.[0] ?? "direct";
    const channelBreakdown = this.buildChannelBreakdown(primary, totalRevenue);
    const recommendations = channelPerformance
      ? this.generateRecommendations(attributionResults, channelPerformance)
      : [];
    let segmentComparisons: SegmentComparison[] | undefined;
    if (segments) {
      segmentComparisons = Object.entries(segments).map(([segmentName, data]) => {
        const userSet = new Set(data.touchpoints.map(tp => tp.userId));
        const topCh = sorted[0]?.[0] ?? "direct";
        const rev = data.conversions.reduce((s, c) => s + c.revenue, 0);
        return {
          segmentName, topChannel: topCh,
          topChannelPercent: totalRevenue > 0 ? (primary.channelAttribution[topCh] ?? 0) * 100 : 0,
          conversionRate: userSet.size > 0 ? data.conversions.length / userSet.size : 0,
          avgOrderValue: data.conversions.length > 0 ? rev / data.conversions.length : 0,
          revenue: rev,
        };
      });
    }
    return {
      reportId: `rpt-${Date.now()}`,
      generatedAt: new Date().toISOString(),
      period: { start: periodStart, end: periodEnd },
      models: attributionResults,
      primaryModel: primary.model as AttributionModel,
      summary: {
        totalRevenue,
        totalConversions: Object.values(primary.conversionsAttributed).reduce((s, v) => s + v, 0),
        topChannel, secondChannel,
        modelAgreement: 0.8,
        channelCount: Object.values(primary.channelAttribution).filter(v => v > 0).length,
        conversionCount: Object.values(primary.conversionsAttributed).reduce((s, v) => s + v, 0),
      },
      channelBreakdown,
      recommendations,
      segments: segmentComparisons,
    };
  }

  generateExecutiveSummary(report: AttributionReport): string {
    const { summary } = report;
    return `${summary.topChannel} is the dominant channel with ${summary.totalRevenue > 0 ? ((Object.values(report.channelBreakdown[0]?.revenue ?? 0) as unknown as number) / summary.totalRevenue * 100).toFixed(1) : 0}% of attributed revenue. ${report.recommendations[0] ? `Top recommendation: ${report.recommendations[0].action} on ${report.recommendations[0].channel}.` : ""}`;
  }

  toJSON(report: AttributionReport): string {
    return JSON.stringify(report, null, 2);
  }

  toMarkdown(report: AttributionReport): string {
    const lines = [
      `# Attribution Report — ${report.period.start} to ${report.period.end}`,
      `**Primary Model:** ${report.primaryModel}`,
      `**Generated:** ${report.generatedAt}`,
      ``,
      `## Channel Performance`,
      ``,
      `| Channel | Revenue | % | Trend |`,
      `|---------|---------|---|---|`,
    ];
    for (const ch of report.channelBreakdown) {
      lines.push(`| ${ch.channel} | $${ch.revenue.toFixed(2)} | ${ch.revenuePercent.toFixed(1)}% | ${ch.trend} |`);
    }
    lines.push(``, `## Top Recommendations`);
    for (const rec of report.recommendations.slice(0, 3)) {
      lines.push(`- **${rec.action}** ${rec.channel}: ${rec.rationale} (Confidence: ${(rec.confidence * 100).toFixed(0)}%, Expected: ${rec.expectedImpact}) [${rec.priority}]`);
    }
    return lines.join("\n");
  }

  toCSV(report: AttributionReport): string {
    const rows = [["Channel", "Revenue", "RevenuePercent", "Conversions", "Trend"]];
    for (const ch of report.channelBreakdown) {
      rows.push([ch.channel, ch.revenue.toFixed(2), ch.revenuePercent.toFixed(1), ch.conversions.toString(), ch.trend]);
    }
    return rows.map(r => r.join(",")).join("\n");
  }

  private buildChannelBreakdown(result: AttributionResult, totalRevenue: number): ChannelBreakdown[] {
    return (Object.entries(result.channelAttribution) as [Channel, number][])
      .sort((a, b) => b[1] - a[1])
      .filter(([, v]) => v > 0)
      .map(([channel, fraction]) => ({
        channel,
        revenue: result.channelValue[channel] ?? 0,
        revenuePercent: totalRevenue > 0 ? fraction * 100 : 0,
        conversions: result.conversionsAttributed[channel] ?? 0,
        conversionsPercent: Object.values(result.conversionsAttributed).reduce((s, v) => s + v, 0) > 0
          ? ((result.conversionsAttributed[channel] ?? 0) / Object.values(result.conversionsAttributed).reduce((s, v) => s + v, 0)) * 100 : 0,
        trend: "stable" as const,
        trendPercent: 0,
        explanation: result.explanations[channel] ?? "",
      }));
  }

  private generateRecommendations(results: AttributionResult[], channelPerf: ChannelPerformanceSummary[]): Recommendation[] {
    const primary = results[0];
    const topCh = (Object.entries(primary.channelAttribution) as [Channel, number][]).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!topCh) return [];
    const perf = channelPerf.find(p => p.channel === topCh);
    const action: Recommendation["action"] = perf && perf.efficiency > 50 ? "increase_budget" : "expand";
    return [{
      channel: topCh,
      action,
      rationale: `${topCh} drives the most attributed revenue.`,
      expectedImpact: "+10-20% revenue with budget increase.",
      confidence: 0.75,
      priority: "high",
    }];
  }
}
