# 07 — Commercial Outbound Playbook

## Compliance first
- **Email (CAN-SPAM):** accurate From/subject, physical mailing address in footer, one-click opt-out honoured within 10 business days (do it immediately). Send from a **separate outbound domain** (e.g. `stonecraft-facilities.com`) with SPF/DKIM/DMARC; warm 3–4 weeks; ≤40 sends/inbox/day initially.
- **Calls:** business lines OK; scrub any mobiles you're unsure are business numbers against the National DNC list; no prerecorded/AI voice calls; no cold texts.
- **LinkedIn:** manual only (no automation extensions). Personalised notes.
- Never name current or past clients (including healthcare facilities) without written permission. Never imply an existing relationship that doesn't exist.

Merge fields: `{{first_name}} {{org}} {{city}} {{building_count}} {{sender}} {{market_phone}}`.

---

## Sequence 1 — Hospitals & healthcare (Facility Director / EVS Director)
**Day 1 — Email 1** · Subject: *Restroom tile at {{org}}*
> Hi {{first_name}} — restroom floors and shower areas in high-use healthcare buildings often look worn even when EVS is cleaning them perfectly; the grout and caulk are holding soil and moisture that daily cleaning can't reach.
> StoneCraft restores those surfaces in place—phased one restroom at a time, scheduled into your permitted hours, with before/after documentation by area.
> Would a 20-minute call to see whether a 2–3 restroom pilot makes sense be useful?
> {{sender}} · StoneCraft · {{market_phone}}

**Day 3 — LinkedIn connect** · "Hi {{first_name}}, I work with facility teams on restroom tile/grout restoration that avoids retiling. Would like to connect."

**Day 4 — Call 1** (script below) → voicemail if no answer.

**Day 7 — Email 2** · Subject: *Phasing without closing floors*
> {{first_name}}, the question we hear most from facilities teams is "how many restrooms can be down at once?" Our answer is: as few as you need—usually one per floor, with cure times built into the plan. I've attached our one-page capabilities statement. If infection-control requirements apply, we build them into the scope with your IP team at the site walk.

**Day 11 — Call 2**

**Day 14 — Email 3** · Subject: *Pilot idea for {{org}}*
> A low-risk way to evaluate: pick 2–3 representative restrooms, we restore and document them, and you decide based on the result and the per-restroom cost. Worth a look before next fiscal planning?

**Day 21 — Breakup email** · Subject: *Close the loop?*
> I don't want to clutter your inbox. If restroom surface restoration isn't a priority this year, just reply "later" and I'll check back in six months. If someone else handles this, I'd appreciate a pointer.

## Sequence 2 — Universities & schools (Facilities / Residential Life / Athletics)
**Email 1** · *Residence hall bathrooms before summer* — "Summer and break windows are short. We restore residence-hall bathroom, locker-room and shower grout and caulk room by room, with a sample-room pilot first so you know the per-room time and cost before committing a building."
**Email 2** · *Locker rooms & shower areas* — wet-area focus; mildewed caulk, stained floor grout; documented by room.
**Email 3** · *Vendor registration* — "Happy to complete your vendor registration and insurance requirements ahead of summer so we're ready when you are."
**Breakup.** Timing: run Jan–Apr (summer) and Sep–Oct (winter break).

## Sequence 3 — Hotels & hospitality (GM / Director of Engineering / Director of Rooms)
**Email 1** · *Guest bathrooms in reviews* — "Grout and caulk are the details guests photograph. We restore guest bathrooms room by room around occupancy, and lobby/pool stone on a schedule."
**Email 2** · *Pilot rooms* — "Give us 3 rooms; we'll establish a reliable per-room time so you can plan out-of-order inventory precisely."
**Email 3** · *Low season planning* — (FL: target May–Oct; Boston: Jan–Mar).
**Breakup.**

## Sequence 4 — Condos & HOAs (Community/Property Manager; Board President)
**Email 1** · *Lobby & amenity surfaces at {{org}}* — "Lobbies, corridors, pool and fitness restrooms take daily wear. We restore tile, grout and stone with a written scope your board can review, and work around residents with posted notices."
**Email 2** · *Board-ready proposal* — offer to present at the next board meeting; reserve-plan alignment.
**Email 3** · *Resident program* — optional unit-owner pricing with association approval.
**Breakup.**

## Sequence 5 — Property management companies (Regional/Portfolio Manager, Maintenance Director)
**Email 1** · *Unit-turn bathrooms across {{org}}'s portfolio* — "We reset bathroom grout, caulk, shower and floors at turnover with per-unit before/after documentation, scheduled to your turn dates."
**Email 2** · *Pilot one unit* — "One unit, one turn date, then decide."
**Email 3** · *Approved vendor setup* — W-9, COI, standard scope menu and pricing per unit type.
**Breakup.**

---

## LinkedIn connection scripts (≤300 chars)
- Hospital: "Hi {{first_name}} — I help facility teams restore restroom tile and grout in place (phased, documented, no retiling). Thought it'd be useful to connect."
- University: "Hi {{first_name}}, we work on residence-hall and locker-room tile/grout restoration during breaks. Would be glad to connect."
- Hotel: "Hi {{first_name}} — I work with hotel engineering teams on guest-bath grout/caulk and lobby stone restoration around occupancy. Happy to connect."
- HOA: "Hi {{first_name}}, we restore lobby, corridor and amenity tile/stone for associations with board-ready scopes. Would like to connect."
- PM: "Hi {{first_name}} — I help PM teams reset bathrooms at unit turns with per-unit documentation. Glad to connect."
**Post-accept message:** "Thanks for connecting. No pitch—here's a one-page overview in case restroom or common-area surfaces come up in planning: [capabilities link]. If it's useful later, I'm easy to reach."

## Cold call script (90 seconds)
1. **Opener:** "Hi {{first_name}}, it's {{sender}} with StoneCraft. I know I'm calling out of the blue—do you have 30 seconds and I'll tell you why I called?"
2. **Reason:** "We restore restroom tile, grout and caulk in occupied buildings—phased, in your permitted hours, with documentation—so facilities can defer retiling where the tile is still sound."
3. **Question:** "How are you handling restrooms that look worn even after cleaning—is that on anyone's list this year?"
4. **Branches:**
   - *Yes / it's a problem* → "Would it make sense to walk two or three of the worst restrooms together? Twenty minutes, and you'd get a written scope." → book.
   - *We retile* → "Makes sense when tile is failing. Where tile is sound, restoration is usually a fraction of the cost and closure time—worth comparing on a couple of restrooms?"
   - *We have a vendor* → "Great. Is it for daily cleaning or restoration? We're often brought in for the deep restoration and caulk/grout repair that routine vendors don't do."
   - *Send info* → "Happy to—what's most useful: the capabilities sheet or a pilot outline? And when should I follow up?" (Get a date.)
   - *Not me* → "Who handles restroom finishes / floor care?"
5. **Close:** confirm time, send calendar invite + capabilities.

## Voicemail scripts (≤25 seconds)
- **VM1:** "Hi {{first_name}}, {{sender}} with StoneCraft—we restore restroom tile and grout in occupied facilities, phased and documented. I'll send a short note; my number is {{market_phone}}."
- **VM2:** "{{first_name}}, {{sender}} again from StoneCraft. Quick idea: a two-or-three-restroom pilot so you can judge results and cost before planning. {{market_phone}}."

## Follow-up after a meeting
Subject: *Next steps — restroom surfaces at {{org}}*
> Thanks for the time today. As discussed: (1) site walk on {{date}} at {{time}} with {{attendees}}; (2) we'll bring the inventory sheet for {{building_count}} buildings; (3) please send any access/ICRA/badging requirements so we can build them into the scope. Capabilities attached for anyone else who should see it.

## Meeting-request copy (for referrals / warm intros)
> {{first_name}}, {{referrer}} suggested I reach out. We restore restroom and common-area tile, grout and stone without retiling—phased and documented. Could we find 20 minutes the week of {{week}}? Here's my calendar: {{booking_link}}.

## Prospect management in GHL
Pipeline **Commercial**: Target Account → Contact Identified → Outreach Started → Meeting Booked → Site Walk → Scope Development → Proposal → Procurement/Approval → Contract → Work Scheduled → Completed → Renewal. Each email/call logged; sequence enrolment via workflow with **stop on reply**; opt-outs tagged `dnd:email` and suppressed across all locations.
Weekly targets per BDR (starting point, adjust): 50 new contacts, 100 touches, 5 conversations, 2 meetings.
