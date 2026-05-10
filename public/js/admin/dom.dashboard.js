// admin/js/dom.dashboard.js
export const dom = {};

document.addEventListener("DOMContentLoaded", () => {
  dom.revenue = document.getElementById("stat-revenue");
  dom.revenueChange = document.getElementById("stat-revenue-change");
  dom.totalBookings = document.getElementById("stat-bookings");
  dom.occupancy = document.getElementById("stat-occupancy");

  dom.onlineAmount = document.getElementById("finance-online");
  dom.offlineAmount = document.getElementById("finance-offline");
  dom.remainingAmount = document.getElementById("finance-remaining");

  dom.ledgerContainer = document.getElementById("booking-ledger");
  dom.ledgerSearch =  document.getElementById("ledger-search");

  dom.refreshBtn = document.getElementById("refresh-dashboard");

  dom.slotDateInput = document.getElementById("slot-date");
  dom.slotGrid = document.getElementById("slot-grid");

  dom.galleryGrid = document.getElementById("gallery-grid");
  dom.uploadMediaBtn = document.getElementById("upload-media-btn");
});


