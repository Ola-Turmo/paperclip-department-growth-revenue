import type { LeadScore } from "../types/types.js";

export interface BehavioralSignals {
  hasDemo: boolean;
  hasTrial: boolean;
  pricingPageVisits: number;
  pageViews: number;
  contentDownloads: number;
  emailOpenRate: number;
  webinarAttendances: number;
  daysSinceLastActive: number;
}

export type CompanySize = "enterprise" | "mid" | "smb";

export class LeadScorer {
  scoreLeads(
    leads: Array<{
      leadId: string;
      companySize: CompanySize;
      industry?: string;
      signals: BehavioralSignals;
    }>
  ): LeadScore[] {
    return leads.map((lead) => {
      const { signals, companySize } = lead;
      let score = 0;
      const factors: Record<string, number> = {};

      // demo +30
      if (signals.hasDemo) {
        factors["demo"] = 30;
        score += 30;
      }

      // trial +25
      if (signals.hasTrial) {
        factors["trial"] = 25;
        score += 25;
      }

      // pricing>=3 +15
      if (signals.pricingPageVisits >= 3) {
        factors["pricing"] = 15;
        score += 15;
      }

      // pages>=10 +10
      if (signals.pageViews >= 10) {
        factors["pageViews"] = 10;
        score += 10;
      }

      // downloads>=3 +8
      if (signals.contentDownloads >= 3) {
        factors["downloads"] = 8;
        score += 8;
      }

      // email_open>=50% +5
      if (signals.emailOpenRate >= 0.5) {
        factors["emailOpen"] = 5;
        score += 5;
      }

      // webinar>=1 +5
      if (signals.webinarAttendances >= 1) {
        factors["webinar"] = 5;
        score += 5;
      }

      // last_active<=7d +10
      if (signals.daysSinceLastActive <= 7) {
        factors["recency"] = 10;
        score += 10;
      }

      // enterprise+20, mid+10, smb+5
      if (companySize === "enterprise") {
        factors["enterprise"] = 20;
        score += 20;
      } else if (companySize === "mid") {
        factors["mid"] = 10;
        score += 10;
      } else if (companySize === "smb") {
        factors["smb"] = 5;
        score += 5;
      }

      const grade = this.determineGrade(score);
      const recommendedAction = this.getRecommendedAction(grade);

      return {
        leadId: lead.leadId,
        score,
        grade,
        factors,
        predictedConversionProbability: Math.min(1, score / 100),
        recommendedAction,
        updatedAt: new Date().toISOString(),
      };
    });
  }

  getTopLeads(scores: LeadScore[], count: number = 10): LeadScore[] {
    return [...scores].sort((a, b) => b.score - a.score).slice(0, count);
  }

  explainScore(score: LeadScore): string {
    const topFactors = Object.entries(score.factors)
      .sort(([, a], [, b]) => b - a)
      .slice(0, 3);

    const factorExplanations = topFactors
      .map(([name, value]) => `${name}: +${value}`)
      .join(", ");

    return `Lead ${score.leadId} scored ${score.score}/100 (${score.grade}) based on: ${factorExplanations}. Recommended action: ${score.recommendedAction}`;
  }

  private determineGrade(score: number): LeadScore["grade"] {
    if (score >= 80) return "hot";
    if (score >= 50) return "warm";
    if (score >= 25) return "cool";
    return "cold";
  }

  private getRecommendedAction(grade: LeadScore["grade"]): string {
    switch (grade) {
      case "hot":
        return "Immediately schedule a sales call";
      case "warm":
        return "Send personalized follow-up";
      case "cool":
        return "Send educational content";
      case "cold":
        return "Add to newsletter list";
    }
  }
}

export const leadScorer = new LeadScorer();
