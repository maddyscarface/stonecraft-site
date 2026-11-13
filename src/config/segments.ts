import type { FAQ } from "./services";

export type FormVariant = "residential" | "renter" | "landlord" | "commercial";

export type Segment = {
  id: string;
  path: string;
  label: string;
  audience: string;
  eyebrow: string;
  h1: string;
  sub: string;
  primaryCta: { label: string; href: string };
  secondaryCta?: { label: string; href: string };
  pains: string[];
  offers: { title: string; body: string }[];
  howWeWork: string[];
  formVariant: FormVariant;
  customerType: string;
  faq: FAQ[];
  seoTitle: string;
  metaDescription: string;
};

export const segments: Segment[] = [
  {
    id: "homeowners", path: "/residential", label: "Homeowners", audience: "Homeowners",
    eyebrow: "For homeowners",
    h1: "Your Home's Surfaces, Restored—Without the Remodel",
    sub: "Showers, tile floors, grout, marble and stone brought back with professional restoration. Send photos and we'll tell you honestly what's possible.",
    primaryCta: { label: "Get a Photo Assessment", href: "/free-assessment?type=homeowner" },
    secondaryCta: { label: "See the 1–2 Day Bathroom Refresh", href: "/bathroom-refresh" },
    pains: ["Grout that stays dark no matter how often you clean", "Caulk that cracks or grows mildew", "Marble that's dull or etched", "A bathroom you'd like to update before selling—without a remodel"],
    offers: [
      { title: "Shower restoration", body: "Clean, repair, recaulk and seal the full shower." },
      { title: "Floor & grout restoration", body: "Deep clean, colour seal and protect tile floors." },
      { title: "Marble & stone care", body: "Hone, polish and seal natural stone with stone-safe methods." },
      { title: "Pre-listing refresh", body: "Get bathrooms and kitchens photo-ready before you list." },
    ],
    howWeWork: ["Send 3–4 photos", "We review and reply with an honest assessment", "You approve a written scope and price", "We restore, walk it through with you, and leave care instructions"],
    formVariant: "residential", customerType: "homeowner",
    faq: [
      { q: "Do I need to be home?", a: "Someone needs to let us in and do the final walkthrough. Many homeowners work from another room while we're there." },
      { q: "Is restoration always cheaper than replacing?", a: "Usually, when the tile is sound. If replacement is the better answer, we'll tell you." },
      { q: "Will there be dust or demolition?", a: "Restoration is not demolition. Some steps—like removing old grout or honing stone—create limited dust or slurry, which we contain and clean up." },
    ],
    seoTitle: "Tile, Grout & Stone Restoration for Homeowners | StoneCraft",
    metaDescription: "Restore showers, tile, grout and marble without a remodel. Free photo assessment for homeowners in Greater Boston.",
  },
  {
    id: "renters", path: "/renters", label: "Renters", audience: "Renters and roommates",
    eyebrow: "For renters & roommates",
    h1: "Your Apartment Bathroom Should Feel as Good as the Rest of Your Home.",
    sub: "A 1–2 day bathroom refresh for renters: grout, shower and caulk restoration, with landlord approval coordinated before any work and optional cost-sharing between roommates.",
    primaryCta: { label: "Get a Photo Assessment", href: "/free-assessment?type=renter" },
    secondaryCta: { label: "Get the Landlord Approval Template", href: "/renters/landlord-approval" },
    pains: ["Grout and caulk that were dingy on move-in day", "A shared bathroom nobody wants to deep-clean", "A landlord who won't renovate but might approve a refresh"],
    offers: [
      { title: "Tile & grout restoration", body: "Deep clean and colour seal where appropriate." },
      { title: "Shower cleaning & restoration", body: "Remove film and build-up, restore the finish." },
      { title: "Caulk & grout repair", body: "Replace failed caulk and spot-repair grout where appropriate." },
      { title: "Roommate cost-sharing", body: "Split the approved price however your household agrees." },
    ],
    howWeWork: ["Send photos of the bathroom", "We assess and give you a written scope and price", "You get written landlord approval (we can contact them if you authorise it)", "We schedule, restore and walk it through with you"],
    formVariant: "renter", customerType: "renter",
    faq: [
      { q: "Do I need my landlord's permission?", a: "Yes. We need written approval from your landlord or property manager before any work is booked. Splitting the cost with roommates doesn't change that. We can contact your landlord on your behalf if you give us permission and their details." },
      { q: "What if my landlord says no?", a: "Then we won't do the work. Some landlords agree to share the cost or cover it at lease renewal—our approval template gives them the scope to review." },
      { q: "Is it worth it if I'm only staying a year?", a: "That's your call. We'll give you a fixed scope and price so you can decide whether it's worth it to you." },
      { q: "How is the price set?", a: "From your photos and, if needed, a short visit. The roommate calculator is just a way to see the split once you have a quote." },
    ],
    seoTitle: "Bathroom Refresh for Renters & Roommates | StoneCraft",
    metaDescription: "A 1–2 day bathroom refresh for apartment renters: grout, shower and caulk restoration with landlord approval coordination and roommate cost-sharing.",
  },
  {
    id: "landlords", path: "/landlords", label: "Landlords", audience: "Landlords and property managers",
    eyebrow: "For landlords & property managers",
    h1: "Turn Units Faster With Bathroom Resets That Skip the Remodel",
    sub: "Unit-turn restoration, recurring maintenance and portfolio pricing for bathrooms and tile—scoped from photos, documented on completion.",
    primaryCta: { label: "Request a Unit-Turn Quote", href: "/free-assessment?type=landlord" },
    secondaryCta: { label: "Discuss a Portfolio Program", href: "/commercial-site-assessment?segment=property-management" },
    pains: ["Bathrooms that drag down listing photos and showings", "Remodel bids that don't pencil for a one-unit turn", "Vendors who don't document what they did"],
    offers: [
      { title: "Unit-turn bathroom reset", body: "Grout, caulk, shower and floor restoration between tenants." },
      { title: "Pre-showing refresh", body: "Get a vacant unit photo-ready." },
      { title: "Recurring maintenance", body: "Scheduled resealing and caulk renewal across units." },
      { title: "Portfolio pricing", body: "Standardised scopes and pricing across multiple units or properties." },
    ],
    howWeWork: ["Send unit photos or a turn schedule", "We return a per-unit scope and price", "We work to your access and turn dates", "You receive before/after photos and a completion note per unit"],
    formVariant: "landlord", customerType: "landlord",
    faq: [
      { q: "Can you work in occupied units?", a: "Yes, with tenant notice handled per your lease and local rules. Vacant turns are simplest." },
      { q: "Do you offer volume pricing?", a: "Yes. Portfolio and multi-unit pricing is quoted after reviewing unit count, condition and access." },
    ],
    seoTitle: "Unit-Turn Bathroom Restoration for Landlords & Property Managers | StoneCraft",
    metaDescription: "Bathroom and tile restoration at unit turns, recurring maintenance and portfolio pricing. Photo-based quotes and documented completion.",
  },
  {
    id: "commercial", path: "/commercial", label: "Commercial", audience: "Commercial facilities",
    eyebrow: "Commercial services",
    h1: "Professional Tile, Grout & Stone Restoration for Facilities That Cannot Afford Unnecessary Disruption.",
    sub: "Restore high-use restrooms, tiled floors and hard surfaces through organised maintenance programs, documented work scopes and scheduling designed around facility operations.",
    primaryCta: { label: "Request a Commercial Site Assessment", href: "/commercial-site-assessment" },
    secondaryCta: { label: "Discuss a Multi-Property Maintenance Program", href: "/commercial-site-assessment?program=multi-property" },
    pains: ["Restrooms that look worn even when they're clean", "Replacement projects that close areas for weeks", "Vendors who can't work within facility rules or document work"],
    offers: [
      { title: "Restroom restoration", body: "Floor and wall grout, caulk and fixtures-adjacent tile restored by phase." },
      { title: "Hard-floor restoration", body: "Lobbies, corridors and common areas." },
      { title: "Maintenance programs", body: "Recurring schedules by building, floor or restroom." },
      { title: "Documentation", body: "Scope by area, before/after photos and completion reports." },
    ],
    howWeWork: ["Site assessment request with counts and constraints", "Site walk and written scope by area", "Proposal aligned to your procurement process", "Phased work in permitted windows, with documentation"],
    formVariant: "commercial", customerType: "commercial",
    faq: [
      { q: "Do you work nights and weekends?", a: "Yes, when the scope calls for it. Work windows are set in the proposal." },
      { q: "Can you meet vendor onboarding requirements?", a: "We'll complete your vendor packet. Insurance limits and any background-check requirements are confirmed during scoping. (VERIFY limits before quoting.)" },
    ],
    seoTitle: "Commercial Tile & Grout Restoration | StoneCraft",
    metaDescription: "Commercial tile, grout and stone restoration for managed properties. Request a scoped walkthrough and service plan.",
  },
  {
    id: "hospitals", path: "/commercial/hospitals", label: "Hospitals & Healthcare", audience: "Hospital facility directors, environmental services and healthcare operations",
    eyebrow: "Hospitals & healthcare facilities",
    h1: "Restroom Tile & Grout Restoration Planned Around Patient Care",
    sub: "Scheduled restroom and hard-surface restoration with phased access, permitted work hours and documented completion for healthcare facilities.",
    primaryCta: { label: "Request a Facility Site Assessment", href: "/commercial-site-assessment?segment=hospitals" },
    secondaryCta: { label: "Download the Capabilities Statement", href: "/commercial#capabilities" },
    pains: ["Restrooms that look unclean despite daily EVS cleaning", "Limited windows to close restrooms", "Need for a documented record of work"],
    offers: [
      { title: "Phased restroom restoration", body: "One restroom or zone at a time, aligned to EVS and facilities schedules." },
      { title: "Grout repair & resealing", body: "Restore and protect high-use floors and shower areas." },
      { title: "Documented completion", body: "Area-by-area photo record and completion report." },
      { title: "Recurring program", body: "Planned cycles across buildings and floors." },
    ],
    howWeWork: ["Facility assessment request", "Site walk with facilities/EVS to confirm access, hours and PPE rules", "Written scope by restroom/area with phasing plan", "Work in permitted windows; documentation delivered after each phase"],
    formVariant: "commercial", customerType: "commercial",
    faq: [
      { q: "Do you follow infection-control requirements?", a: "We build the facility's requirements—work zones, barriers, PPE and hours—into the scope. Specific protocols (such as ICRA classifications) are confirmed with your infection-prevention team during the site walk. We don't certify infection-control compliance; your infection-prevention team remains the authority on it." },
      { q: "Can you share references?", a: "Yes, where clients have authorised it. We never name healthcare clients publicly without written permission." },
    ],
    seoTitle: "Hospital Restroom Tile & Grout Restoration | StoneCraft Commercial",
    metaDescription: "Phased, documented restroom tile and grout restoration for hospitals and healthcare facilities, scheduled around patient care.",
  },
  {
    id: "universities-schools", path: "/commercial/universities-schools", label: "Universities & Schools", audience: "University and school facilities departments",
    eyebrow: "Universities, colleges & schools",
    h1: "Restore Residence Hall, Locker Room and Restroom Tile Between Terms",
    sub: "Bathrooms, residence halls, locker rooms and tiled common areas restored on academic-calendar schedules, with recurring programs across buildings.",
    primaryCta: { label: "Request a Campus Site Assessment", href: "/commercial-site-assessment?segment=universities-schools" },
    secondaryCta: { label: "Plan a Summer or Break Program", href: "/commercial-site-assessment?segment=universities-schools&program=break" },
    pains: ["Short turnover windows between terms", "Dozens of similar bathrooms across buildings", "Procurement and vendor-registration requirements"],
    offers: [
      { title: "Residence hall bathroom restoration", body: "Standardised scopes repeated across floors and buildings." },
      { title: "Locker room & shower areas", body: "Grout repair, recaulking and sealing for wet areas." },
      { title: "Common-area floors", body: "Lobbies, corridors and dining areas." },
      { title: "Break-period programs", body: "Summer, winter and spring break scheduling." },
    ],
    howWeWork: ["Assessment request with building and bathroom counts", "Sample-room pilot to confirm scope and production rate", "Proposal aligned to procurement", "Scheduled rollout by building with documentation"],
    formVariant: "commercial", customerType: "commercial",
    faq: [{ q: "Can you start with a pilot?", a: "Yes. A pilot on a few representative rooms is the best way to confirm results, production rates and price per room." }],
    seoTitle: "University & School Restroom and Residence Hall Tile Restoration | StoneCraft",
    metaDescription: "Residence hall, locker room and restroom tile and grout restoration on academic schedules, with pilots and recurring programs.",
  },
  {
    id: "hotels-hospitality", path: "/commercial/hotels-hospitality", label: "Hotels & Hospitality", audience: "Hotel general managers and engineering teams",
    eyebrow: "Hotels, resorts & hospitality",
    h1: "Guest Bathroom and Public-Area Restoration Without Taking Rooms Offline for Long",
    sub: "Room-by-room bathroom restoration, lobby and pool-area stone care, and recurring programs scheduled around occupancy.",
    primaryCta: { label: "Request a Property Assessment", href: "/commercial-site-assessment?segment=hotels-hospitality" },
    secondaryCta: { label: "Pilot a Few Rooms", href: "/commercial-site-assessment?segment=hotels-hospitality&program=pilot" },
    pains: ["Grout and caulk that show up in guest reviews and photos", "Renovation cycles that take rooms out of inventory", "Stone lobbies and spa areas losing their finish"],
    offers: [
      { title: "Guest bathroom restoration", body: "Room-by-room, scheduled with housekeeping and engineering." },
      { title: "Lobby & public-area stone", body: "Marble and stone honing, polishing and sealing." },
      { title: "Pool, spa & fitness areas", body: "Wet-area grout and caulk." },
      { title: "Recurring program", body: "Planned cycles by floor or wing." },
    ],
    howWeWork: ["Assessment request with room counts and occupancy constraints", "Pilot rooms to set per-room time and price", "Rollout schedule by floor", "Per-room completion records"],
    formVariant: "commercial", customerType: "commercial",
    faq: [{ q: "How long is a room out of service?", a: "It depends on scope and cure times; a pilot establishes a reliable per-room figure before rollout." }],
    seoTitle: "Hotel Bathroom & Lobby Tile and Stone Restoration | StoneCraft",
    metaDescription: "Guest bathroom, lobby and pool-area tile and stone restoration for hotels and resorts, scheduled around occupancy.",
  },
  {
    id: "hoa-condos", path: "/commercial/hoa-condos", label: "HOAs & Condos", audience: "HOA boards and condominium managers",
    eyebrow: "HOAs & condominium associations",
    h1: "Common-Area and Amenity Tile & Stone Restoration for Associations",
    sub: "Lobbies, hallways, pool decks, fitness centres and clubhouse restrooms restored with scopes and documentation boards can review.",
    primaryCta: { label: "Request an Association Assessment", href: "/commercial-site-assessment?segment=hoa-condos" },
    secondaryCta: { label: "Offer a Resident Program", href: "/commercial-site-assessment?segment=hoa-condos&program=resident" },
    pains: ["Worn lobbies and amenity areas that affect resale value", "Boards needing clear scopes and comparable bids", "Residents asking for vendor recommendations"],
    offers: [
      { title: "Lobby & corridor stone and tile", body: "Restore and seal high-visibility areas." },
      { title: "Amenity restrooms & showers", body: "Pool, fitness and clubhouse wet areas." },
      { title: "Maintenance schedule", body: "Recurring care aligned to the reserve plan." },
      { title: "Optional resident program", body: "Unit-owner pricing for in-unit work, with the association's approval." },
    ],
    howWeWork: ["Assessment request", "Site walk with the manager or board representative", "Written scope and proposal suitable for board review", "Scheduled work with resident notices and documentation"],
    formVariant: "commercial", customerType: "commercial",
    faq: [{ q: "Can you present to the board?", a: "Yes. We can walk the board through the scope, schedule and documentation." }],
    seoTitle: "HOA & Condo Common-Area Tile and Stone Restoration | StoneCraft",
    metaDescription: "Lobby, corridor and amenity tile and stone restoration for HOAs and condominium associations, with board-ready scopes.",
  },
  {
    id: "property-management", path: "/commercial/property-management", label: "Property Management", audience: "Multifamily owners and property management firms",
    eyebrow: "Multifamily & property management",
    h1: "One Restoration Vendor Across Your Portfolio",
    sub: "Standardised unit-turn scopes, recurring maintenance and common-area restoration across buildings—with per-unit documentation.",
    primaryCta: { label: "Start a Portfolio Review", href: "/commercial-site-assessment?segment=property-management" },
    secondaryCta: { label: "Pilot One Unit", href: "/free-assessment?type=landlord&program=pilot" },
    pains: ["Inconsistent results from different vendors", "Turn timelines slipping on bathroom work", "No photo record to support security-deposit decisions"],
    offers: [
      { title: "Pilot unit", body: "Prove results and timing on one unit first." },
      { title: "Approved-vendor program", body: "Standard scope menu and pricing per unit type." },
      { title: "Recurring work", body: "Turn schedules fed straight into our calendar." },
      { title: "Common areas", body: "Lobbies, corridors and amenity spaces." },
    ],
    howWeWork: ["Portfolio review", "Pilot unit", "Approved-vendor setup", "Recurring work and expansion across properties"],
    formVariant: "commercial", customerType: "property_manager",
    faq: [{ q: "Can you invoice per property?", a: "Yes—invoicing can be set per property, entity or cost code." }],
    seoTitle: "Portfolio Tile & Bathroom Restoration for Property Managers | StoneCraft",
    metaDescription: "Standardised unit-turn and common-area tile restoration for multifamily owners and property managers, with per-unit documentation.",
  },
];

export const findSegment = (id: string) => segments.find((s) => s.id === id);
export const commercialSegments = segments.filter((s) => s.path.startsWith("/commercial/"));
