import { useEffect } from "react";
import { useSearchParams } from "react-router-dom";

import type { FlowDocument, FlowScenario } from "../flow-document/index.js";
import { DiagramCanvas } from "./components/DiagramCanvas.js";
import { ScenarioListPanel } from "./components/ScenarioListPanel.js";
import { WalkthroughPanel } from "./components/WalkthroughPanel.js";
import {
  buildEditorUrlSearchParams,
  buildViewerUrlSearchParams,
  findScenario,
  readEditorUrlState,
  readViewerUrlState,
  resolveView,
} from "./url-state.js";

interface HighlightState {
  activeNodeIds: Set<string>;
  activeEdgeIds: Set<string>;
}

interface DiagramWorkspaceProps {
  document: FlowDocument;
  pageMode: "viewer" | "editor";
}

export function DiagramWorkspace({ document, pageMode }: DiagramWorkspaceProps) {
  const [searchParams, setSearchParams] = useSearchParams();
  const scenarios = document.scenarios ?? [];
  const search = searchParams.toString();
  const viewerState = pageMode === "viewer" ? readViewerUrlState(document, searchParams) : null;
  const editorState = pageMode === "editor" ? readEditorUrlState(document, searchParams) : null;
  const selectedScenario =
    pageMode === "viewer" && viewerState
      ? findScenario(scenarios, viewerState.scenarioId)
      : null;
  const selectedView = resolveView(
    document.views,
    pageMode === "viewer" ? viewerState?.viewId ?? null : editorState?.viewId ?? null,
  );
  const isInteractive =
    pageMode === "viewer" &&
    viewerState?.mode === "interactive" &&
    selectedScenario !== null;
  const stepIndex = getStepIndex(selectedScenario, viewerState?.step ?? 0);
  const currentStep =
    isInteractive && selectedScenario ? selectedScenario.steps[stepIndex] : null;
  const highlightState = buildHighlightState(selectedScenario, stepIndex, isInteractive);
  const hasScenarios = pageMode === "viewer" && scenarios.length > 0;
  const isAtFirstStep = stepIndex === 0;
  const isAtLastStep =
    selectedScenario === null || stepIndex === selectedScenario.steps.length - 1;
  const canonicalSearch =
    pageMode === "viewer" && viewerState
      ? buildViewerUrlSearchParams({
          mode: isInteractive ? "interactive" : "diagram",
          scenarioId: viewerState.scenarioId,
          step: stepIndex,
          viewId: selectedView?.id ?? null,
        }).toString()
      : buildEditorUrlSearchParams({ viewId: selectedView?.id ?? null }).toString();

  useEffect(() => {
    if (search === canonicalSearch) {
      return;
    }

    setSearchParams(new URLSearchParams(canonicalSearch), { replace: true });
  }, [canonicalSearch, search, setSearchParams]);

  function handleScenarioSelect(scenario: FlowScenario): void {
    if (pageMode !== "viewer" || !viewerState) {
      return;
    }

    setSearchParams(
      buildViewerUrlSearchParams({
        ...viewerState,
        mode: "interactive",
        scenarioId: scenario.id,
        step: 0,
        viewId: scenario.viewId ?? selectedView?.id ?? null,
      }),
    );
  }

  function handleInteractiveModeChange(enabled: boolean): void {
    if (pageMode !== "viewer" || !viewerState) {
      return;
    }

    if (!enabled) {
      setSearchParams(
        buildViewerUrlSearchParams({
          ...viewerState,
          mode: "diagram",
          step: 0,
          viewId: selectedView?.id ?? null,
        }),
      );
      return;
    }

    const fallbackScenario =
      selectedScenario ??
      findScenarioForView(scenarios, selectedView?.id ?? null) ??
      scenarios[0] ??
      null;

    if (!fallbackScenario) {
      return;
    }

    setSearchParams(
      buildViewerUrlSearchParams({
        mode: "interactive",
        scenarioId: fallbackScenario.id,
        step: selectedScenario ? viewerState.step : 0,
        viewId: fallbackScenario.viewId ?? selectedView?.id ?? null,
      }),
    );
  }

  function handlePrev(): void {
    if (!selectedScenario || !viewerState) {
      return;
    }

    setSearchParams(
      buildViewerUrlSearchParams({
        ...viewerState,
        step: clamp(viewerState.step - 1, 0, selectedScenario.steps.length - 1),
        viewId: selectedView?.id ?? null,
      }),
    );
  }

  function handleNext(): void {
    if (!selectedScenario || !viewerState) {
      return;
    }

    setSearchParams(
      buildViewerUrlSearchParams({
        ...viewerState,
        step: clamp(viewerState.step + 1, 0, selectedScenario.steps.length - 1),
        viewId: selectedView?.id ?? null,
      }),
    );
  }

  function handleReset(): void {
    if (!viewerState) {
      return;
    }

    setSearchParams(
      buildViewerUrlSearchParams({
        ...viewerState,
        step: 0,
        viewId: selectedView?.id ?? null,
      }),
    );
  }

  const headingEyebrow = pageMode === "viewer" ? "Diagram viewer" : "Diagram editor";
  const headingTitle = selectedView?.title ?? (pageMode === "viewer" ? "Overview" : "Editor");
  const headingBody =
    pageMode === "viewer"
      ? selectedView?.description ?? "Explore the full flow or follow a guided replay."
      : "Editing tools will land here next. For now this page shows the diagram canvas without walkthrough controls.";

  return (
    <div className={["app-shell", isInteractive ? "is-interactive" : "is-diagram-only"].join(" ")}>
      {isInteractive ? (
        <ScenarioListPanel
          document={document}
          onScenarioSelect={handleScenarioSelect}
          scenarios={scenarios}
          selectedScenarioId={selectedScenario?.id ?? null}
        />
      ) : null}

      <main className="diagram-panel">
        <div className="diagram-panel-header">
          <div className="diagram-heading">
            <p className="eyebrow">{headingEyebrow}</p>
            <h2>{headingTitle}</h2>
            <p>{headingBody}</p>
            <div className="diagram-meta-row">
              <span className="panel-pill panel-pill-strong">
                {pageMode === "viewer"
                  ? isInteractive
                    ? "Interactive walkthrough"
                    : "Full diagram"
                  : "Editor placeholder"}
              </span>
              {pageMode === "viewer" && isInteractive && selectedScenario ? (
                <span className="panel-pill">{selectedScenario.title}</span>
              ) : pageMode === "viewer" ? (
                <span className="panel-pill panel-pill-muted">Diagram overview</span>
              ) : (
                <span className="panel-pill panel-pill-muted">Scenarios hidden</span>
              )}
            </div>
          </div>
          {pageMode === "viewer" ? (
            <label className="mode-toggle" aria-label="Toggle interactive mode">
              <span className="mode-toggle-label">Interactive mode</span>
              <input
                checked={isInteractive}
                className="mode-toggle-input"
                disabled={!hasScenarios}
                onChange={(event) => handleInteractiveModeChange(event.target.checked)}
                type="checkbox"
              />
              <span className="mode-toggle-track" aria-hidden="true">
                <span className="mode-toggle-thumb" />
              </span>
            </label>
          ) : null}
        </div>

        <DiagramCanvas
          document={document}
          activeNodeIds={highlightState.activeNodeIds}
          activeEdgeIds={highlightState.activeEdgeIds}
          interactiveMode={isInteractive}
        />
      </main>

      {isInteractive ? (
        <WalkthroughPanel
          currentStep={currentStep}
          isAtFirstStep={isAtFirstStep}
          isAtLastStep={isAtLastStep}
          onNext={handleNext}
          onPrev={handlePrev}
          onReset={handleReset}
          scenario={selectedScenario}
          stepIndex={stepIndex}
        />
      ) : null}
    </div>
  );
}

function buildHighlightState(
  scenario: FlowScenario | null,
  stepIndex: number,
  isInteractive: boolean,
): HighlightState {
  const activeNodeIds = new Set<string>();
  const activeEdgeIds = new Set<string>();

  if (!isInteractive || !scenario) {
    return { activeNodeIds, activeEdgeIds };
  }

  scenario.steps.slice(0, stepIndex + 1).forEach((step) => {
    step.activeNodeIds.forEach((nodeId) => activeNodeIds.add(nodeId));
    step.activeEdgeIds.forEach((edgeId) => activeEdgeIds.add(edgeId));
  });

  return { activeNodeIds, activeEdgeIds };
}

function getStepIndex(scenario: FlowScenario | null, step: number): number {
  if (!scenario) {
    return 0;
  }

  return clamp(step, 0, scenario.steps.length - 1);
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}

function findScenarioForView(
  scenarios: FlowScenario[],
  viewId: string | null,
): FlowScenario | null {
  if (!viewId) {
    return null;
  }

  return scenarios.find((scenario) => scenario.viewId === viewId) ?? null;
}
