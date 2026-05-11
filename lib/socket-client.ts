"use client";
import { io, Socket } from "socket.io-client";

let socket: Socket | null = null;

export function getSocket(): Socket {
  if (!socket) {
    socket = io(window.location.origin, {
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
  }
  return socket;
}

export function emitToAll(event: string, data?: unknown) {
  const s = getSocket();
  s.emit(event, data);
}
