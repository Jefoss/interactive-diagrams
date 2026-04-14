import type { FlowDocument, FlowScenario, FlowView } from "../flow-document/index.js";

export type ViewerMode = "diagram" | "interactive";

export interface ViewerUrlState {
  mode: ViewerMode;
  scenarioId: string | null;
  step: number;
  viewId: string | null;
}

export interface EditorUrlState {
  viewId: string | null;
}

const MODE_PARAM = "mode";
const SCENARIO_PARAM = "scenario";
const STEP_PARAM = "step";
const VIEW_PARAM = "view";

export function readViewerUrlState(
  document: FlowDocument,
  search: string | URLSearchParams,
): ViewerUrlState {
  const params = toSearchParams(search);
  const scenarios = document.scenarios ?? [];
  const requestedMode = params.get(MODE_PARAM);
  const requestedScenarioId = params.get(SCENARIO_PARAM);
  const requestedViewId = params.get(VIEW_PARAM);
  const requestedStep = Number(params.get(STEP_PARAM) ?? 0);
  const interactiveRequested =
    requestedMode === "interactive" || (requestedMode === null && requestedScenarioId !== null);
  const matchingScenario = findScenario(scenarios, requestedScenarioId);
  const fallbackScenario =
    findFirstScenarioForView(scenarios, requestedViewId) ?? scenarios[0] ?? null;
  const selectedScenario = interactiveRequested
    ? matchingScenario ?? fallbackScenario
    : matchingScenario;
  const selectedView = resolveView(
    viewsFrom(document),
    interactiveRequested
      ? selectedScenario?.viewId ?? requestedViewId
      : requestedViewId ?? selectedScenario?.viewId ?? null,
  );

  return {
    mode: interactiveRequested && selectedScenario ? "interactive" : "diagram",
    scenarioId: selectedScenario?.id ?? null,
    step: Number.isFinite(requestedStep) ? requestedStep : 0,
    viewId: selectedView?.id ?? null,
  };
}

export function readEditorUrlState(
  document: FlowDocument,
  search: string | URLSearchParams,
): EditorUrlState {
  const params = toSearchParams(search);

  return {
    viewId: resolveView(viewsFrom(document), params.get(VIEW_PARAM))?.id ?? null,
  };
}

export function buildViewerUrlSearchParams(state: ViewerUrlState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.viewId) {
    params.set(VIEW_PARAM, state.viewId);
  }

  if (state.scenarioId) {
    params.set(SCENARIO_PARAM, state.scenarioId);
  }

  params.set(MODE_PARAM, state.mode);

  if (state.mode === "interactive" && state.scenarioId) {
    params.set(STEP_PARAM, String(state.step));
  }

  return params;
}

export function buildEditorUrlSearchParams(state: EditorUrlState): URLSearchParams {
  const params = new URLSearchParams();

  if (state.viewId) {
    params.set(VIEW_PARAM, state.viewId);
  }

  return params;
}

export function findScenario(
  scenarios: FlowScenario[],
  scenarioId: string | null,
): FlowScenario | null {
  if (!scenarioId) {
    return null;
  }

  return scenarios.find((scenario) => scenario.id === scenarioId) ?? null;
}

export function resolveView(
  views: FlowView[] | undefined,
  viewId: string | null,
): FlowView | null {
  if (!views || views.length === 0) {
    return null;
  }

  if (!viewId) {
    return views[0];
  }

  return views.find((view) => view.id === viewId) ?? views[0];
}

function findFirstScenarioForView(
  scenarios: FlowScenario[],
  viewId: string | null,
): FlowScenario | null {
  if (!viewId) {
    return null;
  }

  return scenarios.find((scenario) => scenario.viewId === viewId) ?? null;
}

function toSearchParams(search: string | URLSearchParams): URLSearchParams {
  return search instanceof URLSearchParams ? search : new URLSearchParams(search);
}

function viewsFrom(document: FlowDocument): FlowView[] | undefined {
  return document.views;
}
