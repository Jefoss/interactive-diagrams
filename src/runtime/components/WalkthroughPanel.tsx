import type { FlowScenario, FlowScenarioStep } from "../../flow-document/index.js";

interface WalkthroughPanelProps {
  currentStep: FlowScenarioStep | null;
  isAtFirstStep: boolean;
  isAtLastStep: boolean;
  onNext: () => void;
  onPrev: () => void;
  onReset: () => void;
  scenario: FlowScenario | null;
  stepIndex: number;
}

export function WalkthroughPanel({
  currentStep,
  isAtFirstStep,
  isAtLastStep,
  onNext,
  onPrev,
  onReset,
  scenario,
  stepIndex,
}: WalkthroughPanelProps) {
  if (!scenario || !currentStep) {
    return null;
  }

  return (
    <section className="walkthrough-panel panel-animate-in panel-animate-up">
      <div className="walkthrough-copy">
        <p className="eyebrow">Walkthrough</p>
        <h2>{scenario.title}</h2>
        <p className="walkthrough-summary">
          {scenario.description ?? "Replay this scenario step by step."}
        </p>
        <div className="step-meta">
          Step {stepIndex + 1} of {scenario.steps.length}
        </div>
        <h3>{currentStep.title}</h3>
        <p className="step-body">{currentStep.body}</p>
      </div>

      <div className="walkthrough-actions">
        <button
          className="secondary-button"
          disabled={isAtFirstStep}
          onClick={onPrev}
          type="button"
        >
          Prev
        </button>
        <button
          className="secondary-button"
          disabled={isAtLastStep}
          onClick={onNext}
          type="button"
        >
          Next
        </button>
        <button
          className="secondary-button"
          disabled={isAtFirstStep}
          onClick={onReset}
          type="button"
        >
          Reset
        </button>
      </div>
    </section>
  );
}
