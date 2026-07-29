let modal;
let modalTitle;
let modalMessage;
let modalIcon;
let modalCloseButton;

const ICONS = {
  success: `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2">
      <path d="M5 13l4 4L19 7"/>
    </svg>
  `,

  error: `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2">
      <path d="M6 18L18 6M6 6l12 12"/>
    </svg>
  `,

  warning: `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2">
      <path d="M12 9v4"/>
      <path d="M12 17h.01"/>
      <path d="M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z"/>
    </svg>
  `,

  info: `
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
         stroke="currentColor" stroke-width="2">
      <circle cx="12" cy="12" r="10"/>
      <path d="M12 16v-4"/>
      <path d="M12 8h.01"/>
    </svg>
  `,
};

function initializeModal() {
  // Already created
  if (document.getElementById("message-modal")) {
    modal = document.getElementById("message-modal");
    modalTitle = document.getElementById("modal-title");
    modalMessage = document.getElementById("modal-message");
    modalIcon = document.getElementById("modal-icon");
    modalCloseButton = document.getElementById("modal-close-button");
    return;
  }

  document.body.insertAdjacentHTML(
    "beforeend",
    `
    <div
      id="message-modal"
      class="fixed inset-0 z-[9999] hidden items-center justify-center bg-black/60 backdrop-blur-sm p-4"
    >
      <div
        class="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl animate-[fadeIn_.2s_ease]"
      >

        <div class="flex justify-center mb-4">
          <div
            id="modal-icon"
            class="flex h-16 w-16 items-center justify-center rounded-full"
          ></div>
        </div>

        <h2
          id="modal-title"
          class="text-center text-2xl font-black text-slate-800"
        ></h2>

        <p
          id="modal-message"
          class="mt-3 text-center text-slate-600"
        ></p>

        <button
          id="modal-close-button"
          class="mt-8 h-12 w-full rounded-xl bg-emerald-600 font-bold text-white transition hover:bg-emerald-700"
        >
          OK
        </button>

      </div>
    </div>
  `
  );

  modal = document.getElementById("message-modal");
  modalTitle = document.getElementById("modal-title");
  modalMessage = document.getElementById("modal-message");
  modalIcon = document.getElementById("modal-icon");
  modalCloseButton = document.getElementById("modal-close-button");

  modalCloseButton.addEventListener("click", closeModal);

  modal.addEventListener("click", e => {
    if (e.target === modal) {
      closeModal();
    }
  });

  document.addEventListener("keydown", e => {
    if (e.key === "Escape") {
      closeModal();
    }
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", initializeModal);
} else {
  initializeModal();
}

export function closeModal() {
  if (!modal) return;

  modal.classList.remove("flex");
  modal.classList.add("hidden");
}

export function showModal(title, message, type = "info", autoClose = false) {
  if (!modal) {
    initializeModal();
  }

  modalTitle.textContent = title;
  modalMessage.textContent = message;

  modalIcon.className =
    "flex h-16 w-16 items-center justify-center rounded-full";

  switch (type) {
    case "success":
      modalIcon.classList.add("bg-emerald-100", "text-emerald-600");
      break;

    case "error":
      modalIcon.classList.add("bg-red-100", "text-red-600");
      break;

    case "warning":
      modalIcon.classList.add("bg-yellow-100", "text-yellow-600");
      break;

    default:
      modalIcon.classList.add("bg-blue-100", "text-blue-600");
  }

  modalIcon.innerHTML = ICONS[type] || ICONS.info;

  modal.classList.remove("hidden");
  modal.classList.add("flex");

  if (autoClose) {
    clearTimeout(showModal.timer);

    showModal.timer = setTimeout(() => {
      closeModal();
    }, 2000);
  }
}
