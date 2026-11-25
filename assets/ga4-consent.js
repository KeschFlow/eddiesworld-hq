/* Eddie's World: basic consent for optional GA4 analytics.
   Measurement ID: G-0DFW5EMT8M (existing stream, unchanged).
   Purchase clicks are sent only after consent === "yes" and GA4 has loaded.
   Scheme:
   - a#calendar-buy keeps the event name calendar_purchase_click.
     product_id is calendar_2027. placement comes from
     data-purchase-placement, otherwise product_page.
   - every other a[data-purchase-product] sends purchase_click
     (or data-purchase-event) with product_id and placement.
   Parameters: product_id, placement, page_path, page_location, link_url, link_text.
   transport_type is beacon. The click is never cancelled, so same-tab
   navigation and target=_blank both proceed immediately. */
(function () {
  "use strict";

  var measurementId = "G-0DFW5EMT8M";
  var consentKey = "eddie_ga4_consent";
  var loaded = false;
  var consent = null;

  function readConsent() {
    try { return window.localStorage.getItem(consentKey); }
    catch (_) { return null; }
  }

  function saveConsent(value) {
    consent = value;
    try { window.localStorage.setItem(consentKey, value); }
    catch (_) {}
  }

  function currentPage() {
    return window.location.origin + window.location.pathname;
  }

  function safeReferrer() {
    try {
      var referrer = new URL(document.referrer);
      return referrer.origin + referrer.pathname;
    } catch (_) {
      return "";
    }
  }

  function loadAnalytics() {
    if (loaded || consent !== "yes") return;
    loaded = true;
    window.__eddieGa4Loaded = true;
    window.dataLayer = window.dataLayer || [];
    window.gtag = function () { window.dataLayer.push(arguments); };
    window.gtag("js", new Date());
    window.gtag("config", measurementId, {
      page_location: currentPage(),
      page_referrer: safeReferrer(),
      allow_google_signals: false,
      allow_ad_personalization_signals: false
    });

    var script = document.createElement("script");
    script.async = true;
    script.src = "https://www.googletagmanager.com/gtag/js?id=" + encodeURIComponent(measurementId);
    script.dataset.eddieGa4 = "true";
    document.head.appendChild(script);
  }

  function clearAnalyticsCookies() {
    var names = document.cookie.split(";").map(function (item) {
      return item.trim().split("=")[0];
    }).filter(function (name) {
      return name === "_ga" || name.indexOf("_ga_") === 0;
    });
    var domains = [window.location.hostname, "." + window.location.hostname];
    names.forEach(function (name) {
      domains.forEach(function (domain) {
        document.cookie = name + "=; Max-Age=0; path=/; domain=" + domain;
      });
      document.cookie = name + "=; Max-Age=0; path=/";
    });
  }

  function revokeAnalytics() {
    saveConsent("no");
    window.__eddieGa4Loaded = false;
    loaded = false;
    clearAnalyticsCookies();
    var script = document.querySelector("script[data-eddie-ga4]");
    if (script) script.remove();
    window.dataLayer = [];
    window.gtag = function () {};
    window.location.reload();
  }

  function addButton(panel, label, choice, primary) {
    var button = document.createElement("button");
    button.type = "button";
    button.textContent = label;
    button.dataset.choice = choice;
    button.style.cssText = "min-height:44px;padding:10px 16px;border:1px solid " +
      (primary ? "#800080" : "#777") + ";border-radius:6px;background:" +
      (primary ? "#800080" : "#222") + ";color:#fff;font:inherit;font-weight:700;cursor:pointer";
    panel.appendChild(button);
  }

  function removeBanner(panel) {
    if (panel) panel.remove();
    if (document.body) document.body.style.paddingBottom = "";
  }

  function showChoice(settings) {
    var existing = document.getElementById("eddie-analytics-consent");
    if (existing) removeBanner(existing);

    var panel = document.createElement("section");
    panel.id = "eddie-analytics-consent";
    panel.setAttribute("role", "region");
    panel.setAttribute("aria-label", "Einstellungen zur optionalen Besuchermessung");
    panel.style.cssText = "position:fixed;left:0;right:0;bottom:0;z-index:99999;display:flex;flex-wrap:wrap;align-items:center;justify-content:space-between;gap:12px;background:#111;color:#fff;padding:16px max(16px, calc((100vw - 900px)/2));border-top:3px solid #800080;box-shadow:0 -2px 14px #0008;font:15px/1.5 system-ui,sans-serif";
    var copy = document.createElement("div");
    copy.style.cssText = "flex:1 1 320px;max-width:680px";
    copy.textContent = "Optionale Reichweitenmessung durch Google Analytics 4 von Google. Bei Zustimmung werden Seitenaufrufe und Klicks auf Kauf-Links erfasst (Produkt und Platzierung auf der Seite, zum Beispiel Bücher und „Kalender kaufen“); dabei können Browser- und Geräteinformationen sowie Analytics-Cookies verarbeitet werden. Ohne Zustimmung werden keine Messdaten an Google gesendet. Du kannst deine Entscheidung jederzeit in den Analytics-Einstellungen ändern. ";
    var privacy = document.createElement("a");
    privacy.href = "/datenschutz/";
    privacy.textContent = "Datenschutz";
    privacy.style.cssText = "color:#e9a9e9";
    copy.appendChild(privacy);
    panel.appendChild(copy);

    var actions = document.createElement("div");
    actions.style.cssText = "display:flex;flex-wrap:wrap;gap:8px;justify-content:flex-end";
    panel.appendChild(actions);

    if (settings && consent === "yes") {
      addButton(actions, "Widerrufen", "revoke", false);
      addButton(actions, "Einwilligung behalten", "yes", true);
    } else {
      addButton(actions, "Ablehnen", "no", false);
      addButton(actions, "Zustimmen", "yes", true);
    }

    panel.addEventListener("click", function (event) {
      var button = event.target.closest("button[data-choice]");
      if (!button) return;
      var choice = button.dataset.choice;
      if (choice === "revoke" || choice === "no") {
        if (choice === "revoke" || consent === "yes") {
          revokeAnalytics();
          return;
        }
        saveConsent("no");
        removeBanner(panel);
        return;
      }
      saveConsent("yes");
      removeBanner(panel);
      loadAnalytics();
    });
    document.body.appendChild(panel);
    var box = typeof panel.getBoundingClientRect === "function" ? panel.getBoundingClientRect() : null;
    if (box && box.height) document.body.style.paddingBottom = Math.ceil(box.height) + "px";
  }

  function purchaseLinkFrom(event) {
    var target = event.target;
    if (!target) return null;
    if (target.nodeType === 3) target = target.parentElement;
    if (!target || typeof target.closest !== "function") return null;
    return target.closest("a[data-purchase-product], a#calendar-buy");
  }

  function trackPurchaseClicks() {
    document.addEventListener("click", function (event) {
      var link = purchaseLinkFrom(event);
      if (!link || consent !== "yes" || !loaded || typeof window.gtag !== "function") return;
      var isCalendar = link.id === "calendar-buy";
      var eventName = link.getAttribute("data-purchase-event") ||
        (isCalendar ? "calendar_purchase_click" : "purchase_click");
      var productId = link.getAttribute("data-purchase-product") ||
        (isCalendar ? "calendar_2027" : "");
      var placement = link.getAttribute("data-purchase-placement") ||
        (isCalendar ? "product_page" : "");
      if (!eventName || !productId) return;
      window.gtag("event", eventName, {
        product_id: productId,
        placement: placement,
        page_path: window.location.pathname,
        page_location: currentPage(),
        link_url: link.href,
        link_text: (link.textContent || "").replace(/\s+/g, " ").trim(),
        transport_type: "beacon"
      });
    });
  }

  function start() {
    consent = readConsent();
    trackPurchaseClicks();
    if (consent === "yes") loadAnalytics();
    else if (consent !== "no") showChoice(false);

    var settings = document.getElementById("eddie-analytics-settings");
    if (settings) settings.addEventListener("click", function (event) {
      event.preventDefault();
      showChoice(true);
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();
