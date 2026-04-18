import { WebSocketServer, type WebSocket } from "ws";

const wss = new WebSocketServer({ port: 8101 });

type Room = {
  code: string;
  players: Set<WebSocket>;
};

type ClientMessage =
  | { type: "create_game" }
  | { type: "join_game"; code?: string }
  | { type: "battle_setup"; player: { name: string; pokemons: string[] } }
  | { type: "active_pokemon"; pokemonName: string }
  | { type: "battle_move"; moveName: string };

type ServerMessage =
  | { type: "room_created"; code: string }
  | { type: "room_joined"; code: string }
  | { type: "player_joined"; code: string }
  | { type: "battle_setup"; player: { name: string; pokemons: string[] } }
  | { type: "active_pokemon"; pokemonName: string }
  | { type: "battle_move"; moveName: string }
  | { type: "game_start" }
  | { type: "error"; message?: string };

const rooms = new Map<string, Room>();
const socketRooms = new Map<WebSocket, string>();

function generateCode() {
  return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function sendMessage(socket: WebSocket, message: ServerMessage) {
  socket.send(JSON.stringify(message));
}

function findRoomForSocket(socket: WebSocket): Room | undefined {
  const roomCode = socketRooms.get(socket);
  if (!roomCode) {
    return undefined;
  }

  return rooms.get(roomCode);
}

wss.on("connection", (ws: WebSocket) => {
  console.log("Client connected");

  ws.on("message", (msg: string | Buffer) => {
    const data = JSON.parse(msg.toString()) as ClientMessage;

    if (data.type === "create_game") {
      const code = generateCode();
      console.log(`Room created: ${code}`);

      rooms.set(code, {
        code,
        players: new Set([ws]),
      });
      socketRooms.set(ws, code);

      sendMessage(ws, { type: "room_created", code });
      return;
    }

    if (data.type === "join_game") {
      if (!data.code) {
        sendMessage(ws, { type: "error", message: "Room code is required" });
        return;
      }

      const room = rooms.get(data.code);

      if (!room || room.players.size >= 2) {
        sendMessage(ws, { type: "error", message: "Room not found or full" });
        return;
      }

      console.log(`Player joined room: ${data.code}`);
      room.players.add(ws);
      socketRooms.set(ws, data.code);

      sendMessage(ws, { type: "room_joined", code: data.code });

      for (const player of room.players) {
        if (player !== ws) {
          sendMessage(player, { type: "player_joined", code: data.code });
        }
      }

      if (room.players.size === 2) {
        for (const player of room.players) {
          sendMessage(player, { type: "game_start" });
        }
      }

      return;
    }

    if (
      data.type === "battle_setup" ||
      data.type === "active_pokemon" ||
      data.type === "battle_move"
    ) {
      const room = findRoomForSocket(ws);
      if (!room) {
        sendMessage(ws, { type: "error", message: "You are not in a room" });
        return;
      }

      for (const player of room.players) {
        if (player !== ws) {
          sendMessage(player, data);
        }
      }

      return;
    }

    sendMessage(ws, { type: "error", message: "Unknown message type" });
  });

  ws.on("close", () => {
    const roomCode = socketRooms.get(ws);
    if (!roomCode) {
      return;
    }

    const room = rooms.get(roomCode);
    if (!room) {
      socketRooms.delete(ws);
      return;
    }

    room.players.delete(ws);
    socketRooms.delete(ws);

    if (room.players.size === 0) {
      rooms.delete(roomCode);
    }
  });
});