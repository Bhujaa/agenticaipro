export const SCENARIOS = [
  {
    id: "vault",
    title: "The Quiet Vault",
    tag: "safecracking",
    targetLabel: "VAULT FLOOR PLAN",
    desc: "Blueprints leaked from the bank show a maze of corridors between the service entrance and the vault door. Deploy the network to trace the one true route before the guard's rounds come back.",
  },
  {
    id: "relay",
    title: "Signal in the Static",
    tag: "sigint",
    targetLabel: "TERRAIN GRID",
    desc: "A pirate broadcast is bouncing off ridgelines somewhere in the hills. Chart a route through the terrain to the source and get word back to base before the transmission goes dark.",
  },
  {
    id: "convoy",
    title: "The Scattered Convoy",
    tag: "recon",
    targetLabel: "STREET GRID",
    desc: "A convoy's route through the old quarter was torn from the manifest and handed to informants across the city. Retrace the one path through the grid before the convoy reaches the border.",
  },
];

export const ARCH_BRIEFS = {
  hierarchical:
    "A control node splits the search into sectors and delegates them down a chain of sub-coordinators to field workers. A find is verified and relayed back up before the whole chain stands down.",
  decentralized:
    "No one is in charge. Each agent sweeps a small patch alone, and whoever finds something spreads the word peer-by-peer until the entire swarm has heard it — a gossip protocol.",
  p2p:
    "Every agent starts holding one piece of the picture. Agents connect directly, trade what they know, and whoever ends up holding the full set calls it in. No coordinator required.",
};

export const ARCH_PHASE_LABELS = {
  briefed: "briefed",
  searching: {
    hierarchical: "sweeping sectors",
    decentralized: "sweeping & gossiping",
    p2p: "trading fragments",
  },
  solved: "case closed",
};
