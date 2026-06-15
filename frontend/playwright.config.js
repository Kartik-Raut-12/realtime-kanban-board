// playwright.config.js
import { defineConfig } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/e2e", // Path to your test files
  timeout: 20 * 1000, // Test timeout in milliseconds
  use: {
    headless: false, // Run tests in headless mode
    baseURL: "http://localhost:3000", // Replace with your app's base URL
    viewport: { width: 1300, height: 720 }, // Default viewport
  },
  projects: [
    {
      name: "chromium",
      use: { browserName: "chromium" },
    },
    {
      name: "webkit",
      use: { browserName: "webkit" },
    },
  ],
  webServer: {
    command: "npm run build && npm run preview", // Command to start your server
    port: 3000, // Port your app runs on
    reuseExistingServer: true,
    timeout: 60 * 60 * 1000, // Wait time for server start in milliseconds
  },
});
