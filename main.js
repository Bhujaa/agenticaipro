import { createSimulation, rebuild, tick } from "./engine/puzzleEngine.js";
import { SCENARIOS, ARCH_BRIEFS, ARCH_PHASE_LABELS } from "./scenarios/scenarios.js";
import { initGraph, drawStatic, animatePulses } from "./ui/graphRenderer.js";
import { createLogPanel } from "./ui/logPanel.js";
import { updateMetrics } from "./ui/metricsPanel.js";
import { renderMaze } from "./ui/mazeBoard.js";

/* ---------------- DOM refs ---------------- */
const svg = document.getElementById("graphCanvas");
const scenarioListEl = document.getElementById("scenarioList");
const archTabsEl = document.getElementById("archTabs");
const archBriefEl = document.getElementById("archBrief");
const agentCountInput = document.getElementById("agentCount");
const agentCountVal = document.getElementById("agentCountVal");
const speedInput = document.getElementById("speed");
const speedVal = document.getElementById("speedVal");
const btnStart = document.getElementById("btnStart");
const btnStep = document.getElementById("btnStep");
const btnReset = document.getElementById("btnReset");
const scenarioTitleEl = document.getElementById("scenarioTitle");
const scenarioDescEl = document.getElementById("scenarioDesc");
const phaseChipEl = document.getElementById("phaseChip");
const statusDot = document.getElementById("statusDot");
const statusText = document.getElementById("statusText");

const metricEls = {
  ticks: document.getElementById("metricTicks"),
  messages: document.getElementById("metricMessages"),
  awareness: document.getElementById("metricAwareness"),
  efficiency: document.getElementById("metricEfficiency"),
};

const mazeSvg = document.getElementById("mazeCanvas");
const mazeFracEl = document.getElementById("mazeFrac");
const mazeLabelEl = document.getElementById("mazeLabel");

const logPanel = createLogPanel(document.getElementById("logList"));

/* ---------------- app state ---------------- */
const appState = {
  scenarioIndex: 0,
  archType: "hierarchical",
  agentCount: Number(agentCountInput.value),
  speed: Number(speedInput.value),
  running: false,
  intervalId: null,
  sim: null,
};

/* ---------------- helpers ---------------- */
function speedToIntervalMs(speed) {
  return Math.round(1100 - speed * 90); // speed 1 -> ~1010ms, speed 10 -> ~200ms
}

function currentScenario() {
  return SCENARIOS[appState.scenarioIndex];
}

function buildSim() {
  const sim = createSimulation({
    archType: appState.archType,
    agentCount: appState.agentCount,
    scenarioId: currentScenario().id,
    onLog: (text, kind, tickAtLog) => logPanel.push(text, kind, tickAtLog),
    onUpdate: render,
  });
  sim.pulseDurationMs = Math.round(speedToIntervalMs(appState.speed) * 0.85);
  return sim;
}

function resetSim({ clearLog = true } = {}) {
  stopLoop();
  appState.sim = buildSim();
  if (clearLog) logPanel.clear();
  logPanel.push(
    `Briefed on "${currentScenario().title}" — ${ARCH_BRIEFS[appState.archType].split(".")[0]}.`,
    "system",
    0
  );
  appState.running = false;
  btnStart.textContent = "▶ Launch operation";
  statusDot.className = "status__dot";
  statusText.textContent = "standing by";
  render();
}

function startLoop() {
  if (appState.running) return;
  appState.running = true;
  btnStart.textContent = "⏸ Pause operation";
  statusDot.className = "status__dot live";
  statusText.textContent = "operation live";
  const ms = speedToIntervalMs(appState.speed);
  appState.intervalId = setInterval(() => {
    tick(appState.sim);
    if (appState.sim.solved) stopLoop({ solved: true });
  }, ms);
}

function stopLoop({ solved = false } = {}) {
  if (appState.intervalId) clearInterval(appState.intervalId);
  appState.intervalId = null;
  appState.running = false;
  if (solved) {
    btnStart.textContent = "▶ Launch operation";
    statusDot.className = "status__dot done";
    statusText.textContent = "case closed";
  } else if (appState.sim && appState.sim.tickCount > 0) {
    btnStart.textContent = "▶ Resume operation";
    statusDot.className = "status__dot";
    statusText.textContent = "paused";
  }
}

/* ---------------- render ---------------- */
function render() {
  const sim = appState.sim;
  if (!sim) return;
  drawStatic(svg, sim);
  updateMetrics(metricEls, sim);
  renderMaze(mazeSvg, sim, mazeFracEl);

  const phaseKey = sim.phase;
  let label = ARCH_PHASE_LABELS[phaseKey];
  if (typeof label === "object") label = label[appState.archType];
  phaseChipEl.textContent = `PHASE: ${label || phaseKey}`;

  if (sim.solved) {
    statusDot.className = "status__dot done";
    statusText.textContent = "case closed";
  }
}

function rafLoop() {
  if (appState.sim) animatePulses(svg, appState.sim);
  requestAnimationFrame(rafLoop);
}

/* ---------------- UI: scenario cards ---------------- */
function renderScenarioList() {
  scenarioListEl.innerHTML = "";
  SCENARIOS.forEach((s, i) => {
    const card = document.createElement("button");
    card.className = "scenario-card" + (i === appState.scenarioIndex ? " active" : "");
    card.innerHTML = `<span class="scenario-card__title">${s.title}</span><span class="scenario-card__tag">${s.tag}</span>`;
    card.addEventListener("click", () => {
      appState.scenarioIndex = i;
      renderScenarioList();
      updateScenarioHeader();
      resetSim();
    });
    scenarioListEl.appendChild(card);
  });
}

function updateScenarioHeader() {
  const s = currentScenario();
  scenarioTitleEl.textContent = s.title;
  scenarioDescEl.textContent = s.desc;
  mazeLabelEl.textContent = s.targetLabel;
}

/* ---------------- UI: architecture tabs ---------------- */
function renderArchTabs() {
  [...archTabsEl.children].forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.arch === appState.archType);
  });
  archBriefEl.textContent = ARCH_BRIEFS[appState.archType];
  document.body.className = `arch-${appState.archType}`;
}

archTabsEl.addEventListener("click", (e) => {
  const btn = e.target.closest(".arch-tab");
  if (!btn) return;
  appState.archType = btn.dataset.arch;
  renderArchTabs();
  resetSim();
});

/* ---------------- UI: sliders & buttons ---------------- */
agentCountInput.addEventListener("input", () => {
  appState.agentCount = Number(agentCountInput.value);
  agentCountVal.textContent = appState.agentCount;
});
agentCountInput.addEventListener("change", () => resetSim());

speedInput.addEventListener("input", () => {
  appState.speed = Number(speedInput.value);
  speedVal.textContent = appState.speed;
  if (appState.sim) appState.sim.pulseDurationMs = Math.round(speedToIntervalMs(appState.speed) * 0.85);
  if (appState.running) {
    clearInterval(appState.intervalId);
    appState.intervalId = setInterval(() => {
      tick(appState.sim);
      if (appState.sim.solved) stopLoop({ solved: true });
    }, speedToIntervalMs(appState.speed));
  }
});

btnStart.addEventListener("click", () => {
  if (!appState.sim) appState.sim = buildSim();
  if (appState.sim.solved) return;
  if (appState.running) stopLoop();
  else startLoop();
});

btnStep.addEventListener("click", () => {
  if (appState.running) return;
  if (!appState.sim) appState.sim = buildSim();
  if (appState.sim.solved) return;
  tick(appState.sim);
});

btnReset.addEventListener("click", () => resetSim());

/* ---------------- boot ---------------- */
function boot() {
  agentCountVal.textContent = appState.agentCount;
  speedVal.textContent = appState.speed;
  renderScenarioList();
  updateScenarioHeader();
  renderArchTabs();
  initGraph(svg);
  resetSim();
  requestAnimationFrame(rafLoop);
}

boot();
