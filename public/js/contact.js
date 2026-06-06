import { showModal } from "./modal.js";

const mobileMenuButton = document.getElementById("mobile-menu-button");
const mobileMenu = document.getElementById("mobile-menu");
mobileMenuButton.addEventListener("click", () => {
  mobileMenu.classList.toggle("hidden");
});

document.addEventListener("DOMContentLoaded", function () {
  // Get references to the form and confirmation message
  console.log("CONTACT JS LOADED");
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
    console.log("FORM SUBMIT TRIGGERED");
    if (
      !validateContactForm(
        fullNameInput.value,
        emailInput.value,
        messageInput.value
      )
    ) {
      return;
    }
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
        localStorage.removeItem("contactFormData");

        contactForm.classList.add("hidden");
        confirmationMessage.classList.remove("hidden");

        showModal(
          "Message Sent",
          "Thank you for contacting us. We will get back to you soon.",
          "success"
        );
      } else {
        showModal(
          "Error",
          "Failed to send message. Please try again later.",
          "error"
        );
        submitButton.disabled = false; // Re-enable on error
        submitButton.textContent = "Send Message";
        submitButton.classList.remove("opacity-50", "cursor-not-allowed");
      }
    } catch (err) {
      showModal(
        "Error",
        "Unable to send message right now. Please try again.",
        "error"
      );
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

function validateContactForm(name, email, message) {
  name = name.trim();
  email = email.trim();
  message = message.trim();

  console.log("Validating Contact Form", {
    name,
    email,
    messageLength: message.length,
  });

  // Name validation
  if (!name || name.length < 3) {
    console.log("Validation failed: Name too short");

    showModal(
      "Invalid Name",
      "Name must contain at least 3 characters",
      "error"
    );
    return false;
  }

  // Allows:
  // Md Faisal
  // Md. Faisal
  // O'Connor
  // Anne-Marie
  const nameRegex = /^[A-Za-z\s.'-]+$/;

  if (!nameRegex.test(name)) {
    console.log("Validation failed: Invalid name characters");

    showModal(
      "Invalid Name",
      "Name can only contain letters, spaces, dots, apostrophes and hyphens",
      "error"
    );
    return false;
  }

  // Email validation
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailRegex.test(email)) {
    console.log("Validation failed: Invalid email");

    showModal("Invalid Email", "Please enter a valid email address", "error");
    return false;
  }

  // Message validation
  if (message.length < 10) {
    console.log("Validation failed: Message too short");

    showModal(
      "Invalid Message",
      "Message must contain at least 10 characters",
      "error"
    );
    return false;
  }

  if (message.length > 1000) {
    console.log("Validation failed: Message too long");

    showModal(
      "Message Too Long",
      "Message cannot exceed 1000 characters",
      "error"
    );
    return false;
  }

  console.log("Validation passed");

  return true;
}
