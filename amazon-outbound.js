(() => {
  "use strict";

  const FIREBASE_API_KEY = "AIzaSyC0olKESyTP0rXUlnjGstLlGN50I1m_O2A";
  const FIREBASE_PROJECT_ID = "mg-challenge";
  const DESTINATION = "https://www.amazon.de/dp/B0H7KX8XF4";
  const ASIN = "B0H7KX8XF4";
  const CLIENT_VERSION = "amazon-outbound-v1";
  const TOKEN_KEY = "kesch_funnel_anonymous_auth_v1";

  function randomId() {
    const bytes = crypto.getRandomValues(new Uint8Array(18));
    return "CLICK_" + Array.from(bytes, (value) => value.toString(36).padStart(2, "0")).join("").slice(0, 24);
  }

  function isTestEvent() {
    return new URLSearchParams(location.search).get("funnel_test") === "1";
  }

  function setStatus(element, message) {
    const status = document.getElementById(element.dataset.statusTarget || "amazonClickStatus");
    if (status) status.textContent = message;
  }

  async function anonymousToken() {
    const cached = sessionStorage.getItem(TOKEN_KEY);
    if (cached) {
      try {
        const parsed = JSON.parse(cached);
        if (parsed.token && parsed.expiresAt > Date.now() + 60000) return parsed.token;
      } catch (_) {
        sessionStorage.removeItem(TOKEN_KEY);
      }
    }

    const response = await fetch(
      `https://identitytoolkit.googleapis.com/v1/accounts:signUp?key=${FIREBASE_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ returnSecureToken: true })
      }
    );
    if (!response.ok) throw new Error("anonymous_auth_failed");
    const auth = await response.json();
    sessionStorage.setItem(TOKEN_KEY, JSON.stringify({
      token: auth.idToken,
      expiresAt: Date.now() + (Number(auth.expiresIn || 3600) * 1000)
    }));
    return auth.idToken;
  }

  async function recordClick(source) {
    const token = await anonymousToken();
    const eventId = randomId();
    const documentName = `projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents/amazon_product_clicks/${eventId}`;
    const response = await fetch(
      `https://firestore.googleapis.com/v1/projects/${FIREBASE_PROJECT_ID}/databases/(default)/documents:commit`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json"
        },
        body: JSON.stringify({
          writes: [{
            update: {
              name: documentName,
              fields: {
                event_name: { stringValue: "amazon_product_click" },
                asin: { stringValue: ASIN },
                source: { stringValue: source },
                destination: { stringValue: DESTINATION },
                test_event: { booleanValue: isTestEvent() },
                client_version: { stringValue: CLIENT_VERSION }
              }
            },
            updateTransforms: [{ fieldPath: "timestamp", setToServerValue: "REQUEST_TIME" }],
            currentDocument: { exists: false }
          }]
        })
      }
    );
    if (!response.ok) throw new Error("event_write_failed");
    const receipt = { eventId, event_name: "amazon_product_click", asin: ASIN, source, destination: DESTINATION, test_event: isTestEvent() };
    sessionStorage.setItem("kesch_last_amazon_product_click", JSON.stringify(receipt));
    window.dispatchEvent(new CustomEvent("amazon-product-click-recorded", { detail: receipt }));
    return receipt;
  }

  document.querySelectorAll("[data-amazon-product-cta]").forEach((element) => {
    let active = false;
    element.addEventListener("click", async (event) => {
      event.preventDefault();
      if (active) return;
      active = true;
      element.setAttribute("aria-disabled", "true");
      setStatus(element, isTestEvent() ? "TEST-Klick wird registriert ..." : "Klick wird registriert ...");
      try {
        await recordClick(element.dataset.source);
        location.assign(DESTINATION);
      } catch (_) {
        active = false;
        element.removeAttribute("aria-disabled");
        setStatus(element, "Klick konnte nicht registriert werden. Bitte erneut versuchen.");
      }
    });
  });
})();
