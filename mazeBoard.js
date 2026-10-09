const SVG_NS = "http://www.w3.org/2000/svg";

function el(tag, attrs = {}) {
  const node = document.createElementNS(SVG_NS, tag);
  Object.entries(attrs).forEach(([k, v]) => node.setAttribute(k, v));
  return node;
}

const CELL = 34;
const PAD = 14;

export function renderMaze(svg, sim, fracEl) {
  if (!sim || !sim.maze) {
    svg.innerHTML = "";
    if (fracEl) fracEl.textContent = "";
    return;
  }

  const { cols, rows, cells } = sim.maze;
  const w = cols * CELL + PAD * 2;
  const h = rows * CELL + PAD * 2;
  svg.setAttribute("viewBox", `0 0 ${w} ${h}`);
  svg.innerHTML = "";

  const cx = (x) => PAD + x * CELL + CELL / 2;
  const cy = (y) => PAD + y * CELL + CELL / 2;

  // walls
  const wallsG = el("g", { class: "maze-walls" });
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < cols; x++) {
      const c = cells[y][x];
      const x0 = PAD + x * CELL, y0 = PAD + y * CELL;
      const x1 = x0 + CELL, y1 = y0 + CELL;
      if (c.walls.N) wallsG.appendChild(el("line", { x1: x0, y1: y0, x2: x1, y2: y0, class: "maze-wall" }));
      if (c.walls.W) wallsG.appendChild(el("line", { x1: x0, y1: y0, x2: x0, y2: y1, class: "maze-wall" }));
      if (c.walls.E) wallsG.appendChild(el("line", { x1: x1, y1: y0, x2: x1, y2: y1, class: "maze-wall" }));
      if (c.walls.S) wallsG.appendChild(el("line", { x1: x0, y1: y1, x2: x1, y2: y1, class: "maze-wall" }));
    }
  }
  svg.appendChild(wallsG);

  // how many path steps (from the start) has the network actually verified?
  let revealedCount;
  if (sim.solved) {
    revealedCount = sim.pathLength;
  } else if (sim.archType === "p2p") {
    let lead = sim.agents[0];
    sim.agents.forEach((a) => { if (a.fragments.size > lead.fragments.size) lead = a; });
    const fraction = lead.fragments.size / sim.fragmentTotal;
    revealedCount = Math.min(sim.pathLength, Math.floor(fraction * sim.pathLength));
  } else {
    revealedCount = Math.min(sim.pathRevealed || 0, sim.pathLength);
  }

  const path = sim.mazePath;

  if (revealedCount > 1) {
    let d = `M ${cx(path[0][0])} ${cy(path[0][1])}`;
    for (let i = 1; i < revealedCount; i++) d += ` L ${cx(path[i][0])} ${cy(path[i][1])}`;
    svg.appendChild(el("path", { d, class: "maze-trail" }));
  }

  path.forEach(([x, y], i) => {
    const on = i < revealedCount;
    svg.appendChild(el("circle", { cx: cx(x), cy: cy(y), r: 3.4, class: "maze-dot" + (on ? " on" : "") }));
  });

  const [sx, sy] = sim.mazeStart;
  const [gx, gy] = sim.mazeGoal;
  const startG = el("g", { class: "maze-marker maze-marker--start" });
  startG.appendChild(el("circle", { cx: cx(sx), cy: cy(sy), r: 9 }));
  startG.appendChild(el("text", { x: cx(sx), y: cy(sy) + 0.5, class: "maze-marker__label" }));
  startG.lastChild.textContent = "S";
  svg.appendChild(startG);

  const goalG = el("g", { class: "maze-marker maze-marker--goal" });
  goalG.appendChild(el("circle", { cx: cx(gx), cy: cy(gy), r: 9 }));
  goalG.appendChild(el("text", { x: cx(gx), y: cy(gy) + 0.5, class: "maze-marker__label" }));
  goalG.lastChild.textContent = "G";
  svg.appendChild(goalG);

  if (fracEl) {
    fracEl.textContent =
      revealedCount >= sim.pathLength
        ? `route confirmed · ${sim.pathLength} steps`
        : `${revealedCount}/${sim.pathLength} steps traced`;
  }
}
