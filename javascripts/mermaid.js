const renderMermaidDiagrams = () => {
  if (!window.mermaid) return;

  mermaid.initialize({
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    fontFamily: "Open Sans, sans-serif",
    flowchart: {
      curve: "basis",
      htmlLabels: true,
      useMaxWidth: true,
    },
    themeVariables: {
      background: "transparent",
      primaryColor: "#202020",
      primaryTextColor: "#ffffff",
      primaryBorderColor: "#ff5d00",
      secondaryColor: "#2a160d",
      tertiaryColor: "#10251a",
      lineColor: "#8a8a8a",
      edgeLabelBackground: "#151515",
      clusterBkg: "#151515",
      clusterBorder: "#404040",
      fontSize: "15px",
    },
  });

  mermaid.run({ querySelector: ".mermaid" });
};

if (typeof document$ !== "undefined") {
  document$.subscribe(renderMermaidDiagrams);
} else {
  window.addEventListener("DOMContentLoaded", renderMermaidDiagrams);
}
