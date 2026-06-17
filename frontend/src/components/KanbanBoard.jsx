import React, { useState, useEffect } from "react";
import { DragDropContext, Droppable, Draggable } from "@hello-pangea/dnd";
import Select from "react-select";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import socket from "../services/socket";

const COLUMNS = [
  { id: "todo", label: "To Do" },
  { id: "inprogress", label: "In Progress" },
  { id: "done", label: "Done" },
];

const PRIORITIES = [
  { value: "Low", label: "Low" },
  { value: "Medium", label: "Medium" },
  { value: "High", label: "High" },
];

const CATEGORIES = [
  { value: "Bug", label: "Bug" },
  { value: "Feature", label: "Feature" },
  { value: "Enhancement", label: "Enhancement" },
];

const PRIORITY_COLORS = { Low: "#4caf50", Medium: "#ff9800", High: "#f44336" };

const DEFAULT_FORM = {
  title: "",
  description: "",
  priority: { value: "Medium", label: "Medium" },
  category: { value: "Feature", label: "Feature" },
};

const ALLOWED_TYPES = ["image/", "application/pdf", "application/msword", "application/vnd.openxmlformats-officedocument.wordprocessingml.document"];

function isAllowedFile(file) {
  return ALLOWED_TYPES.some((t) => file.type.startsWith(t));
}

function KanbanBoard() {
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState(DEFAULT_FORM);
  const [fileErrors, setFileErrors] = useState({});

  useEffect(() => {
    socket.on("sync:tasks", (allTasks) => {
      setTasks(allTasks);
      setLoading(false);
    });

    // The socket is a module-level singleton — it may have already connected
    // and received sync:tasks before this component mounted and registered the
    // listener above. Request tasks explicitly to handle that race condition.
    if (socket.connected) {
      socket.emit("get:tasks");
    }

    // Also re-request on reconnect
    socket.on("connect", () => {
      socket.emit("get:tasks");
    });

    socket.on("task:created", (task) => {
      setTasks((prev) => [...prev, task]);
    });

    socket.on("task:updated", (updated) => {
      setTasks((prev) => prev.map((t) => (t.id === updated.id ? updated : t)));
    });

    socket.on("task:moved", (moved) => {
      setTasks((prev) => prev.map((t) => (t.id === moved.id ? moved : t)));
    });

    socket.on("task:deleted", ({ id }) => {
      setTasks((prev) => prev.filter((t) => t.id !== id));
    });

    return () => {
      socket.off("sync:tasks");
      socket.off("connect");
      socket.off("task:created");
      socket.off("task:updated");
      socket.off("task:moved");
      socket.off("task:deleted");
    };
  }, []);

  const handleAddTask = () => {
    if (!form.title.trim()) return;
    socket.emit("task:create", {
      title: form.title.trim(),
      description: form.description.trim(),
      priority: form.priority.value,
      category: form.category.value,
      column: "todo",
    });
    setForm(DEFAULT_FORM);
  };

  const handleDelete = (id) => {
    socket.emit("task:delete", { id });
  };

  const handleDragEnd = (result) => {
    if (!result.destination) return;
    const { draggableId, destination } = result;
    const task = tasks.find((t) => t.id === draggableId);
    if (!task || task.column === destination.droppableId) return;
    socket.emit("task:move", { id: draggableId, column: destination.droppableId });
  };

  const handleFileUpload = (taskId, e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (!isAllowedFile(file)) {
      setFileErrors((prev) => ({ ...prev, [taskId]: `"${file.name}" is not supported. Please upload an image, PDF, or Word document.` }));
      e.target.value = "";
      return;
    }
    setFileErrors((prev) => { const next = { ...prev }; delete next[taskId]; return next; });
    const url = URL.createObjectURL(file);
    const task = tasks.find((t) => t.id === taskId);
    if (!task) return;
    socket.emit("task:update", {
      id: taskId,
      attachments: [...task.attachments, { name: file.name, url, type: file.type }],
    });
  };

  const chartData = COLUMNS.map((col) => ({
    name: col.label,
    count: tasks.filter((t) => t.column === col.id).length,
  }));

  const completionPct =
    tasks.length > 0
      ? Math.round((tasks.filter((t) => t.column === "done").length / tasks.length) * 100)
      : 0;

  if (loading) {
    return (
      <div data-testid="loading-indicator" style={{ textAlign: "center", padding: "2rem" }}>
        Connecting to server...
      </div>
    );
  }

  return (
    <div style={{ padding: "1rem", fontFamily: "sans-serif" }}>
      <h2>Kanban Board</h2>

      {/* Add Task Form */}
      <div
        data-testid="add-task-form"
        style={{
          display: "flex",
          gap: "0.5rem",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          alignItems: "center",
          background: "#f9f9f9",
          padding: "1rem",
          borderRadius: "8px",
        }}
      >
        <input
          data-testid="task-title-input"
          placeholder="Task title"
          value={form.title}
          onChange={(e) => setForm({ ...form, title: e.target.value })}
          onKeyDown={(e) => e.key === "Enter" && handleAddTask()}
          style={{ padding: "0.5rem", flex: 1, minWidth: "150px", borderRadius: "4px", border: "1px solid #ccc" }}
        />
        <input
          data-testid="task-description-input"
          placeholder="Description (optional)"
          value={form.description}
          onChange={(e) => setForm({ ...form, description: e.target.value })}
          style={{ padding: "0.5rem", flex: 1, minWidth: "150px", borderRadius: "4px", border: "1px solid #ccc" }}
        />
        <div style={{ minWidth: "140px" }} data-testid="priority-select-wrapper">
          <Select
            options={PRIORITIES}
            value={form.priority}
            onChange={(val) => setForm({ ...form, priority: val })}
            placeholder="Priority"
            inputId="priority-select"
          />
        </div>
        <div style={{ minWidth: "160px" }} data-testid="category-select-wrapper">
          <Select
            options={CATEGORIES}
            value={form.category}
            onChange={(val) => setForm({ ...form, category: val })}
            placeholder="Category"
            inputId="category-select"
          />
        </div>
        <button
          data-testid="add-task-btn"
          onClick={handleAddTask}
          style={{
            padding: "0.5rem 1.25rem",
            background: "#1976d2",
            color: "#fff",
            border: "none",
            borderRadius: "4px",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Add Task
        </button>
      </div>

      {/* Kanban Columns */}
      <DragDropContext onDragEnd={handleDragEnd}>
        <div style={{ display: "flex", gap: "1rem" }}>
          {COLUMNS.map((col) => {
            const colTasks = tasks.filter((t) => t.column === col.id);
            return (
              <div
                key={col.id}
                style={{
                  flex: 1,
                  background: "#f4f5f7",
                  borderRadius: "8px",
                  padding: "1rem",
                  minHeight: "300px",
                }}
              >
                <h3 style={{ marginTop: 0 }}>
                  {col.label}{" "}
                  <span
                    style={{
                      background: "#e0e0e0",
                      borderRadius: "12px",
                      padding: "2px 8px",
                      fontSize: "0.85rem",
                      fontWeight: "normal",
                    }}
                  >
                    {colTasks.length}
                  </span>
                </h3>
                <Droppable droppableId={col.id}>
                  {(provided, snapshot) => (
                    <div
                      ref={provided.innerRef}
                      {...provided.droppableProps}
                      data-testid={`column-${col.id}`}
                      style={{
                        minHeight: "100px",
                        background: snapshot.isDraggingOver ? "#e8f0fe" : "transparent",
                        borderRadius: "4px",
                        padding: "4px",
                        transition: "background 0.2s",
                      }}
                    >
                      {colTasks.map((task, index) => (
                        <Draggable key={task.id} draggableId={task.id} index={index}>
                          {(provided, snapshot) => (
                            <div
                              ref={provided.innerRef}
                              {...provided.draggableProps}
                              {...provided.dragHandleProps}
                              data-testid={`task-card-${task.id}`}
                              style={{
                                background: snapshot.isDragging ? "#e3f2fd" : "#fff",
                                border: "1px solid #ddd",
                                borderRadius: "6px",
                                padding: "0.75rem",
                                marginBottom: "0.5rem",
                                boxShadow: snapshot.isDragging
                                  ? "0 4px 12px rgba(0,0,0,0.15)"
                                  : "0 1px 3px rgba(0,0,0,0.06)",
                                ...provided.draggableProps.style,
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start" }}>
                                <strong style={{ fontSize: "0.95rem" }}>{task.title}</strong>
                                <button
                                  data-testid={`delete-task-${task.id}`}
                                  onClick={() => handleDelete(task.id)}
                                  style={{
                                    background: "none",
                                    border: "none",
                                    cursor: "pointer",
                                    color: "#aaa",
                                    fontSize: "1rem",
                                    lineHeight: 1,
                                    padding: 0,
                                  }}
                                  aria-label="Delete task"
                                >
                                  ✕
                                </button>
                              </div>

                              {task.description && (
                                <p style={{ margin: "0.25rem 0 0.5rem", fontSize: "0.82rem", color: "#666" }}>
                                  {task.description}
                                </p>
                              )}

                              <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap", marginTop: "0.4rem" }}>
                                <span
                                  data-testid={`task-priority-${task.id}`}
                                  style={{
                                    fontSize: "0.72rem",
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    background: PRIORITY_COLORS[task.priority] || "#ccc",
                                    color: "#fff",
                                  }}
                                >
                                  {task.priority}
                                </span>
                                <span
                                  data-testid={`task-category-${task.id}`}
                                  style={{
                                    fontSize: "0.72rem",
                                    padding: "2px 8px",
                                    borderRadius: "12px",
                                    background: "#e0e0e0",
                                    color: "#444",
                                  }}
                                >
                                  {task.category}
                                </span>
                              </div>

                              {/* Move to column */}
                              <select
                                data-testid={`move-task-${task.id}`}
                                value=""
                                onChange={(e) => {
                                  if (e.target.value)
                                    socket.emit("task:move", { id: task.id, column: e.target.value });
                                }}
                                style={{
                                  marginTop: "0.5rem",
                                  fontSize: "0.72rem",
                                  width: "100%",
                                  padding: "2px 4px",
                                  borderRadius: "4px",
                                  border: "1px solid #ddd",
                                  cursor: "pointer",
                                }}
                              >
                                <option value="">Move to…</option>
                                {COLUMNS.filter((c) => c.id !== task.column).map((c) => (
                                  <option key={c.id} value={c.id}>{c.label}</option>
                                ))}
                              </select>

                              {/* File Upload */}
                              <div style={{ marginTop: "0.5rem" }}>
                                <label
                                  style={{ fontSize: "0.75rem", cursor: "pointer", color: "#1976d2" }}
                                  data-testid={`file-upload-label-${task.id}`}
                                >
                                  + Attach file
                                  <input
                                    type="file"
                                    style={{ display: "none" }}
                                    data-testid={`file-upload-${task.id}`}
                                    onChange={(e) => handleFileUpload(task.id, e)}
                                  />
                                </label>
                                {fileErrors[task.id] && (
                                  <p
                                    data-testid={`file-error-${task.id}`}
                                    style={{ margin: "4px 0 0", fontSize: "0.72rem", color: "#d32f2f" }}
                                  >
                                    {fileErrors[task.id]}
                                  </p>
                                )}
                                {task.attachments.map((att, i) => (
                                  <div key={i} style={{ marginTop: "4px" }}>
                                    {att.type.startsWith("image/") ? (
                                      <img
                                        src={att.url}
                                        alt={att.name}
                                        style={{ maxWidth: "100%", maxHeight: "80px", borderRadius: "4px" }}
                                      />
                                    ) : (
                                      <a
                                        href={att.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        style={{ fontSize: "0.75rem", color: "#1976d2" }}
                                      >
                                        {att.name}
                                      </a>
                                    )}
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                        </Draggable>
                      ))}
                      {provided.placeholder}
                    </div>
                  )}
                </Droppable>
              </div>
            );
          })}
        </div>
      </DragDropContext>

      {/* Progress Chart */}
      <div style={{ marginTop: "2rem" }}>
        <h3>Task Progress</h3>
        <ResponsiveContainer width="100%" height={200}>
          <BarChart data={chartData} data-testid="progress-chart">
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="name" />
            <YAxis allowDecimals={false} />
            <Tooltip />
            <Bar dataKey="count" fill="#1976d2" radius={[4, 4, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
        <p
          data-testid="completion-pct"
          style={{ textAlign: "center", color: "#555", fontWeight: "bold" }}
        >
          {tasks.length > 0 ? `${completionPct}% complete` : "No tasks yet"}
        </p>
      </div>
    </div>
  );
}

export default KanbanBoard;
