// A single field agent (node) in the network.
export class Agent {
  constructor(id) {
    this.id = id;
    this.role = "worker";      // 'coordinator' | 'subcoordinator' | 'worker' | 'peer'
    this.x = 0;
    this.y = 0;

    // topology links
    this.parent = null;        // hierarchical
    this.children = [];        // hierarchical
    this.neighbors = [];       // decentralized / p2p

    // simulation state
    this.state = "idle";       // idle | working | messaging | solved | done
    this.remaining = 0;        // ticks left of local search work
    this.informed = false;     // decentralized: knows the rumor
    this.fragments = new Set(); // p2p: fragment ids held
  }
}
