import type { ReactNode } from "react";
import { Link, NavLink, Navigate, Route, Routes, useLocation } from "react-router-dom";

import type { FlowDocument } from "../flow-document/index.js";
import { DiagramWorkspace } from "./DiagramWorkspace.js";

interface AppProps {
  document: FlowDocument;
}

interface HomePageProps {
  document: FlowDocument;
}

interface HomeModeCardProps {
  chipLabel: string;
  description: string;
  mode: "view" | "edit";
  tags: string[];
  title: string;
}

interface DiagramRouteFrameProps {
  children: ReactNode;
}

export function App({ document }: AppProps) {
  return (
    <Routes>
      <Route path="/" element={<HomePage document={document} />} />
      <Route
        path="/view"
        element={
          <DiagramRouteFrame>
            <DiagramWorkspace document={document} pageMode="viewer" />
          </DiagramRouteFrame>
        }
      />
      <Route
        path="/edit"
        element={
          <DiagramRouteFrame>
            <DiagramWorkspace document={document} pageMode="editor" />
          </DiagramRouteFrame>
        }
      />
      <Route path="*" element={<Navigate replace to="/" />} />
    </Routes>
  );
}

function HomePage({ document }: HomePageProps) {
  const location = useLocation();

  return (
    <main className="landing-shell">
      <section className="landing-grid landing-grid-only" aria-label={`Choose how to open ${document.title}`}>
        <ViewModePanel search={location.search} />
        <EditModePanel search={location.search} />
      </section>
    </main>
  );
}

function ViewModePanel({ search }: { search: string }) {
  return (
    <HomeModeCard
      chipLabel="Walkthrough"
      description="Replay scenarios and inspect the interactive diagram."
      mode="view"
      search={search}
      tags={["Scenario list", "Step-by-step mode"]}
      title="View"
    />
  );
}

function EditModePanel({ search }: { search: string }) {
  return (
    <HomeModeCard
      chipLabel="Authoring"
      description="Work on the diagram canvas without walkthrough distractions."
      mode="edit"
      search={search}
      tags={["Diagram canvas", "Editor surface"]}
      title="Edit"
    />
  );
}

function HomeModeCard({
  chipLabel,
  description,
  mode,
  search,
  tags,
  title,
}: HomeModeCardProps & { search: string }) {
  return (
    <Link
      className={`landing-mode-card landing-mode-card-${mode}`}
      to={{ pathname: `/${mode}`, search }}
    >
      <div className="landing-mode-header">
        <span className="landing-mode-chip">{chipLabel}</span>
      </div>
      <div className="landing-mode-copy">
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      <div className="landing-mode-tags" aria-hidden="true">
        {tags.map((tag) => (
          <span key={tag} className="panel-pill">
            {tag}
          </span>
        ))}
      </div>
    </Link>
  );
}

function DiagramRouteFrame({ children }: DiagramRouteFrameProps) {
  const location = useLocation();

  return (
    <div className="page-shell">
      <header className="page-topbar">
        <Link className="page-home-link" to={{ pathname: "/", search: location.search }}>
          Main page
        </Link>
        <nav className="page-nav" aria-label="Diagram pages">
          <NavLink
            className={getNavLinkClassName}
            to={{ pathname: "/view", search: location.search }}
          >
            View
          </NavLink>
          <NavLink
            className={getNavLinkClassName}
            to={{ pathname: "/edit", search: location.search }}
          >
            Edit
          </NavLink>
        </nav>
      </header>
      {children}
    </div>
  );
}

function getNavLinkClassName({ isActive }: { isActive: boolean }) {
  return ["page-nav-link", isActive ? "is-active" : ""].filter(Boolean).join(" ");
}
