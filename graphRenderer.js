const SVG_NS = "http://www.w3.org/2000/svg";

const ROLE_GLYPH = {
  coordinator: "◆",
  subcoordinator: "▲",
  worker: "●",
  peer: "●",
};

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

export function initGraph(svg) {
  svg.innerHTML = "";
  const rings = el("g", { id: "rings" });
  const edges = el("g", { id: "edges" });
  const nodes = el("g", { id: "nodes" });
  const pulses = el("g", { id: "pulses" });
  svg.appendChild(rings);
  svg.appendChild(edges);
  svg.appendChild(nodes);
  svg.appendChild(pulses);
  drawRadarRings(rings);
}

function drawRadarRings(g) {
  const cx = 500, cy = 300;
  [90, 170, 250].forEach((r) => {
    g.appendChild(el("circle", { cx, cy, r, class: "radar-ring" }));
  });
}

export function drawStatic(svg, sim) {
  const edgesG = svg.querySelector("#edges");
  const nodesG = svg.querySelector("#nodes");
  edgesG.innerHTML = "";
  nodesG.innerHTML = "";

  sim.edges.forEach((e) => {
    const a = sim.agents[e.a], b = sim.agents[e.b];
    const active = a.state === "messaging" || b.state === "messaging";
    edgesG.appendChild(
      el("line", {
        x1: a.x, y1: a.y, x2: b.x, y2: b.y,
        class: "edge" + (active ? " active" : ""),
      })
    );
  });

  sim.agents.forEach((a) => {
    const g = el("g", { class: "node", transform: `translate(${a.x},${a.y})` });
    g.appendChild(
      el("circle", {
        r: a.role === "coordinator" ? 17 : a.role === "subcoordinator" ? 14 : 12,
        class: `node-ring role-${a.role} state-${a.state}`,
      })
    );
    const glyph = el("text", { class: "node-glyph", y: 0.5 });
    glyph.textContent = ROLE_GLYPH[a.role] || "●";
    g.appendChild(glyph);
    const label = el("text", { class: "node-label", y: a.role === "coordinator" ? 32 : 27 });
    label.textContent = `A${a.id}`;
    g.appendChild(label);
    nodesG.appendChild(g);
  });
}

export function animatePulses(svg, sim) {
  const g = svg.querySelector("#pulses");
  if (!g) return;
  g.innerHTML = "";
  const now = performance.now();
  sim.pulses = sim.pulses.filter((p) => now - p.ts < p.dur);
  sim.pulses.forEach((p) => {
    const t = Math.min(1, (now - p.ts) / p.dur);
    const a = sim.agents[p.from], b = sim.agents[p.to];
    if (!a || !b) return;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t;
    g.appendChild(el("circle", { cx: x, cy: y, r: 4.5, class: "msg-pulse" }));
  });
}
