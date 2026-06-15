import { render, screen } from "@testing-library/react";

import KanbanBoard from "../../src/components/KanbanBoard.jsx";

test("renders Kanban board title", () => {
  render(<KanbanBoard />);
  expect(screen.getByText("Kanban Board")).toBeInTheDocument();
});

// TODO: Add more unit tests for individual components
