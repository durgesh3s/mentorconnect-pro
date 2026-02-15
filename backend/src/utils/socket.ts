import { Server as HTTPServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';

let io: SocketIOServer | null = null;

/**
 * Initialize Socket.io server
 */
export function initializeSocket(server: HTTPServer): SocketIOServer {
  io = new SocketIOServer(server, {
    cors: {
      origin: '*',
      methods: ['GET', 'POST'],
    },
  });

  io.on('connection', (socket: Socket) => {
    console.log(`[Socket.IO] Client connected: ${socket.id}`);

    // Join user to their own room for personalized updates
    socket.on('join:user', (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`[Socket.IO] User ${userId} joined their room`);
    });

    // Leave user room
    socket.on('leave:user', (userId: string) => {
      socket.leave(`user:${userId}`);
      console.log(`[Socket.IO] User ${userId} left their room`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket.IO] Client disconnected: ${socket.id}`);
    });
  });

  return io;
}

/**
 * Get the Socket.io instance
 */
export function getIO(): SocketIOServer | null {
  return io;
}

/**
 * Emit event to a specific user
 */
export function emitToUser(userId: string, event: string, data: any): void {
  if (io) {
    io.to(`user:${userId}`).emit(event, data);
  }
}

/**
 * Emit event to all connected clients
 */
export function emitToAll(event: string, data: any): void {
  if (io) {
    io.emit(event, data);
  }
}
