import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import { Providers } from "@/app/Providers";
import { AppRouter } from "@/app/Router";
import "@/styles/global.css";

const rootElement = document.getElementById("root");

if (!rootElement) {
  throw new Error("Root element #root was not found");
}

createRoot(rootElement).render(
  <StrictMode>
    <Providers>
      <AppRouter />
    </Providers>
  </StrictMode>,
);
