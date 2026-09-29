import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { TooltipProvider } from "@/components/ui/tooltip";
import { App } from "./app";
import { settings } from "./settings/store";
import "./styles.css";

// Expose settings store on window for headless automation and testing
(window as unknown as { nagomiSettings: typeof settings }).nagomiSettings = settings;

registerSW({ immediate: true });

const rootElement = document.querySelector<HTMLDivElement>("#root");
if (!rootElement) throw new Error("Missing required element: #root");

document.documentElement.classList.add("dark");
createRoot(rootElement).render(
  <TooltipProvider>
    <App />
  </TooltipProvider>,
);
