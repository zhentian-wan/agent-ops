import type { PluginInfo } from "../types/deployment-flow.js";
import {
  getPluginFormDefinition,
  getPluginLabel,
  parseStepArgsToFormValues,
} from "../lib/plugin-fields.js";

export type StepDraft = {
  clientId: string;
  pluginName: string;
  values: Record<string, string>;
};

type StepFormProps = {
  index: number;
  onChange: (next: StepDraft) => void;
  onMoveDown: () => void;
  onMoveUp: () => void;
  onRemove: () => void;
  plugins: PluginInfo[];
  step: StepDraft;
  totalSteps: number;
};

export function StepForm({
  index,
  onChange,
  onMoveDown,
  onMoveUp,
  onRemove,
  plugins,
  step,
  totalSteps,
}: StepFormProps) {
  const definition = getPluginFormDefinition(step.pluginName);

  function updateValue(key: string, value: string) {
    onChange({
      ...step,
      values: {
        ...step.values,
        [key]: value,
      },
    });
  }

  function updatePlugin(pluginName: string) {
    onChange({
      clientId: step.clientId,
      pluginName,
      values: parseStepArgsToFormValues(pluginName, undefined),
    });
  }

  return (
    <article className="step-form">
      <header className="step-form__header">
        <div>
          <p className="eyebrow">Step {index + 1}</p>
          <h3>{getPluginLabel(step.pluginName)}</h3>
        </div>
        <div className="step-form__actions">
          <button
            className="button button--ghost"
            disabled={index === 0}
            onClick={onMoveUp}
            type="button"
          >
            Move up
          </button>
          <button
            className="button button--ghost"
            disabled={index === totalSteps - 1}
            onClick={onMoveDown}
            type="button"
          >
            Move down
          </button>
          <button className="button button--ghost" onClick={onRemove} type="button">
            Remove
          </button>
        </div>
      </header>

      <label className="field">
        <span className="field__label">Plugin</span>
        <select
          className="field__input"
          onChange={(event) => updatePlugin(event.target.value)}
          value={step.pluginName}
        >
          {plugins.map((plugin) => (
            <option key={plugin.name} value={plugin.name}>
              {getPluginLabel(plugin.name)}
            </option>
          ))}
        </select>
      </label>

      {definition ? (
        <div className="step-form__fields">
          {definition.fields.map((field) => (
            <label className="field" key={field.key}>
              <span className="field__label">
                {field.label}
                {field.required ? " *" : ""}
              </span>
              <input
                className="field__input"
                onChange={(event) => updateValue(field.key, event.target.value)}
                placeholder={field.placeholder}
                required={field.required}
                type="text"
                value={step.values[field.key] ?? ""}
              />
              {field.helpText ? (
                <span className="field__help">{field.helpText}</span>
              ) : null}
            </label>
          ))}
        </div>
      ) : (
        <p className="muted">No configurable fields for this plugin.</p>
      )}
    </article>
  );
}
