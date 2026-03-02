const G2P_RESULTS_URL = "media/g2p-bench-predictions.csv";
const TTS_MANIFEST_URL = "media/bench-samples/saspeech_100_gold_gt.csv";
const ILSPEECH_METADATA_URL = "media/ilspeech_speaker2_v1/metadata.csv";
const ILSPEECH_TRANSCRIPT_URL = "media/ilspeech_speaker2_v1/transcript.json";
const ILSPEECH_SAMPLE_IDS = ["1", "2", "3", "4", "5", "6"];
const PAGE_SIZE = 10;

const G2P_EXCLUDED_MODELS = new Set(["Goruut", "Gemma3-G2P", "GPT-5.2"]);
const G2P_DISPLAY_NAMES = {
  Dicta: "DictaBERT",
  CharSiU: "CharsiuG2P",
  "Claude-Opus-4.6-Thinking": "Claude Opus 4.6",
  "Gemini-3.1-Pro-High": "Gemini 3.1 Pro",
};
const G2P_MODEL_ORDER = [
  "Phonikud",
  "Dicta",
  "Nakdimon",
  "eSpeak NG",
  "CharSiU",
  "Claude-Opus-4.6-Thinking",
  "Gemini-3.1-Pro-High",
];

const TTS_SYSTEMS = [
  { folder: "phonikud_piper_high", label: "Ours (Piper High)", ext: "opus" },
  { folder: "phonikud_styletts2", label: "Ours (StyleTTS2)", ext: "opus" },
  { folder: "roboshaul_nakdimon", label: "Robo-Shaul", ext: "opus" },
  { folder: "saspeech_nakdimon", label: "SASPEECH", ext: "opus" },
  { folder: "mms_nakdimon", label: "MMS", ext: "opus" },
  { folder: "hebtts_unvocalized", label: "HebTTS", ext: "opus" },
  { folder: "gemini_unvocalized", label: "Gemini", ext: "opus" },
  { folder: "openai_unvocalized", label: "OpenAI", ext: "opus" },
];

const appState = {
  g2pRows: [],
  manifestRows: [],
  datasetRows: [],
  renderedPanels: new Set(),
  currentG2PPage: 1,
  currentTTSPage: 1,
};

document.addEventListener("DOMContentLoaded", async () => {
  const getActivePanelId = initializeTabs();
  initializeLazyAudioLoading();

  try {
    const [g2pRows, manifestRows, datasetRows] = await Promise.all([
      loadCsv(G2P_RESULTS_URL),
      loadCsv(TTS_MANIFEST_URL),
      loadDatasetRows(ILSPEECH_METADATA_URL, ILSPEECH_TRANSCRIPT_URL),
    ]);

    appState.g2pRows = g2pRows;
    appState.manifestRows = manifestRows;
    appState.datasetRows = datasetRows;

    ensurePanelRendered(getActivePanelId());
  } catch (error) {
    renderLoadError(error);
  }
});

function initializeTabs() {
  const tabs = Array.from(document.querySelectorAll(".results-tab"));
  const panels = Array.from(document.querySelectorAll(".result-panel"));
  let activePanelId =
    tabs.find((tab) => tab.classList.contains("is-active"))?.dataset.tabTarget ||
    "panel-g2p";

  const activateTab = (targetId) => {
    activePanelId = targetId;

    tabs.forEach((tab) => {
      const isActive = tab.dataset.tabTarget === targetId;
      tab.classList.toggle("is-active", isActive);
      tab.setAttribute("aria-selected", String(isActive));
    });

    panels.forEach((panel) => {
      const isActive = panel.id === targetId;
      panel.hidden = !isActive;
      panel.classList.toggle("is-active", isActive);
    });

    ensurePanelRendered(targetId);
  };

  tabs.forEach((tab) => {
    tab.addEventListener("click", () => activateTab(tab.dataset.tabTarget));
  });

  return () => activePanelId;
}

function initializeLazyAudioLoading() {
  const hydrateFromEvent = (event) => {
    const audio = event.target.closest?.("audio[data-src]");

    if (!audio || !(audio instanceof HTMLAudioElement)) {
      return;
    }

    hydrateAudioSource(audio);
  };

  document.addEventListener("pointerenter", hydrateFromEvent, true);
  document.addEventListener("focusin", hydrateFromEvent, true);
  document.addEventListener("touchstart", hydrateFromEvent, true);
  document.addEventListener("click", hydrateFromEvent, true);
}

function hydrateAudioSource(audio) {
  if (audio.src || !audio.dataset.src) {
    return;
  }

  audio.src = audio.dataset.src;
  audio.load();
}

async function loadCsv(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }

  const text = await response.text();
  return parseCsv(text);
}

async function loadJson(url) {
  const response = await fetch(url);

  if (!response.ok) {
    throw new Error(`Failed to load ${url}`);
  }

  return response.json();
}

async function loadDatasetRows(metadataUrl, transcriptUrl) {
  const [metadataText, transcript] = await Promise.all([
    fetch(metadataUrl).then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load ${metadataUrl}`);
      }

      return response.text();
    }),
    loadJson(transcriptUrl),
  ]);

  const metadata = parseMetadataCsv(metadataText);

  return ILSPEECH_SAMPLE_IDS.map((id) => {
    const ipa = metadata.get(id);
    const text = transcript[id];

    if (!ipa || !text) {
      return null;
    }

    return {
      id,
      text,
      ipa,
      audioSrc: `media/ilspeech_speaker2_v1/wav/${id}.m4a`,
    };
  }).filter(Boolean);
}

function ensurePanelRendered(panelId) {
  if (appState.renderedPanels.has(panelId)) {
    return;
  }

  if (panelId === "panel-g2p") {
    if (!appState.g2pRows.length) {
      return;
    }

    renderG2PResults();
    appState.renderedPanels.add(panelId);
    return;
  }

  if (panelId === "panel-tts") {
    if (!appState.manifestRows.length) {
      return;
    }

    renderTTSResults();
    appState.renderedPanels.add(panelId);
    return;
  }

  if (panelId === "panel-dataset") {
    renderDatasetResults();
    appState.renderedPanels.add(panelId);
  }
}

function parseMetadataCsv(text) {
  const rows = new Map();

  text
    .split(/\r?\n/u)
    .map((line) => line.trim())
    .filter(Boolean)
    .forEach((line) => {
      const separatorIndex = line.indexOf("|");

      if (separatorIndex === -1) {
        return;
      }

      const id = line.slice(0, separatorIndex).trim();
      const ipa = line.slice(separatorIndex + 1).trim();

      if (!id || !ipa) {
        return;
      }

      rows.set(id, ipa);
    });

  return rows;
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (char === "," && !inQuotes) {
      row.push(current);
      current = "";
      continue;
    }

    if ((char === "\n" || char === "\r") && !inQuotes) {
      if (char === "\r" && next === "\n") {
        i += 1;
      }

      row.push(current);
      current = "";

      const hasContent = row.some((cell) => cell.length > 0);
      if (hasContent) {
        rows.push(row);
      }

      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    rows.push(row);
  }

  const [header, ...dataRows] = rows;

  return dataRows.map((cells) => {
    const record = {};

    header.forEach((key, index) => {
      record[key] = cells[index] ?? "";
    });

    return record;
  });
}

function renderG2PResults() {
  const container = document.getElementById("g2p-results");

  if (!appState.g2pRows.length) {
    container.innerHTML = '<p class="empty-state">No G2P benchmark rows found.</p>';
    return;
  }

  const grouped = Array.from(groupG2PRows(appState.g2pRows).values());
  const totalPages = Math.max(1, Math.ceil(grouped.length / PAGE_SIZE));
  appState.currentG2PPage = clampPage(appState.currentG2PPage, totalPages);

  const start = (appState.currentG2PPage - 1) * PAGE_SIZE;
  const pageItems = grouped.slice(start, start + PAGE_SIZE);

  container.innerHTML = "";

  const list = document.createElement("div");
  list.className = "results-page-list";

  pageItems.forEach((entry) => {
    const item = document.createElement("details");
    item.className = "result-item";

    const predictionRows = entry.predictions
      .map(
        (prediction) => `
          <div class="prediction-row">
            <div class="prediction-model">${escapeHtml(prediction.label)}</div>
            <div class="prediction-text">${escapeHtml(prediction.prediction)}</div>
          </div>
        `
      )
      .join("");

    item.innerHTML = `
      <summary>
        <div class="summary-main">
          <span class="summary-text hebrew" dir="rtl">${escapeHtml(entry.sentence)}</span>
        </div>
        <span class="summary-toggle">Expand</span>
      </summary>
      <div class="result-body">
        <div class="g2p-block">
          <div>
            <div class="section-label">Ground Truth</div>
            <div class="mono-block">${escapeHtml(entry.gt)}</div>
          </div>
          <div>
            <div class="section-label">Predictions</div>
            <div class="prediction-list">
              ${predictionRows}
            </div>
          </div>
        </div>
      </div>
    `;

    list.appendChild(item);
  });

  container.appendChild(list);
  container.appendChild(
    createPaginationControls({
      currentPage: appState.currentG2PPage,
      totalPages,
      onPrevious: () => {
        appState.currentG2PPage -= 1;
        renderG2PResults();
      },
      onNext: () => {
        appState.currentG2PPage += 1;
        renderG2PResults();
      },
    }),
  );
}

function groupG2PRows(rows) {
  const grouped = new Map();

  rows.forEach((row) => {
    if (G2P_EXCLUDED_MODELS.has(row.model)) {
      return;
    }

    const existing = grouped.get(row.id);
    const prediction = {
      model: row.model,
      label: G2P_DISPLAY_NAMES[row.model] ?? row.model,
      prediction: row.prediction,
    };

    if (!existing) {
      grouped.set(row.id, {
        id: row.id,
        sentence: row.sentence,
        gt: row.gt,
        predictions: [prediction],
      });
      return;
    }

    existing.predictions.push(prediction);
  });

  grouped.forEach((entry) => {
    entry.predictions.sort(
      (left, right) => G2P_MODEL_ORDER.indexOf(left.model) - G2P_MODEL_ORDER.indexOf(right.model),
    );
  });

  return grouped;
}

function renderDatasetResults() {
  const container = document.getElementById("dataset-results");

  if (!container) {
    return;
  }

  if (!appState.datasetRows.length) {
    container.innerHTML = '<p class="empty-state">No dataset samples found.</p>';
    return;
  }

  container.innerHTML = appState.datasetRows
    .map(
      (row) => `
        <div class="dataset-example-card">
          <audio controls preload="none" data-src="${escapeAttribute(row.audioSrc)}"></audio>
          <div class="dataset-example-text hebrew" dir="rtl">${escapeHtml(row.text)}</div>
          <div class="mono-block">${escapeHtml(row.ipa)}</div>
        </div>
      `,
    )
    .join("");
}

function renderTTSResults() {
  const container = document.getElementById("tts-results");

  if (!appState.manifestRows.length) {
    container.innerHTML = '<p class="empty-state">No aligned audio rows found.</p>';
    return;
  }

  const totalPages = Math.max(1, Math.ceil(appState.manifestRows.length / PAGE_SIZE));
  appState.currentTTSPage = clampPage(appState.currentTTSPage, totalPages);

  const start = (appState.currentTTSPage - 1) * PAGE_SIZE;
  const pageItems = appState.manifestRows.slice(start, start + PAGE_SIZE);

  container.innerHTML = "";

  const list = document.createElement("div");
  list.className = "results-page-list";

  pageItems.forEach((row) => {
    const item = document.createElement("details");
    item.className = "result-item";

    item.innerHTML = `
      <summary>
        <div class="summary-main">
          <span class="summary-text hebrew" dir="rtl">${escapeHtml(unvocalizeHebrew(row.text))}</span>
        </div>
        <span class="summary-toggle">Expand</span>
      </summary>
      <div class="result-body">
        <div class="aux-copy">
          <div class="section-label">Ground Truth Phonemes</div>
          <div class="mono-block">${escapeHtml(row.phonemes)}</div>
        </div>
        <div class="audio-grid"></div>
      </div>
    `;

    const audioGrid = item.querySelector(".audio-grid");
    item.addEventListener("toggle", () => {
      if (item.open) {
        populateAudioGrid(audioGrid, row, TTS_SYSTEMS);
        return;
      }

      clearAudioGrid(audioGrid);
    });

    list.appendChild(item);
  });

  container.appendChild(list);
  container.appendChild(
    createPaginationControls({
      currentPage: appState.currentTTSPage,
      totalPages,
      onPrevious: () => {
        appState.currentTTSPage -= 1;
        renderTTSResults();
      },
      onNext: () => {
        appState.currentTTSPage += 1;
        renderTTSResults();
      },
    }),
  );
}

function createPaginationControls({ currentPage, totalPages, onPrevious, onNext }) {
  const controls = document.createElement("div");
  controls.className = "results-pagination";

  const previousButton = document.createElement("button");
  previousButton.type = "button";
  previousButton.className = "pagination-button";
  previousButton.textContent = "Previous";
  previousButton.disabled = currentPage === 1;
  previousButton.addEventListener("click", onPrevious);

  const status = document.createElement("div");
  status.className = "pagination-status";
  status.textContent = `Page ${currentPage} of ${totalPages}`;

  const nextButton = document.createElement("button");
  nextButton.type = "button";
  nextButton.className = "pagination-button";
  nextButton.textContent = "Next";
  nextButton.disabled = currentPage === totalPages;
  nextButton.addEventListener("click", onNext);

  controls.appendChild(previousButton);
  controls.appendChild(status);
  controls.appendChild(nextButton);

  return controls;
}

function populateAudioGrid(container, row, systems) {
  if (container.dataset.hydrated === "true") {
    return;
  }

  const fragment = document.createDocumentFragment();

  systems.forEach((system) => {
    const src = `media/bench-samples/${system.folder}/${row.id}.${system.ext}`;
    const card = document.createElement("div");
    card.className = "audio-card";
    card.innerHTML = `
      <h4>${escapeHtml(system.label)}</h4>
      <audio controls preload="none" data-src="${escapeAttribute(src)}"></audio>
    `;
    fragment.appendChild(card);
  });

  container.appendChild(fragment);
  container.dataset.hydrated = "true";
}

function clearAudioGrid(container) {
  if (container.dataset.hydrated !== "true") {
    return;
  }

  container.innerHTML = "";
  delete container.dataset.hydrated;
}

function unvocalizeHebrew(value) {
  return String(value)
    .replace(/\|/g, "")
    .replace(/[\u0591-\u05C7]/gu, "")
    .replace(/\s+/g, " ")
    .trim();
}

function clampPage(page, totalPages) {
  return Math.min(Math.max(page, 1), totalPages);
}

function renderLoadError(error) {
  const message = `<p class="error-state">Unable to load supplementary results. ${escapeHtml(error.message)}</p>`;
  ["g2p-results", "tts-results", "dataset-results"].forEach((id) => {
    const container = document.getElementById(id);
    if (container) {
      container.innerHTML = message;
    }
  });
}

function escapeHtml(value) {
  return String(value)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}
