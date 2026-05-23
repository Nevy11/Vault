import React from "react";
import "./styles.css";
import { createRoot } from "react-dom/client";
import { getRouter } from "./router";
import { RouterProvider } from "@tanstack/react-router";

async function main() {
  const router = await getRouter();
  const el = document.getElementById("root") || document.body;
  const root = createRoot(el);
  root.render(
    <React.StrictMode>
      <RouterProvider router={router} />
    </React.StrictMode>,
  );
}

main().catch((e) => {
  // eslint-disable-next-line no-console
  console.error("Failed to mount client:", e);
});
