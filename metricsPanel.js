export function updateMetrics(els, sim) {
  els.ticks.textContent = sim.tickCount;
  els.messages.textContent = sim.messagesSent;
  els.awareness.textContent = `${Math.round((sim.awareness || 0) * 100)}%`;
  els.efficiency.textContent =
    sim.tickCount > 0 ? (sim.messagesSent / sim.tickCount).toFixed(2) : "—";
}
