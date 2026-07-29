import { showModal } from "../newModal.js";
function togglePassword() {
  const passwordInput = document.getElementById("password");
  const toggleIcon = document.getElementById("toggleIcon");

  if (passwordInput.type === "password") {
    passwordInput.type = "text";
    toggleIcon.classList.remove("fa-eye");
    toggleIcon.classList.add("fa-eye-slash");
  } else {
    passwordInput.type = "password";
    toggleIcon.classList.remove("fa-eye-slash");
    toggleIcon.classList.add("fa-eye");
  }
}
document.getElementById("eye-button").addEventListener("click", togglePassword);
document
  .getElementById("loginForm")
  .addEventListener("submit", async function (e) {
    e.preventDefault();

    const submitBtn = e.target.querySelector('button[type="submit"]');
    const originalText = submitBtn.innerHTML;
    submitBtn.innerHTML =
      '<i class="fas fa-spinner fa-spin mr-2"></i><span class="relative z-10">Signing in...</span>';
    submitBtn.disabled = true;

    const email = document.getElementById("email").value;
    const password = document.getElementById("password").value;

    if (!email || !password) {
      showModal("Error", "Please enter both email and password.", "error");
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      return;
    }

    try {
      const res = await fetch("/api/admin/login", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include", // 🔥 REQUIRED
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (data.success) {
        showModal("Success", "Login successful! Redirecting...", "success");

        // Redirect to dashboard after 2 seconds

        window.location.href = "/admin/dashboard.html";
      } else {
        showModal("Error", data.message || "Login failed.", "error");
      }
    } catch (error) {
      submitBtn.innerHTML = originalText;
      submitBtn.disabled = false;
      showModal("Error", "An error occurred. Please try again.", "error");
    }
  });

const inputs = document.querySelectorAll(".input-field");
inputs.forEach(input => {
  input.addEventListener("focus", function () {
    this.parentElement.parentElement
      .querySelector("label")
      .classList.add("text-emerald-600");
  });

  input.addEventListener("blur", function () {
    if (!this.value) {
      this.parentElement.parentElement
        .querySelector("label")
        .classList.remove("text-emerald-600");
    }
  });
});
