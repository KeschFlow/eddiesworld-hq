const { test, expect, devices } = require("@playwright/test");
const fs = require("fs");
const path = require("path");

const iphone = devices["iPhone 12"];
const mobile = {
  viewport: iphone.viewport,
  userAgent: iphone.userAgent,
  isMobile: iphone.isMobile,
  hasTouch: iphone.hasTouch,
  deviceScaleFactor: iphone.deviceScaleFactor
};

const BUY_LINKS = [
  {
    path: "/",
    href: "https://amzn.to/4egvGwi",
    event: "purchase_click",
    productId: "B0H3MDYSMG",
    placement: "home_product",
    newTab: true,
    shot: "home-book"
  },
  {
    path: "/",
    href: "https://amzn.to/3SGjaPG",
    event: "purchase_click",
    productId: "keschflow_creator_tools",
    placement: "home_creator_tools",
    newTab: true
  },
  {
    path: "/books/",
    href: "https://link.amazon/B0eaJdNQ9",
    event: "purchase_click",
    productId: "life-os-junior-4-6",
    placement: "books_grid",
    newTab: true
  },
  {
    path: "/books/",
    href: "https://link.amazon/B0hzdJDbi",
    event: "purchase_click",
    productId: "life-os-junior-7-9",
    placement: "books_grid",
    newTab: true
  },
  {
    path: "/books/",
    href: "https://link.amazon/B012lVLHp",
    event: "purchase_click",
    productId: "life-os-junior-10-12",
    placement: "books_grid",
    newTab: true
  },
  {
    path: "/books/",
    href: "https://link.amazon/B03KsA56o",
    event: "purchase_click",
    productId: "life-os-junior-13-16",
    placement: "books_grid",
    newTab: true,
    shot: "books-grid"
  },
  {
    path: "/books/",
    href: "https://link.amazon/B0fGdXbky",
    event: "purchase_click",
    productId: "B0H3MDYSMG",
    placement: "books_grid",
    newTab: true
  },
  {
    path: "/raw-logs.html",
    href: "https://www.amazon.de/dp/B0H3MDYSMG",
    event: "purchase_click",
    productId: "B0H3MDYSMG",
    placement: "raw_logs_cta",
    newTab: true,
    shot: "raw-logs-book"
  },
  {
    path: "/kalender-2027/",
    href: "https://buy.stripe.com/7sYaEWa2e63p8mF9Rd8Ra03",
    event: "calendar_purchase_click",
    productId: "calendar_2027",
    placement: "product_page",
    newTab: false,
    shot: "calendar-buy"
  }
];

const ARTIFACTS = "/opt/cursor/artifacts/purchase-clicks";

function hookScript() {
  return [
    "window.__gaHooked=true;",
    "window.gtag=function(){",
    "var args=Array.prototype.slice.call(arguments);",
    "var params=args[2]||null;",
    "try{params=JSON.parse(JSON.stringify(args[2]));}catch(e){}",
    "var record={type:args[0],name:args[1],params:params};",
    "try{navigator.sendBeacon('/__ga_collect', new Blob([JSON.stringify(record)],{type:'application/json'}));}catch(e){}",
    "if(window.dataLayer)window.dataLayer.push(arguments);",
    "};"
  ].join("");
}

async function installRoutes(context, bag) {
  await context.route("https://www.googletagmanager.com/**", (route) => {
    bag.gtagRequests.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: "application/javascript",
      body: hookScript()
    });
  });
  await context.route("**/__ga_collect", async (route) => {
    bag.events.push(JSON.parse(route.request().postData() || "{}"));
    await route.fulfill({ status: 204, body: "" });
  });
  await context.route(/https:\/\/(?:amzn\.to|link\.amazon|www\.amazon\.[a-z.]+|buy\.stripe\.com)\//, (route) => {
    if (route.request().resourceType() === "document") bag.outbound.push(route.request().url());
    return route.fulfill({
      status: 200,
      contentType: "text/html",
      body: "<!doctype html><title>outbound-stub</title><p>stub</p>"
    });
  });
}

async function openPage(browser) {
  const bag = { events: [], outbound: [], gtagRequests: [] };
  const context = await browser.newContext(mobile);
  await installRoutes(context, bag);
  const page = await context.newPage();
  return { bag, context, page };
}

async function clickBuy(page, link) {
  const anchor = page.locator(`a[href="${link.href}"]`);
  await expect(anchor).toHaveCount(1);
  await expect(anchor).toHaveAttribute("href", link.href);
  await anchor.evaluate((element) => element.scrollIntoView({ block: "center" }));
  if (link.newTab) {
    const [popup] = await Promise.all([
      page.waitForEvent("popup"),
      anchor.click()
    ]);
    await expect(popup).toHaveURL(link.href);
    await popup.close();
  } else {
    await Promise.all([
      page.waitForURL(link.href),
      anchor.click()
    ]);
  }
  const hrefAfter = link.newTab ? await anchor.getAttribute("href") : link.href;
  expect(hrefAfter).toBe(link.href);
}

test.describe("mobile purchase clicks", () => {
  for (const link of BUY_LINKS) {
    test(`before consent ${link.placement} ${link.productId} sends nothing`, async ({ browser }) => {
      const { bag, context, page } = await openPage(browser);
      await page.goto(link.path);
      await clickBuy(page, link);
      await page.waitForTimeout(250);
      expect(bag.gtagRequests).toEqual([]);
      expect(bag.events).toEqual([]);
      expect(bag.outbound).toEqual([link.href]);
      await context.close();
    });

    test(`after consent ${link.placement} ${link.productId} sends one event`, async ({ browser }) => {
      const { bag, context, page } = await openPage(browser);
      await page.goto(link.path);
      await page.getByRole("button", { name: "Zustimmen" }).click();
      await page.waitForFunction(() => window.__gaHooked === true);
      await clickBuy(page, link);
      await expect.poll(() => bag.events.length).toBe(1);
      expect(bag.events[0]).toMatchObject({
        type: "event",
        name: link.event,
        params: {
          product_id: link.productId,
          placement: link.placement,
          link_url: link.href,
          transport_type: "beacon"
        }
      });
      expect(bag.events[0].params.page_path).toBe(new URL(link.path, "http://127.0.0.1:4173").pathname);
      expect(bag.outbound).toEqual([link.href]);
      expect(bag.gtagRequests.length).toBeGreaterThan(0);
      await context.close();
    });
  }
});

test("mobile screenshots of buy sections", async ({ browser }) => {
  fs.mkdirSync(ARTIFACTS, { recursive: true });
  const context = await browser.newContext(mobile);
  await context.addInitScript(() => {
    localStorage.setItem("eddie_ga4_consent", "no");
  });
  const page = await context.newPage();
  const shots = [
    { path: "/", selector: "section.product:has(a[href='https://amzn.to/4egvGwi'])", name: "home-book.png" },
    { path: "/", selector: "section.product:has(a[href='https://amzn.to/3SGjaPG'])", name: "home-creator-tools.png" },
    { path: "/books/", selector: "section.catalog", name: "books-grid.png" },
    { path: "/raw-logs.html", selector: "section.archive-cta", name: "raw-logs-book.png" }
  ];
  for (const shot of shots) {
    await page.goto(shot.path);
    const target = page.locator(shot.selector);
    await expect(target).toBeVisible();
    await target.screenshot({ path: path.join(ARTIFACTS, shot.name) });
  }
  await page.goto("/kalender-2027/");
  await page.locator("#calendar-buy").evaluate((element) => element.scrollIntoView({ block: "center" }));
  await page.screenshot({ path: path.join(ARTIFACTS, "calendar-buy.png") });
  await context.close();
});
