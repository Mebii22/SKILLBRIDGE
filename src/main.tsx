import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles/global.css";
import "./styles/animations.css";
import "./styles/doodles.css";
import "./styles/dashboard.css";

const rootEl = document.getElementById("root");
if (rootEl) {
  createRoot(rootEl).render(<App />);
}
