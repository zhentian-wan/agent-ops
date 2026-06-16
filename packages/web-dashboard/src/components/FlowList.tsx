import type { DeploymentFlow } from "../types/deployment-flow.js";
import { getPluginLabel } from "../lib/plugin-fields.js";

type FlowListProps = {
  activeFlowId: string | null;
  flows: DeploymentFlow[];
  isLoading: boolean;
  onCreate: () => void;
  onDelete: (flow: DeploymentFlow) => void;
  onSelect: (flow: DeploymentFlow) => void;
};

export function FlowList({
  activeFlowId,
  flows,
  isLoading,
  onCreate,
  onDelete,
  onSelect,
}: FlowListProps) {
  return (
    <section className="flow-list">
      <div className="flow-list__header">
        <div>
          <p className="eyebrow">Deployment flows</p>
          <h2>Configured pipelines</h2>
        </div>
        <button className="button button--primary" onClick={onCreate} type="button">
          New flow
        </button>
      </div>

      {isLoading ? (
        <p className="muted">Loading flows...</p>
      ) : flows.length === 0 ? (
        <div className="empty-state">
          <p>No deployment flows yet.</p>
          <p className="muted">
            Create a flow to chain plugins like Git clone and Docker build.
          </p>
          <button className="button button--secondary" onClick={onCreate} type="button">
            Create your first flow
          </button>
        </div>
      ) : (
        <ul className="flow-list__items">
          {flows.map((flow) => (
            <li key={flow.id}>
              <button
                className={`flow-card${activeFlowId === flow.id ? " flow-card--active" : ""}`}
                onClick={() => onSelect(flow)}
                type="button"
              >
                <div className="flow-card__title">{flow.name}</div>
                <div className="flow-card__meta">
                  {flow.steps.length} step{flow.steps.length === 1 ? "" : "s"}
                </div>
                <div className="flow-card__steps">
                  {flow.steps.map((step, index) => (
                    <span className="step-chip" key={step.id}>
                      {index + 1}. {getPluginLabel(step.pluginName)}
                    </span>
                  ))}
                </div>
              </button>
              <button
                className="button button--ghost flow-card__delete"
                onClick={() => onDelete(flow)}
                type="button"
              >
                Delete
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
