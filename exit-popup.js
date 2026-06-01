/**
 * Exit-intent popup — pokazuje sie, gdy uzytkownik
 * przesuwa kursor w strone paska przegladarki (zamkniecie karty).
 */
(function initExitPopup() {
  const STORAGE_KEY = "technova_exit_popup_shown";
  const MIN_TIME_ON_PAGE_MS = 8000;
  const TOP_ZONE_PX = 28;

  const overlay = document.querySelector("[data-exit-popup]");
  if (!overlay) return;

  const closeBtn = overlay.querySelector("[data-exit-popup-close]");
  const dismissBtn = overlay.querySelector("[data-exit-popup-dismiss]");
  const ctaBtn = overlay.querySelector("[data-exit-popup-cta]");

  let armed = false;
  let shown = false;
  let pageReadyAt = Date.now();

  function alreadyShownThisSession() {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === "1";
    } catch {
      return false;
    }
  }

  function markShown() {
    shown = true;
    try {
      sessionStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
  }

  function track(eventName, params) {
    if (typeof window.gtag === "function") {
      window.gtag("event", eventName, params || {});
    }
    if (typeof window.clarity === "function") {
      window.clarity("event", eventName);
    }
  }

  function openPopup(trigger) {
    if (shown || alreadyShownThisSession()) return;
    if (Date.now() - pageReadyAt < MIN_TIME_ON_PAGE_MS) return;

    markShown();
    overlay.classList.add("is-visible");
    overlay.setAttribute("aria-hidden", "false");
    document.body.style.overflow = "hidden";

    const dialog = overlay.querySelector(".exit-popup");
    if (dialog) dialog.focus();

    track("exit_popup_show", { trigger: trigger || "exit_intent" });
  }

  function closePopup(reason) {
    if (!overlay.classList.contains("is-visible")) return;

    overlay.classList.remove("is-visible");
    overlay.setAttribute("aria-hidden", "true");
    document.body.style.overflow = "";

    track("exit_popup_close", { reason: reason || "unknown" });
  }

  function canUseExitIntent() {
    return window.matchMedia("(hover: hover) and (pointer: fine)").matches;
  }

  function armAfterDelay() {
    window.setTimeout(() => {
      armed = true;
    }, MIN_TIME_ON_PAGE_MS);
  }

  /* Klasyczny exit intent: wyjscie myszy u gory okna */
  function onMouseOut(event) {
    if (!armed || shown) return;
    if (!canUseExitIntent()) return;

    const leftThroughTop = event.clientY <= 0;
    const leavingDocument =
      !event.relatedTarget && !event.toElement;

    if (leftThroughTop && leavingDocument) {
      openPopup("mouseout_top");
    }
  }

  /* Dodatkowo: szybki ruch w gore w strefie pod paskiem przegladarki */
  let lastY = null;
  function onMouseMove(event) {
    if (!armed || shown || !canUseExitIntent()) return;

    const y = event.clientY;
    if (lastY !== null && y < TOP_ZONE_PX && y < lastY - 12) {
      openPopup("mousemove_top_zone");
    }
    lastY = y;
  }

  closeBtn?.addEventListener("click", () => closePopup("close_button"));
  dismissBtn?.addEventListener("click", () => closePopup("dismiss"));
  ctaBtn?.addEventListener("click", () => {
    track("exit_popup_cta_click", { href: ctaBtn.getAttribute("href") || "" });
    closePopup("cta");
  });

  overlay.addEventListener("click", (event) => {
    if (event.target === overlay) closePopup("overlay");
  });

  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape" && overlay.classList.contains("is-visible")) {
      closePopup("escape");
    }
  });

  if (canUseExitIntent()) {
    document.addEventListener("mouseout", onMouseOut);
    document.addEventListener("mousemove", onMouseMove, { passive: true });
  }

  armAfterDelay();

  if (alreadyShownThisSession()) {
    shown = true;
  }
})();
