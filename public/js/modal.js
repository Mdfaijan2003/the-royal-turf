let modal;
let modalTitle;
let modalMessage;
let modalIcon;
let modalCloseButton;

document.addEventListener("DOMContentLoaded", () => {
  initializeModal();
});

function initializeModal() {
  modal = document.getElementById("message-modal");
  modalTitle = document.getElementById("modal-title");
  modalMessage = document.getElementById("modal-message");
  modalIcon = document.getElementById("modal-icon");
  modalCloseButton = document.getElementById("modal-close-button");

  if (!modal || !modalCloseButton) {
    console.warn("⚠️ Modal DOM elements missing");
    return;
  }

  modalCloseButton.addEventListener("click", closeModal);

  modal.addEventListener("click", e => {
    if (e.target === modal) {
      closeModal();
    }
  });
}

export function closeModal() {
  const modal = document.getElementById("message-modal");

  if (modal) {
    modal.classList.add("hidden");
  }
}

export function showModal(title, message, type = "info") {
  modal = document.getElementById("message-modal");
  modalTitle = document.getElementById("modal-title");
  modalMessage = document.getElementById("modal-message");
  modalIcon = document.getElementById("modal-icon");

  if (!modal || !modalTitle || !modalMessage || !modalIcon) {
    console.warn("⚠️ Modal DOM elements missing");
    return;
  }

  modalTitle.textContent = title;
  modalMessage.textContent = message;

  // Reset previous state
  modalIcon.className = "";
  modalIcon.innerHTML = "";

  switch (type) {
    case "success":
      modalIcon.classList.add("success");
      modalIcon.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M5 13l4 4L19 7" />
        </svg>
      `;
      break;

    case "error":
      modalIcon.classList.add("error");
      modalIcon.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M6 18L18 6M6 6l12 12" />
        </svg>
      `;
      break;

    case "warning":
      modalIcon.classList.add("warning");
      modalIcon.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <path d="M12 9v4" />
          <path d="M12 17h.01" />
          <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
        </svg>
      `;
      break;

    default:
      modalIcon.classList.add("info");
      modalIcon.innerHTML = `
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
          <circle cx="12" cy="12" r="10" />
          <path d="M12 16v-4" />
          <path d="M12 8h.01" />
        </svg>
      `;
  }

  modal.classList.remove("hidden");
}
