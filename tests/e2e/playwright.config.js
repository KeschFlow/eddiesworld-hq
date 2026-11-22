const path = require("path");
const { defineConfig, devices } = require("@playwright/test");

const iphone = devices["iPhone 12"];
const root = path.join(__dirname, "../..");

module.exports = defineConfig({
  testDir: __dirname,
  timeout: 30000,
  workers: 1,
  fullyParallel: false,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173",
    viewport: iphone.viewport,
    userAgent: iphone.userAgent,
    isMobile: iphone.isMobile,
    hasTouch: iphone.hasTouch,
    deviceScaleFactor: iphone.deviceScaleFactor
  },
  webServer: {
    command: "python3 -m http.server 4173",
    cwd: root,
    url: "http://127.0.0.1:4173/",
    reuseExistingServer: true
  }
});
