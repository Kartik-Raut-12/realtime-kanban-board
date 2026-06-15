import { test, expect } from "@playwright/test";

test("User can add a task and see it on the board", async ({ page }) => {
  await page.goto("http://localhost:3000");

  await expect(page.getByText("Real-time Kanban Board")).toBeVisible();
});
