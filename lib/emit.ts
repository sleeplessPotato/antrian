import type { Server as SocketIOServer } from "socket.io";

export function getIO(): SocketIOServer | null {
  return (global as any).io ?? null;
}

export function emitQueueUpdate(event: string, data: unknown) {
  const io = getIO();
  if (io) {
    io.emit(event, data);
  }
}
