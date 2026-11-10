"use client";
import { Printer } from "lucide-react";
import { track } from "@/lib/tracking/client";
export function PrintButton({ label = "Print / Save as PDF" }: { label?: string }) {
  return <button className="btn btn-hunter !min-h-10 text-sm" onClick={() => { track("template_print", { path: location.pathname }); window.print(); }}><Printer size={16} />{label}</button>;
}
