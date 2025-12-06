"use client";

import { createContext, useContext, ReactNode } from "react";

// Socket.IO is disabled in production (Vercel serverless doesn't support WebSockets)
// Chat uses polling via React Query's refetchInterval instead

interface SocketContextType {
  socket: null;
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
  // No-op provider - socket is disabled on serverless platforms
  return (
    <SocketContext.Provider
      value={{
        socket: null,
        isConnected: false,
        joinGroup: () => {},
        leaveGroup: () => {},
        joinDm: () => {},
        leaveDm: () => {},
        sendMessage: () => {},
        sendTyping: () => {},
      }}
    >
      {children}
    </SocketContext.Provider>
  );
}
