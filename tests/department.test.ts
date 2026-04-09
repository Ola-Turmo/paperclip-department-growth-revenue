import { describe, expect, it } from "vitest";
import { connectors, department, jobs, roles, skills } from "../src";

describe("@uos/department-growth-revenue", () => {
  it("captures the growth department boundary", () => {
    expect(department.departmentId).toBe("growth-revenue");
    expect(department.parentFunctionId).toBe("growth");
    expect(department.moduleId).toBeNull();
  });

  it("includes the growth leadership and execution roles", () => {
    expect(roles.some((role) => role.roleKey === "growth")).toBe(true);
    expect(roles.some((role) => role.roleKey === "growth-demand-specialist")).toBe(true);
    expect(jobs.map((job) => job.jobKey)).toEqual([
      "growth-weekly-pipeline-review",
      "growth-lifecycle-review",
    ]);
  });

  it("keeps the growth skill and connector boundary together", () => {
    expect(skills.bundleIds).toContain("uos-growth");
    expect(skills.externalSkills.some((skill) => skill.id === "uos-external-revops")).toBe(true);
    expect(connectors.requiredToolkits).toContain("hubspot");
    expect(connectors.requiredToolkits).toContain("mailchimp");
    expect(connectors.roleToolkits.some((role) => role.roleKey === "growth-revops-lead")).toBe(true);
  });
});
