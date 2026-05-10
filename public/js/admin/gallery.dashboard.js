// admin/js/gallery.dashboard.js

export function renderGallery({ container, items, onDelete }) {
  container.innerHTML = "";
  if (!items || items.length === 0) {
    container.innerHTML = `<p class="col-span-full text-center text-gray-500">No media found.</p>`;
    return;
  }
  items.forEach(item => {
    const card = document.createElement("div");
    card.className =
      "aspect-square bg-slate-200 rounded-[2rem] overflow-hidden relative group";

    card.innerHTML = `
      <img
        src="${item.url}"
        class="w-full h-full object-cover grayscale group-hover:grayscale-0 transition duration-500"
        alt="Turf Media"
      />

      <div
        class="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
        <button
          class="bg-red-500 p-2 rounded-full text-white delete-media-btn">
          <svg class="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
            <path fill-rule="evenodd"
              d="M9 2a1 1 0 00-.894.553L7.382 4H4a1 1 0 000 2v10a2 2 0 002 2h8a2 2 0 002-2V6a1 1 0 100-2h-3.382l-.724-1.447A1 1 0 0011 2H9zM7 8a1 1 0 012 0v6a1 1 0 11-2 0V8zm5-1a1 1 0 00-1 1v6a1 1 0 102 0V8a1 1 0 00-1-1z"
              clip-rule="evenodd" />
          </svg>
        </button>
      </div>
    `;

    card.querySelector(".delete-media-btn").onclick = e => {
      e.stopPropagation();
      onDelete(item);
    };

    container.appendChild(card);
  });
}
