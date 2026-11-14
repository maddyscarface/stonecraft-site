import { z } from "zod";
import type { EscalationFlag, WorkType } from "@/config/walkthrough-templates";
import type { Measurement, UnitSystem } from "./measure";

/** Walkthrough objects (mirror migrations/0004_phase4_stonecraft.up.sql). */
export const walkthroughStatuses = ["invited", "in_progress", "submitted", "needs_correction", "reviewed", "closed"] as const;
export type WalkthroughStatus = (typeof walkthroughStatuses)[number];
export const outcomes = ["ready_for_remote_quote", "targeted_follow_up", "live_video_walkthrough", "site_check"] as const;
export type Outcome = (typeof outcomes)[number];
export const outcomeLabel: Record<Outcome, string> = {
  ready_for_remote_quote: "Ready for remote quote",
  targeted_follow_up: "Targeted follow-up (specific photos / measurements)",
  live_video_walkthrough: "Live video walkthrough",
  site_check: "Site check required",
};

export type Answer = string | string[];
export type StepState = { key: string; answers: Record<string, Answer>; completedAt?: string; updatedAt: string };
export type MeasurementVersion = { version: number; at: string; by: string; source: "customer" | "staff"; reason?: string; stepKey: string; values: Measurement[] };
export type MediaItem = {
  id: string; stepKey: string; kind: "photo" | "video"; contentType: string; size: number; storageKey: string;
  status: "pending_upload" | "uploaded" | "rejected" | "deleted"; metadata?: "stripped" | "none_found" | "metadata_retained";
  createdAt: string; uploadedAt?: string; rejectReason?: string;
};
export type Correction = { id: string; at: string; by: string; stepKeys: string[]; note: string; resolvedAt?: string };

export type Walkthrough = {
  id: string; brand: "stonecraft"; reference: string; workType: WorkType; market: "boston" | "south-florida"; county?: string | null; zip?: string;
  status: WalkthroughStatus; units: UnitSystem;
  customer: { firstName: string; email?: string };
  leadId?: string; projectId?: string;
  invite: { hash: string; expiresAt: string; revoked: boolean; createdAt: string; createdBy: string; channel: "staff_link" | "self_start" };
  steps: Record<string, StepState>;
  /** Repeat counts per repeatable step id (e.g. { wall: 3 }). */
  repeats: Record<string, number>;
  measurements: MeasurementVersion[];
  media: MediaItem[];
  corrections: Correction[];
  escalations: EscalationFlag[];
  suggestedOutcome?: Outcome;
  outcome?: { value: Outcome; by: string; at: string; note?: string };
  internalNotes: { at: string; by: string; text: string }[];
  revision: number;
  createdAt: string; updatedAt: string; submittedAt?: string; sandbox: boolean;
};

const KEY = /^[a-z_]+(#\d{1,2})?$/;
const answer = z.union([z.string().max(500), z.array(z.string().max(60)).max(12)]);
export const measureInputSchema = z.object({
  fieldId: z.string().regex(/^[a-z_]{2,40}$/), kind: z.enum(["length", "area", "count"]),
  a: z.number().nullable().optional(), b: z.number().nullable().optional(),
  unknown: z.boolean().optional(), uncertain: z.boolean().optional(), note: z.string().max(200).optional(),
});
export const stepSaveSchema = z.object({
  stepKey: z.string().regex(KEY),
  answers: z.record(z.string().regex(/^[a-z_]{2,40}$/), answer).default({}),
  measurements: z.array(measureInputSchema).max(12).default([]),
  units: z.enum(["imperial", "metric"]).optional(),
  complete: z.boolean().default(false),
  repeats: z.record(z.string().regex(/^[a-z_]{2,40}$/), z.number().int().min(0).max(10)).optional(),
});
export const mediaSignSchema = z.object({ stepKey: z.string().regex(KEY), kind: z.enum(["photo", "video"]), contentType: z.string().max(60), size: z.number().int().positive() });
export const createSchema = z.object({
  workType: z.enum(["shower", "floor", "stone", "commercial"]),
  market: z.enum(["boston", "south-florida"]).optional(),
  zip: z.string().regex(/^\d{5}$/).optional(),
  firstName: z.string().trim().min(1).max(60),
  email: z.string().email().max(200).optional().or(z.literal("")),
  units: z.enum(["imperial", "metric"]).default("imperial"),
  leadId: z.string().regex(/^[A-Za-z0-9_-]{6,100}$/).optional(),
  projectId: z.string().uuid().optional(),
  expiresDays: z.number().int().min(1).max(30).default(14),
});
