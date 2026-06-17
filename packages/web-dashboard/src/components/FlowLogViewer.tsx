import { useCallback, useEffect, useState } from "react";

import { getRun, listRunsByFlowId, runFlow } from "../api/client.js";
import { getPluginLabel } from "../lib/plugin-fields.js";
import type { DeploymentFlow } from "../types/deployment-flow.js";
import type { DeploymentRun, LogEntry } from "../types/deployment-run.js";

type FlowLogViewerProps = {
  flow: DeploymentFlow;
  onEdit: () => void;
};

function formatTimestamp(value: string): string {
  return new Date(value).toLocaleString();
}

function formatDuration(startedAt: string, finishedAt?: string): string {
  if (!finishedAt) {
    return "In progress";
  }

  const durationMs = new Date(finishedAt).getTime() - new Date(startedAt).getTime();

  if (durationMs < 1000) {
    return `${durationMs}ms`;
  }

  return `${(durationMs / 1000).toFixed(1)}s`;
}

function getStatusClassName(status: string): string {
  return `status-badge status-badge--${status}`;
}

function formatDetails(details: unknown): string {
  if (typeof details === "string") {
    return details;
  }

  try {
    return JSON.stringify(details, null, 2);
  } catch {
    return String(details);
  }
}

function LogEntryRow({ entry }: { entry: LogEntry }) {
  const [expanded, setExpanded] = useState(false);
  const hasDetails = entry.details !== undefined;

  return (
    <article className={`log-entry log-entry--${entry.level}`}>
      <div className="log-entry__header">
        <span className={`log-entry__level log-entry__level--${entry.level}`}>
          {entry.level}
        </span>
        <time className="log-entry__time">{formatTimestamp(entry.timestamp)}</time>
        {entry.pluginName ? (
          <span className="log-entry__plugin">{getPluginLabel(entry.pluginName)}</span>
        ) : null}
      </div>
      <p className="log-entry__message">{entry.message}</p>
      {hasDetails ? (
        <div className="log-entry__details">
          <button
            className="button button--ghost log-entry__toggle"
            onClick={() => setExpanded((current) => !current)}
            type="button"
          >
            {expanded ? "Hide details" : "Show details"}
          </button>
          {expanded ? (
            <pre className="log-entry__payload">{formatDetails(entry.details)}</pre>
          ) : null}
        </div>
      ) : null}
    </article>
  );
}

export function FlowLogViewer({ flow, onEdit }: FlowLogViewerProps) {
  const [runs, setRuns] = useState<DeploymentRun[]>([]);
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null);
  const [selectedRun, setSelectedRun] = useState<DeploymentRun | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadRuns = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const nextRuns = await listRunsByFlowId(flow.id);
      setRuns(nextRuns);

      if (nextRuns.length === 0) {
        setSelectedRunId(null);
        setSelectedRun(null);
        return;
      }

      const latestRunId = nextRuns[0]?.id ?? null;
      setSelectedRunId((current) => current ?? latestRunId);
    } catch (loadError) {
      setError(
        loadError instanceof Error ? loadError.message : "Failed to load deployment logs.",
      );
    } finally {
      setIsLoading(false);
    }
  }, [flow.id]);

  useEffect(() => {
    void loadRuns();
  }, [loadRuns]);

  useEffect(() => {
    if (!selectedRunId) {
      setSelectedRun(null);
      return;
    }

    let cancelled = false;

    async function loadSelectedRun() {
      if (!selectedRunId) {
        return;
      }

      try {
        const run = await getRun(selectedRunId);
        if (!cancelled) {
          setSelectedRun(run);
        }
      } catch (loadError) {
        if (!cancelled) {
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Failed to load run details.",
          );
        }
      }
    }

    void loadSelectedRun();

    return () => {
      cancelled = true;
    };
  }, [selectedRunId]);

  async function handleRunFlow() {
    setIsRunning(true);
    setError(null);

    try {
      const run = await runFlow(flow.id);
      setRuns((current) => [run, ...current.filter((item) => item.id !== run.id)]);
      setSelectedRunId(run.id);
      setSelectedRun(run);
    } catch (runError) {
      setError(
        runError instanceof Error ? runError.message : "Failed to run deployment flow.",
      );
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <section className="flow-log-viewer">
      <div className="flow-log-viewer__header">
        <div>
          <p className="eyebrow">Deployment logs</p>
          <h2>{flow.name}</h2>
          <p className="muted">
            View execution history and step-by-step logs for this deployment flow.
          </p>
        </div>
        <div className="flow-log-viewer__actions">
          <button className="button button--secondary" onClick={onEdit} type="button">
            Edit flow
          </button>
          <button
            className="button button--primary"
            disabled={isRunning}
            onClick={() => void handleRunFlow()}
            type="button"
          >
            {isRunning ? "Running..." : "Run flow"}
          </button>
        </div>
      </div>

      {error ? <p className="banner-error">{error}</p> : null}

      {isLoading ? (
        <p className="muted">Loading deployment logs...</p>
      ) : runs.length === 0 ? (
        <div className="empty-state">
          <p>No deployment runs yet.</p>
          <p className="muted">
            Run this flow to generate step logs for Git clone, Docker build, and other
            plugins.
          </p>
          <button
            className="button button--primary"
            disabled={isRunning}
            onClick={() => void handleRunFlow()}
            type="button"
          >
            {isRunning ? "Running..." : "Run flow"}
          </button>
        </div>
      ) : (
        <div className="flow-log-viewer__layout">
          <aside className="run-list">
            <p className="run-list__title">Run history</p>
            <ul className="run-list__items">
              {runs.map((run) => (
                <li key={run.id}>
                  <button
                    className={`run-card${selectedRunId === run.id ? " run-card--active" : ""}`}
                    onClick={() => setSelectedRunId(run.id)}
                    type="button"
                  >
                    <div className="run-card__top">
                      <span className={getStatusClassName(run.status)}>{run.status}</span>
                      <span className="run-card__duration">
                        {formatDuration(run.startedAt, run.finishedAt)}
                      </span>
                    </div>
                    <time className="run-card__time">{formatTimestamp(run.startedAt)}</time>
                    <p className="run-card__meta">
                      {run.entries.length} log entr{run.entries.length === 1 ? "y" : "ies"}
                    </p>
                  </button>
                </li>
              ))}
            </ul>
          </aside>

          <div className="run-detail">
            {selectedRun ? (
              <>
                <div className="run-detail__summary">
                  <div>
                    <p className="eyebrow">Selected run</p>
                    <h3>{formatTimestamp(selectedRun.startedAt)}</h3>
                  </div>
                  <span className={getStatusClassName(selectedRun.status)}>
                    {selectedRun.status}
                  </span>
                </div>

                <div className="run-detail__steps">
                  {selectedRun.steps.map((step, index) => (
                    <div className="run-step" key={step.id}>
                      <span className="run-step__index">{index + 1}</span>
                      <div>
                        <p className="run-step__name">{getPluginLabel(step.pluginName)}</p>
                        <span className={getStatusClassName(step.status)}>{step.status}</span>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="log-stream">
                  <p className="log-stream__title">Log entries</p>
                  <div className="log-stream__entries">
                    {selectedRun.entries.map((entry) => (
                      <LogEntryRow entry={entry} key={entry.id} />
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <p className="muted">Select a run to view its logs.</p>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
