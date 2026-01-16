const mobileMenuButton = document.getElementById("mobile-menu-button");
const mobileMenu = document.getElementById("mobile-menu");
mobileMenuButton.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});

document.addEventListener("DOMContentLoaded", function () {
  // Get references to the form and confirmation message
  const contactForm = document.getElementById("contact-form");
  const confirmationMessage = document.getElementById("confirmation-message");
  // Load saved data
  let objectField = JSON.parse(localStorage.getItem("contactFormData")) || {};

  // Get form inputs
  const fullNameInput = document.getElementById("name");
  const emailInput = document.getElementById("email");
  const messageInput = document.getElementById("message");

  // Populate inputs if data exists
  if (objectField.fullName) {
    fullNameInput.value = objectField.fullName;
  }
  if (objectField.email) {
    emailInput.value = objectField.email;
  }
  if (objectField.message) {
    messageInput.value = objectField.message;
  }

  // Save updated data whenever user types
  fullNameInput.addEventListener("input", saveData);
  emailInput.addEventListener("input", saveData);
  messageInput.addEventListener("input", saveData);

  function saveData() {
    objectField = {
      fullName: fullNameInput.value,
      email: emailInput.value,
      message: messageInput.value,
    };
    localStorage.setItem("contactFormData", JSON.stringify(objectField));
  }

  // Event listener for the form submission
  contactForm.addEventListener("submit", async function (event) {
    event.preventDefault(); // Prevents the default form submission and page reload
    const submitButton = contactForm.querySelector("button[type='submit']");
    submitButton.disabled = true;
    submitButton.textContent = "Sending…"; // Optional: show loading text
    submitButton.classList.add("opacity-50", "cursor-not-allowed");

    const payload = {
      name: fullNameInput.value,
      email: emailInput.value,
      message: messageInput.value,
    };
    try {
      const response = await fetch("/api/contact/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (response.ok) {
        contactForm.classList.add("hidden");
        confirmationMessage.classList.remove("hidden");
      } else {
        alert("Failed to send message. Try again later.");
        submitButton.disabled = false; // Re-enable on error
        submitButton.textContent = "Send Message";
        submitButton.classList.remove("opacity-50", "cursor-not-allowed");
      }
    } catch (err) {
      alert("Error sending message.");
      console.error(err);
      submitButton.disabled = false; // Re-enable on error
      submitButton.textContent = "Send Message";
      submitButton.classList.remove("opacity-50", "cursor-not-allowed");
    }

    // Log the form data to the console (as a placeholder for backend logic)
    console.log("--- NEW CONTACT FORM SUBMISSION ---");
    console.log("Name:", document.getElementById("name").value);
    console.log("Email:", document.getElementById("email").value);
    console.log("Message:", document.getElementById("message").value);
    console.log("-----------------------------------");
  });
});
