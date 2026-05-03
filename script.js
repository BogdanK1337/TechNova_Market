const DEFAULT_GA_ID = "G-XXXXXXXXXX";
const DEFAULT_CLARITY_ID = "xxxxxxxxxx";
const analyticsConfig = window.TECHNOVA_ANALYTICS || {};
const newsletterConfig = window.TECHNOVA_NEWSLETTER || {};
const GA_MEASUREMENT_ID = (analyticsConfig.gaMeasurementId || "").trim();
const CLARITY_PROJECT_ID = (analyticsConfig.clarityProjectId || "").trim();
const EMAILJS_SDK_URL = "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/dist/email.min.js";

let gaReady = false;
let clarityReady = false;

function initGa4() {
  if (!GA_MEASUREMENT_ID || GA_MEASUREMENT_ID === DEFAULT_GA_ID) return;
  const ga = document.createElement("script");
  ga.async = true;
  ga.src = "https://www.googletagmanager.com/gtag/js?id=" + GA_MEASUREMENT_ID;
  document.head.appendChild(ga);

  window.dataLayer = window.dataLayer || [];
  window.gtag = function gtag() {
    window.dataLayer.push(arguments);
  };
  window.gtag("js", new Date());
  window.gtag("config", GA_MEASUREMENT_ID);
  gaReady = true;
}

function initClarity() {
  if (!CLARITY_PROJECT_ID || CLARITY_PROJECT_ID === DEFAULT_CLARITY_ID) return;
  (function (c, l, a, r, i, t, y) {
    c[a] = c[a] || function () {
      (c[a].q = c[a].q || []).push(arguments);
    };
    t = l.createElement(r);
    t.async = 1;
    t.src = "https://www.clarity.ms/tag/" + i;
    y = l.getElementsByTagName(r)[0];
    y.parentNode.insertBefore(t, y);
  })(window, document, "clarity", "script", CLARITY_PROJECT_ID);
  clarityReady = true;
}

function trackEvent(eventName, params) {
  if (gaReady && typeof window.gtag === "function") {
    window.gtag("event", eventName, params || {});
  }
  if (clarityReady && typeof window.clarity === "function") {
    window.clarity("event", eventName);
  }
}

function isNewsletterConfigured() {
  return Boolean(
    newsletterConfig.enabled &&
    newsletterConfig.provider === "emailjs" &&
    newsletterConfig.publicKey &&
    newsletterConfig.serviceId &&
    newsletterConfig.templateId &&
    newsletterConfig.publicKey !== "YOUR_EMAILJS_PUBLIC_KEY" &&
    newsletterConfig.serviceId !== "YOUR_EMAILJS_SERVICE_ID" &&
    newsletterConfig.templateId !== "YOUR_EMAILJS_TEMPLATE_ID"
  );
}

function loadExternalScript(src) {
  return new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${src}"]`);
    if (existing) {
      existing.addEventListener("load", resolve, { once: true });
      existing.addEventListener("error", reject, { once: true });
      if (window.emailjs) resolve();
      return;
    }

    const script = document.createElement("script");
    script.src = src;
    script.async = true;
    script.onload = resolve;
    script.onerror = reject;
    document.head.appendChild(script);
  });
}

async function sendNewsletterEmail(email, signedAt) {
  if (!isNewsletterConfigured()) {
    throw new Error("newsletter_not_configured");
  }

  await loadExternalScript(EMAILJS_SDK_URL);
  if (!window.emailjs) {
    throw new Error("emailjs_not_loaded");
  }

  window.emailjs.init({ publicKey: newsletterConfig.publicKey });
  return window.emailjs.send(newsletterConfig.serviceId, newsletterConfig.templateId, {
    to_email: email,
    subscriber_email: email,
    signed_at: signedAt,
    from_name: newsletterConfig.fromName || "TechNova Market",
    reply_to: newsletterConfig.replyTo || "kontakt@technova-market.pl",
    subject: "Nowosci technologiczne od TechNova Market",
    message:
      "Dziekujemy za zapis do newslettera TechNova Market. W kolejnych wiadomosciach otrzymasz nowosci technologiczne, praktyczne poradniki zakupowe oraz rekomendacje dotyczace laptopow, smartfonow i audio."
  });
}

initGa4();
initClarity();
if (!gaReady || !clarityReady) {
  console.warn("Uzupelnij analytics-config.js, aby aktywowac GA4 i Clarity.");
}

const nav = document.querySelector("#main-nav");
const menuToggle = document.querySelector(".menu-toggle");
const navDropdown = document.querySelector(".nav-dropdown");
const navDropBtn = document.querySelector(".nav-drop-btn");

if (nav && menuToggle) {
  menuToggle.addEventListener("click", () => {
    const isOpen = nav.classList.toggle("is-open");
    menuToggle.setAttribute("aria-expanded", String(isOpen));
    trackEvent("menu_toggle", { open: isOpen });
  });
}

const page = document.body.dataset.page;
if (nav && page) {
  const currentFile = window.location.pathname.split("/").pop() || "index.html";
  const map = {
    home: "index.html",
    categories: currentFile,
    blog: "blog.html",
    contact: "contact.html"
  };
  const activeHref = map[page];
  if (activeHref) {
    nav.querySelectorAll("a").forEach((link) => {
      const href = link.getAttribute("href");
      const isActive = Array.isArray(activeHref) ? activeHref.includes(href) : href === activeHref;
      if (isActive) {
        link.classList.add("is-active");
      }
    });
    if (page === "categories" && navDropBtn) {
      navDropBtn.classList.add("is-active");
    }
  }
}

if (navDropdown && navDropBtn) {
  navDropBtn.addEventListener("click", () => {
    const isOpen = navDropdown.classList.toggle("is-open");
    navDropBtn.setAttribute("aria-expanded", String(isOpen));
    trackEvent("category_dropdown_toggle", { open: isOpen });
  });
}

if ("IntersectionObserver" in window) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add("is-visible");
        }
      });
    },
    { threshold: 0.12 }
  );
  document.querySelectorAll(".reveal").forEach((el) => observer.observe(el));
} else {
  document.querySelectorAll(".reveal").forEach((el) => el.classList.add("is-visible"));
}

const yearTarget = document.querySelector("[data-year]");
if (yearTarget) {
  yearTarget.textContent = String(new Date().getFullYear());
}

const NEWS_KEY = "technova_newsletter_signup";

function getSignup() {
  let raw = null;
  try {
    raw = localStorage.getItem(NEWS_KEY);
  } catch {
    raw = null;
  }
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

document.querySelectorAll("[data-newsletter-form]").forEach((form) => {
  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const emailInput = form.querySelector('input[name="email"]');
    const submitBtn = form.querySelector('button[type="submit"]');
    const originalBtnText = submitBtn ? submitBtn.textContent : "";
    const msg = form.parentElement.querySelector("[data-newsletter-msg]");
    if (!emailInput) return;

    const email = emailInput.value.trim();
    if (!email) return;

    const payload = { email, signedAt: new Date().toISOString() };
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = "Wysylanie...";
    }

    try {
      await sendNewsletterEmail(email, payload.signedAt);
      localStorage.setItem(NEWS_KEY, JSON.stringify(payload));
    } catch (error) {
      if (msg) {
        if (error.message === "newsletter_not_configured") {
          msg.textContent =
            "Newsletter wymaga konfiguracji EmailJS w pliku newsletter-config.js.";
        } else {
          msg.textContent = "Nie udalo sie wyslac e-maila. Sprawdz konfiguracje EmailJS.";
        }
      }
      if (submitBtn) {
        submitBtn.disabled = false;
        submitBtn.textContent = originalBtnText;
      }
      return;
    }
    emailInput.value = "";

    if (msg) {
      msg.textContent = "Zapisano. Wiadomosc z nowosciami zostala wyslana na podany adres e-mail.";
    }

    trackEvent("newsletter_signup", { form: "newsletter", page });
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = originalBtnText;
    }
  });
});

const contactForm = document.querySelector("[data-contact-form]");
if (contactForm) {
  contactForm.addEventListener("submit", (event) => {
    event.preventDefault();
    const msg = document.querySelector("[data-contact-msg]");
    if (msg) {
      msg.textContent = "Dziekujemy. Formularz testowy zostal wyslany poprawnie.";
    }
    trackEvent("contact_form_submit", { form: "contact" });
    contactForm.reset();
  });
}

function showToast(message) {
  let toast = document.querySelector("[data-toast]");
  if (!toast) {
    toast = document.createElement("div");
    toast.className = "toast";
    toast.setAttribute("data-toast", "");
    toast.setAttribute("role", "status");
    toast.setAttribute("aria-live", "polite");
    document.body.appendChild(toast);
  }
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => {
    toast.classList.remove("is-visible");
  }, 2600);
}

document.querySelectorAll("[data-cart-add]").forEach((btn) => {
  btn.addEventListener("click", () => {
    const product = btn.getAttribute("data-cart-add") || "Produkt";
    showToast(`${product} dodano do koszyka demonstracyjnego.`);
    trackEvent("add_to_cart_demo", { product, page });
  });
});
