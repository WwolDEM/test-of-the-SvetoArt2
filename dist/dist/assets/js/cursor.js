window.__svetoartSharedCursor = true;

if (matchMedia("(hover: hover) and (pointer: fine)").matches && !matchMedia("(prefers-reduced-motion: reduce)").matches) {
  const ring = document.createElement("div");
  const dot = document.createElement("div");
  ring.className = "sv-cursor";
  dot.className = "sv-cursor-dot";
  ring.setAttribute("aria-hidden", "true");
  dot.setAttribute("aria-hidden", "true");
  document.body.append(ring, dot);
  document.body.classList.add("cursor-ready");

  document.addEventListener("pointermove", (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    ring.style.setProperty("--cursor-x", `${event.clientX}px`);
    ring.style.setProperty("--cursor-y", `${event.clientY}px`);
    dot.style.setProperty("--cursor-x", `${event.clientX}px`);
    dot.style.setProperty("--cursor-y", `${event.clientY}px`);
    document.body.classList.add("cursor-visible");
    const target = event.target instanceof Element ? event.target : null;
    document.body.classList.toggle("cursor-link", Boolean(target?.closest("a, button, [role='button']")));
    document.body.classList.toggle("cursor-on-dark", Boolean(target?.closest(".hero, .page-hero, .dark, .section-dark, .contact, .footer, .site-footer")));
  }, { passive: true });

  document.documentElement.addEventListener("mouseleave", () => document.body.classList.remove("cursor-visible"));
  window.addEventListener("blur", () => document.body.classList.remove("cursor-visible"));
}
