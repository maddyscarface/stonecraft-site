/** Launch articles. Remaining 17 briefs are in docs/11-seo-aeo.md. Plain-text body blocks keep content portable. */
export type Article = {
  slug: string;
  title: string;
  description: string;
  date: string;
  audience: string;
  cta: { label: string; href: string };
  body: ({ h2: string } | { p: string } | { ul: string[] })[];
};

export const articles: Article[] = [
  {
    slug: "restore-or-replace-bathroom-tile",
    title: "Restore or Replace? How to Tell What Your Bathroom Tile Actually Needs",
    description: "A practical checklist for deciding whether tired bathroom tile needs restoration or replacement, and what each involves.",
    date: "2026-11-02", audience: "Homeowners and landlords",
    cta: { label: "Send photos for an honest assessment", href: "/free-assessment" },
    body: [
      { p: "Most bathrooms that look worn out are suffering from surface problems: grout that has absorbed years of dirt, caulk that has cracked or grown mildew, soap and mineral film, or sealer that has worn away. Those are restoration problems. A smaller number have structural problems—loose tile, soft walls or water behind the tile—and those need replacement. Telling the two apart before you spend money is the whole game." },
      { h2: "Signs restoration will work" },
      { ul: ["Tiles are firmly attached and sound solid when tapped", "Walls don't flex when you press on them", "The problem is colour: dark, blotchy or stained grout", "Caulk at corners and the tub line is cracked, peeling or mouldy", "There's a film on the tile that cleaning products won't remove", "Marble looks dull or has etched rings"] },
      { h2: "Signs you may need replacement" },
      { ul: ["Several tiles sound hollow or move", "Cracks run through tiles rather than along grout lines", "Walls feel soft, or there's staining on the ceiling below", "Grout is crumbling away across large areas and the joints stay damp", "You want a different tile, layout or fixture configuration"] },
      { h2: "What restoration involves" },
      { p: "A typical restoration combines deep cleaning with surface-appropriate cleaners, replacing failed caulk after removing it completely, repairing cracked or missing grout lines, and sealing—either clear or with a colour sealant that gives the grout a uniform colour. Natural stone is handled differently: no acidic products, and etching is removed by honing and polishing." },
      { h2: "How to get an honest answer quickly" },
      { p: "Take a wide photo of the bathroom, close-ups of the worst grout and caulk, and a photo of anything that looks cracked or loose. A good restoration company should be able to tell you from those photos whether restoration is realistic, what it would involve, and roughly what it costs—and should tell you plainly if replacement is the better answer." },
    ],
  },
  {
    slug: "renter-guide-landlord-approval-bathroom-refresh",
    title: "A Renter's Guide to Getting Landlord Approval for a Bathroom Refresh",
    description: "How renters can ask a landlord to approve non-structural bathroom restoration, what to include in the request, and how roommates can share the cost.",
    date: "2026-11-02", audience: "Renters and roommates",
    cta: { label: "Open the landlord approval template", href: "/renters/landlord-approval" },
    body: [
      { p: "If your apartment bathroom was dingy on move-in day, you don't have to live with it for the whole lease. Many landlords will approve a non-structural refresh—cleaning, sealing and recaulking existing surfaces—especially when it costs them nothing and improves their property. The key is asking in writing with a clear scope." },
      { h2: "Why written approval matters" },
      { p: "Your lease likely restricts alterations. Even though restoration doesn't remove tile, changing grout colour or replacing caulk is work on the landlord's property. Written approval protects you, your security deposit and the contractor. A reputable company won't book renter work without it." },
      { h2: "What to include in your request" },
      { ul: ["The exact scope from the contractor's written quote", "Confirmation that no tile, plumbing or structure is affected", "Any grout colour change (or that colour stays the same)", "Proposed dates and how long the bathroom will be out of use", "Who pays—you, shared with roommates, or shared with the landlord", "That the contractor can provide a certificate of insurance"] },
      { h2: "Splitting the cost with roommates" },
      { p: "A shared bathroom is a shared cost. Agree on the split before you request approval so everyone is committed. Our roommate calculator shows each person's share once you have a quote. Remember that a cost split between roommates is an arrangement among you—it doesn't replace landlord approval." },
      { h2: "If your landlord says no" },
      { p: "Ask whether they'd consider it at lease renewal, or whether they'd share the cost. Some landlords are more receptive when they see the scope is limited and documented with before-and-after photos." },
    ],
  },
  {
    slug: "commercial-restroom-tile-maintenance-planning",
    title: "Planning Restroom Tile & Grout Restoration in Occupied Facilities",
    description: "How facility teams in hospitals, universities and hotels can plan restroom tile and grout restoration with phased closures, permitted hours and documentation.",
    date: "2026-11-02", audience: "Facility directors and property managers",
    cta: { label: "Request a commercial site assessment", href: "/commercial-site-assessment" },
    body: [
      { p: "High-use restrooms often look unclean even when cleaning teams are doing everything right. The reason is usually the grout and caulk: porous grout absorbs soil that daily cleaning can't reach, and failed caulk at wall-floor joints traps moisture. Restoration addresses those surfaces without the closures and cost of replacement—but in an occupied facility, the plan matters as much as the work." },
      { h2: "Start with an inventory" },
      { ul: ["Number of restrooms by building and floor", "Approximate tiled square footage per restroom", "Surface types: ceramic, porcelain, quartz, natural stone", "Current condition, with representative photos", "Which restrooms can close, for how long, and when"] },
      { h2: "Phase closures to keep access" },
      { p: "Work one restroom per floor or zone at a time so an alternative is always available. Build cure times into the phase plan: some sealers and caulks need hours before the area can reopen. A pilot on one or two representative restrooms establishes realistic production rates before rollout." },
      { h2: "Work within facility rules" },
      { p: "Healthcare facilities may require infection-control risk assessments, barriers and specific PPE; universities often prefer academic breaks; hotels need coordination with housekeeping and occupancy. These requirements should be written into the scope, not discovered on the first night." },
      { h2: "Document everything" },
      { p: "Before-and-after photos by area, a completion sign-off per phase and maintenance recommendations give facility teams a record for capital planning and make the next cycle easier to budget." },
    ],
  },
];

export const findArticle = (slug: string) => articles.find((a) => a.slug === slug);
