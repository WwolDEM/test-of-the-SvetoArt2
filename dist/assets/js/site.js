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

const observer = "IntersectionObserver" in window
  ? new IntersectionObserver((entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("visible");
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.08 })
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
