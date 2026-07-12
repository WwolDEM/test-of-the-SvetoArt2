const menuButton = document.querySelector(".menu-button");
const menu = document.querySelector(".main-nav");
const menuBackdrop = document.querySelector(".menu-backdrop");

const setMenu = (open) => {
  document.body.classList.toggle("menu-open", open);
  menuButton.setAttribute("aria-expanded", String(open));
  menuButton.textContent = open ? "Закрыть" : "Меню";
};

menuButton?.addEventListener("click", () => setMenu(!document.body.classList.contains("menu-open")));
menuBackdrop?.addEventListener("click", () => setMenu(false));
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && document.body.classList.contains("menu-open")) setMenu(false);
});

menu?.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    setMenu(false);
  }
});

document.querySelectorAll(".faq-question").forEach((button) => {
  button.addEventListener("click", () => {
    const item = button.closest(".faq-item");
    const answer = item.querySelector(".faq-answer");
    const open = item.classList.toggle("open");
    button.setAttribute("aria-expanded", String(open));
    answer.style.maxHeight = open ? `${answer.scrollHeight}px` : "0px";
  });
});

const revealGroups = [
  ".page-hero .hero-inner > *",
  ".legal-header .container > *",
  ".section-head > *",
  ".grid-2 > *",
  ".grid-3 > *",
  ".grid-4 > *",
  ".gallery > *",
  ".steps > *",
  ".faq-list > *",
  ".contact-grid > *",
  ".cta-inner > *",
  ".legal-content > *",
  ".footer-grid > *",
];

revealGroups.forEach((selector) => {
  document.querySelectorAll(selector).forEach((node, index) => {
    if (node.closest(".site-header, .mobile-actions")) return;
    node.classList.add("reveal");
    node.style.setProperty("--reveal-delay", `${Math.min(index % 6, 5) * 75}ms`);
    if (node.matches(".service-card, .content-card, .info-card, .form-card, figure")) {
      node.classList.add("reveal-scale");
    }
  });
});

const observer = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, rootMargin: "0px 0px -36px 0px" })
  : null;

document.querySelectorAll(".reveal").forEach((node) => {
  if (observer) observer.observe(node);
  else node.classList.add("visible");
});

document.querySelectorAll(".footer-toggle").forEach((button) => {
  button.addEventListener("click", () => {
    const group = button.closest(".footer-nav");
    const open = group.classList.toggle("is-open");
    button.setAttribute("aria-expanded", String(open));
  });
});

document.querySelectorAll(".nav-item.has-panel").forEach((item) => {
  const link = item.querySelector("a");
  const toggle = item.querySelector(".sub-toggle");
  const setExpanded = (open) => {
    item.classList.toggle("open", open);
    link?.setAttribute("aria-expanded", String(open));
    toggle?.setAttribute("aria-expanded", String(open));
  };
  toggle?.addEventListener("click", (event) => {
    event.preventDefault();
    event.stopPropagation();
    setExpanded(!item.classList.contains("open"));
  });
  item.addEventListener("mouseenter", () => setExpanded(true));
  item.addEventListener("mouseleave", () => setExpanded(false));
  item.addEventListener("focusin", () => setExpanded(true));
  item.addEventListener("focusout", (event) => {
    if (!item.contains(event.relatedTarget)) setExpanded(false);
  });
});
