# SIGNAL — Distributed Agent Ops Console

A scenario-based, front-end simulation of multi-agent puzzle solving under
three different network doctrines:

- **Hierarchical** — a command node delegates sectors of the search down a
  tree of sub-coordinators to leaf workers. A find is verified and relayed
  back up the chain before the whole tree stands down.
- **Decentralized** — no leader. Every agent sweeps a small patch on its
  own; whoever finds something spreads it peer-by-peer (a gossip / epidemic
  protocol) until the whole swarm knows.
- **Peer-to-peer** — every agent starts holding one fragment of the answer.
  Agents connect directly and trade fragments until one of them holds the
  full set — no coordinator required.

Pick a **case file** (scenario) for flavor, pick a **doctrine**
(architecture), tune the agent count and tempo, and launch the operation.
The network graph, message pulses, live log, and metrics all update in
real time so you can see the structural difference between the three
approaches on the same puzzle.

**Where the actual puzzle is:** the maze panel on the left of the stage
(labeled "VAULT FLOOR PLAN" / "TERRAIN GRID" / "STREET GRID" depending on
the case file) is the real artifact being solved — a generated maze with
exactly one true route from the entry (S) to the objective (G), hidden
from you at the start except for its walls. The glowing trail only
extends along that route as the network *actually, verifiably* recovers
each step of it: a leaf worker's confirmed find relayed up the chain
(hierarchical), a rumor that's reached a given fraction of the swarm
(decentralized), or the waypoints currently held by whichever peer has
collected the most (peer-to-peer). The comms network panel on the right
shows *how* the agents are talking to solve it; the maze shows *what*
they've actually found.

This is a pure front-end simulation — everything runs in the browser, no
backend or real network calls involved. It's meant as a teaching /
demo tool for distributed-systems concepts (delegation trees, gossip
protocols, peer negotiation), skinned as a spy-ops console.

## Folder structure

```
distributed-puzzle-agents/
├── index.html                 entry point
├── css/
│   └── style.css              theme (accent color shifts per doctrine)
└── js/
    ├── main.js                UI wiring, control loop, render loop
    ├── engine/
    │   ├── Agent.js            agent/node data model
    │   ├── topologies.js       builds the tree / gossip-mesh / p2p-mesh graphs
    │   ├── maze.js             generates the maze puzzle & solves its unique route
    │   └── puzzleEngine.js     the three simulation step functions + tick loop
    ├── scenarios/
    │   └── scenarios.js        case-file flavor text & architecture briefings
    └── ui/
        ├── graphRenderer.js    SVG comms network + animated message pulses
        ├── mazeBoard.js        the actual puzzle artifact — a maze whose
        │                       solution route is traced in as the network
        │                       makes real, verifiable progress
        ├── logPanel.js         comms-intercept log console
        └── metricsPanel.js     ticks / messages / awareness / efficiency
```

## Running it

No build step, no npm install — it's plain HTML/CSS/JS with ES modules.
You just need *something* serving the files over `http://` (browsers block
ES module imports from `file://`).

**In VS Code (recommended):**
1. Open this folder in VS Code.
2. Install the **Live Server** extension (by Ritwick Dey) if you don't have it.
3. Right-click `index.html` → **Open with Live Server**.

**Or from a terminal, no extensions needed:**
```bash
cd distributed-puzzle-agents
python3 -m http.server 8000
# then open http://localhost:8000 in your browser
```

Any static file server works — `npx serve`, `php -S localhost:8000`, etc.

## How the simulation works

Each tick (interval speed controlled by the *Tempo* slider) advances the
whole network by one discrete step:

- **Hierarchical**: leaf workers count down a local "search" timer. One
  random leaf is the one that will find the answer. On find, a `FOUND`
  message is relayed up parent-by-parent to the root; the root then floods
  a `STAND_DOWN` message back down the whole tree.
- **Decentralized**: one random agent is the initial source and finds the
  answer after a short delay. Every tick, every "informed" agent gossips to
  one random un-informed neighbor over the mesh, until 100% of the network
  is informed.
- **Peer-to-peer**: every agent starts holding exactly one unique fragment
  id. Each tick, a handful of random agents each reach out to one random
  neighbor and merge fragment sets. Once any agent's set covers every
  fragment, it's solved, and the full fragment set is distributed to
  everyone for visual closure.

Messages are drawn as small glowing pulses that travel along the edge
between two agents, animated independently of the logic tick rate so the
motion stays smooth even at slow tempos. The maze is a "perfect maze"
(randomized depth-first backtracker), so there's exactly one route between
the entry and the objective — the network's job is to trace that unique
route out, not to search among several.

## Extending it

- **New scenario**: add an entry to `SCENARIOS` in `js/scenarios/scenarios.js`
  with a `title`, `tag`, and `desc`. It'll show up in the case-file list
  automatically.
- **New doctrine**: add a `buildX` topology function in
  `js/engine/topologies.js`, an `initX` / `stepX` pair in
  `js/engine/puzzleEngine.js`, wire it into `rebuild()` / `tick()`, add a
  tab button in `index.html`, an accent palette in `css/style.css`
  (`body.arch-x`), and a brief in `ARCH_BRIEFS`.
- **Tune difficulty**: adjust `WORK_MIN` / `WORK_MAX` in `puzzleEngine.js`
  for how long the initial search takes, or the chord-count multipliers in
  `topologies.js` for how densely connected the gossip/p2p meshes are.
