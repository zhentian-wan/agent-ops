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
import type { DeploymentFlow, PluginInfo } from "./types/deployment-flow.js";

import "./styles.css";

type EditorMode = "create" | "edit" | null;

export function App() {
  const [flows, setFlows] = useState<DeploymentFlow[]>([]);
  const [plugins, setPlugins] = useState<PluginInfo[]>([]);
  const [activeFlowId, setActiveFlowId] = useState<string | null>(null);
  const [editorMode, setEditorMode] = useState<EditorMode>(null);
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
    setEditorMode("create");
    setBannerError(null);
  }

  function openEditEditor(flow: DeploymentFlow) {
    setActiveFlowId(flow.id);
    setEditorMode("edit");
    setBannerError(null);
  }

  function closeEditor() {
    setEditorMode(null);
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

      if (editorMode === "edit" && activeFlow) {
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

      setEditorMode(null);
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
        setEditorMode(null);
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
          Configure deployment pipelines and plugin step settings from one place.
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
          onSelect={openEditEditor}
        />

        {editorMode ? (
          <FlowEditor
            editingFlow={editorMode === "edit" ? activeFlow : null}
            isSaving={isSaving}
            onCancel={closeEditor}
            onSave={handleSave}
            plugins={plugins}
          />
        ) : (
          <section className="flow-placeholder">
            <p className="eyebrow">Editor</p>
            <h2>Select or create a flow</h2>
            <p className="muted">
              Pick a pipeline from the list to edit its steps, or create a new flow
              with Git and Docker configuration fields.
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
