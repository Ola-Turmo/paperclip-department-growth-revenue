import type { ABTest, ExperimentVariant } from "../types/types.js";

export interface LeaderboardEntry {
  experimentId: string;
  experimentName: string;
  status: string;
  winner?: ExperimentVariant | "no_winner" | undefined;
  lift: number;
  revenue_impact: number;
  statistical_significance: number;
  startedAt?: string;
  concludedAt?: string;
}

export interface AggregateStats {
  totalExperiments: number;
  winningExperiments: number;
  totalRevenueImpact: number;
  avgLift: number;
  avgSignificance: number;
  runningCount: number;
  concludedCount: number;
}

export class ExperimentLeaderboard {
  rank(params: {
    experiments: ABTest[];
    sortBy?: "revenue_impact" | "lift" | "statistical_significance";
    sortOrder?: "asc" | "desc";
  }): LeaderboardEntry[] {
    const { experiments, sortBy = "revenue_impact", sortOrder = "desc" } = params;
    
    const entries: LeaderboardEntry[] = experiments.map(exp => ({
      experimentId: exp.id,
      experimentName: exp.name,
      status: exp.status,
      winner: exp.result?.winner,
      lift: exp.result?.lift ?? 0,
      revenue_impact: exp.result?.revenueImpact ?? 0,
      statistical_significance: exp.result?.statisticalSignificance ?? 0,
      startedAt: exp.startedAt,
      concludedAt: exp.concludedAt,
    }));
    
    return entries.sort((a, b) => {
      const aVal = a[sortBy as keyof LeaderboardEntry] ?? 0;
      const bVal = b[sortBy as keyof LeaderboardEntry] ?? 0;
      return sortOrder === "desc" 
        ? (typeof bVal === "number" ? bVal - (aVal as number) : 0)
        : (typeof aVal === "number" ? aVal - (bVal as number) : 0);
    });
  }

  getAggregateStats(experiments: ABTest[]): AggregateStats {
    const concluded = experiments.filter(e => e.status === "concluded");
    const running = experiments.filter(e => e.status === "running");
    const winners = concluded.filter(e => e.result?.winner && e.result.winner !== "no_winner");
    
    const lifts = concluded.map(e => e.result?.lift ?? 0);
    const significances = concluded.map(e => e.result?.statisticalSignificance ?? 0);
    const impacts = concluded.map(e => e.result?.revenueImpact ?? 0);
    
    const avgLift = lifts.length > 0 ? lifts.reduce((s, l) => s + l, 0) / lifts.length : 0;
    const avgSignificance = significances.length > 0 
      ? significances.reduce((s, s_) => s + s_, 0) / significances.length 
      : 0;
    const totalImpact = impacts.reduce((s, i) => s + i, 0);
    
    return {
      totalExperiments: experiments.length,
      winningExperiments: winners.length,
      totalRevenueImpact: totalImpact,
      avgLift,
      avgSignificance,
      runningCount: running.length,
      concludedCount: concluded.length,
    };
  }

  getExperimentsNeedingAttention(experiments: ABTest[]): LeaderboardEntry[] {
    const needsAttention = experiments.filter(exp => {
      // Running for more than 4 weeks without significance
      if (exp.status === "running" && exp.startedAt) {
        const startDate = new Date(exp.startedAt);
        const weeksRunning = (Date.now() - startDate.getTime()) / (7 * 24 * 60 * 60 * 1000);
        const significance = exp.result?.statisticalSignificance ?? 0;
        return weeksRunning > 4 && significance < 0.8;
      }
      // Concluded but no clear winner
      if (exp.status === "concluded" && (!exp.result || exp.result.winner === "no_winner")) {
        return true;
      }
      return false;
    });
    
    return this.rank({ experiments: needsAttention, sortBy: "revenue_impact", sortOrder: "desc" });
  }
}

export const experimentLeaderboard = new ExperimentLeaderboard();
