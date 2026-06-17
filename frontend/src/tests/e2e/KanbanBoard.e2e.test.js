import { test, expect } from "@playwright/test";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Wait for the board to finish loading (loading indicator disappears)
async function waitForBoard(page) {
  await page.waitForSelector('[data-testid="loading-indicator"]', { state: "hidden", timeout: 15000 });
  await expect(page.getByRole("heading", { name: "Kanban Board", exact: true })).toBeVisible();
}

// Add a task through the UI form
async function addTask(page, title, { description = "", priority = null, category = null } = {}) {
  await page.getByTestId("task-title-input").fill(title);
  if (description) await page.getByTestId("task-description-input").fill(description);
  if (priority) await selectOption(page, "priority-select", priority);
  if (category) await selectOption(page, "category-select", category);
  await page.getByTestId("add-task-btn").click();
  // Wait for the task card to appear on the board
  await expect(page.locator(`text=${title}`).first()).toBeVisible();
}

// Helper to interact with react-select dropdowns
async function selectOption(page, inputId, optionLabel) {
  await page.locator(`#${inputId}`).click();
  await page.getByRole("option", { name: optionLabel }).click();
}

// Helper to move a task via the "Move to" native select (reliable alternative to drag-and-drop)
async function moveTask(page, taskText, targetColumnId) {
  const taskCard = page.locator('[data-testid^="task-card-"]').filter({ hasText: taskText });
  const moveSelect = taskCard.locator('[data-testid^="move-task-"]');
  await moveSelect.selectOption(targetColumnId);
}

// Clear all backend tasks before each test so runs are isolated
test.beforeEach(async ({ request }) => {
  await request.post("http://localhost:5000/test/reset");
});

// ─── Basic Board ──────────────────────────────────────────────────────────────

test.describe("Kanban Board — page load", () => {
  test("shows app title and board after loading", async ({ page }) => {
    await page.goto("/");
    await expect(page.getByText("Real-time Kanban Board")).toBeVisible();
    await waitForBoard(page);
  });

  test("renders all three columns", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await expect(page.getByRole("heading", { name: "To Do" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "In Progress" })).toBeVisible();
    await expect(page.getByRole("heading", { name: "Done" })).toBeVisible();
  });

  test("shows add task form inputs", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await expect(page.getByTestId("task-title-input")).toBeVisible();
    await expect(page.getByTestId("task-description-input")).toBeVisible();
    await expect(page.getByTestId("add-task-btn")).toBeVisible();
  });
});

// ─── Task Creation ────────────────────────────────────────────────────────────

test.describe("Kanban Board — task creation", () => {
  test("user can add a task and see it on the board", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await addTask(page, "My first task");
    await expect(page.getByTestId("column-todo")).toContainText("My first task");
  });

  test("new task lands in the To Do column by default", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await addTask(page, "Default column task");
    await expect(page.getByTestId("column-todo")).toContainText("Default column task");
    await expect(page.getByTestId("column-inprogress")).not.toContainText("Default column task");
    await expect(page.getByTestId("column-done")).not.toContainText("Default column task");
  });

  test("title input is cleared after adding a task", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await page.getByTestId("task-title-input").fill("Clear me");
    await page.getByTestId("add-task-btn").click();
    await expect(page.getByTestId("task-title-input")).toHaveValue("");
  });

  test("can add multiple tasks", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await addTask(page, "Task Alpha");
    await addTask(page, "Task Beta");
    await addTask(page, "Task Gamma");
    await expect(page.getByTestId("column-todo")).toContainText("Task Alpha");
    await expect(page.getByTestId("column-todo")).toContainText("Task Beta");
    await expect(page.getByTestId("column-todo")).toContainText("Task Gamma");
  });

  test("task with description shows description text", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await addTask(page, "Described task", { description: "This is the detail" });
    await expect(page.locator("text=This is the detail")).toBeVisible();
  });
});

// ─── Task Deletion ────────────────────────────────────────────────────────────

test.describe("Kanban Board — task deletion", () => {
  test("user can delete a task and see it removed", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await addTask(page, "Delete this task");

    // Find the task card and click its delete button
    const taskCard = page.locator('[data-testid^="task-card-"]').filter({ hasText: "Delete this task" });
    const deleteBtn = taskCard.locator('[data-testid^="delete-task-"]');
    await deleteBtn.click();

    await expect(page.locator("text=Delete this task")).not.toBeVisible();
  });

  test("deleting one task does not remove others", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await addTask(page, "Keep this one");
    await addTask(page, "Remove this one");

    const removeCard = page.locator('[data-testid^="task-card-"]').filter({ hasText: "Remove this one" });
    await removeCard.locator('[data-testid^="delete-task-"]').click();

    await expect(page.locator("text=Remove this one")).not.toBeVisible();
    await expect(page.locator("text=Keep this one")).toBeVisible();
  });
});

// ─── Drag and Drop ────────────────────────────────────────────────────────────

test.describe("Kanban Board — drag and drop", () => {
  test("user can move a task from To Do to In Progress", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await addTask(page, "Move me to progress");

    await moveTask(page, "Move me to progress", "inprogress");

    await expect(page.getByTestId("column-inprogress")).toContainText("Move me to progress");
    await expect(page.getByTestId("column-todo")).not.toContainText("Move me to progress");
  });

  test("user can move a task from In Progress to Done", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await addTask(page, "Almost done task");

    await moveTask(page, "Almost done task", "inprogress");
    await expect(page.getByTestId("column-inprogress")).toContainText("Almost done task");

    await moveTask(page, "Almost done task", "done");
    await expect(page.getByTestId("column-done")).toContainText("Almost done task");
  });
});

// ─── Dropdown Select ──────────────────────────────────────────────────────────

test.describe("Dropdown — priority and category", () => {
  test("user can select a priority level and it appears on the task card", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);

    await page.getByTestId("task-title-input").fill("High priority task");
    await selectOption(page, "priority-select", "High");
    await page.getByTestId("add-task-btn").click();

    const taskCard = page.locator('[data-testid^="task-card-"]').filter({ hasText: "High priority task" });
    await expect(taskCard.locator('[data-testid^="task-priority-"]')).toHaveText("High");
  });

  test("user can select a category and it appears on the task card", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);

    await page.getByTestId("task-title-input").fill("Bug task");
    await selectOption(page, "category-select", "Bug");
    await page.getByTestId("add-task-btn").click();

    const taskCard = page.locator('[data-testid^="task-card-"]').filter({ hasText: "Bug task" });
    await expect(taskCard.locator('[data-testid^="task-category-"]')).toHaveText("Bug");
  });

  test("priority defaults to Medium when not changed", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await addTask(page, "Default priority task");

    const taskCard = page.locator('[data-testid^="task-card-"]').filter({ hasText: "Default priority task" });
    await expect(taskCard.locator('[data-testid^="task-priority-"]')).toHaveText("Medium");
  });

  test("category defaults to Feature when not changed", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await addTask(page, "Default category task");

    const taskCard = page.locator('[data-testid^="task-card-"]').filter({ hasText: "Default category task" });
    await expect(taskCard.locator('[data-testid^="task-category-"]')).toHaveText("Feature");
  });
});

// ─── File Upload ──────────────────────────────────────────────────────────────

test.describe("File upload", () => {
  test("user can upload an image file and see a preview", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await addTask(page, "Task with image");

    const taskCard = page.locator('[data-testid^="task-card-"]').filter({ hasText: "Task with image" });
    const taskId = await taskCard.getAttribute("data-testid").then((id) => id.replace("task-card-", ""));

    // Upload a small test image
    const testImagePath = path.join(__dirname, "test-image.png");
    await page.getByTestId(`file-upload-${taskId}`).setInputFiles(testImagePath);

    // Image preview should appear
    await expect(taskCard.locator("img")).toBeVisible({ timeout: 5000 });
  });

  test("invalid file type shows an error message", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await addTask(page, "Task for invalid file");

    const taskCard = page.locator('[data-testid^="task-card-"]').filter({ hasText: "Task for invalid file" });
    const taskId = await taskCard.getAttribute("data-testid").then((id) => id.replace("task-card-", ""));

    // Upload an unsupported file type (.exe)
    const invalidFile = path.join(__dirname, "test-invalid.exe");
    await page.getByTestId(`file-upload-${taskId}`).setInputFiles({
      name: "malware.exe",
      mimeType: "application/octet-stream",
      buffer: Buffer.from("fake exe content"),
    });

    await expect(taskCard.locator(`[data-testid="file-error-${taskId}"]`)).toBeVisible({ timeout: 3000 });
    await expect(taskCard.locator(`[data-testid="file-error-${taskId}"]`)).toContainText("not supported");
  });

  test("non-image files show as a download link", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await addTask(page, "Task with PDF");

    const taskCard = page.locator('[data-testid^="task-card-"]').filter({ hasText: "Task with PDF" });
    const taskId = await taskCard.getAttribute("data-testid").then((id) => id.replace("task-card-", ""));

    const testPdfPath = path.join(__dirname, "test-file.pdf");
    await page.getByTestId(`file-upload-${taskId}`).setInputFiles(testPdfPath);

    await expect(taskCard.locator("a")).toBeVisible({ timeout: 5000 });
    await expect(taskCard.locator("a")).toContainText("test-file.pdf");
  });
});

// ─── Progress Graph ───────────────────────────────────────────────────────────

test.describe("Progress graph", () => {
  test("shows 'No tasks yet' when board is empty", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await expect(page.getByTestId("completion-pct")).toHaveText("No tasks yet");
  });

  test("completion percentage updates as tasks move to Done", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await addTask(page, "Graph task 1");
    await addTask(page, "Graph task 2");

    await expect(page.getByTestId("completion-pct")).toHaveText("0% complete");

    await moveTask(page, "Graph task 1", "done");

    await expect(page.getByTestId("completion-pct")).toHaveText("50% complete");
  });

  test("chart renders on the page", async ({ page }) => {
    await page.goto("/");
    await waitForBoard(page);
    await expect(page.locator(".recharts-wrapper")).toBeVisible();
  });
});

// ─── Real-time sync ───────────────────────────────────────────────────────────

test.describe("Real-time sync — two tabs", () => {
  test("task added in one tab appears in another tab", async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto("/");
    await page2.goto("/");
    await waitForBoard(page1);
    await waitForBoard(page2);

    // Add a task in page1
    await addTask(page1, "Shared task");

    // It should appear in page2 via WebSocket broadcast
    await expect(page2.locator("text=Shared task")).toBeVisible({ timeout: 5000 });

    await context.close();
  });

  test("task deleted in one tab disappears in another tab", async ({ browser }) => {
    const context = await browser.newContext();
    const page1 = await context.newPage();
    const page2 = await context.newPage();

    await page1.goto("/");
    await page2.goto("/");
    await waitForBoard(page1);
    await waitForBoard(page2);

    await addTask(page1, "Will be deleted");
    await expect(page2.locator("text=Will be deleted")).toBeVisible({ timeout: 5000 });

    // Delete from page1
    const taskCard = page1.locator('[data-testid^="task-card-"]').filter({ hasText: "Will be deleted" });
    await taskCard.locator('[data-testid^="delete-task-"]').click();

    // Should disappear from page2
    await expect(page2.locator("text=Will be deleted")).not.toBeVisible({ timeout: 5000 });

    await context.close();
  });
});
