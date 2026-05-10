// admin/js/slots.render.js

export function renderSlots({ container, slots, onBlock, onUnblock }) {
  container.innerHTML = "";

  slots.forEach(slot => {
    const card = document.createElement("div");

    const start = new Date(slot.start);

    // Base classes
    card.className =
      "p-4 rounded-3xl text-center bento-card border-2 cursor-default";

    /* ===============================
       STATUS-BASED STYLES
    ================================ */
    let timeColor = "text-slate-400";
    let statusText = "";
    let statusColor = "";
    let bg = "bg-white";
    let border = "border-slate-100";

    switch (slot.status) {
      case "AVAILABLE":
        statusText = "Available";
        statusColor = "text-emerald-600";
        card.classList.add("cursor-pointer");
        card.onclick = () => onBlock(slot);
        break;

      case "BOOKED":
        bg = "bg-slate-900";
        border = "border-slate-900";
        timeColor = "text-slate-500";
        statusText = "Booked";
        statusColor = "text-yellow-400 italic";
        break;

      case "HELD":
        border = "border-yellow-200";
        statusText = "Held";
        statusColor = "text-yellow-500 italic";
        break;

      case "BLOCKED":
        border = "border-red-100";
        statusText = "Blocked";
        statusColor = "text-red-500";
        break;
    }

    card.classList.add(bg, border);

    /* ===============================
       INNER HTML
    ================================ */
    card.innerHTML = `
      <p class="text-[10px] font-bold uppercase ${timeColor}">
        ${formatTime(start)}
      </p>
      <p class="text-xs font-bold mt-1 ${statusColor}">
        ${statusText}
      </p>
    `;

    /* ===============================
       UNLOCK BUTTON (BLOCKED ONLY)
    ================================ */
    if (slot.status === "BLOCKED") {
      const btn = document.createElement("button");
      btn.textContent = "Unlock";
      btn.className =
        "text-[8px] font-black uppercase mt-1 underline";
      btn.onclick = e => {
        e.stopPropagation();
        onUnblock(slot);
      };
      card.appendChild(btn);
    }

    container.appendChild(card);
  });
}

/* ===============================
   HELPERS
================================ */

function formatTime(date) {
  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}
