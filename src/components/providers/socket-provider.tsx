"use client";

import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { io, Socket } from "socket.io-client";
import { useSession } from "next-auth/react";

interface SocketContextType {
  socket: Socket | null;
  isConnected: boolean;
  joinGroup: (groupId: string) => void;
  leaveGroup: (groupId: string) => void;
  joinDm: (threadId: string) => void;
  leaveDm: (threadId: string) => void;
  sendMessage: (data: { threadId?: string; groupId?: string; message: unknown }) => void;
  sendTyping: (data: { threadId?: string; groupId?: string; isTyping: boolean }) => void;
}

const SocketContext = createContext<SocketContextType>({
  socket: null,
  isConnected: false,
  joinGroup: () => {},
  leaveGroup: () => {},
  joinDm: () => {},
  leaveDm: () => {},
  sendMessage: () => {},
  sendTyping: () => {},
});

export function useSocket() {
  return useContext(SocketContext);
}

interface SocketProviderProps {
  children: ReactNode;
}

export function SocketProvider({ children }: SocketProviderProps) {
  const { data: session } = useSession();
  const [socket, setSocket] = useState<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);

  useEffect(() => {
    if (!session?.user?.id) return;

    // Initialize socket connection
    const socketInstance = io({
      path: "/api/socketio",
      addTrailingSlash: false,
    });

    socketInstance.on("connect", () => {
      console.log("Socket connected");
      setIsConnected(true);
      // Join user's personal room
      socketInstance.emit("join-user", session.user.id);
    });

    socketInstance.on("disconnect", () => {
      console.log("Socket disconnected");
      setIsConnected(false);
    });

    setSocket(socketInstance);

    return () => {
      socketInstance.disconnect();
    };
  }, [session?.user?.id]);

  const joinGroup = (groupId: string) => {
    socket?.emit("join-group", groupId);
  };

  const leaveGroup = (groupId: string) => {
    socket?.emit("leave-group", groupId);
  };

  const joinDm = (threadId: string) => {
    socket?.emit("join-dm", threadId);
  };

  const leaveDm = (threadId: string) => {
    socket?.emit("leave-dm", threadId);
  };

  const sendMessage = (data: { threadId?: string; groupId?: string; message: unknown }) => {
    socket?.emit("send-message", data);
  };

  const sendTyping = (data: { threadId?: string; groupId?: string; isTyping: boolean }) => {
    if (!session?.user?.id) return;
    socket?.emit("typing", { ...data, userId: session.user.id });
  };

  return (
    <SocketContext.Provider
      value={{
        socket,
        isConnected,
        joinGroup,
        leaveGroup,
        joinDm,
        leaveDm,
        sendMessage,
        sendTyping,
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
