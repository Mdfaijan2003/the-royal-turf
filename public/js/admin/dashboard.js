// admin/js/dashboard.js
import { dom } from "./dom.dashboard.js";
import { state } from "./state.dashboard.js";
import {
  fetchDashboardSummary,
  fetchDashboardBookings,
} from "./api.dashboard.js";
import { renderSlots } from "./slots.dashboard.js";
import { renderGallery } from "./gallery.dashboard.js";

document.addEventListener("DOMContentLoaded", initDashboard);

function initDashboard() {
  const today = new Date().toISOString().slice(0, 10);

  loadDashboard(today);
  loadGallery();

  if (!state.selectedSlotDate) {
    state.selectedSlotDate = today;
    loadSlots();
  }

  dom.slotDateInput?.addEventListener("input", e => {
    state.selectedSlotDate = e.target.value;
    console.log("Selected Slot Date:", state.selectedSlotDate);
    loadSlots();
  });

  dom.refreshBtn?.addEventListener("click", () => {
    loadDashboard(today);
    if (state.selectedSlotDate) loadSlots();
  });

  dom.ledgerSearch.addEventListener("input", e => {
    const query = e.target.value.trim();
    if(!query){
      console.log("Empty search, loading all bookings");
    }
    console.log("Ledger search query:", query);
    handleSearch(query);
  });

  const fileInput = document.getElementById("gallery-file-input");
  console.log("File input:", fileInput);

  dom.uploadMediaBtn?.addEventListener("click", () => {
    console.log("Upload media button clicked");
    fileInput.click();
  });
  console.log(dom.uploadMediaBtn);

  fileInput.addEventListener("change", () => {
    console.log("Files selected:", fileInput.files);
    uploadFiles([...fileInput.files]);
    fileInput.value = "";
  });

  // Drag & Drop
  dom.galleryGrid.addEventListener("dragover", e => {
    e.preventDefault();
    console.log("Drag over gallery grid");
    dom.galleryGrid.classList.add("ring-2", "ring-slate-900");
  });

  dom.galleryGrid.addEventListener("dragleave", () => {
    console.log("Drag leave gallery grid");
    dom.galleryGrid.classList.remove("ring-2", "ring-slate-900");
  });

  dom.galleryGrid.addEventListener("drop", e => {
    e.preventDefault();
    dom.galleryGrid.classList.remove("ring-2", "ring-slate-900");

    const files = [...e.dataTransfer.files].filter(f =>
      f.type.startsWith("image/")
    );
    console.log("Files dropped:", files);

    if (files.length) uploadFiles(files);
  });
}

async function loadDashboard(date) {
  try {
    const [summary, bookings] = await Promise.all([
      fetchDashboardSummary(date),
      fetchDashboardBookings(date),
    ]);

    state.summary = summary;
    state.bookings = bookings;

    renderSummary();
    renderFinance();
    renderBookings();
  } catch (err) {
    console.error("Dashboard load error:", err);
  }
}

/* ===============================
   RENDER FUNCTIONS
================================ */

function renderSummary() {
  const s = state.summary;
  if (!s) return;
  console.log(s);

  dom.revenue.textContent = `₹${s.revenue.toLocaleString("en-IN")}`;
  dom.revenueChange.textContent = `${s.revenueChange}%`;
  dom.totalBookings.textContent = s.totalBookings;
  dom.occupancy.textContent = `${s.occupancy}%`;
}

function renderFinance() {
  const s = state.summary;
  if (!s) return;

  dom.onlineAmount.textContent = `₹${s.online.toLocaleString("en-IN")}`;
  dom.offlineAmount.textContent = `₹${s.offline.toLocaleString("en-IN")}`;
  dom.remainingAmount.textContent = `₹${s.remainingToCollect.toLocaleString(
    "en-IN"
  )}`;
}

function renderBookings() {
  dom.ledgerContainer.innerHTML = "";

  state.bookings.forEach(b => {
    const row = document.createElement("div");
    row.className =
      "flex justify-between items-center py-3 border-b last:border-none";

    row.innerHTML = `
      <div class="flex items-center gap-4">
        <div class="h-10 w-10 rounded-full bg-yellow-100 flex items-center justify-center font-bold">
          ${b.customerName.slice(0, 2).toUpperCase()}
        </div>
        <div>
          <p class="font-medium">${b.customerName}</p>
          <p class="text-xs text-gray-400">${b.bookingId} · ${b.paymentMode}</p>
        </div>
      </div>

      <div class="text-right">
        <span class="text-xs px-3 py-1 rounded-full ${
          b.status === "PAID"
            ? "bg-green-100 text-green-600"
            : "bg-red-100 text-red-600"
        }">
          ${b.status}
        </span>
        <p class="font-semibold mt-1">₹${b.amount}</p>
      </div>
    `;

    dom.ledgerContainer.appendChild(row);
  });
}

async function loadSlots() {
  try {
    const res = await fetch(`/api/slots?date=${state.selectedSlotDate}`);
    const data = await res.json();

    if (!res.ok) throw new Error(data.error);

    state.slots = data.slots;

    renderSlots({
      container: dom.slotGrid,
      slots: state.slots,
      onBlock: handleBlock,
      onUnblock: handleUnblock,
    });
  } catch (err) {
    console.error("Slot load error:", err);
  }
}

async function handleBlock(slot) {
  if (!confirm("Block this slot?")) return;

  await fetch("/api/admin/slots/block", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start: slot.start,
      end: slot.end,
    }),
  });

  loadSlots();
}

async function handleUnblock(slot) {
  if (!confirm("Unblock this slot?")) return;

  await fetch("/api/admin/slots/unblock", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      start: slot.start,
      end: slot.end,
    }),
  });

  loadSlots();
}

async function loadGallery() {
  try {
    const res = await fetch("/api/admin/gallery");
    const data = await res.json();
    console.log("Gallery fetch response:", data);
    if (!res.ok) throw new Error(data.error);
    console.log("Gallery data:", data, Array.isArray(data));

    console.log("Gallery items:", data.items);

    state.gallery = data.items;
    renderGallery({
      container: dom.galleryGrid,
      items: state.gallery,
      onDelete: deleteGalleryItem,
    });
  } catch (err) {
    console.error("Gallery load error:", err);
  }
}

async function deleteGalleryItem(item) {
  if (!confirm("Delete this media?")) return;

  try {
    const res = await fetch(`/api/admin/gallery/${item._id}`, {
      method: "DELETE",
    });

    console.log("Delete response:", res);
    loadGallery();
  } catch (err) {
    console.error("Delete media error:", err);
  }
}

/* ===============================
   GALLERY UPLOAD + DRAG DROP
================================ */

async function uploadFiles(files) {
  if (!files.length) return;

  dom.uploadMediaBtn.disabled = true;
  dom.uploadMediaBtn.textContent = "Uploading...";

  for (const file of files) {
    const formData = new FormData();
    formData.append("file", file);

    try {
      const res = await fetch("/api/admin/gallery", {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        console.error("Upload failed:", err.error);
      }
    } catch (err) {
      console.error("Upload error:", err);
    }
  }

  dom.uploadMediaBtn.disabled = false;
  dom.uploadMediaBtn.textContent = "+ Upload Media";

  loadGallery();
}

// Delay the load for 300ms after typing stops
function debounce(fn, delay = 300) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), delay);
  };
}

const handleSearch = debounce(async value => {
  console.log("Handling search for:", value);
  if (!value) {
    console.log("Empty search, loading all bookings");
    loadDashboardBookings(); // fallback to normal list
    return;
  }

  try {
    const res = await fetch(
      `/api/admin/bookings/search?q=${encodeURIComponent(value)}`
    );
    if (!res.ok) throw new Error("Search request failed");
    const data = await res.json();
    if (!data) throw new Error("No data in search response");

    console.log("Search results:", data);
    state.bookings = data;

    renderBookings(); // reuse existing renderer
  } catch (err) {
    console.error("Search error:", err);
  }
}, 300);
