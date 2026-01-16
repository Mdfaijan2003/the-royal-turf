let modal,
  modalTitle,
  modalMessage,
  modalIcon,
  modalCloseButton;

// Ensure DOM is ready
document.addEventListener("DOMContentLoaded", () => {
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
    if (e.target === modal) closeModal();
  });
});

function closeModal() {
  modal?.classList.add("hidden");
}

export function showModal(title, message, type = "info") {
  if (!modal) return;

  modalTitle.textContent = title;
  modalMessage.textContent = message;

  modalIcon.className =
    "mx-auto flex items-center justify-center h-12 w-12 rounded-full";
  modalIcon.innerHTML = "";

  switch (type) {
    case "success":
      modalIcon.classList.add("bg-green-100");
      modalIcon.innerHTML = `
        <svg class="h-6 w-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
        </svg>`;
      break;

    case "error":
      modalIcon.classList.add("bg-red-100");
      modalIcon.innerHTML = `
        <svg class="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
        </svg>`;
      break;

    case "warning":
      modalIcon.classList.add("bg-yellow-100");
      modalIcon.innerHTML = `
        <svg class="h-6 w-6 text-yellow-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 9v4m0 4h.01M5.455 19h13.09L12 5 5.455 19z" />
        </svg>`;
      break;

    default:
      modalIcon.classList.add("bg-blue-100");
      modalIcon.innerHTML = `
        <svg class="h-6 w-6 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>`;
  }

  modal.classList.remove("hidden");
}
