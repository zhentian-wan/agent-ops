import { useCallback, useEffect, useState } from "react";

import {
  createFlow,
  deleteFlow,
  listFlows,
  listPlugins,
  updateFlow,
} from "./api/client.js";
import { buildFlowPayload, FlowEditor } from "./components/FlowEditor.js";
import { FlowList } from "./components/FlowList.js";
import { FlowLogViewer } from "./components/FlowLogViewer.js";
import type { DeploymentFlow, PluginInfo } from "./types/deployment-flow.js";

import "./styles.css";

type ViewMode = "create" | "edit" | "logs" | null;

export function App() {
  const [flows, setFlows] = useState<DeploymentFlow[]>([]);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [viewMode, setViewMode] = useState<ViewMode>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [bannerError, setBannerError] = useState<string | null>(null);

  const activeFlow = flows.find((flow) => flow.id === activeFlowId) ?? null;

  const loadData = useCallback(async () => {
    setIsLoading(true);
    setBannerError(null);

    try {
      const [nextFlows, nextPlugins] = await Promise.all([
        listFlows(),
        listPlugins(),
      ]);
      setFlows(nextFlows);
      setPlugins(nextPlugins);
    } catch (error) {
      setBannerError(
        error instanceof Error ? error.message : "Failed to load dashboard data.",
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void loadData();
  }, [loadData]);

  function openCreateEditor() {
    setActiveFlowId(null);
    setViewMode("create");
    setBannerError(null);
  }

  function openEditEditor(flow: DeploymentFlow) {
    setActiveFlowId(flow.id);
    setViewMode("edit");
    setBannerError(null);
  }

  function openLogsViewer(flow: DeploymentFlow) {
    setActiveFlowId(flow.id);
    setViewMode("logs");
    setBannerError(null);
  }

  function closeEditor() {
    if (activeFlow) {
      setViewMode("logs");
      return;
    }

    setViewMode(null);
  }

  async function handleSave(input: {
    name: string;
    steps: Parameters<typeof buildFlowPayload>[0];
  }) {
    setIsSaving(true);
    setBannerError(null);

    try {
      const payload = {
        name: input.name,
        steps: buildFlowPayload(input.steps),
      };

      if (viewMode === "edit" && activeFlow) {
        const updated = await updateFlow(activeFlow.id, payload);
        setFlows((current) =>
          current.map((flow) => (flow.id === updated.id ? updated : flow)),
        );
        setActiveFlowId(updated.id);
      } else {
        const created = await createFlow(payload);
        setFlows((current) => [...current, created]);
        setActiveFlowId(created.id);
      }

      setViewMode("logs");
    } finally {
      setIsSaving(false);
    }
  }

  async function handleDelete(flow: DeploymentFlow) {
    const confirmed = window.confirm(`Delete flow "${flow.name}"?`);

    if (!confirmed) {
      return;
    }

    setBannerError(null);

    try {
      await deleteFlow(flow.id);
      setFlows((current) => current.filter((item) => item.id !== flow.id));

      if (activeFlowId === flow.id) {
        setActiveFlowId(null);
        setViewMode(null);
      }
    } catch (error) {
      setBannerError(
        error instanceof Error ? error.message : "Failed to delete flow.",
      );
    }
  }

  return (
    <div className="app-shell">
      <header className="app-header">
        <div>
          <p className="eyebrow">Agentic Deployment</p>
          <h1>Flow control panel</h1>
        </div>
        <p className="app-header__copy">
          Configure deployment pipelines, run flows, and inspect step-by-step logs.
        </p>
      </header>

      {bannerError ? <p className="banner-error">{bannerError}</p> : null}

      <main className="app-layout">
        <FlowList
          activeFlowId={activeFlowId}
          flows={flows}
          isLoading={isLoading}
          onCreate={openCreateEditor}
          onDelete={handleDelete}
          onEdit={openEditEditor}
          onSelect={openLogsViewer}
        />

        {viewMode === "create" || viewMode === "edit" ? (
          <FlowEditor
            editingFlow={viewMode === "edit" ? activeFlow : null}
            isSaving={isSaving}
            onCancel={closeEditor}
            onSave={handleSave}
            plugins={plugins}
          />
        ) : viewMode === "logs" && activeFlow ? (
          <FlowLogViewer flow={activeFlow} onEdit={() => openEditEditor(activeFlow)} />
        ) : (
          <section className="flow-placeholder">
            <p className="eyebrow">Logs</p>
            <h2>Select or create a flow</h2>
            <p className="muted">
              Pick a pipeline from the list to view its deployment logs, or create a new
              flow with Git and Docker configuration fields.
            </p>
            <button className="button button--primary" onClick={openCreateEditor} type="button">
              New flow
            </button>
          </section>
        )}
      </main>
    </div>
  );
}
