import { useEffect, useState } from "react";

import type { FlowDocument } from "../../flow-document/index.js";
import {
  applyEdgeForm,
  applyNodeForm,
  buildSuggestedEdgeId,
  buildSuggestedNodeId,
  collectReservedIds,
  createEdgeFormValues,
  createEmptyEdgeFormValues,
  createEmptyNodeFormValues,
  createNodeFormValues,
  deleteEdge,
  deleteNode,
  getEdgeDeleteBlockers,
  getNodeDeleteBlockers,
  type EdgeFormValues,
  type NodeFormValues,
} from "../editor-document.js";

interface EditorAuthoringPanelProps {
  document: FlowDocument;
  onDocumentChange: (document: FlowDocument) => void;
  onHighlightChange: (state: { activeEdgeIds: Set<string>; activeNodeIds: Set<string> }) => void;
}

type EditorSection = "edges" | "nodes";

interface DraftState<TValues> {
  dirty: boolean;
  idTouched: boolean;
  mode: "existing" | "new";
  originalId: string | null;
  values: TValues;
}

interface FeedbackState {
  tone: "danger" | "success" | "warning";
  message: string;
}

type AuthoringState =
  | ({ section: "nodes" } & DraftState<NodeFormValues>)
  | ({ section: "edges" } & DraftState<EdgeFormValues>);

const NODE_KIND_OPTIONS = [
  { value: "start", label: "Start" },
  { value: "process", label: "Process" },
  { value: "decision", label: "Decision" },
  { value: "end", label: "End" },
] as const;

const NODE_TONE_OPTIONS = [
  { value: "", label: "Default" },
  { value: "neutral", label: "Neutral" },
  { value: "info", label: "Info" },
  { value: "success", label: "Success" },
  { value: "warning", label: "Warning" },
  { value: "danger", label: "Danger" },
] as const;

export function EditorAuthoringPanel({
  document,
  onDocumentChange,
  onHighlightChange,
}: EditorAuthoringPanelProps) {
  const [authoringState, setAuthoringState] = useState<AuthoringState>(() =>
    createInitialAuthoringState(document),
  );
  const [activeSection, setActiveSection] = useState<EditorSection>(authoringState.section);
  const [feedback, setFeedback] = useState<FeedbackState | null>(null);

  useEffect(() => {
    setAuthoringState((current) => {
      if (current.section === "nodes") {
        const nodeExists =
          current.originalId !== null
            ? document.nodes.some((node) => node.id === current.originalId)
            : true;

        if (current.originalId !== null && !nodeExists) {
          return createInitialNodeState(document);
        }

        if (!current.dirty && current.originalId !== null) {
          const node = document.nodes.find((item) => item.id === current.originalId);

          if (node) {
            return createExistingNodeState(node.id, createNodeFormValues(node));
          }
        }

        return current;
      }

      const edgeExists =
        current.originalId !== null
          ? document.edges.some((edge) => edge.id === current.originalId)
          : true;

      if (current.originalId !== null && !edgeExists) {
        return createInitialEdgeState(document);
      }

      if (!current.dirty && current.originalId !== null) {
        const edge = document.edges.find((item) => item.id === current.originalId);

        if (edge) {
          return createExistingEdgeState(edge.id, createEdgeFormValues(edge));
        }
      }

      return current;
    });
  }, [document]);

  useEffect(() => {
    if (authoringState.section === "nodes") {
      const activeNodeIds =
        authoringState.mode === "existing" && authoringState.originalId
          ? new Set([authoringState.originalId])
          : new Set<string>();

      onHighlightChange({ activeEdgeIds: new Set(), activeNodeIds });
      return;
    }

    const activeEdgeIds =
      authoringState.mode === "existing" && authoringState.originalId
        ? new Set([authoringState.originalId])
        : new Set<string>();
    const activeNodeIds = new Set(
      [authoringState.values.source, authoringState.values.target].filter(Boolean),
    );

    onHighlightChange({ activeEdgeIds, activeNodeIds });
  }, [authoringState, onHighlightChange]);

  function switchSection(nextSection: EditorSection): void {
    if (nextSection === activeSection) {
      return;
    }

    if (!allowDraftExit(`switch to ${nextSection}`)) {
      return;
    }

    setActiveSection(nextSection);
    setAuthoringState(
      nextSection === "nodes" ? createInitialNodeState(document) : createInitialEdgeState(document),
    );
    setFeedback(null);
  }

  function allowDraftExit(actionLabel: string): boolean {
    if (!authoringState.dirty) {
      return true;
    }

    setFeedback({
      tone: "warning",
      message: `Save or cancel the current form before you ${actionLabel}.`,
    });

    return false;
  }

  function handleNodeFieldChange<Key extends keyof NodeFormValues>(
    key: Key,
    value: NodeFormValues[Key],
  ): void {
    if (authoringState.section !== "nodes") {
      return;
    }

    setAuthoringState((current) => {
      if (current.section !== "nodes") {
        return current;
      }

      const nextValues: NodeFormValues = {
        ...current.values,
        [key]: value,
      };

      if ((key === "title" || key === "kind") && !current.idTouched) {
        nextValues.id = buildSuggestedNodeId(
          {
            kind: nextValues.kind,
            title: nextValues.title,
          },
          collectReservedIds(document, current.originalId),
        );
      }

      return {
        ...current,
        dirty: true,
        values: nextValues,
      };
    });
    setFeedback(null);
  }

  function handleEdgeFieldChange<Key extends keyof EdgeFormValues>(
    key: Key,
    value: EdgeFormValues[Key],
  ): void {
    if (authoringState.section !== "edges") {
      return;
    }

    setAuthoringState((current) => {
      if (current.section !== "edges") {
        return current;
      }

      const nextValues: EdgeFormValues = {
        ...current.values,
        [key]: value,
      };

      if ((key === "label" || key === "source" || key === "target") && !current.idTouched) {
        nextValues.id = buildSuggestedEdgeId(
          {
            label: nextValues.label,
            source: nextValues.source,
            target: nextValues.target,
          },
          collectReservedIds(document, current.originalId),
        );
      }

      return {
        ...current,
        dirty: true,
        values: nextValues,
      };
    });
    setFeedback(null);
  }

  function handleIdChange(value: string): void {
    if (authoringState.section === "nodes") {
      handleNodeIdChange(value);
      return;
    }

    handleEdgeIdChange(value);
  }

  function handleNodeIdChange(value: string): void {
    if (authoringState.section !== "nodes") {
      return;
    }

    setAuthoringState((current) =>
      current.section !== "nodes"
        ? current
        : {
            ...current,
            dirty: true,
            idTouched: true,
            values: {
              ...current.values,
              id: value,
            },
          },
    );
    setFeedback(null);
  }

  function handleEdgeIdChange(value: string): void {
    if (authoringState.section !== "edges") {
      return;
    }

    setAuthoringState((current) =>
      current.section !== "edges"
        ? current
        : {
            ...current,
            dirty: true,
            idTouched: true,
            values: {
              ...current.values,
              id: value,
            },
          },
    );
    setFeedback(null);
  }

  function generateId(): void {
    if (authoringState.section === "nodes") {
      setAuthoringState((current) =>
        current.section !== "nodes"
          ? current
          : {
              ...current,
              dirty: true,
              idTouched: true,
              values: {
                ...current.values,
                id: buildSuggestedNodeId(
                  {
                    kind: current.values.kind,
                    title: current.values.title,
                  },
                  collectReservedIds(document, current.originalId),
                ),
              },
            },
      );
      setFeedback(null);
      return;
    }

    setAuthoringState((current) =>
      current.section !== "edges"
        ? current
        : {
            ...current,
            dirty: true,
            idTouched: true,
            values: {
              ...current.values,
              id: buildSuggestedEdgeId(
                {
                  label: current.values.label,
                  source: current.values.source,
                  target: current.values.target,
                },
                collectReservedIds(document, current.originalId),
              ),
            },
          },
    );
    setFeedback(null);
  }

  function saveCurrentForm(): void {
    if (authoringState.section === "nodes") {
      const result = applyNodeForm(document, authoringState.originalId, authoringState.values);

      if (!result.ok) {
        setFeedback({
          tone: "danger",
          message: result.issues.map((issue) => issue.message).join(" "),
        });
        return;
      }

      onDocumentChange(result.document);
      setAuthoringState(
        createExistingNodeState(result.id, createNodeFormValues(findNode(result.document, result.id))),
      );
      setFeedback({
        tone: "success",
        message:
          authoringState.mode === "new"
            ? `Node "${result.id}" was created.`
            : `Node "${result.id}" was saved.`,
      });
      return;
    }

    const result = applyEdgeForm(document, authoringState.originalId, authoringState.values);

    if (!result.ok) {
      setFeedback({
        tone: "danger",
        message: result.issues.map((issue) => issue.message).join(" "),
      });
      return;
    }

    onDocumentChange(result.document);
    setAuthoringState(
      createExistingEdgeState(result.id, createEdgeFormValues(findEdge(result.document, result.id))),
    );
    setFeedback({
      tone: "success",
      message:
        authoringState.mode === "new"
          ? `Edge "${result.id}" was created.`
          : `Edge "${result.id}" was saved.`,
    });
  }

  function cancelCurrentForm(): void {
    if (authoringState.section === "nodes") {
      if (authoringState.mode === "existing" && authoringState.originalId) {
        const node = document.nodes.find((item) => item.id === authoringState.originalId);

        if (node) {
          setAuthoringState(createExistingNodeState(node.id, createNodeFormValues(node)));
        }
      } else {
        setAuthoringState(createNewNodeState(document));
      }
    } else if (authoringState.mode === "existing" && authoringState.originalId) {
      const edge = document.edges.find((item) => item.id === authoringState.originalId);

      if (edge) {
        setAuthoringState(createExistingEdgeState(edge.id, createEdgeFormValues(edge)));
      }
    } else {
      setAuthoringState(createNewEdgeState(document));
    }

    setFeedback(null);
  }

  function deleteCurrentSelection(): void {
    if (authoringState.section === "nodes") {
      if (authoringState.mode !== "existing" || !authoringState.originalId) {
        setAuthoringState(createNewNodeState(document));
        setFeedback(null);
        return;
      }

      const blockers = getNodeDeleteBlockers(document, authoringState.originalId);

      if (blockers.length > 0) {
        setFeedback({
          tone: "warning",
          message: blockers.join(" "),
        });
        return;
      }

      const nextDocument = deleteNode(document, authoringState.originalId);
      onDocumentChange(nextDocument);
      setAuthoringState(createInitialNodeState(nextDocument));
      setFeedback({
        tone: "success",
        message: `Node "${authoringState.originalId}" was deleted.`,
      });
      return;
    }

    if (authoringState.mode !== "existing" || !authoringState.originalId) {
      setAuthoringState(createNewEdgeState(document));
      setFeedback(null);
      return;
    }

    const blockers = getEdgeDeleteBlockers(document, authoringState.originalId);

    if (blockers.length > 0) {
      setFeedback({
        tone: "warning",
        message: blockers.join(" "),
      });
      return;
    }

    const nextDocument = deleteEdge(document, authoringState.originalId);
    onDocumentChange(nextDocument);
    setAuthoringState(createInitialEdgeState(nextDocument));
    setFeedback({
      tone: "success",
      message: `Edge "${authoringState.originalId}" was deleted.`,
    });
  }

  function selectNode(nodeId: string): void {
    if (authoringState.section !== "nodes") {
      return;
    }

    if (authoringState.originalId === nodeId && authoringState.mode === "existing") {
      return;
    }

    if (!allowDraftExit(`open node "${nodeId}"`)) {
      return;
    }

    const node = document.nodes.find((item) => item.id === nodeId);

    if (!node) {
      return;
    }

    setAuthoringState(createExistingNodeState(node.id, createNodeFormValues(node)));
    setFeedback(null);
  }

  function selectEdge(edgeId: string): void {
    if (authoringState.section !== "edges") {
      return;
    }

    if (authoringState.originalId === edgeId && authoringState.mode === "existing") {
      return;
    }

    if (!allowDraftExit(`open edge "${edgeId}"`)) {
      return;
    }

    const edge = document.edges.find((item) => item.id === edgeId);

    if (!edge) {
      return;
    }

    setAuthoringState(createExistingEdgeState(edge.id, createEdgeFormValues(edge)));
    setFeedback(null);
  }

  function startNewEntity(): void {
    if (!allowDraftExit(`start a new ${activeSection.slice(0, -1)}`)) {
      return;
    }

    setAuthoringState(
      activeSection === "nodes" ? createNewNodeState(document) : createNewEdgeState(document),
    );
    setFeedback(null);
  }

  return (
    <aside className="editor-panel panel-animate-in panel-animate-left">
      <div className="panel-intro">
        <p className="eyebrow">Authoring</p>
        <h1>Edit nodes and edges</h1>
        <p>
          Work from forms instead of raw JSON. Changes stay local until you save the current
          record, and deletes are blocked when the document still depends on that id.
        </p>
      </div>

      <div className="editor-tabs" role="tablist" aria-label="Authoring sections">
        <button
          aria-selected={activeSection === "nodes"}
          className={getTabClassName(activeSection === "nodes")}
          onClick={() => switchSection("nodes")}
          role="tab"
          type="button"
        >
          Nodes
          <span className="panel-pill">{document.nodes.length}</span>
        </button>
        <button
          aria-selected={activeSection === "edges"}
          className={getTabClassName(activeSection === "edges")}
          onClick={() => switchSection("edges")}
          role="tab"
          type="button"
        >
          Edges
          <span className="panel-pill">{document.edges.length}</span>
        </button>
      </div>

      <div className="editor-toolbar">
        <button className="secondary-button" onClick={startNewEntity} type="button">
          Add {activeSection === "nodes" ? "node" : "edge"}
        </button>
        <span className="panel-pill panel-pill-muted">
          {authoringState.mode === "new" ? "Unsaved draft" : "Saved record"}
        </span>
      </div>

      <div className="editor-entity-list" aria-label={`${activeSection} list`}>
        {activeSection === "nodes"
          ? document.nodes.map((node) => (
              <button
                key={node.id}
                className={getListItemClassName(
                  authoringState.section === "nodes" &&
                    authoringState.mode === "existing" &&
                    authoringState.originalId === node.id,
                )}
                onClick={() => selectNode(node.id)}
                type="button"
              >
                <span className="editor-entity-title">{node.title}</span>
                <span className="editor-entity-meta">{node.id}</span>
              </button>
            ))
          : document.edges.map((edge) => (
              <button
                key={edge.id}
                className={getListItemClassName(
                  authoringState.section === "edges" &&
                    authoringState.mode === "existing" &&
                    authoringState.originalId === edge.id,
                )}
                onClick={() => selectEdge(edge.id)}
                type="button"
              >
                <span className="editor-entity-title">
                  {edge.label || `${edge.source} -> ${edge.target}`}
                </span>
                <span className="editor-entity-meta">{edge.id}</span>
              </button>
            ))}
      </div>

      {feedback ? (
        <div className={["editor-feedback", `tone-${feedback.tone}`].join(" ")}>{feedback.message}</div>
      ) : null}

      <form
        className="editor-form"
        onSubmit={(event) => {
          event.preventDefault();
          saveCurrentForm();
        }}
      >
        {authoringState.section === "nodes" ? (
          <>
            <label className="editor-field">
              <span className="editor-field-label">Title</span>
              <input
                onChange={(event) => handleNodeFieldChange("title", event.target.value)}
                required
                type="text"
                value={authoringState.values.title}
              />
            </label>

            <div className="editor-field editor-field-inline">
              <label className="editor-field">
                <span className="editor-field-label">ID</span>
                <input
                  onChange={(event) => handleIdChange(event.target.value)}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  required
                  type="text"
                  value={authoringState.values.id}
                />
              </label>
              <button className="secondary-button" onClick={generateId} type="button">
                Generate
              </button>
            </div>

            <div className="editor-field-grid">
              <label className="editor-field">
                <span className="editor-field-label">Kind</span>
                <select
                  onChange={(event) => handleNodeFieldChange("kind", event.target.value)}
                  value={authoringState.values.kind}
                >
                  {NODE_KIND_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="editor-field">
                <span className="editor-field-label">Tone</span>
                <select
                  onChange={(event) => handleNodeFieldChange("tone", event.target.value)}
                  value={authoringState.values.tone}
                >
                  {NODE_TONE_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label className="editor-field">
              <span className="editor-field-label">Body</span>
              <textarea
                onChange={(event) => handleNodeFieldChange("body", event.target.value)}
                rows={5}
                value={authoringState.values.body}
              />
            </label>
          </>
        ) : (
          <>
            <label className="editor-field">
              <span className="editor-field-label">Label</span>
              <input
                onChange={(event) => handleEdgeFieldChange("label", event.target.value)}
                type="text"
                value={authoringState.values.label}
              />
            </label>

            <div className="editor-field editor-field-inline">
              <label className="editor-field">
                <span className="editor-field-label">ID</span>
                <input
                  onChange={(event) => handleIdChange(event.target.value)}
                  pattern="[a-z0-9]+(?:-[a-z0-9]+)*"
                  required
                  type="text"
                  value={authoringState.values.id}
                />
              </label>
              <button className="secondary-button" onClick={generateId} type="button">
                Generate
              </button>
            </div>

            <div className="editor-field-grid">
              <label className="editor-field">
                <span className="editor-field-label">Source</span>
                <select
                  onChange={(event) => handleEdgeFieldChange("source", event.target.value)}
                  required
                  value={authoringState.values.source}
                >
                  {document.nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.title} ({node.id})
                    </option>
                  ))}
                </select>
              </label>

              <label className="editor-field">
                <span className="editor-field-label">Target</span>
                <select
                  onChange={(event) => handleEdgeFieldChange("target", event.target.value)}
                  required
                  value={authoringState.values.target}
                >
                  {document.nodes.map((node) => (
                    <option key={node.id} value={node.id}>
                      {node.title} ({node.id})
                    </option>
                  ))}
                </select>
              </label>
            </div>
          </>
        )}

        <div className="editor-actions">
          <button className="primary-button" type="submit">
            Save
          </button>
          <button className="secondary-button" onClick={cancelCurrentForm} type="button">
            Cancel
          </button>
          <button className="danger-button" onClick={deleteCurrentSelection} type="button">
            {authoringState.mode === "new" ? "Clear draft" : "Delete"}
          </button>
        </div>
      </form>
    </aside>
  );
}

function createInitialAuthoringState(document: FlowDocument): AuthoringState {
  return createInitialNodeState(document);
}

function createInitialNodeState(document: FlowDocument): AuthoringState {
  const firstNode = document.nodes[0];

  if (!firstNode) {
    return createNewNodeState(document);
  }

  return createExistingNodeState(firstNode.id, createNodeFormValues(firstNode));
}

function createInitialEdgeState(document: FlowDocument): AuthoringState {
  const firstEdge = document.edges[0];

  if (!firstEdge) {
    return createNewEdgeState(document);
  }

  return createExistingEdgeState(firstEdge.id, createEdgeFormValues(firstEdge));
}

function createExistingNodeState(id: string, values: NodeFormValues): AuthoringState {
  return {
    dirty: false,
    idTouched: false,
    mode: "existing",
    originalId: id,
    section: "nodes",
    values,
  };
}

function createNewNodeState(document: FlowDocument): AuthoringState {
  return {
    dirty: false,
    idTouched: false,
    mode: "new",
    originalId: null,
    section: "nodes",
    values: createEmptyNodeFormValues(document),
  };
}

function createExistingEdgeState(id: string, values: EdgeFormValues): AuthoringState {
  return {
    dirty: false,
    idTouched: false,
    mode: "existing",
    originalId: id,
    section: "edges",
    values,
  };
}

function createNewEdgeState(document: FlowDocument): AuthoringState {
  return {
    dirty: false,
    idTouched: false,
    mode: "new",
    originalId: null,
    section: "edges",
    values: createEmptyEdgeFormValues(document),
  };
}

function findNode(document: FlowDocument, id: string) {
  const node = document.nodes.find((item) => item.id === id);

  if (!node) {
    throw new Error(`Node "${id}" was expected after save.`);
  }

  return node;
}

function findEdge(document: FlowDocument, id: string) {
  const edge = document.edges.find((item) => item.id === id);

  if (!edge) {
    throw new Error(`Edge "${id}" was expected after save.`);
  }

  return edge;
}

function getTabClassName(isActive: boolean): string {
  return ["editor-tab", isActive ? "is-active" : ""].filter(Boolean).join(" ");
}

function getListItemClassName(isActive: boolean): string {
  return ["editor-entity-button", isActive ? "is-active" : ""].filter(Boolean).join(" ");
}
