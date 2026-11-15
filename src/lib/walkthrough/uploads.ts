/**
 * When a walkthrough can be submitted. Uploads in flight, queued, or still
 * pending on the server must block Send — including after a correction, when
 * an earlier photo's "uploaded" badge is already on the page.
 */
const LOCAL_DONE = new Set(["done", "failed", "rejected"]);

export function uploadsBlockSubmit(opts: {
  inFlight: number;
  locals?: { state: string }[];
  media?: { status: string }[];
}): boolean {
  if (opts.inFlight > 0) return true;
  if ((opts.locals ?? []).some((l) => !LOCAL_DONE.has(l.state))) return true;
  if ((opts.media ?? []).some((m) => m.status === "pending_upload")) return true;
  return false;
}
