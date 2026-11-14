import { z } from "zod";

/** Phase 4 ops objects (mirror db/migrations/0004_phase4_ops.up.sql). */
export const provenances = ["user-entered", "first-party form", "DataMoon", "manual correction", "staff verified", "system"] as const;
export type Provenance = (typeof provenances)[number];
export type Stamp = { source: Provenance; by: string; at: string };

export const projectTypes = ["shower", "floor", "stone", "commercial", "bathroom_refresh", "general"] as const;
export const projectStatuses = ["intake", "walkthrough", "estimating", "proposal_approved", "scheduled", "active", "waiting_client", "on_hold", "completed", "cancelled"] as const;
export type ProjectStatus = (typeof projectStatuses)[number];
export const recordTypes = ["lead", "walkthrough", "proposal", "project", "vendor_prospect"] as const;
export type RecordType = (typeof recordTypes)[number];

export type ProjectTask = { id: string; title: string; due?: string; assignee?: string; done: boolean; createdAt: string; by: string };
export type ProjectNote = { id: string; at: string; by: string; text: string };
export type Project = {
  id: string; brand: string; reference: string; title: string; type: (typeof projectTypes)[number]; status: ProjectStatus;
  market: "boston" | "south-florida" | "unknown"; assignee?: string; dueDate?: string;
  links: { type: RecordType; id: string }[]; tasks: ProjectTask[]; notes: ProjectNote[];
  createdAt: string; updatedAt: string; created: Stamp; sandbox: boolean;
};

export const docCategories = ["photo", "video", "measurement_sheet", "site_check", "deliverable", "proposal_export", "building_rules", "insurance_request", "correspondence", "other"] as const;
export type OpsDocument = {
  id: string; brand: string; projectId: string; category: (typeof docCategories)[number]; label: string; contentType: string; size: number;
  storageKey: string; status: "pending_upload" | "uploaded" | "verified" | "deleted"; scan: "not_configured" | "pending" | "clean" | "infected";
  provenance: Stamp; verifiedBy?: Stamp; createdAt: string; deletedAt?: string; ownerApprovedForDelivery?: Stamp;
};

export const projectCreateSchema = z.object({
  title: z.string().trim().min(3).max(120),
  type: z.enum(projectTypes),
  market: z.enum(["boston", "south-florida", "unknown"]).default("unknown"),
  assignee: z.string().max(40).optional(),
  dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  links: z.array(z.object({ type: z.enum(recordTypes), id: z.string().regex(/^[A-Za-z0-9_-]{6,64}$/) })).max(10).default([]),
});

export const projectPatchSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("status"), status: z.enum(projectStatuses) }),
  z.object({ action: z.literal("assign"), assignee: z.string().max(40) }),
  z.object({ action: z.literal("due"), dueDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/) }),
  z.object({ action: z.literal("add_task"), title: z.string().trim().min(2).max(160), due: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(), assignee: z.string().max(40).optional() }),
  z.object({ action: z.literal("toggle_task"), taskId: z.string().uuid() }),
  z.object({ action: z.literal("note"), text: z.string().trim().min(1).max(2000) }),
  z.object({ action: z.literal("link"), type: z.enum(recordTypes), id: z.string().regex(/^[A-Za-z0-9_-]{6,64}$/) }),
]);

/** Allowed upload types for ops documents (same allowlist as the paid review). */
export const opsUploadPolicy = {
  types: { "application/pdf": "pdf", "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/heic": "heic", "image/heif": "heif", "video/mp4": "mp4", "video/quicktime": "mov" } as Record<string, string>,
  maxBytes: 25 * 1024 * 1024,
  maxPerProject: 60,
  ttlSec: 5 * 60,
};
export const documentRequestSchema = z.object({
  category: z.enum(docCategories),
  label: z.string().trim().min(2).max(120),
  contentType: z.string().max(80),
  size: z.number().int().positive(),
});

/** Validates an upload request. Returns an error string or null. Pure (unit-tested). */
export function validateUpload(req: { contentType: string; size: number; label: string }, storeMaxBytes: number, existing: number): string | null {
  if (!opsUploadPolicy.types[req.contentType]) return "File type not allowed (PDF, JPEG, PNG, WebP, HEIC, MP4, MOV only)";
  if (req.size > Math.min(opsUploadPolicy.maxBytes, storeMaxBytes)) return `File too large (max ${Math.round(Math.min(opsUploadPolicy.maxBytes, storeMaxBytes) / 1024 / 1024)} MB on this storage)`;
  if (existing >= opsUploadPolicy.maxPerProject) return "Too many documents on this project";
  if (/[<>:"\\|?*\x00-\x1f]/.test(req.label)) return "Label contains invalid characters";
  return null;
}

export const suppressionSchema = z.object({
  email: z.string().email().max(200).optional(),
  contactId: z.string().regex(/^id_[0-9a-f]{16}$/).optional(),
  reason: z.enum(["opt_out", "privacy_request", "do_not_contact", "bounced", "existing_customer", "manual"]),
  note: z.string().max(300).optional(),
}).refine((v) => v.email || v.contactId, { message: "email or contactId required" });
