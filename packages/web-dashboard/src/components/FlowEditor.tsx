import { useEffect, useState } from "react";

import type { DeploymentFlow, PluginInfo } from "../types/deployment-flow.js";
import {
  buildStepArgs,
  parseStepArgsToFormValues,
} from "../lib/plugin-fields.js";
import { StepForm, type StepDraft } from "./StepForm.js";

type FlowEditorProps = {
  editingFlow: DeploymentFlow | null;
  isSaving: boolean;
  onCancel: () => void;
  onSave: (input: { name: string; steps: StepDraft[] }) => Promise<void>;
  plugins: PluginInfo[];
};

function createClientId(): string {
  return crypto.randomUUID();
}

function createEmptyStep(pluginName: string): StepDraft {
  return {
    clientId: createClientId(),
    pluginName,
    values: {},
  };
}

function flowToDraft(flow: DeploymentFlow): { name: string; steps: StepDraft[] } {
  return {
    name: flow.name,
    steps: flow.steps.map((step) => ({
      clientId: step.id,
      pluginName: step.pluginName,
      values: parseStepArgsToFormValues(
        step.pluginName,
        step.args as Record<string, unknown> | undefined,
      ),
    })),
  };
}

export function FlowEditor({
  editingFlow,
  isSaving,
  onCancel,
  onSave,
  plugins,
}: FlowEditorProps) {
  const defaultPlugin = plugins[0]?.name ?? "git-plugin";
  const [name, setName] = useState("");
  const [steps, setSteps] = useState<StepDraft[]>([createEmptyStep(defaultPlugin)]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (editingFlow) {
      const draft = flowToDraft(editingFlow);
      setName(draft.name);
      setSteps(
        draft.steps.length > 0 ? draft.steps : [createEmptyStep(defaultPlugin)],
      );
      setError(null);
      return;
    }

    setName("");
    setSteps([createEmptyStep(defaultPlugin)]);
    setError(null);
  }, [defaultPlugin, editingFlow]);

  function updateStep(index: number, next: StepDraft) {
    setSteps((current) =>
      current.map((step, stepIndex) => (stepIndex === index ? next : step)),
    );
  }

  function addStep() {
    setSteps((current) => [...current, createEmptyStep(defaultPlugin)]);
  }

  function removeStep(index: number) {
    setSteps((current) => current.filter((_, stepIndex) => stepIndex !== index));
  }

  function moveStep(index: number, direction: -1 | 1) {
    setSteps((current) => {
      const targetIndex = index + direction;

      if (targetIndex < 0 || targetIndex >= current.length) {
        return current;
      }

      const next = [...current];
      const moved = next[index];

      if (!moved) {
        return current;
      }

      next.splice(index, 1);
      next.splice(targetIndex, 0, moved);
      return next;
    });
  }

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    const trimmedName = name.trim();

    if (!trimmedName) {
      setError("Flow name is required.");
      return;
    }

    if (steps.length === 0) {
      setError("Add at least one step.");
      return;
    }

    for (const step of steps) {
      if (step.pluginName === "git-plugin" && !step.values.repoUrl?.trim()) {
        setError("Git steps need a repository URL.");
        return;
      }
    }

    try {
      await onSave({ name: trimmedName, steps });
    } catch (saveError) {
      setError(
        saveError instanceof Error ? saveError.message : "Failed to save flow.",
      );
    }
  }

  return (
    <section className="flow-editor">
      <div className="flow-editor__header">
        <div>
          <p className="eyebrow">{editingFlow ? "Edit flow" : "Create flow"}</p>
          <h2>{editingFlow ? editingFlow.name : "New deployment flow"}</h2>
        </div>
        <button className="button button--ghost" onClick={onCancel} type="button">
          Cancel
        </button>
      </div>

      <form className="flow-editor__form" onSubmit={handleSubmit}>
        <label className="field">
          <span className="field__label">Flow name *</span>
          <input
            className="field__input"
            onChange={(event) => setName(event.target.value)}
            placeholder="Aurora production deploy"
            required
            type="text"
            value={name}
          />
        </label>

        <div className="flow-editor__steps">
          <div className="flow-editor__steps-header">
            <h3>Steps</h3>
            <button className="button button--secondary" onClick={addStep} type="button">
              Add step
            </button>
          </div>

          {steps.map((step, index) => (
            <StepForm
              index={index}
              key={step.clientId}
              onChange={(next) => updateStep(index, next)}
              onMoveDown={() => moveStep(index, 1)}
              onMoveUp={() => moveStep(index, -1)}
              onRemove={() => removeStep(index)}
              plugins={plugins}
              step={step}
              totalSteps={steps.length}
            />
          ))}
        </div>

        {error ? <p className="form-error">{error}</p> : null}

        <div className="flow-editor__footer">
          <button
            className="button button--primary"
            disabled={isSaving}
            type="submit"
          >
            {isSaving ? "Saving..." : editingFlow ? "Save changes" : "Create flow"}
          </button>
        </div>
      </form>
    </section>
  );
}

export function buildFlowPayload(steps: StepDraft[]) {
  return steps.map((step) => ({
    pluginName: step.pluginName,
    args: buildStepArgs(step.pluginName, step.values),
  }));
}
