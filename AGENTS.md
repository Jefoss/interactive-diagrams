# AGENTS.md

## App Gist

This project is building a schema-driven interactive diagram tool for explaining system flows.

The app should let a user either:

- view the full diagram as a readable graph, or
- replay a scenario step by step, with commentary and highlighted nodes and edges.

The goal is to make complex flows easy to explore without forcing authors to hand-build layouts, HTML snippets, or bespoke visual logic for every diagram.

## Expected User Experience

- Opening a flow should immediately show a clear diagram.
- Users should be able to pick a scenario and move through it step by step.
- Each step should explain what is happening in plain language and visually highlight only the relevant part of the graph.
- Users should also be able to stay in a full-diagram mode without replaying a scenario.
- The viewer should support shareable URL state for the current view, scenario, and step.

## Product Direction

Treat the product as two connected layers:

1. A stable viewer/runtime that renders validated flow data.
2. An authoring experience that makes creating and editing that flow data easy.

The viewer should stay simple and predictable. The authoring side can grow over time with templates, imports, auto-layout, and assisted draft generation.

## Modeling Principles

- Keep the data model canonical and validated.
- Prefer YAML for human authoring and JSON for runtime/build artifacts.
- Represent flows in terms of views, nodes, edges, scenarios, and steps.
- Store step commentary as Markdown or structured text, not inline HTML.
- Avoid requiring manual coordinates by default; layout should come from auto-layout with optional overrides.

## Behavior Guardrails

- Full-diagram browsing and replay mode should both be first-class experiences.
- Scenario replay must be deterministic: each step points to explicit nodes and edges to highlight.
- Invalid references, duplicate ids, and broken scenario highlights should be rejected by validation.
- The system should remain domain-agnostic so different teams can use the same flow model and viewer patterns.