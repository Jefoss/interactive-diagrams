import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";

import type { FlowDocument, FlowScenario } from "../flow-document/index.js";
import { DiagramCanvas } from "./components/DiagramCanvas.js";
import { ScenarioListPanel } from "./components/ScenarioListPanel.js";
import { WalkthroughPanel } from "./components/WalkthroughPanel.js";

type ViewerMode = "diagram" | "interactive";

interface ViewerState {
  mode: ViewerMode;
  scenarioId: string | null;
  step: number;
  viewId: string | null;
}

interface HighlightState {
  activeNodeIds: Set<string>;
  activeEdgeIds: Set<string>;
}

interface DiagramWorkspaceProps {
  document: FlowDocument;
  pageMode: "viewer" | "editor";
}

export function DiagramWorkspace({ document, pageMode }: DiagramWorkspaceProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const scenarios = document.scenarios ?? [];
  const [viewerState, setViewerState] = useState(() =>
    pageMode === "viewer"
      ? readViewerState(document, location.search)
      : createDiagramOnlyState(document),
  );

  useEffect(() => {
    if (pageMode !== "viewer") {
      return;
    }

    setViewerState(readViewerState(document, location.search));
  }, [document, location.search, pageMode]);

  const selectedScenario =
    pageMode === "viewer" ? resolveScenario(scenarios, viewerState.scenarioId) : null;
  const selectedView = resolveView(document, viewerState.viewId);
  const isInteractive =
    pageMode === "viewer" &&
    viewerState.mode === "interactive" &&
    selectedScenario !== null;
  const stepIndex = getStepIndex(selectedScenario, viewerState.step);
  const currentStep = isInteractive ? selectedScenario.steps[stepIndex] : null;
  const highlightState = buildHighlightState(selectedScenario, stepIndex, isInteractive);
  const hasScenarios = pageMode === "viewer" && scenarios.length > 0;
  const isAtFirstStep = stepIndex === 0;
  const isAtLastStep =
    selectedScenario === null || stepIndex === selectedScenario.steps.length - 1;

  useEffect(() => {
    if (pageMode !== "viewer") {
      return;
    }

    const nextSearch = buildViewerSearch({
      isInteractive,
      scenarioId: selectedScenario?.id ?? null,
      stepIndex,
      viewId: selectedView?.id ?? null,
    });

    if (location.search === nextSearch) {
      return;
    }

    navigate(
      {
        pathname: location.pathname,
        search: nextSearch,
      },
      { replace: true },
    );
  }, [
    isInteractive,
    location.pathname,
    location.search,
    navigate,
    pageMode,
    selectedScenario,
    selectedView,
    stepIndex,
  ]);

  function handleScenarioSelect(scenario: FlowScenario): void {
    if (pageMode !== "viewer") {
      return;
    }

    setViewerState((current) => ({
      ...current,
      mode: "interactive",
      scenarioId: scenario.id,
      step: 0,
      viewId: scenario.viewId ?? current.viewId,
    }));
  }

  function handleInteractiveModeChange(enabled: boolean): void {
    if (pageMode !== "viewer") {
      return;
    }

    if (!enabled) {
      setViewerState((current) => ({
        ...current,
        mode: "diagram",
        step: 0,
      }));
      return;
    }

    const fallbackScenario = selectedScenario ?? scenarios[0] ?? null;

    if (!fallbackScenario) {
      return;
    }

    setViewerState((current) => ({
      ...current,
      mode: "interactive",
      scenarioId: current.scenarioId ?? fallbackScenario.id,
      step: current.scenarioId ? current.step : 0,
      viewId: fallbackScenario.viewId ?? current.viewId,
    }));
  }

  function handlePrev(): void {
    if (!selectedScenario) {
      return;
    }

    setViewerState((current) => ({
      ...current,
      step: clamp(current.step - 1, 0, selectedScenario.steps.length - 1),
    }));
  }

  function handleNext(): void {
    if (!selectedScenario) {
      return;
    }

    setViewerState((current) => ({
      ...current,
      step: clamp(current.step + 1, 0, selectedScenario.steps.length - 1),
    }));
  }

  function handleReset(): void {
    setViewerState((current) => ({
      ...current,
      step: 0,
    }));
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

function createDiagramOnlyState(document: FlowDocument): ViewerState {
  return {
    mode: "diagram",
    scenarioId: null,
    step: 0,
    viewId: document.views?.[0]?.id ?? null,
  };
}

function readViewerState(document: FlowDocument, search: string): ViewerState {
  const params = new URLSearchParams(search);
  const scenarios = document.scenarios ?? [];
  const requestedMode = params.get("mode");
  const requestedStep = Number(params.get("step") ?? 0);
  const requestedScenarioId = params.get("scenario") ?? scenarios[0]?.id ?? null;
  const selectedScenario = resolveScenario(scenarios, requestedScenarioId);
  const interactiveModeRequested =
    requestedMode === "interactive" || (requestedMode === null && selectedScenario !== null);
  const initialViewId = params.get("view") ?? selectedScenario?.viewId ?? document.views?.[0]?.id ?? null;

  return {
    mode: interactiveModeRequested && selectedScenario ? "interactive" : "diagram",
    scenarioId: selectedScenario?.id ?? null,
    step: Number.isFinite(requestedStep) ? requestedStep : 0,
    viewId: initialViewId,
  };
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

function buildViewerSearch(input: {
  isInteractive: boolean;
  scenarioId: string | null;
  stepIndex: number;
  viewId: string | null;
}): string {
  const params = new URLSearchParams();

  if (input.viewId) {
    params.set("view", input.viewId);
  }

  if (input.scenarioId) {
    params.set("scenario", input.scenarioId);
  }

  params.set("mode", input.isInteractive ? "interactive" : "diagram");

  if (input.isInteractive) {
    params.set("step", String(input.stepIndex));
  }

  const search = params.toString();
  return search.length > 0 ? `?${search}` : "";
}

function getStepIndex(scenario: FlowScenario | null, step: number): number {
  if (!scenario) {
    return 0;
  }

  return clamp(step, 0, scenario.steps.length - 1);
}

function resolveScenario(
  scenarios: FlowScenario[],
  scenarioId: string | null,
): FlowScenario | null {
  if (!scenarioId) {
    return null;
  }

  return scenarios.find((scenario) => scenario.id === scenarioId) ?? scenarios[0] ?? null;
}

function resolveView(document: FlowDocument, viewId: string | null) {
  if (!document.views || document.views.length === 0) {
    return null;
  }

  if (!viewId) {
    return document.views[0];
  }

  return document.views.find((view) => view.id === viewId) ?? document.views[0];
}

function clamp(value: number, minimum: number, maximum: number): number {
  return Math.min(Math.max(value, minimum), maximum);
}
