import { createRoot } from "react-dom/client";
import { registerSW } from "virtual:pwa-register";
import { TooltipProvider } from "@/components/ui/tooltip";
import { App } from "./app";
import "./styles.css";

registerSW({ immediate: true });

const rootElement = document.querySelector<HTMLDivElement>("#root");
if (!rootElement) throw new Error("Missing required element: #root");

document.documentElement.classList.add("dark");
createRoot(rootElement).render(
  <TooltipProvider>
    <App />
  </TooltipProvider>,
);
