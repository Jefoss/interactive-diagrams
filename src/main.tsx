import React from "react";
import ReactDOM from "react-dom/client";

import flowDocumentJson from "../fixtures/valid-flow-document.json";
import { validateFlowDocument } from "./flow-document/index.js";
import { App } from "./runtime/App.js";
import "@xyflow/react/dist/style.css";
import "./runtime/styles.css";

const validation = validateFlowDocument(flowDocumentJson);

if (!validation.valid || !validation.document) {
  throw new Error(
    `Sample flow document is invalid: ${validation.issues
      .map((issue) => issue.message)
      .join("; ")}`,
  );
}

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <App document={validation.document} />
  </React.StrictMode>,
);
