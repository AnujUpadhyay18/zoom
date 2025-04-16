import { Server } from "socket.io";

let connections = {};
let messages = {};
let timeOnline = {};

export const connectToSocket = (server) => {
  const io = new Server(server, {
    cors: {
      origin: "*",
      methods: ["GET", "POST"],
      allowedHeaders: ["*"],
      credentials: true
    }
  });

  io.on("connection", (socket) => {
    console.log("📡 Socket connected:", socket.id);

    socket.on("join-call", (path) => {
      if (!connections[path]) {
        connections[path] = [];
      }
      connections[path].push(socket.id);
      timeOnline[socket.id] = new Date();

      // Notify all users in the room about the new user
      connections[path].forEach((userId) => {
        io.to(userId).emit("user-joined", socket.id, connections[path]);
      });

      // Send previous chat messages to the new user
      if (messages[path]) {
        messages[path].forEach((msg) => {
          io.to(socket.id).emit("chat-message", msg.data, msg.sender, msg["socket-id-sender"]);
        });
      }
    });

    socket.on("signal", (toId, message) => {
      io.to(toId).emit("signal", socket.id, message);
    });

    socket.on("chat-message", (data, sender) => {
      const room = Object.entries(connections).find(([_, users]) => users.includes(socket.id))?.[0];

      if (room) {
        if (!messages[room]) {
          messages[room] = [];
        }

        const msg = {
          sender,
          data,
          "socket-id-sender": socket.id
        };

        messages[room].push(msg);

        // Broadcast to everyone in the room
        connections[room].forEach((userId) => {
          io.to(userId).emit("chat-message", data, sender, socket.id);
        });

        console.log(`💬 [${room}] ${sender}: ${data}`);
      }
    });

    socket.on("disconnect", () => {
      const disconnectTime = new Date();
      const sessionDuration = timeOnline[socket.id]
        ? Math.abs(disconnectTime - timeOnline[socket.id])
        : 0;

      delete timeOnline[socket.id];

      for (const [room, users] of Object.entries(connections)) {
        const index = users.indexOf(socket.id);
        if (index !== -1) {
          users.splice(index, 1);
          users.forEach((userId) => {
            io.to(userId).emit("user-left", socket.id);
          });

          if (users.length === 0) {
            delete connections[room];
            delete messages[room];
          }

          break;
        }
      }

      console.log(`❌ Socket disconnected: ${socket.id} (duration: ${sessionDuration} ms)`);
    });
  });

  return io;
};
