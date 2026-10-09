import { Agent } from "./Agent.js";

const W = 1000, H = 620;

function addEdgeFactory(edges) {
  const seen = new Set();
  return (a, b) => {
    if (a === b) return;
    const key = a < b ? `${a}-${b}` : `${b}-${a}`;
    if (seen.has(key)) return;
    seen.add(key);
    edges.push({ a, b });
  };
}

/* ---------------- Hierarchical: command tree ---------------- */
export function buildHierarchical(n) {
  const agents = Array.from({ length: n }, (_, i) => new Agent(i));
  const edges = [];
  const addEdge = addEdgeFactory(edges);
  const BRANCH = 3;

  agents[0].depth = 0;
  const queue = [0];
  let next = 1;
  while (next < n && queue.length) {
    const parentId = queue.shift();
    const parent = agents[parentId];
    let placed = 0;
    while (placed < BRANCH && next < n) {
      const child = agents[next];
      child.parent = parentId;
      child.depth = parent.depth + 1;
      parent.children.push(child.id);
      addEdge(parentId, child.id);
      queue.push(child.id);
      next++;
      placed++;
    }
  }

  agents.forEach((a) => {
    if (a.id === 0) a.role = "coordinator";
    else if (a.children.length) a.role = "subcoordinator";
    else a.role = "worker";
  });

  layoutTree(agents);
  return { agents, edges, root: 0 };
}

function layoutTree(agents) {
  const byDepth = new Map();
  agents.forEach((a) => {
    if (!byDepth.has(a.depth)) byDepth.set(a.depth, []);
    byDepth.get(a.depth).push(a);
  });
  const maxDepth = Math.max(...byDepth.keys());
  byDepth.forEach((row, depth) => {
    const y = 70 + (maxDepth === 0 ? 0 : (depth / maxDepth) * (H - 160));
    row.forEach((a, i) => {
      a.x = ((i + 1) / (row.length + 1)) * (W - 120) + 60;
      a.y = y;
    });
  });
}

/* ---------------- Decentralized: gossip mesh ---------------- */
export function buildDecentralized(n) {
  const agents = Array.from({ length: n }, (_, i) => new Agent(i));
  agents.forEach((a) => (a.role = "peer"));
  circleLayout(agents);

  const edges = [];
  const addEdge = addEdgeFactory(edges);
  for (let i = 0; i < n; i++) addEdge(i, (i + 1) % n);
  const chords = Math.round(n * 0.6);
  for (let i = 0; i < chords; i++) {
    const a = Math.floor(Math.random() * n);
    let b = Math.floor(Math.random() * n);
    if (b === a) b = (b + 1) % n;
    addEdge(a, b);
  }
  attachNeighbors(agents, edges);
  return { agents, edges };
}

/* ---------------- Peer-to-peer: dense negotiation mesh ---------------- */
export function buildPeerToPeer(n) {
  const agents = Array.from({ length: n }, (_, i) => new Agent(i));
  agents.forEach((a) => (a.role = "peer"));
  circleLayout(agents);

  const edges = [];
  const addEdge = addEdgeFactory(edges);
  for (let i = 0; i < n; i++) addEdge(i, (i + 1) % n);
  const chords = Math.round(n * 1.3);
  for (let i = 0; i < chords; i++) {
    const a = Math.floor(Math.random() * n);
    let b = Math.floor(Math.random() * n);
    if (b === a) b = (b + 1) % n;
    addEdge(a, b);
  }
  attachNeighbors(agents, edges);
  return { agents, edges };
}

function circleLayout(agents) {
  const cx = W / 2, cy = H / 2 - 10, r = Math.min(W, H) / 2 - 90;
  agents.forEach((a, i) => {
    const angle = (i / agents.length) * Math.PI * 2 - Math.PI / 2;
    a.x = cx + r * Math.cos(angle);
    a.y = cy + r * Math.sin(angle);
  });
}

function attachNeighbors(agents, edges) {
  agents.forEach((a) => (a.neighbors = []));
  edges.forEach((e) => {
    agents[e.a].neighbors.push(e.b);
    agents[e.b].neighbors.push(e.a);
  });
}
