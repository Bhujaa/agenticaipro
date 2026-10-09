import { buildHierarchical, buildDecentralized, buildPeerToPeer } from "./topologies.js";
import { generateMaze, shortestPath } from "./maze.js";

const WORK_MIN = 3, WORK_MAX = 8;
const MAZE_COLS = 6, MAZE_ROWS = 6;

function rand(min, max) { return Math.floor(Math.random() * (max - min + 1)) + min; }
function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

export function createSimulation({ archType, agentCount, scenarioId, onLog, onUpdate }) {
  const sim = {
    archType,
    agentCount,
    scenarioId: scenarioId || "vault",
    onLog,
    onUpdate,
    pulseDurationMs: 700,
    log(text, kind) { onLog && onLog(text, kind, sim.tickCount); },
    pulseDuration() { return sim.pulseDurationMs; },
  };
  rebuild(sim);
  return sim;
}

export function rebuild(sim) {
  let topo;
  if (sim.archType === "hierarchical") topo = buildHierarchical(sim.agentCount);
  else if (sim.archType === "decentralized") topo = buildDecentralized(sim.agentCount);
  else topo = buildPeerToPeer(sim.agentCount);

  sim.agents = topo.agents;
  sim.edges = topo.edges;
  sim.tickCount = 0;
  sim.messagesSent = 0;
  sim.phase = "briefed";
  sim.solved = false;
  sim.pulses = [];
  sim.pending = [];
  sim.awareness = 0;

  // The actual puzzle: a real maze. The network is trying to trace out the
  // one true route from the entry to the objective, cell by verified cell.
  sim.maze = generateMaze(MAZE_COLS, MAZE_ROWS);
  sim.mazeStart = [0, 0];
  sim.mazeGoal = [MAZE_COLS - 1, MAZE_ROWS - 1];
  sim.mazePath = shortestPath(sim.maze, sim.mazeStart, sim.mazeGoal);
  sim.pathLength = sim.mazePath.length;
  sim.pathRevealed = 0;

  if (sim.archType === "hierarchical") initHierarchical(sim);
  else if (sim.archType === "decentralized") initDecentralized(sim);
  else initP2P(sim);
}

export function tick(sim) {
  if (sim.solved) return;
  sim.tickCount++;

  if (sim.archType === "hierarchical") stepHierarchical(sim);
  else if (sim.archType === "decentralized") stepDecentralized(sim);
  else stepP2P(sim);

  computeAwareness(sim);
  if (sim.solved) sim.pathRevealed = sim.pathLength;
  sim.onUpdate && sim.onUpdate();
}

function computeAwareness(sim) {
  const n = sim.agents.length;
  if (sim.archType === "p2p") {
    const total = sim.fragmentTotal;
    const avg = sim.agents.reduce((s, a) => s + a.fragments.size, 0) / n;
    sim.awareness = avg / total;
  } else if (sim.archType === "hierarchical") {
    const done = sim.agents.filter((a) => a.state === "done" || a.state === "solved").length;
    sim.awareness = done / n;
  } else {
    const informed = sim.agents.filter((a) => a.informed).length;
    sim.awareness = informed / n;
    sim.pathRevealed = Math.max(sim.pathRevealed, Math.floor(sim.awareness * sim.pathLength));
  }
}

/* =========================================================
   HIERARCHICAL — a command chain delegates and reports back
   ========================================================= */
function initHierarchical(sim) {
  const leaves = sim.agents.filter((a) => !a.children.length);
  sim.targetLeaf = choice(leaves).id;
  leaves.forEach((a) => { a.state = "working"; a.remaining = rand(WORK_MIN, WORK_MAX); });
  sim.phase = "searching";
  sim.log(`Command splits the floor plan into ${leaves.length} sectors across the chain.`, "system");
}

function stepHierarchical(sim) {
  const due = [];
  sim.pending = sim.pending.filter((msg) => {
    if (msg.arriveAtTick > sim.tickCount) return true;
    due.push(msg);
    return false;
  });
  due.forEach((msg) => deliverHierarchical(sim, msg));

  sim.agents.forEach((a) => {
    const isLeaf = !a.children.length;
    if (isLeaf && a.state === "working") {
      a.remaining -= 1;
      if (a.remaining <= 0) {
        if (a.id === sim.targetLeaf) {
          a.state = "solved";
          sim.pathRevealed = Math.max(sim.pathRevealed, 1);
          sim.log(`Agent-${a.id} FOUND the route marker in its sector.`, "find");
          sendHierarchical(sim, a.id, a.parent, "FOUND");
        } else {
          a.state = "done";
        }
      }
    }
  });

  const allDone = sim.agents.every((a) => a.state === "done" || a.state === "solved");
  if (allDone && sim.phase !== "solved") {
    sim.phase = "solved";
    sim.solved = true;
    sim.log("Chain of command confirms the route. Case closed.", "solved");
  }
}

function sendHierarchical(sim, from, to, type) {
  if (to === null || to === undefined) return;
  const node = sim.agents[from];
  if (node.state !== "done") node.state = "messaging";
  sim.messagesSent++;
  sim.pulses.push({ from, to, ts: performance.now(), dur: sim.pulseDuration() });
  sim.pending.push({ from, to, type, arriveAtTick: sim.tickCount + 1 });
}

function deliverHierarchical(sim, msg) {
  const node = sim.agents[msg.to];
  if (msg.type === "FOUND") {
    node.state = "solved";
    if (node.parent !== null && node.parent !== undefined) {
      sim.pathRevealed = Math.min(sim.pathLength, sim.pathRevealed + 1);
      sim.log(`Agent-${node.id} verifies the marker and relays it up the chain.`, "report");
      sendHierarchical(sim, node.id, node.parent, "FOUND");
    } else {
      sim.pathRevealed = sim.pathLength;
      sim.log("Command confirms the route. Standing down the network.", "solved");
      node.state = "done";
      broadcastDown(sim, node);
    }
  } else if (msg.type === "STAND_DOWN") {
    node.state = "done";
    broadcastDown(sim, node);
  }
}

function broadcastDown(sim, node) {
  node.children.forEach((childId) => sendHierarchical(sim, node.id, childId, "STAND_DOWN"));
}

/* =========================================================
   DECENTRALIZED — a rumor gossips across a leaderless mesh
   ========================================================= */
function initDecentralized(sim) {
  const sourceId = choice(sim.agents).id;
  sim.gossipSource = sourceId;
  sim.agents[sourceId].state = "working";
  sim.agents[sourceId].remaining = rand(2, 4);
  sim.phase = "searching";
  sim.log(`Agent-${sourceId} starts sweeping its patch of the grid.`, "system");
}

function stepDecentralized(sim) {
  const due = [];
  sim.pending = sim.pending.filter((msg) => {
    if (msg.arriveAtTick > sim.tickCount) return true;
    due.push(msg);
    return false;
  });
  due.forEach((msg) => {
    const node = sim.agents[msg.to];
    if (!node.informed) {
      node.informed = true;
      node.state = "solved";
      sim.log(`Agent-${node.id} hears it from Agent-${msg.from}.`, "gossip");
    }
  });

  const source = sim.agents[sim.gossipSource];
  if (source.state === "working") {
    source.remaining -= 1;
    if (source.remaining <= 0) {
      source.state = "solved";
      source.informed = true;
      sim.log(`Agent-${source.id} traces the first stretch of the route.`, "find");
    }
  }

  sim.agents.forEach((a) => {
    if (!a.informed) return;
    const candidates = a.neighbors.filter((id) => !sim.agents[id].informed);
    if (!candidates.length) return;
    const pick = choice(candidates);
    sim.messagesSent++;
    sim.pulses.push({ from: a.id, to: pick, ts: performance.now(), dur: sim.pulseDuration() });
    sim.pending.push({ from: a.id, to: pick, type: "GOSSIP", arriveAtTick: sim.tickCount + 1 });
  });

  const informedCount = sim.agents.filter((a) => a.informed).length;
  if (informedCount === sim.agents.length && sim.phase !== "solved") {
    sim.phase = "solved";
    sim.solved = true;
    sim.log("Every agent in the swarm has traced the full route.", "solved");
  }
}

/* =========================================================
   PEER-TO-PEER — agents trade fragments directly, no boss
   ========================================================= */
function initP2P(sim) {
  sim.fragmentTotal = sim.agents.length;
  sim.agents.forEach((a, i) => { a.fragments = new Set([i]); a.state = "idle"; });
  sim.phase = "searching";
  sim.log(`${sim.agents.length} agents each hold one waypoint of the route.`, "system");
}

function stepP2P(sim) {
  const total = sim.fragmentTotal;

  const due = [];
  sim.pending = sim.pending.filter((msg) => {
    if (msg.arriveAtTick > sim.tickCount) return true;
    due.push(msg);
    return false;
  });

  for (const msg of due) {
    if (sim.phase === "solved") break;
    const a = sim.agents[msg.from];
    const b = sim.agents[msg.to];
    const merged = new Set([...a.fragments, ...b.fragments]);
    a.fragments = new Set(merged);
    b.fragments = new Set(merged);
    a.state = merged.size === total ? "solved" : "idle";
    b.state = merged.size === total ? "solved" : "idle";
    sim.log(`Agent-${a.id} and Agent-${b.id} trade waypoints (${merged.size}/${total} known).`, "report");

    if (merged.size === total) {
      sim.phase = "solved";
      sim.solved = true;
      sim.log(`Agent-${a.id} holds every waypoint. Route reconstructed.`, "solved");
      sim.agents.forEach((n) => { n.fragments = new Set(merged); n.state = "done"; });
    }
  }

  if (sim.phase === "solved") return;

  const n = sim.agents.length;
  const attempts = Math.max(1, Math.round(n / 3));
  const tried = new Set();
  for (let i = 0; i < attempts; i++) {
    const a = choice(sim.agents);
    if (tried.has(a.id) || !a.neighbors.length) continue;
    tried.add(a.id);
    const bId = choice(a.neighbors);
    a.state = "messaging";
    sim.messagesSent++;
    sim.pulses.push({ from: a.id, to: bId, ts: performance.now(), dur: sim.pulseDuration() });
    sim.pending.push({ from: a.id, to: bId, type: "EXCHANGE", arriveAtTick: sim.tickCount + 1 });
  }
}
