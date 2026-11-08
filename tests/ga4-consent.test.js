const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const consentScript = fs.readFileSync(
  path.join(__dirname, "../assets/ga4-consent.js"),
  "utf8"
);

function createPage(savedConsent) {
  const documentListeners = {};
  const storage = new Map();
  if (savedConsent) storage.set("eddie_ga4_consent", savedConsent);

  function element(tagName) {
    return {
      tagName: tagName.toUpperCase(),
      children: [],
      dataset: {},
      listeners: {},
      style: {},
      attrs: {},
      textContent: "",
      href: "",
      appendChild(child) {
        this.children.push(child);
        child.parent = this;
        return child;
      },
      addEventListener(name, listener) {
        this.listeners[name] = listener;
      },
      setAttribute(name, value) {
        this.attrs[name] = value;
      },
      remove() {
        this.removed = true;
        if (this.parent) {
          this.parent.children = this.parent.children.filter((child) => child !== this);
        }
      },
      closest(selector) {
        if (selector === "button[data-choice]" && this.tagName === "BUTTON") return this;
        if (selector === "#calendar-buy" && this.id === "calendar-buy") return this;
        return null;
      }
    };
  }

  const body = element("body");
  const head = element("head");
  const settingsLink = element("a");
  settingsLink.id = "eddie-analytics-settings";
  const buyLink = element("a");
  buyLink.id = "calendar-buy";
  buyLink.href = "https://buy.stripe.com/3cI8wOa2e0J546paVh8Ra02";
  const scripts = [];
  const cookieWrites = [];

  const document = {
    readyState: "loading",
    body,
    head,
    cookie: "_ga=old; _ga_0DFW5EMT8M=old",
    referrer: "https://eddiesworld.de/?email=private",
    createElement: element,
    addEventListener(name, listener) {
      documentListeners[name] = listener;
    },
    getElementById(id) {
      if (id === "eddie-analytics-consent") {
        return body.children.find((child) => child.id === id) || null;
      }
      if (id === settingsLink.id) return settingsLink;
      if (id === buyLink.id) return buyLink;
      return null;
    },
    querySelector(selector) {
      if (selector === "script[data-eddie-ga4]") {
        return scripts.find((script) => script.dataset.eddieGa4 === "true" && !script.removed) || null;
      }
      return null;
    }
  };

  head.appendChild = (script) => {
    head.children.push(script);
    script.parent = head;
    scripts.push(script);
    return script;
  };

  Object.defineProperty(document, "cookie", {
    get() {
      return "_ga=old; _ga_0DFW5EMT8M=old";
    },
    set(value) {
      cookieWrites.push(value);
    }
  });

  const window = {
    localStorage: {
      getItem(key) {
        return storage.get(key) || null;
      },
      setItem(key, value) {
        storage.set(key, value);
      }
    },
    location: {
      origin: "https://eddiesworld.de",
      hostname: "eddiesworld.de",
      pathname: "/kalender-2027/",
      search: "?email=private",
      reload() {
        this.reloaded = true;
      },
      assign(url) {
        this.assigned = url;
      }
    },
    setTimeout(callback) {
      this.fallbackNavigation = callback;
    }
  };

  vm.runInNewContext(consentScript, {
    window,
    document,
    Date,
    URL,
    encodeURIComponent
  });
  documentListeners.DOMContentLoaded();

  return {
    window,
    document,
    storage,
    cookieWrites,
    settingsLink,
    buyLink,
    scripts,
    consentPanel() {
      return body.children.find((child) => child.id === "eddie-analytics-consent") || null;
    }
  };
}

test("first visit blocks GA4 until an explicit choice; rejection stays blocked", () => {
  const page = createPage();

  assert.ok(page.consentPanel());
  assert.equal(page.scripts.length, 0);

  const panel = page.consentPanel();
  panel.listeners.click({ target: panel.children[1].children[0] });

  assert.equal(page.storage.get("eddie_ga4_consent"), "no");
  assert.equal(page.scripts.length, 0);
  assert.equal(page.consentPanel(), null);
});

test("acceptance loads only the existing stream and strips URL parameters", () => {
  const page = createPage();
  const panel = page.consentPanel();

  panel.listeners.click({ target: panel.children[1].children[1] });

  assert.equal(page.storage.get("eddie_ga4_consent"), "yes");
  assert.equal(page.scripts.length, 1);
  assert.match(page.scripts[0].src, /id=G-0DFW5EMT8M$/);
  assert.equal(page.window.dataLayer[1][0], "config");
  assert.equal(page.window.dataLayer[1][1], "G-0DFW5EMT8M");
  assert.equal(page.window.dataLayer[1][2].page_location, "https://eddiesworld.de/kalender-2027/");
  assert.equal(page.window.dataLayer[1][2].page_referrer, "https://eddiesworld.de/");
});

test("a purchase click sends its event and continues to the unchanged Stripe URL", () => {
  const page = createPage("yes");
  const event = {
    target: page.buyLink,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    }
  };

  page.documentListeners.click(event);

  assert.equal(event.prevented, true);
  const analyticsEvent = page.window.dataLayer.find(
    (entry) => entry[0] === "event" && entry[1] === "calendar_purchase_click"
  );
  assert.ok(analyticsEvent);
  assert.equal(analyticsEvent[2].link_url, page.buyLink.href);

  analyticsEvent[2].event_callback();
  page.window.fallbackNavigation();
  assert.equal(page.window.location.assigned, page.buyLink.href);
});

test("a saved rejection does not add a tag or intercept the checkout link", () => {
  const page = createPage("no");
  const event = {
    target: page.buyLink,
    prevented: false,
    preventDefault() {
      this.prevented = true;
    }
  };

  assert.equal(page.consentPanel(), null);
  assert.equal(page.scripts.length, 0);
  page.documentListeners.click(event);
  assert.equal(event.prevented, false);
  assert.equal(page.window.dataLayer, undefined);
});

test("withdrawal clears GA cookies, removes the tag and reloads without analytics", () => {
  const page = createPage("yes");
  const script = page.scripts[0];

  page.settingsLink.listeners.click({ preventDefault() {} });
  const panel = page.consentPanel();
  assert.equal(panel.children[1].children[0].textContent, "Widerrufen");
  panel.listeners.click({ target: panel.children[1].children[0] });

  assert.equal(page.storage.get("eddie_ga4_consent"), "no");
  assert.equal(script.removed, true);
  assert.equal(page.window.location.reloaded, true);
  assert.equal(page.window.dataLayer.length, 0);
  assert.ok(page.cookieWrites.some((value) => value.includes("_ga=; Max-Age=0")));
  assert.ok(page.cookieWrites.some((value) => value.includes("_ga_0DFW5EMT8M=; Max-Age=0")));
});
