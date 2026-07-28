/**
 * Plurobi Mermaid integration
 *
 * Material's native Mermaid puts diagrams in a closed shadow root, which blocks
 * brand CSS and expand controls. We therefore render into `.mermaid-diagram`
 * (see mkdocs.yml superfences class) so nodes stay in the light DOM.
 */

const EXPAND_ICON = `
  <svg class="pl-mermaid__expand-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/>
  </svg>
`;

const CLOSE_ICON = `
  <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true" focusable="false">
    <path fill="currentColor" d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z"/>
  </svg>
`;

const DIAGRAM_SELECTOR = ".mermaid-diagram";

let mermaidReady = false;

/** Read the active Material colour scheme from the document. */
const getColorScheme = () =>
  document.body?.getAttribute("data-md-color-scheme") || "slate";

/**
 * Theme variables for Mermaid defaults (lines, unclassed nodes).
 * Role colours (source/process/outcome/control) are applied via CSS variables
 * in mermaid.css so they update instantly when the palette toggles.
 */
const getThemeVariables = (scheme) => {
  const isDark = scheme === "slate";

  return {
    darkMode: isDark,
    background: "transparent",
    primaryColor: isDark ? "#2a160d" : "#fff1e8",
    primaryTextColor: isDark ? "#ffffff" : "#111111",
    primaryBorderColor: "#ff5d00",
    secondaryColor: isDark ? "#202020" : "#eeeeee",
    tertiaryColor: isDark ? "#10251a" : "#e8f8ee",
    lineColor: isDark ? "#8a8a8a" : "#5a5a5a",
    textColor: isDark ? "#ffffff" : "#111111",
    edgeLabelBackground: isDark ? "#151515" : "#ffffff",
    clusterBkg: isDark ? "#151515" : "#f0f0f0",
    clusterBorder: isDark ? "#404040" : "#d0d0d0",
    fontSize: "15px",
  };
};

/** Initialise Mermaid once; later scheme changes use updateSiteConfig. */
const initializeMermaid = () => {
  if (!window.mermaid) return;

  const config = {
    startOnLoad: false,
    securityLevel: "loose",
    theme: "base",
    fontFamily: "Open Sans, sans-serif",
    flowchart: {
      curve: "basis",
      htmlLabels: true,
      useMaxWidth: true,
    },
    themeVariables: getThemeVariables(getColorScheme()),
  };

  if (!mermaidReady) {
    mermaid.initialize(config);
    mermaidReady = true;
    return;
  }

  if (typeof mermaid.updateSiteConfig === "function") {
    mermaid.updateSiteConfig({
      theme: config.theme,
      themeVariables: config.themeVariables,
    });
  }
};

/** Ensure a single shared overlay exists for expanded diagrams. */
const ensureOverlay = () => {
  let overlay = document.getElementById("pl-mermaid-overlay");
  if (overlay) return overlay;

  overlay = document.createElement("div");
  overlay.id = "pl-mermaid-overlay";
  overlay.className = "pl-mermaid-overlay";
  overlay.setAttribute("role", "dialog");
  overlay.setAttribute("aria-modal", "true");
  overlay.setAttribute("aria-hidden", "true");
  overlay.innerHTML = `
    <div class="pl-mermaid-overlay__panel">
      <div class="pl-mermaid-overlay__header">
        <p class="pl-mermaid-overlay__title">Solution architecture</p>
        <button type="button" class="pl-mermaid-overlay__close" aria-label="Close expanded diagram">
          ${CLOSE_ICON}
        </button>
      </div>
      <div class="pl-mermaid-overlay__body"></div>
    </div>
  `;
  document.body.appendChild(overlay);

  const close = () => closeOverlay(overlay);
  overlay.querySelector(".pl-mermaid-overlay__close").addEventListener("click", close);
  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) close();
  });

  return overlay;
};

const closeOverlay = (overlay) => {
  const body = overlay.querySelector(".pl-mermaid-overlay__body");
  const sourceId = overlay.dataset.sourceId;
  const source = sourceId ? document.getElementById(sourceId) : null;

  // Move the live diagram node back to its original wrapper.
  if (source && body?.firstElementChild) {
    source.appendChild(body.firstElementChild);
  } else if (body) {
    body.innerHTML = "";
  }

  overlay.classList.remove("is-open");
  overlay.setAttribute("aria-hidden", "true");
  delete overlay.dataset.sourceId;
  document.body.classList.remove("pl-mermaid-no-scroll");
};

const openOverlay = (wrapper) => {
  const overlay = ensureOverlay();
  const body = overlay.querySelector(".pl-mermaid-overlay__body");
  const diagram = wrapper.querySelector(DIAGRAM_SELECTOR);
  if (!diagram || !body) return;

  if (overlay.classList.contains("is-open")) {
    closeOverlay(overlay);
  }

  overlay.dataset.sourceId = wrapper.id;
  body.appendChild(diagram);
  overlay.classList.add("is-open");
  overlay.setAttribute("aria-hidden", "false");
  document.body.classList.add("pl-mermaid-no-scroll");
  overlay.querySelector(".pl-mermaid-overlay__close")?.focus();
};

/**
 * Wrap each rendered diagram with an expand control.
 * Safe to call repeatedly — skips diagrams that are already wrapped.
 */
const enhanceDiagrams = () => {
  document.querySelectorAll(DIAGRAM_SELECTOR).forEach((diagram, index) => {
    if (diagram.closest(".pl-mermaid") || diagram.closest(".pl-mermaid-overlay")) {
      return;
    }

    const wrapper = document.createElement("div");
    wrapper.className = "pl-mermaid";
    wrapper.id = `pl-mermaid-${index + 1}`;

    const toolbar = document.createElement("div");
    toolbar.className = "pl-mermaid__toolbar";

    const expandBtn = document.createElement("button");
    expandBtn.type = "button";
    expandBtn.className = "pl-mermaid__expand";
    expandBtn.setAttribute("aria-label", "Expand diagram");
    expandBtn.innerHTML = `${EXPAND_ICON}<span>Expand diagram</span>`;
    expandBtn.addEventListener("click", () => openOverlay(wrapper));

    toolbar.appendChild(expandBtn);
    diagram.parentNode.insertBefore(wrapper, diagram);
    wrapper.appendChild(toolbar);
    wrapper.appendChild(diagram);
  });
};

/** Re-apply Mermaid theme defaults when the Material palette changes. */
const refreshThemeOnPaletteChange = () => {
  if (!window.mermaid) return;

  const scheme = getColorScheme();
  if (typeof mermaid.updateSiteConfig === "function") {
    mermaid.updateSiteConfig({
      theme: "base",
      themeVariables: getThemeVariables(scheme),
    });
  } else {
    initializeMermaid();
  }

  // Role colours come from CSS variables and update automatically.
};

const observePaletteChanges = () => {
  const target = document.body;
  if (!target || target.dataset.plMermaidPaletteBound === "true") return;

  target.dataset.plMermaidPaletteBound = "true";
  const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (
        mutation.type === "attributes" &&
        mutation.attributeName === "data-md-color-scheme"
      ) {
        refreshThemeOnPaletteChange();
        break;
      }
    }
  });
  observer.observe(target, {
    attributes: true,
    attributeFilter: ["data-md-color-scheme"],
  });
};

const bindEscapeKey = () => {
  if (document.body.dataset.plMermaidEscapeBound === "true") return;
  document.body.dataset.plMermaidEscapeBound = "true";

  document.addEventListener("keydown", (event) => {
    if (event.key !== "Escape") return;
    const overlay = document.getElementById("pl-mermaid-overlay");
    if (overlay?.classList.contains("is-open")) {
      closeOverlay(overlay);
    }
  });
};

/**
 * SuperFences emits <pre class="mermaid-diagram"><code>...</code></pre> with
 * HTML-encoded arrows. Mermaid needs plain text on the host element itself.
 */
const prepareDiagramNodes = () => {
  const nodes = [
    ...document.querySelectorAll(`${DIAGRAM_SELECTOR}:not([data-processed])`),
  ];

  nodes.forEach((el) => {
    const code = el.querySelector("code");
    const source = (code?.textContent || el.textContent || "").trim();
    if (!source) return;

    // Replace encoded/nested markup with the raw diagram definition.
    el.textContent = source;
  });

  return nodes.filter((el) => el.textContent.trim().length > 0);
};

const renderMermaidDiagrams = async () => {
  if (!window.mermaid) return;

  initializeMermaid();

  const pending = prepareDiagramNodes();
  if (pending.length) {
    await mermaid.run({
      nodes: pending,
      suppressErrors: true,
    });
  }

  enhanceDiagrams();
  observePaletteChanges();
  bindEscapeKey();
};

if (typeof document$ !== "undefined") {
  // Material instant navigation / page lifecycle hook
  document$.subscribe(renderMermaidDiagrams);
} else {
  window.addEventListener("DOMContentLoaded", renderMermaidDiagrams);
}
