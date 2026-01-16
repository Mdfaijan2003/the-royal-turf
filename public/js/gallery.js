const mobileMenuButton = document.getElementById("mobile-menu-button");
const mobileMenu = document.getElementById("mobile-menu");
mobileMenuButton.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});

const modal = document.getElementById("modal");
const modalImage = document.getElementById("modal-image");
const modalVideo = document.getElementById("modal-video");
const modalCaption = document.getElementById("modal-caption");

function openModal(src, captionText, type) {
  modalCaption.textContent = captionText;

  if (type === "image") {
    modalImage.src = src;
    modalImage.style.display = "block";
    modalVideo.src = ""; // Clear video source
    modalVideo.style.display = "none";
  } else if (type === "video") {
    modalVideo.src = src;
    modalVideo.style.display = "block";
    modalImage.src = ""; // Clear image source
    modalImage.style.display = "none";
  }

  modal.classList.remove("hidden");
  modal.classList.add("flex");
  document.body.style.overflow = "hidden"; // Prevents scrolling when modal is open
}

function closeModal() {
  modal.classList.add("hidden");
  modal.classList.remove("flex");
  document.body.style.overflow = ""; // Restores scrolling
  modalVideo.src = ""; // Stop video playback
}

// Close modal when clicking outside the image
modal.addEventListener("click", function (e) {
  if (e.target === modal) {
    closeModal();
  }
});
