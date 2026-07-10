document.addEventListener("DOMContentLoaded", () => {
  const year = document.getElementById("current-year");
  if (year) {
    year.textContent = new Date().getFullYear();
  }

  document.querySelectorAll(".accordion-btn").forEach(btn => {
    btn.addEventListener("click", () => {
      const isOpen = btn.classList.contains("open");
      const acc = btn.closest(".accordion");
      acc.querySelectorAll(".accordion-btn").forEach(b => {
        b.classList.remove("open");
        b.setAttribute("aria-expanded", "false");
        b.nextElementSibling.classList.remove("open");
      });
      if (!isOpen) {
        btn.classList.add("open");
        btn.setAttribute("aria-expanded", "true");
        btn.nextElementSibling.classList.add("open");
      }
    });
  });

  const obs = new IntersectionObserver(
    entries => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const el = entry.target;
          const delay = el.classList.contains("rule-card")
            ? Array.from(document.querySelectorAll(".rule-card")).indexOf(el) *
              50
            : 0;
          setTimeout(() => el.classList.add("visible"), delay);
          obs.unobserve(el);
        }
      });
    },
    { threshold: 0.08 }
  );
  document.querySelectorAll(".reveal").forEach(el => obs.observe(el));

  document
    .getElementById("mobile-menu-button")
    .addEventListener("click", function () {
      document.getElementById("mobile-menu").classList.toggle("hidden");
    });
});
