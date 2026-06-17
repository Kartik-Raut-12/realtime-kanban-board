import { io } from "socket.io-client";

const socket = io("https://realtime-kanban-board-production.up.railway.app");

export default socket;
