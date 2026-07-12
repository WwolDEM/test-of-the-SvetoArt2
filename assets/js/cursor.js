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

  let targetX = -80;
  let targetY = -80;
  let ringX = targetX;
  let ringY = targetY;
  let rafId = null;

  const renderRing = () => {
    ringX += (targetX - ringX) * 0.16;
    ringY += (targetY - ringY) * 0.16;
    if (Math.abs(targetX - ringX) < 0.1 && Math.abs(targetY - ringY) < 0.1) {
      ringX = targetX;
      ringY = targetY;
      rafId = null;
    } else {
      rafId = requestAnimationFrame(renderRing);
    }
    ring.style.setProperty("--cursor-x", `${ringX}px`);
    ring.style.setProperty("--cursor-y", `${ringY}px`);
  };

  document.addEventListener("pointermove", (event) => {
    if (event.pointerType && event.pointerType !== "mouse") return;
    targetX = event.clientX;
    targetY = event.clientY;
    if (!document.body.classList.contains("cursor-visible")) {
      ringX = targetX;
      ringY = targetY;
    }
    dot.style.setProperty("--cursor-x", `${targetX}px`);
    dot.style.setProperty("--cursor-y", `${targetY}px`);
    if (rafId === null) rafId = requestAnimationFrame(renderRing);
    document.body.classList.add("cursor-visible");
    const target = event.target instanceof Element ? event.target : null;
    document.body.classList.toggle("cursor-link", Boolean(target?.closest("a, button, [role='button']")));
    document.body.classList.toggle("cursor-on-dark", Boolean(target?.closest(".hero, .page-hero, .dark, .section-dark, .contact, .footer, .site-footer")));
  }, { passive: true });

  document.documentElement.addEventListener("mouseleave", () => document.body.classList.remove("cursor-visible"));
  window.addEventListener("blur", () => document.body.classList.remove("cursor-visible"));
}
