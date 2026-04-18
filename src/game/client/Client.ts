import { WebSocket, type RawData } from "ws";

export class SocketClient {
  ws: WebSocket;
  listeners: Array<(msg: { type: string; [key: string]: unknown }) => void>;

  constructor(url: string) {
    this.ws = new WebSocket(url);
    this.listeners = [];

    this.ws.on("open", () => {
      console.log("Connected to server");
    });

    this.ws.on("message", (data: RawData) => {
      const msg = JSON.parse(data.toString());

      this.listeners.forEach((cb) => cb(msg));
    });
  }

  send(message: { type: string; [key: string]: unknown }) {
    if (this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(message));
      return;
    }

    this.ws.once("open", () => {
      this.ws.send(JSON.stringify(message));
    });
  }

  onMessage(callback: (msg: { type: string; [key: string]: unknown }) => void) {
    this.listeners.push(callback);
  }
}

