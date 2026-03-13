import { writable } from "svelte/store";

export interface DashboardData {
  timestamp: number;
  temperature: number;
  pressure: number;
  rpm: number;
}

function createDashboardStore() {
  const { subscribe, set } = writable<DashboardData | null>(null);
  const connected = writable(false);
  let ws: WebSocket | null = null;

  function connect(url = "ws://localhost:8080") {
    ws = new WebSocket(url);

    ws.onopen = () => {
      connected.set(true);
      console.log("Connected to Qt backend");
    };

    ws.onmessage = (event) => {
      try {
        const data: DashboardData = JSON.parse(event.data);
        set(data);
      } catch (e) {
        console.error("Failed to parse message", e);
      }
    };

    ws.onclose = () => {
      connected.set(false);
      console.log("Disconnected — retrying in 2s...");
      setTimeout(() => connect(url), 2000);
    };

    ws.onerror = (err) => {
      console.error("WebSocket error", err);
      ws?.close();
    };
  }

  function send(command: object) {
    if (ws?.readyState === WebSocket.OPEN) {
      ws.send(JSON.stringify(command));
    }
  }

  return { subscribe, connected, connect, send };
}

export const dashboard = createDashboardStore();
