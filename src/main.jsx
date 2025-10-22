import React from "react";
import { createRoot } from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import App from "./App.jsx";
import "./index.css";

// ErrorBoundary simples para jamais ficar tudo preto
class RootBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, info) {
    console.error("[RootBoundary]", error, info);
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ color: "#fff", background: "#0b0f12", minHeight: "100vh", padding: 24 }}>
          <h2>Falha ao iniciar o app</h2>
          <pre style={{ whiteSpace: "pre-wrap" }}>
            {String(this.state.error?.message || this.state.error || "Erro desconhecido")}
          </pre>
          <p>Confira o console do navegador para mais detalhes.</p>
        </div>
      );
    }
    return this.props.children;
  }
}

createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootBoundary>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </RootBoundary>
  </React.StrictMode>
);
