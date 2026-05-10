document.getElementById("contact-developer").onclick = () => {
  const msg = encodeURIComponent("Hello, I need help regarding Royal Turf.");
  window.open(
    `https://wa.me/${process.env.DEVELOPER_WHATSAPP}?text=${msg}`,
    "_blank"
  );
};

document.getElementById("report-issue").onclick = () => {
  document.getElementById("issue-modal").classList.remove("hidden");
};

document.getElementById("cancel-issue").onclick = () => {
  document.getElementById("issue-modal").classList.add("hidden");
};

document.getElementById("submit-issue").onclick = () => {
  const issue = document.getElementById("issue-text").value.trim();

  if (!issue) {
    alert("Please enter your issue");
    return;
  }

  const msg = encodeURIComponent(
    `Issue Reported from Admin Panel:\n\n${issue}`
  );

  window.open(
    `https://wa.me/${DEVELOPER_WHATSAPP}?text=${msg}`,
    "_blank"
  );

  document.getElementById("issue-text").value = "";
  document.getElementById("issue-modal").classList.add("hidden");
};
