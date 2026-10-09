const KIND_LABEL = {
  system: "SYS",
  find: "FIND",
  report: "RLY",
  gossip: "GSP",
  solved: "OK",
};

export function createLogPanel(listEl, maxEntries = 80) {
  return {
    clear() { listEl.innerHTML = ""; },
    push(text, kind = "system", tick = 0) {
      const entry = document.createElement("div");
      entry.className = `log-entry kind-${kind}`;
      entry.innerHTML = `<span class="t">[t${String(tick).padStart(3, "0")} · ${KIND_LABEL[kind] || "SYS"}]</span>${escapeHtml(text)}`;
      listEl.prepend(entry);
      while (listEl.children.length > maxEntries) {
        listEl.removeChild(listEl.lastChild);
      }
    },
  };
}

function escapeHtml(str) {
  const d = document.createElement("div");
  d.textContent = str;
  return d.innerHTML;
}
