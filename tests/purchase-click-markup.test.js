const test = require("node:test");
const assert = require("node:assert/strict");
const fs = require("fs");
const path = require("path");

const root = path.join(__dirname, "..");

const EXPECTED = [
  {
    file: "index.html",
    href: "https://amzn.to/4egvGwi",
    event: "purchase_click",
    productId: "B0H3MDYSMG",
    placement: "home_product"
  },
  {
    file: "index.html",
    href: "https://amzn.to/3SGjaPG",
    event: "purchase_click",
    productId: "keschflow_creator_tools",
    placement: "home_creator_tools"
  },
  {
    file: "books/index.html",
    href: "https://link.amazon/B0eaJdNQ9",
    event: "purchase_click",
    productId: "life-os-junior-4-6",
    placement: "books_grid"
  },
  {
    file: "books/index.html",
    href: "https://link.amazon/B0hzdJDbi",
    event: "purchase_click",
    productId: "life-os-junior-7-9",
    placement: "books_grid"
  },
  {
    file: "books/index.html",
    href: "https://link.amazon/B012lVLHp",
    event: "purchase_click",
    productId: "life-os-junior-10-12",
    placement: "books_grid"
  },
  {
    file: "books/index.html",
    href: "https://link.amazon/B03KsA56o",
    event: "purchase_click",
    productId: "life-os-junior-13-16",
    placement: "books_grid"
  },
  {
    file: "books/index.html",
    href: "https://link.amazon/B0fGdXbky",
    event: "purchase_click",
    productId: "B0H3MDYSMG",
    placement: "books_grid"
  },
  {
    file: "raw-logs.html",
    href: "https://www.amazon.de/dp/B0H3MDYSMG",
    event: "purchase_click",
    productId: "B0H3MDYSMG",
    placement: "raw_logs_cta"
  },
  {
    file: "kalender-2027/index.html",
    href: "https://buy.stripe.com/7sYaEWa2e63p8mF9Rd8Ra03",
    event: "calendar_purchase_click",
    productId: "calendar_2027",
    placement: "product_page"
  }
];

function walk(dir, found) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (entry.name === ".git" || entry.name === "node_modules") continue;
    const full = path.join(dir, entry.name);
    if (entry.isDirectory()) walk(full, found);
    else if (entry.name.endsWith(".html")) found.push(full);
  }
  return found;
}

function anchorTag(html, hrefIndex) {
  const start = html.lastIndexOf("<a", hrefIndex);
  const end = html.indexOf(">", hrefIndex);
  assert.ok(start !== -1 && end !== -1, "href is not inside an anchor");
  return html.slice(start, end + 1);
}

function attr(tag, name) {
  const match = tag.match(new RegExp(name + '="([^"]*)"'));
  return match ? match[1] : null;
}

test("every Amazon and Stripe buy href is unchanged and carries one purchase-click marker", () => {
  const htmlFiles = walk(root, []);
  const found = [];
  for (const file of htmlFiles) {
    const html = fs.readFileSync(file, "utf8");
    const hrefRe = /href="([^"]+)"/g;
    let match;
    while ((match = hrefRe.exec(html))) {
      const href = match[1];
      if (!/amazon|amzn\.to|buy\.stripe\.com|link\.amazon|partnernet/i.test(href)) continue;
      const tag = anchorTag(html, match.index);
      found.push({
        file: path.relative(root, file),
        href,
        event: attr(tag, "data-purchase-event"),
        productId: attr(tag, "data-purchase-product"),
        placement: attr(tag, "data-purchase-placement"),
        tag
      });
    }
  }

  assert.equal(found.length, EXPECTED.length);
  for (const expected of EXPECTED) {
    const hits = found.filter((item) => item.file === expected.file && item.href === expected.href);
    assert.equal(hits.length, 1, `${expected.file} ${expected.href}`);
    assert.equal(hits[0].event, expected.event);
    assert.equal(hits[0].productId, expected.productId);
    assert.equal(hits[0].placement, expected.placement);
    assert.equal(hits[0].tag.includes("utm_"), false);
    assert.equal(htmlFiles.some((file) => path.relative(root, file) === expected.file), true);
    const html = fs.readFileSync(path.join(root, expected.file), "utf8");
    assert.equal(html.includes(`href="${expected.href}"`), true);
    assert.match(html, /<script src="\/assets\/ga4-consent\.js" defer><\/script>/);
  }
});
