const STATUS_META = {
  AVAILABLE: {
    label: "Available",
    badgeClass: "bg-emerald-50 text-emerald-700 border-emerald-100",
    dotClass: "bg-emerald-500",
    primaryLabel: "Hold / Book Slot",
    loadingLabel: "Opening...",
    icon: "🟢",
  },
  HELD: {
    label: "Held",
    badgeClass: "bg-yellow-50 text-yellow-700 border-yellow-100",
    dotClass: "bg-yellow-500",
    primaryLabel: "Release Hold",
    loadingLabel: "Releasing...",
    icon: "🟡",
  },
  BOOKED: {
    label: "Booked",
    badgeClass: "bg-red-50 text-red-700 border-red-100",
    dotClass: "bg-red-500",
    primaryLabel: "Save Changes",
    loadingLabel: "Saving...",
    icon: "🔴",
  },
  BLOCKED: {
    label: "Blocked",
    badgeClass: "bg-slate-100 text-slate-700 border-slate-200",
    dotClass: "bg-slate-500",
    primaryLabel: "Unblock Slot",
    loadingLabel: "Unblocking...",
    icon: "⚫",
  },
};

const elements = {
  modal: null,
  panel: null,
  closeBtn: null,
  footerCloseBtn: null,
  title: null,
  time: null,
  date: null,
  status: null,
  details: null,
  actions: null,
};

const state = {
  currentSlot: null,
  currentCallbacks: {},
  holdInterval: null,
  lastFocusedElement: null,
  isOpen: false,
  isLoading: false,
};

function formatDate(value) {
  if (!value) return "Not available";

  return new Date(value).toLocaleDateString("en-IN", {
    weekday: "long",
    day: "2-digit",
    month: "long",
    year: "numeric",
  });
}

function formatTime(value) {
  if (!value) return "Not available";

  return new Date(value).toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: true,
  });
}

function formatMoney(value) {
  if (value === null || value === undefined || value === "")
    return "Not available";

  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(Number(value));
}

function formatPhone(value) {
  if (!value) return "Not available";

  const phone = String(value).replace(/\D/g, "");

  if (phone.length !== 10) return value;

  return `${phone.slice(0, 5)} ${phone.slice(5)}`;
}

function formatCountdown(value) {
  if (!value) return "Not available";

  const diff = new Date(value).getTime() - Date.now();

  if (diff <= 0) return "EXPIRED";

  const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  const seconds = Math.floor((diff % (1000 * 60)) / 1000);

  return `${String(minutes).padStart(2, "0")}:${String(seconds).padStart(2, "0")}`;
}

function normalizeStatus(status) {
  const normalized = String(status || "AVAILABLE").toUpperCase();

  return STATUS_META[normalized] ? normalized : "AVAILABLE";
}

function getSlotStart(slot) {
  return slot?.start || slot?.startsAt || slot?.startTime;
}

function getSlotEnd(slot) {
  return slot?.end || slot?.endsAt || slot?.endTime;
}

function getHoldExpiry(slot) {
  return slot?.expiresAt || slot?.holdExpiresAt || slot?.holdExpires;
}

function renderBadge(slot) {
  const status = normalizeStatus(slot?.status);
  const meta = STATUS_META[status];

  return `
    <span class="inline-flex items-center gap-2 rounded-full border px-3 py-1 text-[15px] font-bold ${meta.badgeClass}">
      <span class="h-2.5 w-2.5 rounded-full ${meta.dotClass}" aria-hidden="true"></span>
      <span>${meta.icon} ${meta.label}</span>
    </span>
  `;
}

function renderSummary(slot) {
  elements.time.textContent = `${formatTime(getSlotStart(slot))} → ${formatTime(getSlotEnd(slot))}`;
  elements.date.textContent = formatDate(getSlotStart(slot));
  elements.status.innerHTML = renderBadge(slot);
}

function renderSpinner() {
  return `<span class="h-4 w-4 animate-spin rounded-full border-2 border-white/40 border-t-white" aria-hidden="true"></span>`;
}

function renderButton(label, className, datasetAction, isPrimary = false) {
  const disabled = state.isOpen ? "disabled" : "";
  const loadingContent =
    isPrimary && state.isLoading ? `${renderSpinner()}${label}` : label;

  return `
    <button
      type="button"
      data-slot-modal-action="${datasetAction}"
      class="${className} disabled:cursor-not-allowed disabled:opacity-60"
      ${disabled}
    >
      ${loadingContent}
    </button>
  `;
}

function renderDetailRows(rows) {
  elements.details.innerHTML = rows
    .filter(
      row => row.value !== null && row.value !== undefined && row.value !== ""
    )
    .map(
      row => `
      <div class="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
        <dt class="text-[8px] font-bold uppercase tracking-widest text-slate-400">
          ${row.label}
        </dt>
        <dd class="mt-0.5 text-sm font-semibold text-slate-800 wrap-break-word">
          ${row.value}
        </dd>
      </div>
    `
    )
    .join("");
}

function renderAvailableDetails() {
  renderDetailRows([
    { label: "Availability", value: "This slot is available." },
    { label: "Additional Information", value: "No extra information." },
  ]);
}

function renderHeldDetails(slot) {
  renderDetailRows([
    { label: "Customer Name", value: slot.customerName || slot.heldBy },
    { label: "Phone", value: formatPhone(slot.customerPhone || slot.phone) },
    {
      label: "Hold Expires",
      value: getHoldExpiry(slot)
        ? `${formatDate(getHoldExpiry(slot))} ${formatTime(getHoldExpiry(slot))}`
        : null,
    },
    {
      label: "Live Countdown",
      value: `<span id="slot-modal-countdown" class="font-mono text-yellow-600">${formatCountdown(getHoldExpiry(slot))}</span>`,
    },
  ]);
}

function renderBookedDetails(slot) {
  renderDetailRows([
    {
      label: "Booking ID",
      value: `
        <span class="font-mono text-xs break-all">
          ${slot.bookingId.slice(-6).toUpperCase()}
        </span>
      `,
    },
    {
      label: "Advance Paid",
      value: formatMoney(slot.advanceAmount),
    },
    {
      label: "Remaining",
      value: formatMoney(slot.remainingAmount),
    },
    {
      label: "Payment",
      value: slot.paymentStatus,
    },
    {
      label: "Created",
      value: slot.createdAt ? formatDate(slot.createdAt) : null,
    },
    {
      label: "Notes",
      value: slot.notes,
    },
  ]);
}

function renderBlockedDetails(slot) {
  renderDetailRows([
    { label: "Blocked Reason", value: slot.blockedReason || slot.reason },
    { label: "Blocked By", value: slot.blockedBy },
    {
      label: "Blocked At",
      value: slot.blockedAt ? formatDate(slot.blockedAt) : null,
    },
  ]);
}

function renderAvailableActions() {
  elements.actions.innerHTML = `
    <div class="grid gap-2 sm:grid-cols-2">
      ${renderButton(
        STATUS_META.AVAILABLE.primaryLabel,
        "inline-flex h-8 items-center justify-center rounded-xl bg-emerald-600 px-3 text-[15px] font-black text-white transition hover:bg-emerald-700",
        "manualBooking",
        true
      )}
      ${renderButton(
        "Block Slot",
        "h-8 rounded-xl border border-red-100 bg-red-50 px-3 text-[15px] font-black text-red-600 transition hover:bg-red-100",
        "block"
      )}
    </div>
  `;
}

function renderHeldActions() {
  elements.actions.innerHTML = `
    <div class="rounded-2xl border border-yellow-200 bg-yellow-50 p-4">
      <p class="text-[15px] font-black text-slate-800">Release this hold?</p>
      <p class="text-[11px] font-semibold text-slate-500">
        The slot will become available immediately after confirmation.
      </p>
      <div class="mt-4 grid gap-2 sm:grid-cols-2">
        ${renderButton(
          STATUS_META.HELD.loadingLabel,
          "inline-flex h-8 items-center justify-center rounded-xl bg-slate-900 px-3 text-[15px] font-black text-white transition hover:bg-slate-800",
          "releaseHold",
          true
        )}
        ${renderButton(
          "Keep Hold",
          "h-8 rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-black text-slate-600 transition hover:bg-slate-50",
          "close"
        )}
      </div>
    </div>
  `;

  if (!state.isLoading) {
    elements.actions.querySelector(
      '[data-slot-modal-action="releaseHold"]'
    ).textContent = STATUS_META.HELD.primaryLabel;
  }
}

function renderBookedActions(slot) {
  const paidValue = slot.paidOnSpot || "";
  const completedValue = slot.isCompleted === true ? "YES" : "NO";

  elements.actions.innerHTML = `
    <div class="space-y-4 rounded-xl border border-slate-100 bg-slate-50 p-4">

    <!-- Always Visible -->

    <div class="grid grid-cols-2 gap-2">

        <div class="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
            <p class="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Customer
            </p>

            <p class="mt-1 text-sm font-semibold">
                ${slot.customerName}
            </p>
        </div>

        <div class="rounded-xl border border-slate-100 bg-white px-3 py-2.5">
            <p class="text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Phone
            </p>

            <p class="mt-1 text-sm font-semibold">
                ${formatPhone(slot.customerPhone)}
            </p>
        </div>

    </div>


    <!-- Toggle -->

    <button
        id="slot-toggle-details"
        type="button"
        class="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3">

        <span class="text-sm font-bold">
            Booking Details
        </span>

        <span id="slot-toggle-icon">
            &#9660;
        </span>

    </button>


    <!-- Hidden -->

    <div
        id="slot-booking-details"
        class="hidden">

        <dl
            id="slot-modal-details"
            class="grid grid-cols-1 sm:grid-cols-2 gap-2">
        </dl>

    </div>

    <!-- Booking Management: stacked on mobile, side-by-side on desktop -->

    <div class="lg:grid lg:grid-cols-2 lg:gap-4">

        <div>

            <label
                class="mb-2 block text-xs font-bold text-slate-600">

                Paid on Spot

            </label>

            <input
                id="slot-modal-paid-on-spot"
                type="number"
                value="${paidValue}"
                class="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm"
            />

        </div>

        <div class="mt-4 lg:mt-0">

            <p class="mb-2 text-xs font-bold text-slate-600">
                Booking Completed
            </p>

            <div class="grid grid-cols-2 gap-2">

                <label class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold">

                    <input
                        type="radio"
                        name="slot-modal-completed"
                        value="YES"
                        ${completedValue === "YES" ? "checked" : ""}>

                    YES

                </label>

                <label class="rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold">

                    <input
                        type="radio"
                        name="slot-modal-completed"
                        value="NO"
                        ${completedValue === "NO" ? "checked" : ""}>

                    NO

                </label>

            </div>

        </div>

    </div>

    <div id="slot-modal-discount-note"
         class="hidden rounded-xl border border-yellow-200 bg-yellow-50 p-3 text-xs font-semibold text-yellow-700">

        Remaining amount will be treated as Discount.

    </div>

    <div class="grid gap-2 sm:grid-cols-2">

        ${renderButton(
          "Save Changes",
          "inline-flex h-10 items-center justify-center rounded-xl bg-slate-900 text-white font-bold",
          "saveBooking",
          true
        )}

        ${renderButton(
          "Cancel Booking",
          "h-10 rounded-xl border border-red-100 bg-red-50 font-bold text-red-600",
          "cancelBooking"
        )}

    </div>

</div>
  `;

  updateDiscountNotice();
  renderBookedDetails(slot);
}

function toggleBookingDetails() {
  const details = document.getElementById("slot-booking-details");

  const icon = document.getElementById("slot-toggle-icon");

  details.classList.toggle("hidden");

  icon.textContent = details.classList.contains("hidden") ? "\u25BC" : "\u25B2";
}

function renderBlockedActions() {
  elements.actions.innerHTML = `
    <div class="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <p class="text-[15px] font-black text-slate-800">Unblock this slot?</p>
      <p class="text-[11px] font-semibold text-slate-500">
        The slot will return to the available schedule after confirmation.
      </p>
      <div class="mt-4 grid gap-2 sm:grid-cols-2">
        ${renderButton(
          state.isLoading
            ? STATUS_META.BLOCKED.loadingLabel
            : STATUS_META.BLOCKED.primaryLabel,
          "inline-flex h-8 items-center justify-center rounded-xl bg-slate-900 px-3 text-[15px] font-black text-white transition hover:bg-slate-800",
          "unblock",
          true
        )}
        ${renderButton(
          "Keep Blocked",
          "h-8 rounded-xl border border-slate-200 bg-white px-3 text-[15px] font-black text-slate-600 transition hover:bg-slate-50",
          "close"
        )}
      </div>
    </div>
  `;
}

function renderDetails(slot) {
  const status = normalizeStatus(slot?.status);

  if (status === "AVAILABLE") {
    renderAvailableDetails(slot);
    return;
  }

  if (status === "HELD") {
    renderHeldDetails(slot);
    return;
  }

  if (status === "BOOKED") {
    renderBookedDetails(slot);
    return;
  }

  renderBlockedDetails(slot);
}

function renderActions(slot) {
  const status = normalizeStatus(slot?.status);

  if (status === "AVAILABLE") {
    renderAvailableActions(slot);
    return;
  }

  if (status === "HELD") {
    renderHeldActions(slot);
    return;
  }

  if (status === "BOOKED") {
    renderBookedActions(slot);
    return;
  }

  renderBlockedActions(slot);
}

function renderModal(slot) {
  renderSummary(slot);
  renderDetails(slot);
  renderActions(slot);
}

function clearCountdown() {
  if (!state.holdInterval) return;

  clearInterval(state.holdInterval);
  state.holdInterval = null;
}

function startCountdown() {
  clearCountdown();

  if (
    !state.currentSlot ||
    normalizeStatus(state.currentSlot.status) !== "HELD"
  )
    return;

  state.holdInterval = setInterval(() => {
    const countdown = document.getElementById("slot-modal-countdown");

    if (!countdown) return;

    countdown.textContent = formatCountdown(getHoldExpiry(state.currentSlot));
  }, 1000);
}

// function injectStyles() {
//   if (document.getElementById("slot-modal-style")) return;

//   const style = document.createElement("style");

//   style.id = "slot-modal-style";

//   style.textContent = `
// .slot-modal-open{
//     opacity:1;
//     pointer-events:auto;
// }

// .slot-modal-panel{
//     transform:translateY(18px) scale(.96);
// }

// .slot-modal-open .slot-modal-panel{
//     transform:translateY(0) scale(1);
//     opacity:1;
// }

// #slot-details-modal{
//     transition:opacity .18s ease;
// }

// #slot-details-modal::-webkit-scrollbar{
//     display:none;
// }
// `;

//   document.head.appendChild(style);
// }

function createModal() {
  if (elements.modal) return;

  // injectStyles();

  const modal = document.createElement("div");

  modal.id = "slot-details-modal";

  // Mobile: anchor to bottom (items-end). Desktop (sm+): centered dialog.
  modal.className =
    "rt-modal-backdrop fixed inset-0 z-[9999] flex items-end sm:items-center justify-center bg-black/50 backdrop-blur-md opacity-0 pointer-events-none";

  modal.setAttribute("role", "dialog");
  modal.setAttribute("aria-modal", "true");
  modal.setAttribute("aria-labelledby", "slot-details-title");

  modal.innerHTML = `
<div
  class="rt-modal-panel
         relative
         flex
         flex-col
         w-full
         sm:w-[95vw]
         max-w-full
         sm:max-w-3xl
         lg:max-w-4xl
         h-[92dvh]
         sm:h-auto
         sm:max-h-[85dvh]
         rounded-t-3xl
         sm:rounded-3xl
         bg-white
         shadow-2xl
         overflow-hidden
         border border-slate-200">

    <!-- Mobile drag handle, hidden on desktop -->
    <div class="mx-auto mt-2.5 mb-1 h-1.5 w-10 shrink-0 rounded-full bg-slate-300 sm:hidden"></div>

    <!-- Header -->
    <header
      class="flex items-center justify-between
             border-b border-slate-100
             px-6 py-4 sm:py-5
             shrink-0">

        <div>
            <h2 id="slot-details-title"
                class="text-lg font-black text-slate-900">
                Slot Details
            </h2>

            <p class="text-[13px] text-slate-500 mt-1">
                Manage booking, hold and block status
            </p>
        </div>

        <button
            id="slot-modal-close"
            class="flex h-8 w-8 items-center justify-center
                   rounded-xl
                   border
                   border-slate-200
                   hover:bg-slate-100
                   transition">

            &#10005;

        </button>

    </header>


    <!-- Body: single column on mobile, 2-column (details | actions) on desktop -->
    <main
        class="flex-1
               overflow-y-auto
               overscroll-contain
               min-h-0
               p-4
               lg:p-6
               space-y-5
               lg:space-y-0
               lg:grid
               lg:grid-cols-5
               lg:gap-6
               lg:items-start">

        <!-- Summary (full width) -->
        <section
            class="lg:col-span-5
                   rounded-2xl
                   bg-slate-50
                   border
                   border-slate-100
                   p-4">

            <div
                class="flex
                       items-start
                       justify-between
                       gap-4
                       flex-wrap">

                <div>

                    <p
                      id="slot-modal-time"
                      class="text-lg font-black text-slate-900">
                    </p>

                    <p
                      id="slot-modal-date"
                      class="mt-1 text-sm text-slate-500">
                    </p>

                </div>

                <div id="slot-modal-status"></div>

            </div>

        </section>


        <!-- Dynamic Details (left column on desktop) -->

        <section class="lg:col-span-2 space-y-3">

            <h3
              class="mb-3
                     text-xs
                     uppercase
                     tracking-widest
                     font-bold
                     text-slate-400">

                Details

            </h3>

            <dl
                id="slot-modal-details"
                class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-1 gap-3">
            </dl>

        </section>


        <!-- Actions (right column on desktop) -->

        <section class="lg:col-span-3">

            <h3
              class="mb-3
                     text-xs
                     uppercase
                     tracking-widest
                     font-bold
                     text-slate-400">

                Actions

            </h3>

            <div id="slot-modal-actions"></div>

        </section>

    </main>


    <!-- Footer, safe-area aware so it never sits under a device home indicator -->

    <footer
        class="border-t
               border-slate-100
               p-5
               pb-[max(1.25rem,env(safe-area-inset-bottom))]
               shrink-0">

        <button
            id="slot-modal-footer-close"
            class="h-8
                   w-full
                   rounded-xl
                   border
                   border-slate-200
                   font-bold
                   hover:bg-slate-100
                   transition">

            Close

        </button>

    </footer>

</div>
`;

  document.body.appendChild(modal);

  elements.modal = modal;
  elements.panel = modal.querySelector(".rt-modal-panel");
  elements.closeBtn = modal.querySelector("#slot-modal-close");
  elements.footerCloseBtn = modal.querySelector("#slot-modal-footer-close");
  elements.title = modal.querySelector("#slot-details-title");
  elements.time = modal.querySelector("#slot-modal-time");
  elements.date = modal.querySelector("#slot-modal-date");
  elements.status = modal.querySelector("#slot-modal-status");
  elements.details = modal.querySelector("#slot-modal-details");
  elements.actions = modal.querySelector("#slot-modal-actions");

  elements.closeBtn.addEventListener("click", closeSlotModal);
  elements.footerCloseBtn.addEventListener("click", closeSlotModal);
  elements.modal.addEventListener("mousedown", handleBackdropClick);
  elements.modal.addEventListener("click", handleActionClick);
  elements.modal.addEventListener("input", handleModalInput);
  elements.modal.addEventListener("change", handleModalInput);
  document.addEventListener("keydown", handleKeydown);
}

function lockBodyScroll() {
  document.body.classList.add("overflow-hidden");
}

function unlockBodyScroll() {
  document.body.classList.remove("overflow-hidden");
  document.documentElement.classList.remove("overflow-hidden");
}

function getFocusableElements() {
  if (!elements.modal) return [];

  return [
    ...elements.modal.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    ),
  ].filter(element => element.offsetParent !== null);
}

function focusFirstElement() {
  const focusable = getFocusableElements();

  (focusable[0] || elements.panel).focus();
}

function trapFocus(e) {
  if (e.key !== "Tab" || !state.isOpen) return;

  const focusable = getFocusableElements();

  if (!focusable.length) {
    e.preventDefault();
    elements.panel.focus();
    return;
  }

  const first = focusable[0];
  const last = focusable[focusable.length - 1];

  if (e.shiftKey && document.activeElement === first) {
    e.preventDefault();
    last.focus();
    return;
  }

  if (!e.shiftKey && document.activeElement === last) {
    e.preventDefault();
    first.focus();
  }
}

function handleKeydown(e) {
  if (!state.isOpen) return;

  if (e.key === "Escape") {
    closeSlotModal();
    return;
  }

  trapFocus(e);
}

function handleBackdropClick(e) {
  if (e.target === elements.modal) {
    closeSlotModal();
  }
}

function getBookingFormData(action) {
  const paidInput = elements.modal.querySelector("#slot-modal-paid-on-spot");
  const completedInput = elements.modal.querySelector(
    'input[name="slot-modal-completed"]:checked'
  );

  return {
    action,
    paidOnSpot: Number(paidInput?.value || 0),
    isCompleted: completedInput?.value || "NO",
  };
}

function updateDiscountNotice() {
  const note = elements.modal?.querySelector("#slot-modal-discount-note");
  const paidInput = elements.modal?.querySelector("#slot-modal-paid-on-spot");
  const completedInput = elements.modal?.querySelector(
    'input[name="slot-modal-completed"]:checked'
  );

  if (!note || !paidInput || !completedInput || !state.currentSlot) return;

  const remaining = Number(state.currentSlot.remainingAmount || 0);
  const paid = Number(paidInput.value || 0);
  const finalRemaining = remaining - paid;

  if (completedInput.value === "YES" && finalRemaining > 0) {
    note.classList.remove("hidden");
  } else {
    note.classList.add("hidden");
  }
}

async function runCallback(callback, payload, loadingLabel) {
  if (!callback || state.isLoading) return;

  state.isLoading = true;
  renderActions(state.currentSlot);

  const primaryBtn = elements.actions.querySelector(
    "[data-slot-modal-action].bg-slate-900, [data-slot-modal-action].bg-emerald-600"
  );

  if (primaryBtn) {
    primaryBtn.innerHTML = `${renderSpinner()}${loadingLabel}`;
  }

  try {
    await callback(state.currentSlot, payload);
  } finally {
    state.isLoading = false;
    if (state.currentSlot) renderActions(state.currentSlot);
  }
}

function handleModalInput(e) {
  if (
    e.target.closest("#slot-modal-paid-on-spot") ||
    e.target.name === "slot-modal-completed"
  ) {
    updateDiscountNotice();
  }
}

function handleActionClick(e) {
  if (e.target.closest("#slot-toggle-details")) {
    toggleBookingDetails();
    return;
  }
  const button = e.target.closest("[data-slot-modal-action]");

  if (!button || !elements.modal.contains(button)) return;

  const action = button.dataset.slotModalAction;

  if (action === "close") {
    closeSlotModal();
    return;
  }

  if (action === "manualBooking") {
    runCallback(
      state.currentCallbacks.onManualBooking,
      { action },
      STATUS_META.AVAILABLE.loadingLabel
    );
    return;
  }

  if (action === "block") {
    runCallback(state.currentCallbacks.onBlock, { action }, "Blocking...");
    return;
  }

  if (action === "releaseHold") {
    runCallback(
      state.currentCallbacks.onReleaseHold,
      { action },
      STATUS_META.HELD.loadingLabel
    );
    return;
  }

  if (action === "unblock") {
    runCallback(
      state.currentCallbacks.onUnblock,
      { action },
      STATUS_META.BLOCKED.loadingLabel
    );
    return;
  }

  if (action === "saveBooking" || action === "cancelBooking") {
    runCallback(
      state.currentCallbacks.onBookingAction,
      getBookingFormData(action),
      STATUS_META.BOOKED.loadingLabel
    );
  }
}

function openSlotModal(options) {
  const slot = options?.slot;

  if (!slot) return;

  // createModal() MUST run first — elements.modal is null until this builds
  // the DOM. Touching elements.modal.classList before this line is what was
  // throwing "Cannot read properties of null (reading 'classList')".
  createModal();

  document.body.classList.add("modal-open");
  clearCountdown();

  state.lastFocusedElement = document.activeElement;
  state.currentSlot = slot;
  state.currentCallbacks = options.callbacks || {};
  state.isLoading = false;

  renderModal(state.currentSlot);
  startCountdown();
  lockBodyScroll();
  document.documentElement.classList.add("overflow-hidden");
  elements.modal.classList.remove("hidden");

  requestAnimationFrame(() => {
    elements.modal.classList.add("is-open");
    state.isOpen = true;
    focusFirstElement();
  });
}

function closeSlotModal() {
  if (!elements.modal || !state.isOpen) return;

  elements.modal.classList.remove("is-open");
  document.body.classList.remove("modal-open");

  clearCountdown();
  state.isLoading = false;
  state.isOpen = false;

  // elements.modal.classList.remove("slot-modal-open");

  window.setTimeout(() => {
    if (state.isOpen) return;

    unlockBodyScroll();

    if (typeof state.currentCallbacks.onClose === "function") {
      state.currentCallbacks.onClose(state.currentSlot);
    }

    state.currentSlot = null;
    state.currentCallbacks = {};

    if (
      state.lastFocusedElement &&
      typeof state.lastFocusedElement.focus === "function"
    ) {
      state.lastFocusedElement.focus();
    }

    state.lastFocusedElement = null;
  }, 200);
}

function updateSlotModal(slot) {
  if (!elements.modal || !state.currentSlot) return;

  state.currentSlot = slot;
  state.isLoading = false;

  renderModal(state.currentSlot);
  startCountdown();
}

function destroySlotModal() {
  clearCountdown();
  unlockBodyScroll();

  if (elements.modal) {
    elements.modal.removeEventListener("mousedown", handleBackdropClick);
    elements.modal.removeEventListener("click", handleActionClick);
    elements.modal.removeEventListener("input", handleModalInput);
    elements.modal.removeEventListener("change", handleModalInput);
    elements.modal.remove();
  }

  document.removeEventListener("keydown", handleKeydown);

  elements.modal = null;
  elements.panel = null;
  elements.closeBtn = null;
  elements.footerCloseBtn = null;
  elements.title = null;
  elements.time = null;
  elements.date = null;
  elements.status = null;
  elements.details = null;
  elements.actions = null;

  state.currentSlot = null;
  state.currentCallbacks = {};
  state.lastFocusedElement = null;
  state.isOpen = false;
  state.isLoading = false;
}

export { openSlotModal, closeSlotModal, updateSlotModal, destroySlotModal };
