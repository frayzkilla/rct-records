import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const key = "raw-crownz-analytics-visitor";
const temporaryVisitor = crypto.randomUUID();
const publicPath = /^\/(?:|about|artists|albums|beats|tracks|(?:artists|albums|beats|tracks)\/[1-9][0-9]{0,9})$/;

function visitorId() {
  try {
    const saved = localStorage.getItem(key);
    if (saved && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(saved)) return saved;
    localStorage.setItem(key, temporaryVisitor);
  } catch {
    return temporaryVisitor;
  }
  return temporaryVisitor;
}

function send(payload: object) {
  const body = JSON.stringify({ eventId: crypto.randomUUID(), visitorId: visitorId(), ...payload });
  const attempt = async (retry: boolean) => {
    try {
      const response = await fetch("/api/analytics/events", {
        method: "POST", headers: { "Content-Type": "application/json" }, body, keepalive: true,
      });
      if (retry && (response.status === 409 || response.status >= 500)) window.setTimeout(() => void attempt(false), 1500);
    } catch {
      if (retry) window.setTimeout(() => void attempt(false), 1500);
    }
  };
  void attempt(true);
}

export function recordPlay(trackId: number) {
  send({ kind: "play", trackId });
}

let lastLocationKey: string | null = null;
let lastPath: string | null = null;

export function AnalyticsTracker() {
  const { pathname, key: locationKey } = useLocation();
  useEffect(() => {
    if (lastLocationKey === locationKey) return;
    lastLocationKey = locationKey;
    const path = pathname.replace(/\/+$/, "") || "/";
    const changed = lastPath !== path;
    lastPath = path;
    if (changed && publicPath.test(path)) send({ kind: "pageview", path });
  }, [pathname, locationKey]);
  return null;
}
