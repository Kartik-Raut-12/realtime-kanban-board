import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import KanbanBoard from "../../components/KanbanBoard.jsx";

// Mock ResizeObserver (required by recharts in jsdom)
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Hoist mock so it's available before module imports are resolved
const mockSocket = vi.hoisted(() => {
  const listeners = {};
  return {
    on: vi.fn((event, cb) => {
      listeners[event] = cb;
    }),
    off: vi.fn(),
    emit: vi.fn(),
    // helper: trigger a socket event from tests
    _trigger: (event, data) => {
      if (listeners[event]) listeners[event](data);
    },
  };
});

vi.mock("../../services/socket", () => ({ default: mockSocket }));

// Helper: render the board and immediately sync tasks
const renderWithTasks = async (tasks = []) => {
  render(<KanbanBoard />);
  act(() => mockSocket._trigger("sync:tasks", tasks));
  await waitFor(() => expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument());
};

const sampleTask = {
  id: "task-1",
  title: "Fix login bug",
  description: "Auth fails on Safari",
  priority: "High",
  category: "Bug",
  column: "todo",
  attachments: [],
};

beforeEach(() => {
  mockSocket.emit.mockClear();
  mockSocket.on.mockClear();
  mockSocket.off.mockClear();
});

describe("KanbanBoard — rendering", () => {
  it("shows loading indicator before sync:tasks is received", () => {
    render(<KanbanBoard />);
    expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
  });

  it("renders board title", async () => {
    await renderWithTasks();
    expect(screen.getByText("Kanban Board")).toBeInTheDocument();
  });

  it("renders all three columns", async () => {
    await renderWithTasks();
    expect(screen.getByText(/To Do/i)).toBeInTheDocument();
    expect(screen.getByText(/In Progress/i)).toBeInTheDocument();
    expect(screen.getByText(/Done/i)).toBeInTheDocument();
  });

  it("renders tasks received from sync:tasks", async () => {
    await renderWithTasks([sampleTask]);
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
  });

  it("shows 'No tasks yet' when board is empty", async () => {
    await renderWithTasks([]);
    expect(screen.getByTestId("completion-pct")).toHaveTextContent("No tasks yet");
  });

  it("shows correct completion percentage", async () => {
    const tasks = [
      { ...sampleTask, id: "t1", column: "done" },
      { ...sampleTask, id: "t2", column: "todo" },
    ];
    await renderWithTasks(tasks);
    expect(screen.getByTestId("completion-pct")).toHaveTextContent("50% complete");
  });
});

describe("KanbanBoard — add task", () => {
  it("emits task:create with correct data when Add Task is clicked", async () => {
    await renderWithTasks();
    fireEvent.change(screen.getByTestId("task-title-input"), {
      target: { value: "New feature" },
    });
    fireEvent.click(screen.getByTestId("add-task-btn"));
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "task:create",
      expect.objectContaining({ title: "New feature", column: "todo" })
    );
  });

  it("does not emit task:create when title is empty", async () => {
    await renderWithTasks();
    fireEvent.click(screen.getByTestId("add-task-btn"));
    expect(mockSocket.emit).not.toHaveBeenCalled();
  });

  it("clears the title input after adding a task", async () => {
    await renderWithTasks();
    const input = screen.getByTestId("task-title-input");
    fireEvent.change(input, { target: { value: "My task" } });
    fireEvent.click(screen.getByTestId("add-task-btn"));
    expect(input.value).toBe("");
  });

  it("emits task:create when Enter is pressed in title input", async () => {
    await renderWithTasks();
    fireEvent.change(screen.getByTestId("task-title-input"), {
      target: { value: "Keyboard task" },
    });
    fireEvent.keyDown(screen.getByTestId("task-title-input"), { key: "Enter" });
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "task:create",
      expect.objectContaining({ title: "Keyboard task" })
    );
  });

  it("emits task:create with description when provided", async () => {
    await renderWithTasks();
    fireEvent.change(screen.getByTestId("task-title-input"), {
      target: { value: "Task with desc" },
    });
    fireEvent.change(screen.getByTestId("task-description-input"), {
      target: { value: "Some description" },
    });
    fireEvent.click(screen.getByTestId("add-task-btn"));
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "task:create",
      expect.objectContaining({ title: "Task with desc", description: "Some description" })
    );
  });
});

describe("KanbanBoard — delete task", () => {
  it("emits task:delete with correct id when delete button is clicked", async () => {
    await renderWithTasks([sampleTask]);
    fireEvent.click(screen.getByTestId(`delete-task-${sampleTask.id}`));
    expect(mockSocket.emit).toHaveBeenCalledWith("task:delete", { id: sampleTask.id });
  });
});

describe("KanbanBoard — real-time socket events", () => {
  it("adds a task to the board when task:created is received", async () => {
    await renderWithTasks([]);
    act(() =>
      mockSocket._trigger("task:created", {
        ...sampleTask,
        id: "new-1",
        title: "Realtime task",
      })
    );
    expect(await screen.findByText("Realtime task")).toBeInTheDocument();
  });

  it("removes a task from the board when task:deleted is received", async () => {
    await renderWithTasks([sampleTask]);
    expect(screen.getByText("Fix login bug")).toBeInTheDocument();
    act(() => mockSocket._trigger("task:deleted", { id: sampleTask.id }));
    await waitFor(() =>
      expect(screen.queryByText("Fix login bug")).not.toBeInTheDocument()
    );
  });

  it("updates task data when task:updated is received", async () => {
    await renderWithTasks([sampleTask]);
    act(() =>
      mockSocket._trigger("task:updated", { ...sampleTask, title: "Updated title" })
    );
    expect(await screen.findByText("Updated title")).toBeInTheDocument();
  });

  it("moves a task to the correct column when task:moved is received", async () => {
    await renderWithTasks([sampleTask]);
    act(() =>
      mockSocket._trigger("task:moved", { ...sampleTask, column: "done" })
    );
    await waitFor(() => {
      const doneColumn = screen.getByTestId("column-done");
      expect(doneColumn).toHaveTextContent("Fix login bug");
    });
  });
});

describe("KanbanBoard — task display", () => {
  it("displays task priority badge", async () => {
    await renderWithTasks([sampleTask]);
    expect(screen.getByTestId(`task-priority-${sampleTask.id}`)).toHaveTextContent("High");
  });

  it("displays task category badge", async () => {
    await renderWithTasks([sampleTask]);
    expect(screen.getByTestId(`task-category-${sampleTask.id}`)).toHaveTextContent("Bug");
  });

  it("displays task description when present", async () => {
    await renderWithTasks([sampleTask]);
    expect(screen.getByText("Auth fails on Safari")).toBeInTheDocument();
  });

  it("places task in correct column based on column field", async () => {
    const inProgressTask = { ...sampleTask, id: "t2", column: "inprogress" };
    await renderWithTasks([inProgressTask]);
    const col = screen.getByTestId("column-inprogress");
    expect(col).toHaveTextContent("Fix login bug");
  });
});

describe("KanbanBoard — WebSocket connection lifecycle", () => {
  it("registers all required socket event listeners on mount", async () => {
    await renderWithTasks([]);
    const registeredEvents = mockSocket.on.mock.calls.map((c) => c[0]);
    expect(registeredEvents).toContain("sync:tasks");
    expect(registeredEvents).toContain("task:created");
    expect(registeredEvents).toContain("task:updated");
    expect(registeredEvents).toContain("task:moved");
    expect(registeredEvents).toContain("task:deleted");
  });

  it("deregisters all socket listeners on unmount", async () => {
    const { unmount } = render(<KanbanBoard />);
    act(() => mockSocket._trigger("sync:tasks", []));
    unmount();
    expect(mockSocket.off).toHaveBeenCalledWith("sync:tasks");
    expect(mockSocket.off).toHaveBeenCalledWith("task:created");
    expect(mockSocket.off).toHaveBeenCalledWith("task:updated");
    expect(mockSocket.off).toHaveBeenCalledWith("task:moved");
    expect(mockSocket.off).toHaveBeenCalledWith("task:deleted");
  });
});
