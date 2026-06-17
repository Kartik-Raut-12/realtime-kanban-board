const express = require("express");
const http = require("http");
const { Server } = require("socket.io");
const { randomUUID } = require("crypto");

const app = express();
app.use(express.json());
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: "*" } });

// In-memory task store: { [id]: { id, title, description, priority, category, column, attachments } }
const tasks = {};

// Test-only reset endpoint — only active when NODE_ENV=test
if (process.env.NODE_ENV === "test") {
  app.post("/test/reset", (req, res) => {
    Object.keys(tasks).forEach((id) => delete tasks[id]);
    io.emit("sync:tasks", []);
    res.json({ ok: true });
  });
}

io.on("connection", (socket) => {
  console.log("A user connected:", socket.id);

  // Send all existing tasks to the newly connected client
  socket.emit("sync:tasks", Object.values(tasks));

  // Re-send all tasks on explicit request (handles race condition where
  // sync:tasks fires before the client's listener is registered)
  socket.on("get:tasks", () => {
    socket.emit("sync:tasks", Object.values(tasks));
  });

  // Clear all tasks — used by E2E tests to reset state between runs
  socket.on("tasks:clear", () => {
    Object.keys(tasks).forEach((id) => delete tasks[id]);
    io.emit("sync:tasks", []);
  });

  // Create a new task
  socket.on("task:create", (data, callback) => {
    const task = {
      id: randomUUID(),
      title: data.title || "Untitled",
      description: data.description || "",
      priority: data.priority || "Medium",
      category: data.category || "Feature",
      column: data.column || "todo",
      attachments: data.attachments || [],
    };
    tasks[task.id] = task;
    io.emit("task:created", task);
    if (callback) callback({ success: true, task });
  });

  // Update an existing task
  socket.on("task:update", (data, callback) => {
    const task = tasks[data.id];
    if (!task) {
      if (callback) callback({ success: false, error: "Task not found" });
      return;
    }
    Object.assign(task, {
      title: data.title ?? task.title,
      description: data.description ?? task.description,
      priority: data.priority ?? task.priority,
      category: data.category ?? task.category,
      attachments: data.attachments ?? task.attachments,
    });
    io.emit("task:updated", task);
    if (callback) callback({ success: true, task });
  });

  // Move a task to a different column
  socket.on("task:move", (data, callback) => {
    const task = tasks[data.id];
    if (!task) {
      if (callback) callback({ success: false, error: "Task not found" });
      return;
    }
    task.column = data.column;
    io.emit("task:moved", task);
    if (callback) callback({ success: true, task });
  });

  // Delete a task
  socket.on("task:delete", (data, callback) => {
    const task = tasks[data.id];
    if (!task) {
      if (callback) callback({ success: false, error: "Task not found" });
      return;
    }
    delete tasks[data.id];
    io.emit("task:deleted", { id: data.id });
    if (callback) callback({ success: true });
  });

  socket.on("disconnect", () => {
    console.log("User disconnected:", socket.id);
  });
});

server.listen(5000, () => console.log("Server running on port 5000"));
