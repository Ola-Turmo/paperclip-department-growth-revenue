---
name: growth-revenue-experiments
description: Use for growth-and-revenue work involving attribution, causal analysis, LTV prediction, funnel diagnosis, hypothesis generation, experimentation, or revenue intelligence where the goal is measurable commercial improvement rather than generic marketing activity.
---

# Growth Revenue Experiments

Use this skill when the task is genuinely about revenue intelligence and experimentation.

## Read First

Read these files in order:

1. `README.md`
2. `PRD.md` if present
3. `playbooks/` and `docs/` when the task needs operational detail

Then inspect the implementation surface:

- source logic: `src/`
- tests: `tests/`
- evaluation assets: `evals/`

## What This Repo Owns

This repo owns the growth-and-revenue overlay for:

- attribution
- causal inference
- LTV prediction
- funnel gap analysis
- experimentation pipelines
- revenue optimization

## Working Rules

- Prefer measured commercial truth over easy narrative.
- Keep hypotheses explicit and falsifiable.
- Do not confuse correlation with causation.
- Tie changes back to revenue, activation, retention, or cost efficiency.

## Default Workflow

1. Decide whether the task is measurement, experimentation, funnel analysis, or execution planning.
2. Check the real data model and test/eval surface before changing logic.
3. Preserve explainability of revenue claims and experiment conclusions.
4. Validate the result in terms that operators can act on.

## Expected Outcomes

Good work in this repo should produce:

- sharper hypotheses
- better attribution discipline
- faster experimental loops
- more credible revenue insight
