# 📝 WebSocket-Powered Kanban Board - Candidate Guide

## 📌 Project Overview

This project involves building a **real-time Kanban board** where users can **add, update, delete, move tasks between columns, upload attachments, assign priority & category, and visualize progress**.

The goal is to assess proficiency in:  
✅ **React** (for UI)  
✅ **WebSockets (Socket.IO)** (for real-time updates)  
✅ **Vitest + React Testing Library** (for unit & integration testing)  
✅ **Playwright** (for end-to-end testing)

---

## 📂 Project Structure

```
websocket-kanban-vitest-playwright
│── backend/                     # Node.js WebSocket server
│   ├── server.js                 # Express + Socket.IO WebSocket setup
│   ├── package.json              # Backend dependencies
│
│── frontend/                     # React app
│   ├── src/
│   │   ├── components/           # UI components
│   │   │   ├── KanbanBoard.jsx
│   │   ├── tests/                # All test cases
│   │   │   ├── unit/             # Unit tests (Vitest)
│   │   │   ├── integration/      # Integration tests (Vitest)
│   │   │   ├── e2e/              # End-to-end tests (Playwright)
│   ├── package.json
│
└── README.md                     # Project guide
```

---

## 📌 What is Kanban?

Kanban is a **workflow management system** that visually organizes tasks into columns representing different stages of work.

### 🏗 Example Board:

```
To Do       In Progress      Done
----------------------------------
Task A   →  Task B        →  Task C
Task D   →  Task E        →  Task F
```

### 🔍 Reference Applications:

| Kanban App      | Description                 | Link                                                                   |
| --------------- | --------------------------- | ---------------------------------------------------------------------- |
| **Trello**      | Task management tool        | [trello.com](https://trello.com/)                                      |
| **Jira Kanban** | Agile development workflows | [atlassian.com/software/jira](https://www.atlassian.com/software/jira) |
| **ClickUp**     | Project management tool     | [clickup.com](https://www.clickup.com/)                                |

🔗 **Open-source Kanban boards:**

- **[Wekan](https://github.com/wekan/wekan)** – Self-hosted Trello alternative
- **[Planka](https://github.com/plankanban/planka)** – Open-source React Kanban

---

## 🚀 Take Home Task

### 🔹 Features to Implement

- Create, update, delete, and move tasks between columns.
- Upload attachments for tasks.
- Assign task priority & category using a select dropdown.
- Visualize task progress using a graph/chart.
- Sync updates in real-time using WebSockets.
- Test the application using Vitest + React testing library (unit/integration) and Playwright (E2E tests).

### 1️⃣ Backend (Node.js + WebSocket)

- Set up a WebSocket (Socket.IO or native WebSockets) server.
- Store tasks in memory or use a database (MongoDB preferred).
- Implement WebSocket events for:
  - `task:create` → Adds a new task.
  - `task:update` → Updates a task (title, description, priority, category, attachments).
  - `task:move` → Moves a task between columns.
  - `task:delete` → Removes a task.
  - `sync:tasks` → Sends all tasks to newly connected clients.

### 2️⃣ Frontend (React + WebSocket)

Kanban Board Features:

- Implement a Kanban board UI with the following columns:
  - To Do
  - In Progress
  - Done
- Tasks should be draggable between columns using React DnD or a similar library.
- The UI should update in real-time when a user makes changes.
- Display a loading indicator when waiting for the server to sync.

Additional UI Features:

1. **Priority & Category Selection (Dropdown)**

   - Each task should have a priority (Low, Medium, High).
   - Each task should have a category (Bug, Feature, Enhancement).
   - Implement using a React select dropdown (e.g., react-select).

2. **File Upload**

   - Users can upload attachments (e.g., images, PDFs) to tasks.
   - Show a preview of the uploaded file (if it's an image).
   - Store the file URL in state (simulated backend storage).

3. **Task Progress Graph (Chart.js or Recharts)**
   - Implement a task progress chart that shows:
     - Number of tasks in each column.
     - The percentage of completion (Done vs. total tasks).
   - Update the graph in real-time as tasks move.

### 3️⃣ Unit & Integration Testing (Vitest + React Testing Library)

- Unit test core functions:
  - Adding, updating, and deleting tasks.
  - WebSocket connection logic.
- Integration test:
  - Ensure WebSocket updates correctly sync state across multiple clients.
  - Validate drag-and-drop functionality for moving tasks.

### 4️⃣ E2E Testing (Playwright)

✅ **Kanban Board**

- User can create a task.
- User can drag and drop a task between columns.
- UI updates in real-time when another user modifies tasks.
- User can delete a task and see it removed.

✅ **Dropdown Select Testing**

- User can select a priority level.
- User can change the task category and verify the update.

✅ **File Upload Testing**

- User can upload a file.
- Uploaded files display correctly.
- Invalid files (e.g., non-supported formats) show an error message.

✅ **Graph Testing**

- Task counts update correctly in the graph as tasks move.
- Graph re-renders dynamically when new tasks are added.

---

## 📊 Evaluation Criteria

| **Criteria**                      | **Weightage** | **Key Points**                                     |
| --------------------------------- | ------------- | -------------------------------------------------- |
| **WebSocket Implementation**      | 10%           | Real-time updates, event handling, error handling  |
| **React Component Structure**     | 10%           | Proper separation of concerns, reusable components |
| **Testing**                       | 50%           | Unit, integration, and E2E tests passing           |
| **Code Quality & Best Practices** | 20%           | Clean, well-documented, readable code              |
| **UI & UX**                       | 10%           | Intuitive design, responsive layout                |

---

## 🔗 Useful Resources

📘 **Kanban & WebSockets**

- [What is Kanban? (Atlassian)](https://www.atlassian.com/agile/kanban)
- [WebSockets in Node.js (MDN)](https://developer.mozilla.org/en-US/docs/Web/API/WebSockets_API)

🧪 **Vitest (Unit & Integration Testing)**

- [Frontend Testing Guide](https://www.netguru.com/blog/front-end-testing)
- [Vitest Docs](https://vitest.dev/)
- [React Testing Library](https://testing-library.com/docs/react-testing-library/intro/)

🎭 **Playwright (E2E Testing)**

- [Playwright Docs](https://playwright.dev/)

---

## 🚀 Next Steps for Candidates

🎯 Implement **WebSocket logic** in the Kanban board  
🎯 Add **state management** for tasks  
🎯 Write **unit, integration, and E2E tests**  
🎯 Deploy and verify real-time updates

🛠 **Final Tip:** Pay attention to **code quality, real-time interactions, and testing coverage**. Good luck! 🚀
