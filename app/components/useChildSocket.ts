"use client";
import { useEffect, useRef, useState } from "react";

export type WsStatus = "connecting" | "open" | "closed";

// Subscribes to a child's live timeline. The session cookie authenticates the
// upgrade, so we only need to pass childId. Reconnects with backoff.
export function useChildSocket(childId: string, onMessage: (msg: any) => void) {
  const [status, setStatus] = useState<WsStatus>("connecting");
  const cbRef = useRef(onMessage);
  cbRef.current = onMessage;

  useEffect(() => {
    let ws: WebSocket | null = null;
    let closedByUs = false;
    let retry = 0;
    let timer: ReturnType<typeof setTimeout>;

    function connect() {
      const proto = window.location.protocol === "https:" ? "wss" : "ws";
      ws = new WebSocket(`${proto}://${window.location.host}/ws?childId=${childId}`);
      setStatus("connecting");
      ws.onopen = () => {
        retry = 0;
        setStatus("open");
      };
      ws.onmessage = (e) => {
        try {
          cbRef.current(JSON.parse(e.data));
        } catch {}
      };
      ws.onclose = () => {
        setStatus("closed");
        if (!closedByUs) {
          retry = Math.min(retry + 1, 6);
          timer = setTimeout(connect, 500 * 2 ** retry);
        }
      };
      ws.onerror = () => ws?.close();
    }

    connect();
    return () => {
      closedByUs = true;
      clearTimeout(timer);
      ws?.close();
    };
  }, [childId]);

  return status;
}
