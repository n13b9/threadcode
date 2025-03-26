import express, { Response, Request } from "express";

import path from "path";
import cors from "cors";
import http from "http";
import { Server } from "socket.io";
import { USER_CONNECTION_STATUS, User } from "./types/user";
import { SocketEvent } from "./types/socket";

const app = express();

app.use(express.json());

app.use(cors());

app.use(express.static(path.join(__dirname, "public")));

const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
  },
  maxHttpBufferSize: 1e8,
  pingTimeout: 60000,
});

let userMap: User[] = [];

function getUsersInRoom(roomId: string): User[] {
  return userMap.filter((user) => user.roomId === roomId);
}

function getRoomId(socketId: string) {
  const roomId = userMap.find((u) => u.socketId === socketId)?.roomId;
  if (!roomId) {
    console.error("Room ID is undefined for socket ID:", socketId);
    return null;
  }
  return roomId;
}

function getUserBySocketId(socketId: string): User | null {
  const user = userMap.find((user) => user.socketId === socketId);
  if (!user) {
    console.error("User not found for socket ID:", socketId);
    return null;
  }
  return user;
}

io.on("connection", (socket) => {
  //Handle user connection

  socket.on(SocketEvent.JOIN_REQUEST, (username: string, roomId: string) => {
    const isUsernameAvailable =
      userMap.findIndex((user) => user.username === username) === -1;
    if (!isUsernameAvailable) {
      socket.emit(SocketEvent.USERNAME_EXISTS, false);
      return;
    }

    const user: User = {
      username,
      roomId,
      status: USER_CONNECTION_STATUS.ONLINE,
      socketId: socket.id,
      cursorPosition: 0,
      typing: false,
      currentFile: null,
    };

    userMap.push(user);
    socket.join(roomId);
    socket.broadcast.to(roomId).emit(SocketEvent.USER_JOINED, { user });
    const users = getUsersInRoom(roomId);
    io.to(socket.id).emit(SocketEvent.JOIN_ACCEPTED, { user, users });
  });

  socket.on("disconnect", () => {
    const user = getUserBySocketId(socket.id);
    if (!user) return;
    const roomId = user.roomId;
    socket.broadcast.to(roomId).emit(SocketEvent.USER_DISCONNECTED, user);
    userMap = userMap.filter((user) => user.socketId !== socket.id);
    socket.leave(roomId);
  });
});

const PORT = process.env.PORT || 3000;

app.get("/", (req: Request, res: Response) => {
  // Send index.html file
  res.sendFile(path.join(__dirname, "..", "public", "index.html"));
});

server.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
