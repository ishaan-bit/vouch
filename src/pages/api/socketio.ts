import { Server as NetServer } from "http";
import { Server as SocketIOServer } from "socket.io";
import type { NextApiRequest, NextApiResponse } from "next";

export const config = {
  api: {
    bodyParser: false,
  },
};

export type NextApiResponseWithSocket = NextApiResponse & {
  socket: {
    server: NetServer & {
      io?: SocketIOServer;
    };
  };
};

const SocketHandler = (req: NextApiRequest, res: NextApiResponseWithSocket) => {
  if (res.socket.server.io) {
    console.log("Socket is already running");
    res.end();
    return;
  }

  console.log("Initializing Socket.IO...");
  const io = new SocketIOServer(res.socket.server as NetServer, {
    path: "/api/socketio",
    addTrailingSlash: false,
  });

  res.socket.server.io = io;

  io.on("connection", (socket) => {
    console.log("Client connected:", socket.id);

    // Join user to their personal room
    socket.on("join-user", (userId: string) => {
      socket.join(`user:${userId}`);
      console.log(`User ${userId} joined their room`);
    });

    // Join group room
    socket.on("join-group", (groupId: string) => {
      socket.join(`group:${groupId}`);
      console.log(`Socket ${socket.id} joined group ${groupId}`);
    });

    // Leave group room
    socket.on("leave-group", (groupId: string) => {
      socket.leave(`group:${groupId}`);
      console.log(`Socket ${socket.id} left group ${groupId}`);
    });

    // Join DM thread
    socket.on("join-dm", (threadId: string) => {
      socket.join(`dm:${threadId}`);
      console.log(`Socket ${socket.id} joined DM ${threadId}`);
    });

    // Leave DM thread
    socket.on("leave-dm", (threadId: string) => {
      socket.leave(`dm:${threadId}`);
      console.log(`Socket ${socket.id} left DM ${threadId}`);
    });

    // Handle new message
    socket.on("send-message", (data: {
      threadId?: string;
      groupId?: string;
      message: Record<string, unknown>;
    }) => {
      if (data.threadId) {
        socket.to(`dm:${data.threadId}`).emit("new-message", data.message);
      }
      if (data.groupId) {
        socket.to(`group:${data.groupId}`).emit("new-message", data.message);
      }
    });

    // Handle typing indicator
    socket.on("typing", (data: {
      threadId?: string;
      groupId?: string;
      userId: string;
      isTyping: boolean;
    }) => {
      if (data.threadId) {
        socket.to(`dm:${data.threadId}`).emit("user-typing", data);
      }
      if (data.groupId) {
        socket.to(`group:${data.groupId}`).emit("user-typing", data);
      }
    });

    // Handle call signaling
    socket.on("call-signal", (data: {
      groupId: string;
      signal: unknown;
      from: string;
    }) => {
      socket.to(`group:${data.groupId}`).emit("call-signal", data);
    });

    // Handle call events
    socket.on("join-call", (data: { groupId: string; userId: string }) => {
      socket.to(`group:${data.groupId}`).emit("user-joined-call", data);
    });

    socket.on("leave-call", (data: { groupId: string; userId: string }) => {
      socket.to(`group:${data.groupId}`).emit("user-left-call", data);
    });

    // Handle disconnection
    socket.on("disconnect", () => {
      console.log("Client disconnected:", socket.id);
    });
  });

  res.end();
};

export default SocketHandler;
