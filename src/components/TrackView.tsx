"use client";
import { useEffect } from "react";
import { track } from "@/lib/tracking/client";

export function TrackView({ event, params, meta }: { event: string; params?: Record<string, unknown>; meta?: string }) {
  const key = JSON.stringify(params ?? {});
  useEffect(() => {
    const p = JSON.parse(key) as Record<string, unknown>;
    track(event, p, meta ? { name: meta, custom: p } : undefined);
  }, [event, meta, key]);
  return null;
}
