import type { FlowDocument, FlowScenario } from "../../flow-document/index.js";

interface ScenarioListPanelProps {
  document: FlowDocument;
  onScenarioSelect: (scenario: FlowScenario) => void;
  scenarios: FlowScenario[];
  selectedScenarioId: string | null;
}

export function ScenarioListPanel({
  document,
  onScenarioSelect,
  scenarios,
  selectedScenarioId,
}: ScenarioListPanelProps) {
  return (
    <aside className="scenario-panel panel-animate-in panel-animate-left">
      <div className="panel-intro">
        <div className="panel-kicker">
          <span className="panel-pill">{scenarios.length} scenarios</span>
        </div>
        <h1>{document.title}</h1>
        <p>
          Pick a scenario to replay the flow step by step, or turn interactive mode off
          to browse the complete graph.
        </p>
      </div>

      <div className="scenario-list" aria-label="Scenario list">
        {scenarios.map((scenario) => {
          const isSelected = selectedScenarioId === scenario.id;

          return (
            <button
              key={scenario.id}
              className={["scenario-card", isSelected ? "is-selected" : ""]
                .filter(Boolean)
                .join(" ")}
              onClick={() => onScenarioSelect(scenario)}
              type="button"
            >
              <span className="scenario-card-header">
                <span className="scenario-title">{scenario.title}</span>
                <span className="scenario-meta">{scenario.steps.length} steps</span>
              </span>
              {scenario.description ? (
                <span className="scenario-description">{scenario.description}</span>
              ) : null}
            </button>
          );
        })}
      </div>
    </aside>
  );
}
