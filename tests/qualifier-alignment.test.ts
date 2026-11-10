import { describe, expect, it } from "vitest";
import { estimateConfig } from "@/config/estimate";
import { residentialLead } from "@/lib/leads/schema";

describe("qualifier ids align with the lead schema", () => {
  it("start ids are valid residential `timeline` values (LeadForm sends q.start as timeline)", () => {
    const tl = (residentialLead.shape.timeline as unknown as { unwrap: () => { options: string[] } }).unwrap().options;
    for (const o of estimateConfig.startOptions) expect(tl).toContain(o.id);
  });
});
