enum USER_CONNECTION_STATUS {
  OFFLINE = "OFFLINE",
  ONLINE = "ONLINE",
}

interface User {
  username: string;
  roomId: string;
  status: USER_CONNECTION_STATUS;
  socketId: string;
  cursorPosition: number;
  typing: boolean;
  currentFile: string | null;
}

export { USER_CONNECTION_STATUS, User };
