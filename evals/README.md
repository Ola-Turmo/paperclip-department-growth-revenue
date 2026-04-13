# Evals — Growth Revenue Department

Executable quality checks, golden cases, and regression suites for validating department capabilities.

## Purpose

Per the PRD's continuous learning requirements:
- Telemetry, evaluation harnesses, fixtures, and replayable traces
- Executable validation of core workflows
- Protection against regressions in key business logic

## Core Workflows to Validate

1. **Experiment Design & Performance Synthesis**
   - Hypothesis generation quality
   - Sample size calculation accuracy
   - Statistical significance detection

2. **Attribution & Diagnostics**
   - Multi-touch attribution correctness
   - Model comparison accuracy
   - Confidence score reliability

3. **Revenue Intelligence**
   - LTV prediction accuracy
   - Lead scoring consistency
   - Forecast confidence intervals

4. **Funnel Intelligence**
   - Stage conversion calculation
   - Drop-off identification
   - Segment-specific opportunity detection

## Test Categories

```
evals/
  ├── attribution/
  ├── experiment/
  ├── revenue/
  ├── funnel/
  └── integration/
```

## Running Evals

```bash
# Run all evaluation suites
npm run evals

# Run specific category
npm run evals:attribution

# Run with detailed output
npm run evals -- --verbose
```