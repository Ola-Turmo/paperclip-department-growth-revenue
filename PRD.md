---
repo: "uos-department-growth-revenue"
display_name: "@uos/department-growth-revenue"
package_name: "@uos/department-growth-revenue"
lane: "department overlay"
artifact_class: "TypeScript package / business-domain overlay"
maturity: "domain overlay focused on growth and revenue operations"
generated_on: "2026-04-03"
assumptions: "Grounded in the current split-repo contents, package metadata, README/PRD alignment pass, and the Paperclip plugin scaffold presence where applicable; deeper module-level inspection should refine implementation detail as the code evolves."
autonomy_mode: "maximum-capability autonomous work with deep research and explicit learning loops"
---

# PRD: @uos/department-growth-revenue

## 1. Product Intent

**Package / repo:** `@uos/department-growth-revenue`  
**Lane:** department overlay  
**Artifact class:** TypeScript package / business-domain overlay  
**Current maturity:** domain overlay focused on growth and revenue operations  
**Source-of-truth assumption:** Department-specific growth/revenue overlay.
**Runtime form:** Split repo with package code as the source of truth and a Paperclip plugin scaffold available for worker, manifest, UI, and validation surfaces when the repo needs runtime or operator-facing behavior.

@uos/department-growth-revenue turns acquisition, lifecycle, pipeline, monetization, and performance experimentation into a measurable operating overlay. It should help the team find durable growth drivers instead of noisy wins.

## 2. Problem Statement

Growth and revenue systems are vulnerable to vanity metrics, attribution ambiguity, and local optimizations that look good in dashboards but degrade real business outcomes. This overlay should enforce experimental discipline and decision quality.

## 3. Target Users and Jobs to Be Done

- Growth, marketing, sales, and revenue operations teams.
- Leaders evaluating pipeline and monetization performance.
- Autonomous agents proposing experiments, diagnostics, and lifecycle actions.
- Cross-functional teams depending on sound attribution and segmentation.

## 4. Outcome Thesis

**North star:** Growth work becomes more causal, more reusable, and more trustworthy: experiments improve real business outcomes, attribution gets cleaner, and lifecycle actions become more precise.

### 12-month KPI targets
- 100% of launched experiments receive a structured win/loss readout with an explicit decision.
- Funnel diagnosis turnaround stays <= 2 business days for benchmark growth questions.
- Lifecycle trigger accuracy reaches >= 85% on maintained benchmark segments.
- Attribution confidence is labeled on 100% of major growth and revenue reports.
- Reusable playbooks are extracted from >= 70% of experiments that show meaningful business impact.

### Acceptance thresholds for the next implementation wave
- The repo has a stable experiment template, segment vocabulary, and decision framework.
- Attribution logic can be audited instead of treated as a black box.
- Lifecycle triggers and revenue actions are tied to meaningful signals rather than vanity activity.
- Growth findings can be reused as playbooks rather than staying trapped in one-off analyses.

## 5. In Scope

- Experiment planning and performance synthesis.
- Segmentation, lifecycle, and funnel intelligence workflows.
- Attribution quality checks and diagnostics.
- Growth/revenue playbooks and decision memory.
- Signal routing between top-of-funnel and monetization outcomes.

## 6. Explicit Non-Goals

- Claiming certainty where causal evidence is weak.
- Owning all brand or content work that belongs in social/media overlays.
- Pushing lifecycle actions without segment logic, guardrails, or measurement.

## 7. Maximum Tool and Connection Surface

- This repo should assume it may use any connection, API, browser flow, CLI, document surface, dataset, or storage system materially relevant to completing the job, as long as the access pattern is lawful, auditable, and proportionate to risk.
- Do not artificially limit execution to the tools already named in the repo if adjacent systems are clearly required to close the loop.
- Prefer first-party APIs and direct integrations when available, but use browser automation, provider CLIs, structured import/export, and human-review queues when they are the most reliable path to completion.
- Treat communication systems, docs, spreadsheets, issue trackers, code hosts, cloud consoles, dashboards, databases, and admin panels as valid operating surfaces whenever the repo's job depends on them.
- Escalate only when the action is irreversible, privacy-sensitive, financially material, or likely to create external side effects without adequate review.

### Priority surfaces for growth and revenue work
- CRM and revops systems such as HubSpot or Salesforce, marketing automation, ad platforms, web/product analytics, billing systems such as Stripe, attribution tools, experimentation tools, and pipeline systems needed to run commercial workflows to completion.
- Email systems, landing-page builders, CMS/content systems, spreadsheets, docs, dashboards, call-recording or sales-engagement tools, and browser-admin flows when campaign execution or analysis spans multiple tools.
- Revenue operations surfaces for segmentation, lifecycle actions, forecasting, lead routing, deal hygiene, and customer expansion whenever growth work touches actual revenue mechanics.
- Any adjacent system required to connect acquisition, lifecycle, pipeline, monetization, attribution, and learning into one measurable operating loop.

### Selection rules
- Start by identifying the systems that would let the repo complete the real job end to end, not just produce an intermediate artifact.
- Use the narrowest safe action for high-risk domains, but not the narrowest tool surface by default.
- When one system lacks the evidence or authority needed to finish the task, step sideways into the adjacent system that does have it.
- Prefer a complete, reviewable workflow over a locally elegant but operationally incomplete one.

## 8. Autonomous Operating Model

This PRD assumes **maximum-capability autonomous work**. The repo should not merely accept tasks; it should research deeply, compare options, reduce uncertainty, ship safely, and learn from every outcome. Autonomy here means higher standards for evidence, reversibility, observability, and knowledge capture—not just faster execution.

### Required research before every material task
1. Read the repo README, this PRD, touched source modules, existing tests, and recent change history before proposing a solution.
1. Trace impact across adjacent UOS repos and shared contracts before changing interfaces, schemas, or runtime behavior.
1. Prefer evidence over assumption: inspect current code paths, add repro cases, and study real failure modes before implementing a fix.
1. Use external official documentation and standards for any upstream dependency, provider API, framework, CLI, or format touched by the task.
1. For non-trivial work, compare at least two approaches and explicitly choose based on reversibility, operational safety, and long-term maintainability.

### Repo-specific decision rules
- Causal clarity beats vanity uplift.
- Segment-aware reasoning beats global averages when customer heterogeneity matters.
- Experiment learning must survive the campaign, not disappear in a dashboard.
- Revenue optimization should not silently undermine trust or long-term value.

### Mandatory escalation triggers
- Pricing or packaging changes with material customer impact.
- Claims based on low-confidence attribution or incomplete data.
- Lifecycle automations that create compliance or trust risk.

## 9. Continuous Learning Requirements

### Required learning loop after every task
- Every completed task must leave behind at least one durable improvement: a test, benchmark, runbook, migration note, ADR, or automation asset.
- Capture the problem, evidence, decision, outcome, and follow-up questions in repo-local learning memory so the next task starts smarter.
- Promote repeated fixes into reusable abstractions, templates, linters, validators, or code generation rather than solving the same class of issue twice.
- Track confidence and unknowns; unresolved ambiguity becomes a research backlog item, not a silent assumption.
- Prefer instrumented feedback loops: telemetry, evaluation harnesses, fixtures, or replayable traces should be added whenever feasible.

### Repo-specific research agenda
- Which funnel or lifecycle stages contain the largest unexplained loss today?
- Where is attribution weakest or most misleading?
- What segments respond differently enough to require dedicated strategies?
- Which experiments produce durable learnings versus one-off gains?
- How can revenue efficiency be measured more honestly across channels and motions?

### Repo-specific memory objects that must stay current
- Experiment archive and pattern library.
- Segment intelligence briefs.
- Attribution issue ledger.
- Lifecycle playbook catalog.
- Decision-outcome tracking map.

## 10. Core Workflows the Repo Must Master

1. Designing and prioritizing growth experiments.
1. Analyzing funnel drop-offs and segment-specific opportunities.
1. Auditing attribution logic and confidence.
1. Triggering lifecycle actions based on meaningful signals.
1. Converting performance findings into reusable playbooks.

## 11. Interfaces and Dependencies

- Paperclip plugin scaffold for worker, manifest, UI, and validation surfaces.

- `@uos/core` for orchestration and state handling.
- Potential CRM, analytics, or campaign connectors.
- `@uos/department-social-media` and other overlays contributing acquisition signals.

## 12. Implementation Backlog

### Now
- Standardize experiment design, attribution review, and lifecycle trigger definitions.
- Build the first wave of funnel and segment diagnostics tied to real business decisions.
- Make growth findings portable by capturing them as reusable playbooks and not just campaign notes.

### Next
- Improve confidence labeling and causal reasoning in performance reporting.
- Integrate CRM, billing, and analytics surfaces more tightly for end-to-end revenue visibility.
- Reduce experiment noise by enforcing stronger stop/go rules and post-test discipline.

### Later
- Support semi-autonomous campaign and lifecycle execution bounded by explicit business rules.
- Expand from channel and funnel optimization into full revenue-system orchestration.

## 13. Risks and Mitigations

- Vanity growth optimizations with weak business durability.
- Attribution overconfidence leading to bad capital allocation.
- Automation that creates customer fatigue or compliance issues.
- Fragmented knowledge across campaigns and sales motions.

## 14. Definition of Done

A task in this repo is only complete when all of the following are true:

- The code, configuration, or skill behavior has been updated with clear intent.
- Tests, evals, replay cases, or validation artifacts were added or updated to protect the changed behavior.
- Documentation, runbooks, or decision records were updated when the behavior, contract, or operating model changed.
- The task produced a durable learning artifact rather than only a code diff.
- Cross-repo consequences were checked wherever this repo touches shared contracts, orchestration, or downstream users.

### Repo-specific completion requirements
- Every new workflow records its measurement assumptions and confidence level.
- Experiments leave behind reusable knowledge, not only scorecards.
- Segment and attribution consequences are documented alongside performance changes.

## 15. Recommended Repo-Local Knowledge Layout

- `/docs/research/` for research briefs, benchmark notes, and upstream findings.
- `/docs/adrs/` for decision records and contract changes.
- `/docs/lessons/` for task-by-task learning artifacts and postmortems.
- `/evals/` for executable quality checks, golden cases, and regression suites.
- `/playbooks/` for operator runbooks, migration guides, and incident procedures.
