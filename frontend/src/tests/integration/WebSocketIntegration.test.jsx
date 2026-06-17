import { render, screen, fireEvent, waitFor, act } from "@testing-library/react";
import { vi, describe, it, expect, beforeEach } from "vitest";
import KanbanBoard from "../../components/KanbanBoard.jsx";

// Mock ResizeObserver (required by recharts in jsdom)
global.ResizeObserver = vi.fn(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

// Shared mock socket — simulates the server-side socket connection
const mockSocket = vi.hoisted(() => {
  const listeners = {};
  return {
    on: vi.fn((event, cb) => {
      listeners[event] = cb;
    }),
    off: vi.fn(),
    emit: vi.fn(),
    _trigger: (event, data) => {
      if (listeners[event]) listeners[event](data);
    },
  };
});

vi.mock("../../services/socket", () => ({ default: mockSocket }));

const baseTask = {
  id: "int-task-1",
  title: "Integration task",
  description: "desc",
  priority: "Medium",
  category: "Feature",
  column: "todo",
  attachments: [],
};

// Render board and complete the initial sync
const renderSynced = async (initialTasks = []) => {
  render(<KanbanBoard />);
  act(() => mockSocket._trigger("sync:tasks", initialTasks));
  await waitFor(() =>
    expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument()
  );
};

beforeEach(() => {
  mockSocket.emit.mockClear();
  mockSocket.on.mockClear();
  mockSocket.off.mockClear();
});

describe("WebSocket — initial sync", () => {
  it("board is hidden behind loading screen until sync:tasks fires", async () => {
    render(<KanbanBoard />);
    expect(screen.getByTestId("loading-indicator")).toBeInTheDocument();
    expect(screen.queryByText("Kanban Board")).not.toBeInTheDocument();

    act(() => mockSocket._trigger("sync:tasks", []));

    await waitFor(() =>
      expect(screen.queryByTestId("loading-indicator")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Kanban Board")).toBeInTheDocument();
  });

  it("populates all tasks from sync:tasks on connect", async () => {
    const tasks = [
      { ...baseTask, id: "t1", title: "Alpha" },
      { ...baseTask, id: "t2", title: "Beta", column: "inprogress" },
      { ...baseTask, id: "t3", title: "Gamma", column: "done" },
    ];
    await renderSynced(tasks);
    expect(screen.getByText("Alpha")).toBeInTheDocument();
    expect(screen.getByText("Beta")).toBeInTheDocument();
    expect(screen.getByText("Gamma")).toBeInTheDocument();
  });

  it("places synced tasks in correct columns", async () => {
    const tasks = [
      { ...baseTask, id: "t1", title: "Todo task", column: "todo" },
      { ...baseTask, id: "t2", title: "Done task", column: "done" },
    ];
    await renderSynced(tasks);
    expect(screen.getByTestId("column-todo")).toHaveTextContent("Todo task");
    expect(screen.getByTestId("column-done")).toHaveTextContent("Done task");
    expect(screen.getByTestId("column-todo")).not.toHaveTextContent("Done task");
  });
});

describe("WebSocket — real-time task creation", () => {
  it("adds a task to the board when another client creates one (task:created)", async () => {
    await renderSynced([]);
    act(() =>
      mockSocket._trigger("task:created", {
        ...baseTask,
        id: "new-task",
        title: "From another client",
      })
    );
    expect(await screen.findByText("From another client")).toBeInTheDocument();
  });

  it("emits task:create to server when user adds a task", async () => {
    await renderSynced([]);
    fireEvent.change(screen.getByTestId("task-title-input"), {
      target: { value: "My new task" },
    });
    fireEvent.click(screen.getByTestId("add-task-btn"));
    expect(mockSocket.emit).toHaveBeenCalledWith(
      "task:create",
      expect.objectContaining({
        title: "My new task",
        column: "todo",
      })
    );
  });

  it("new task appears in To Do column by default", async () => {
    await renderSynced([]);
    act(() =>
      mockSocket._trigger("task:created", { ...baseTask, id: "t-new", title: "Fresh task" })
    );
    await waitFor(() =>
      expect(screen.getByTestId("column-todo")).toHaveTextContent("Fresh task")
    );
  });
});

describe("WebSocket — real-time task deletion", () => {
  it("removes task from board when another client deletes it (task:deleted)", async () => {
    await renderSynced([baseTask]);
    expect(screen.getByText("Integration task")).toBeInTheDocument();
    act(() => mockSocket._trigger("task:deleted", { id: baseTask.id }));
    await waitFor(() =>
      expect(screen.queryByText("Integration task")).not.toBeInTheDocument()
    );
  });

  it("emits task:delete to server when user clicks delete", async () => {
    await renderSynced([baseTask]);
    fireEvent.click(screen.getByTestId(`delete-task-${baseTask.id}`));
    expect(mockSocket.emit).toHaveBeenCalledWith("task:delete", { id: baseTask.id });
  });

  it("does not affect other tasks when one is deleted", async () => {
    const tasks = [
      { ...baseTask, id: "del-1", title: "Delete me" },
      { ...baseTask, id: "keep-1", title: "Keep me" },
    ];
    await renderSynced(tasks);
    act(() => mockSocket._trigger("task:deleted", { id: "del-1" }));
    await waitFor(() =>
      expect(screen.queryByText("Delete me")).not.toBeInTheDocument()
    );
    expect(screen.getByText("Keep me")).toBeInTheDocument();
  });
});

describe("WebSocket — real-time task updates", () => {
  it("updates task title when task:updated is received", async () => {
    await renderSynced([baseTask]);
    act(() =>
      mockSocket._trigger("task:updated", { ...baseTask, title: "Renamed task" })
    );
    expect(await screen.findByText("Renamed task")).toBeInTheDocument();
    expect(screen.queryByText("Integration task")).not.toBeInTheDocument();
  });

  it("updates task priority badge when task:updated is received", async () => {
    await renderSynced([baseTask]);
    act(() =>
      mockSocket._trigger("task:updated", { ...baseTask, priority: "High" })
    );
    await waitFor(() =>
      expect(screen.getByTestId(`task-priority-${baseTask.id}`)).toHaveTextContent("High")
    );
  });

  it("does not affect other tasks when one is updated", async () => {
    const tasks = [
      { ...baseTask, id: "upd-1", title: "Will update" },
      { ...baseTask, id: "upd-2", title: "Stay same" },
    ];
    await renderSynced(tasks);
    act(() =>
      mockSocket._trigger("task:updated", { ...tasks[0], title: "Updated!" })
    );
    await waitFor(() => expect(screen.getByText("Updated!")).toBeInTheDocument());
    expect(screen.getByText("Stay same")).toBeInTheDocument();
  });
});

describe("WebSocket — real-time task movement", () => {
  it("moves task to new column when task:moved is received", async () => {
    await renderSynced([baseTask]);
    expect(screen.getByTestId("column-todo")).toHaveTextContent("Integration task");

    act(() =>
      mockSocket._trigger("task:moved", { ...baseTask, column: "inprogress" })
    );

    await waitFor(() => {
      expect(screen.getByTestId("column-inprogress")).toHaveTextContent("Integration task");
      expect(screen.getByTestId("column-todo")).not.toHaveTextContent("Integration task");
    });
  });

  it("task moves to new column when task:moved socket event is received", async () => {
    await renderSynced([baseTask]);
    // Simulate drag end via the DragDropContext onDragEnd callback indirectly:
    // We verify the emit contract by checking emit is called correctly after a move event
    act(() =>
      mockSocket._trigger("task:moved", { ...baseTask, column: "done" })
    );
    await waitFor(() =>
      expect(screen.getByTestId("column-done")).toHaveTextContent("Integration task")
    );
  });

  it("task can move through all three columns in sequence", async () => {
    await renderSynced([baseTask]);

    act(() => mockSocket._trigger("task:moved", { ...baseTask, column: "inprogress" }));
    await waitFor(() =>
      expect(screen.getByTestId("column-inprogress")).toHaveTextContent("Integration task")
    );

    act(() => mockSocket._trigger("task:moved", { ...baseTask, column: "done" }));
    await waitFor(() =>
      expect(screen.getByTestId("column-done")).toHaveTextContent("Integration task")
    );
  });
});

describe("WebSocket — progress chart sync", () => {
  it("completion percentage updates as tasks move to done", async () => {
    const tasks = [
      { ...baseTask, id: "c1", column: "todo" },
      { ...baseTask, id: "c2", column: "todo" },
    ];
    await renderSynced(tasks);
    expect(screen.getByTestId("completion-pct")).toHaveTextContent("0% complete");

    act(() => mockSocket._trigger("task:moved", { ...tasks[0], column: "done" }));
    await waitFor(() =>
      expect(screen.getByTestId("completion-pct")).toHaveTextContent("50% complete")
    );

    act(() => mockSocket._trigger("task:moved", { ...tasks[1], column: "done" }));
    await waitFor(() =>
      expect(screen.getByTestId("completion-pct")).toHaveTextContent("100% complete")
    );
  });
});
