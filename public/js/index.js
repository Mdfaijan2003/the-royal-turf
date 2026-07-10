import { dom } from "./dom.js";
import { loadSlots } from "./loadSlots.js";

const mobileMenuButton = document.getElementById("mobile-menu-button");
const mobileMenu = document.getElementById("mobile-menu");

mobileMenuButton?.addEventListener("click", () => {
  mobileMenu?.classList.toggle("hidden");
});
const header = document.getElementById("site-header");
const inner = document.getElementById("header-inner");
const title = document.getElementById("header-title");

const reviews = [
  {
    name: "Rahul Sharma",
    review:
      "Amazing turf with excellent floodlights and a smooth booking process. Highly recommended.",
  },

  {
    name: "Arman Khan",
    review:
      "Best turf experience in the area. Clean, spacious and professionally managed.",
  },

  {
    name: "Soham Das",
    review:
      "Affordable pricing with outstanding maintenance. Will definitely book again.",
  },

  {
    name: "Ritik Roy",
    review:
      "The online booking system is super easy and the turf quality is top-notch.",
  },

  {
    name: "Ayan Mondal",
    review:
      "Perfect place for weekend matches. Loved the atmosphere and management.",
  },
];

window?.addEventListener("scroll", () => {
  if (window.scrollY > 80) {
    // Shrink state
    header.classList.remove("top-4");
    header.classList.add("top-2");

    inner.classList.remove("px-6", "py-3");
    inner.classList.add("px-5", "py-2");

    title.classList.remove("text-lg");
    title.classList.add("text-base");
  } else {
    // Default state
    header.classList.add("top-4");
    header.classList.remove("top-2");

    inner.classList.add("px-6", "py-3");
    inner.classList.remove("px-5", "py-2");

    title.classList.add("text-lg");
    title.classList.remove("text-base");
  }
});

document?.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("current-year");
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  dom.checkSlotsBtn?.addEventListener("click", e => {
    loadSlots();
  });
  dom.fetchBookingBtn?.addEventListener("click", async () => {
    const email = document.getElementById("booking-email").value.trim();
    const results = document.getElementById("booking-results");
    const skeleton = document.getElementById("booking-skeleton");

    if (!email) {
      alert("Please enter an email");
      return;
    }

    results.innerHTML = "";
    results.classList.add("hidden");
    skeleton.classList.remove("hidden");

    try {
      const res = await fetch(`/api/bookings?email=${email}`);
      const bookings = await res.json();

      skeleton.classList.add("hidden");
      results.classList.remove("hidden");

      if (!res.ok || bookings.length === 0) {
        results.innerHTML =
          "<p class='text-center text-slate-400'>No bookings found</p>";
        return;
      }

      bookings.forEach(b => {
        const shortBookingId = b._id.slice(-6).toUpperCase();
        const div = document.createElement("div");
        div.style.cssText = `
  background:#1e293b;
  border-left:4px solid #4f46e5;
  border-radius:18px;
  padding:22px;
  box-shadow:0 10px 30px rgba(0,0,0,.18);
  color:#e2e8f0;
  margin-bottom:20px;
`;

        div.innerHTML = `

  <!-- TOP -->
  <div style="
    display:flex;
    justify-content:space-between;
    align-items:flex-start;
    gap:16px;
    margin-bottom:18px;
    flex-wrap:wrap;
  ">

      <div style="flex:1;min-width:220px;">

          <h3 style="
            font-size:1.3rem;
            font-weight:700;
            color:#f8fafc;
            margin-bottom:8px;
          ">
              Royal Turf Booking
          </h3>

          <div style="
            display:flex;
            align-items:center;
            gap:8px;
            color:#cbd5e1;
            font-size:.95rem;
            flex-wrap:wrap;
          ">

              <span>
                ${new Date(b.start).toLocaleDateString()}
              </span>

              <span style="opacity:.5;">•</span>

              <span style="font-weight:600;">
                ${new Date(b.start).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}

                –

                ${new Date(b.end).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </span>

          </div>

      </div>

      <div style="
        padding:8px 14px;
        border-radius:999px;
        font-size:.8rem;
        font-weight:700;
        white-space:nowrap;

        ${
          b.status === "PAID"
            ? `
              background:rgba(16,185,129,.15);
              color:#34d399;
              border:1px solid rgba(16,185,129,.3);
            `
            : `
              background:rgba(250,204,21,.15);
              color:#fde047;
              border:1px solid rgba(250,204,21,.3);
            `
        }
      ">
          ${b.status === "PAID" ? "Adv Paid" : b.status}
      </div>

  </div>

  <!-- BOOKING ID -->
  <div style="
    border-top:1px solid rgba(148,163,184,.15);
    border-bottom:1px solid rgba(148,163,184,.15);
    padding:14px 0;
    margin-bottom:18px;
    font-size:.95rem;
    display:flex;
    gap:8px;
    flex-wrap:wrap;
  ">

      <span style="color:#94a3b8;">
          Booking ID:
      </span>

      <span style="
        color:#60a5fa;
        font-weight:700;
        letter-spacing:.5px;
      ">
          ${shortBookingId}
      </span>

  </div>

  <!-- PRICE GRID -->
  <div style="
    display:grid;
    grid-template-columns:repeat(auto-fit,minmax(180px,1fr));
    gap:14px;
    margin-bottom:18px;
  ">

      <!-- TOTAL -->
      <div style="
        background:rgba(51,65,85,.55);
        border:1px solid rgba(148,163,184,.15);
        border-radius:14px;
        padding:18px;
        text-align:center;
      ">

          <div style="
            color:#94a3b8;
            font-size:.72rem;
            text-transform:uppercase;
            letter-spacing:1px;
            margin-bottom:8px;
          ">
              Total Amount
          </div>

          <div style="
            font-size:1.7rem;
            font-weight:800;
            color:#f8fafc;
          ">
              ₹${b.totalAmount}
          </div>

      </div>

      <!-- ADVANCE -->
      <div style="
        background:rgba(16,185,129,.1);
        border:1px solid rgba(16,185,129,.25);
        border-radius:14px;
        padding:18px;
        text-align:center;
      ">

          <div style="
            color:#6ee7b7;
            font-size:.72rem;
            text-transform:uppercase;
            letter-spacing:1px;
            margin-bottom:8px;
          ">
              Advance Paid
          </div>

          <div style="
            font-size:1.7rem;
            font-weight:800;
            color:#10b981;
          ">
              ₹${b.advanceAmount}
          </div>

      </div>

      <!-- REMAINING -->
      <div style="
        background:rgba(51,65,85,.55);
        border:1px solid rgba(148,163,184,.15);
        border-radius:14px;
        padding:18px;
        text-align:center;
      ">

          <div style="
            color:#94a3b8;
            font-size:.72rem;
            text-transform:uppercase;
            letter-spacing:1px;
            margin-bottom:8px;
          ">
              Remaining
          </div>

          <div style="
            font-size:1.7rem;
            font-weight:800;
            color:#f87171;
          ">
              ₹${b.remainingAmount}
          </div>

      </div>

  </div>

  <!-- FOOTER -->
  <div style="
    display:flex;
    justify-content:space-between;
    align-items:center;
    border-top:1px solid rgba(148,163,184,.15);
    padding-top:14px;
    font-size:.95rem;
    flex-wrap:wrap;
    gap:10px;
  ">

      <span style="color:#94a3b8;">
          Payment Method
      </span>

      <span style="
        font-weight:700;
        color:#f8fafc;
      ">
          ${b.paymentMethod}
      </span>

  </div>
`;
        results.appendChild(div);
      });
    } catch (err) {
      console.log("Fetch bookings error:", err);
      skeleton.classList.add("hidden");
      results.classList.remove("hidden");
      results.innerHTML =
        "<p class='text-center text-red-500'>Failed to load bookings</p>";
    }
  });

  let currentReview = 0;

  const reviewText = document.getElementById("review-text");
  const reviewName = document.getElementById("review-name");
  const reviewAvatar = document.getElementById("review-avatar");
  const dots = document.getElementById("review-dots");

  function renderReview(index) {
    const r = reviews[index];

    reviewText.textContent = r.review;

    reviewName.textContent = r.name;

    reviewAvatar.textContent = r.name
      .split(" ")
      .map(n => n[0])
      .join("")
      .substring(0, 2);

    dots.innerHTML = "";

    reviews.forEach((_, i) => {
      const dot = document.createElement("div");

      dot.className = "review-dot";

      if (i === index) {
        dot.classList.add("active");
      }

      dot.onclick = () => {
        currentReview = i;

        renderReview(i);
      };

      dots.appendChild(dot);
    });
  }

  document.querySelector(".next").onclick = () => {
    currentReview = (currentReview + 1) % reviews.length;

    renderReview(currentReview);
  };

  document.querySelector(".prev").onclick = () => {
    currentReview = (currentReview - 1 + reviews.length) % reviews.length;

    renderReview(currentReview);
  };

  setInterval(() => {
    currentReview = (currentReview + 1) % reviews.length;

    renderReview(currentReview);
  }, 5000);

  renderReview(0);
});
