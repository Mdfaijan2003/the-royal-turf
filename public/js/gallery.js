import { dom } from "./dom.js";

const mobileMenuButton = document.getElementById("mobile-menu-button");
const mobileMenu = document.getElementById("mobile-menu");
mobileMenuButton.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});

const modal = document.getElementById("modal");
const modalImage = document.getElementById("modal-image");
const modalVideo = document.getElementById("modal-video");
const modalCaption = document.getElementById("modal-caption");

// function openModal(src, captionText, type) {
//   modalCaption.textContent = captionText;

//   if (type === "image") {
//     modalImage.src = src;
//     modalImage.style.display = "block";
//     modalVideo.src = ""; // Clear video source
//     modalVideo.style.display = "none";
//   } else if (type === "video") {
//     modalVideo.src = src;
//     modalVideo.style.display = "block";
//     modalImage.src = ""; // Clear image source
//     modalImage.style.display = "none";
//   }

//   modal.classList.remove("hidden");
//   modal.classList.add("flex");
//   document.body.style.overflow = "hidden"; // Prevents scrolling when modal is open
// }

// function closeModal() {
//   modal.classList.add("hidden");
//   modal.classList.remove("flex");
//   document.body.style.overflow = ""; // Restores scrolling
//   modalVideo.src = ""; // Stop video playback
// }

// // Close modal when clicking outside the image
// modal.addEventListener("click", function (e) {
//   if (e.target === modal) {
//     closeModal();
//   }
// });

async function fetchGallery() {
  try {
    const res = await fetch("/api/gallery");

    const data = await res.json();
    console.log("Gallery data fetched:", data);

    if (!res.ok) {
      throw new Error(data.error || "Failed to fetch gallery data");
    }

    dom.galleryContainer.innerHTML = "";

    data.items.forEach((item, index) => {
      const url = item?.url;
      const caption = item?.caption || "";
      const type = item?.resourceType || "image";

      const galleryItem = document.createElement("div");

      galleryItem.className = "masonry-item fade-up";

      galleryItem.style.animationDelay = `${index * 0.08}s`;

      galleryItem.innerHTML = `
        
        ${
          type === "image"
            ? `
              <img
                src="${url}"
                alt="${caption}"
                loading="lazy"
                class="masonry-item img"
              />
            `
            : `
              <video
                src="${url}"
                muted
                class="masonry-item video"
              ></video>
            `
        }

        <div class="masonry-overlay">
          <h3 class="text-white font-['Bebas_Neue'] text-xl uppercase tracking-wide">
            ${caption}
          </h3>
        </div>
      `;

      galleryItem.addEventListener("click", () => {
        openModal(url, caption, type);
      });

      dom.galleryContainer.appendChild(galleryItem);
    });
  } catch (error) {
    console.error("Error fetching gallery data:", error);
  }
}

document.addEventListener("DOMContentLoaded", () => {
  fetchGallery();
  // window.openModal = openModal;
  // window.closeModal = closeModal;
});
