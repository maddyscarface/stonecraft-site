"""Generate static downloadable assets into public/:
  - downloads/landlord-approval-request.docx
  - downloads/stonecraft-commercial-capabilities.pdf
  - og.png (1200x630 social card)
Run: python3 scripts/build-assets.py   (re-run after editing src/config/capabilities.ts copy below)
"""
from pathlib import Path
from docx import Document
from docx.shared import Pt, RGBColor
from reportlab.lib.pagesizes import letter
from reportlab.lib.colors import HexColor
from reportlab.pdfgen import canvas
from reportlab.lib.utils import simpleSplit
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1] / "public"
(ROOT / "downloads").mkdir(parents=True, exist_ok=True)
HUNTER, LINEN, CREAM, PATINA = "#1A3828", "#D4B896", "#F5F0E8", "#4A7060"

# ---------- Landlord approval request (.docx) ----------
d = Document()
st = d.styles["Normal"]; st.font.name = "Calibri"; st.font.size = Pt(11)
h = d.add_paragraph(); r = h.add_run("Request for Approval — Bathroom Surface Refresh"); r.bold = True; r.font.size = Pt(16); r.font.color.rgb = RGBColor(0x1A, 0x38, 0x28)
d.add_paragraph("Non-structural restoration of existing tile, grout and caulk")
for label in ["Date", "Property address & unit", "Tenant name(s)", "Tenant phone / email", "Landlord / property manager", "Landlord phone / email"]:
    d.add_paragraph(f"{label}: ________________________________________________")
d.add_heading("What we are requesting", level=2)
d.add_paragraph("The tenant(s) request permission for StoneCraft to perform a non-structural restoration of the existing bathroom surfaces at the address above. No tile will be removed or replaced and no plumbing, electrical or structural work is included.")
d.add_heading("Proposed scope (from StoneCraft's written quote)", level=2)
for item in ["Deep cleaning of shower/tub tile and grout", "Grout colour sealing or clear sealing — colour: ______________", "Removal and replacement of caulk at tub/shower and vanity joints", "Spot regrouting of cracked or missing grout", "Bathroom floor tile and grout cleaning / sealing"]:
    d.add_paragraph(f"☐ {item}")
d.add_paragraph("Quote reference: ______________    Proposed date(s): ______________")
d.add_heading("Cost", level=2)
d.add_paragraph("☐ Paid by tenant(s)    ☐ Shared: tenant ____% / landlord ____%    ☐ Paid by landlord")
d.add_heading("Conditions", level=2)
d.add_paragraph("StoneCraft will provide a certificate of insurance on request, protect adjacent surfaces, and provide before/after photos to the tenant and, if requested, the landlord. Grout colour changes (if any) are listed above. Approval does not change any other term of the lease.")
d.add_heading("Decision", level=2)
d.add_paragraph("☐ Approved    ☐ Approved with changes: ____________________    ☐ Not approved")
d.add_paragraph("Landlord / manager signature: ____________________________   Date: __________")
d.add_paragraph("Printed name: ____________________________")
p = d.add_paragraph(); rr = p.add_run("This template is provided for convenience and is not legal advice. Your lease may set its own approval process."); rr.italic = True; rr.font.size = Pt(9)
d.save(ROOT / "downloads" / "landlord-approval-request.docx")

# ---------- Capabilities statement (.pdf) ----------
CAP = {
  "overview": "StoneCraft restores existing tile, grout, caulk and natural stone in occupied commercial and residential properties. We scope by area, schedule work into permitted windows, phase closures so facilities stay operational, and document every area before and after.",
  "services": ["Restroom floor and wall tile and grout restoration", "Grout repair, regrouting and colour/clear sealing", "Caulk removal and replacement at wet-area joints", "Shower, locker-room and pool/amenity wet-area restoration", "Marble and natural stone cleaning, honing, polishing and sealing", "Hard-floor restoration for lobbies and corridors", "Recurring maintenance programs across buildings and properties"],
  "method": ["Site assessment request with building, restroom and square-footage counts", "Site walk with facilities to confirm access, hours, PPE and work-zone rules", "Written scope by area with phasing plan and schedule", "Pilot area (optional) to confirm results and production rate", "Phased work in permitted windows (nights, weekends, academic breaks)", "Before/after photo log and completion report per phase"],
  "differentiators": ["Restoration-first: extends surface life without replacement where tile is sound", "Honest scoping: we identify areas that need replacement rather than covering them up", "Documentation suitable for facility records and capital planning", "One vendor across Greater Boston and Southeast Florida"],
  "sectors": ["Hospitals & healthcare", "Universities, colleges & schools", "Hotels & hospitality", "HOAs & condominium associations", "Multifamily & property management", "Commercial office & retail common areas"],
  "data": [("Legal entity", "[VERIFY before distribution]"), ("NAICS (suggested)", "561790; 238340 — VERIFY"), ("Insurance", "COI on request — VERIFY limits"), ("Certifications", "List only if certified")],
  "contact": [("StoneCraft Boston", "(617) 000-0000 · hello@stonecraftboston.com"), ("StoneCraft Southeast Florida", "(561) 000-0000 · hello@stonecraftsefl.com")],
}
W, H = letter
c = canvas.Canvas(str(ROOT / "downloads" / "stonecraft-commercial-capabilities.pdf"), pagesize=letter)
c.setTitle("StoneCraft — Commercial Capabilities Statement")
c.setFillColor(HexColor(HUNTER)); c.rect(0, H - 90, W, 90, stroke=0, fill=1)
c.setFont("Times-Bold", 26); c.setFillColor(HexColor("#FFFFFF")); c.drawString(40, H - 55, "Stone"); c.setFillColor(HexColor(LINEN)); c.drawString(40 + c.stringWidth("Stone", "Times-Bold", 26), H - 55, "Craft")
c.setFont("Helvetica-Bold", 9); c.drawRightString(W - 40, H - 52, "COMMERCIAL CAPABILITIES STATEMENT")
c.setFont("Helvetica", 9); c.setFillColor(HexColor(LINEN)); c.drawString(40, H - 75, "Restore Your Surfaces. Reduce Disruption. Protect Your Property.")

def block(x, y, w, title, lines, bullet=True, size=9.2):
    c.setFillColor(HexColor(HUNTER)); c.setFont("Times-Bold", 13); c.drawString(x, y, title); y -= 15
    c.setFont("Helvetica", size); c.setFillColor(HexColor("#222222"))
    for i, ln in enumerate(lines):
        pre = "•  " if bullet is True else (f"{i+1}.  " if bullet == "num" else "")
        wrapped = simpleSplit(pre + ln, "Helvetica", size, w)
        for j, wl in enumerate(wrapped):
            c.drawString(x + (0 if (j == 0 or not bullet) else 10), y, wl if j == 0 else wl.strip()); y -= size + 3.2
        y -= 1.5
    return y - 10

lx, rx, lw, rw = 40, 380, 320, 192
y = block(lx, H - 120, lw, "Overview", [CAP["overview"]], bullet=False, size=9.6)
y = block(lx, y, lw, "Core services", CAP["services"])
y = block(lx, y, lw, "How we work", CAP["method"], bullet="num")
y = block(lx, y, lw, "Differentiators", CAP["differentiators"])
c.setFillColor(HexColor(CREAM)); c.rect(rx - 12, 60, rw + 24, H - 190, stroke=0, fill=1)
y2 = block(rx, H - 120, rw, "Sectors", CAP["sectors"])
y2 = block(rx, y2, rw, "Company data", [f"{k}: {v}" for k, v in CAP["data"]], bullet=False, size=8.6)
y2 = block(rx, y2, rw, "Contact", [f"{k} — {v}" for k, v in CAP["contact"]], bullet=False, size=8.6)
c.setFont("Helvetica-Oblique", 7.5); c.setFillColor(HexColor(PATINA)); c.drawString(40, 40, "Independently owned and operated. Replace bracketed placeholders and phone numbers before distribution.")
c.showPage(); c.save()

# ---------- OG image ----------
img = Image.new("RGB", (1200, 630), HUNTER)
dr = ImageDraw.Draw(img)
def font(names, size):
    for n in names:
        try: return ImageFont.truetype(n, size)
        except OSError: pass
    return ImageFont.load_default()
serif = font(["/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"], 64)
sans = font(["/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"], 30)
for i in range(6):
    for j in range(4):
        dr.rounded_rectangle([760 + i * 74, 120 + j * 74, 760 + i * 74 + 66, 120 + j * 74 + 66], 6, fill=LINEN if (i + j) % 3 else PATINA)
dr.text((70, 150), "Your Tile. Your Grout.", font=serif, fill="#FFFFFF")
dr.text((70, 230), "Your Stone. Restored.", font=serif, fill=LINEN)
dr.text((70, 360), "Tile, grout, shower & natural stone restoration", font=sans, fill="#C8D0B8")
dr.text((70, 405), "Greater Boston · Southeast Florida", font=sans, fill="#C8D0B8")
dr.text((70, 520), "StoneCraft", font=font(["/usr/share/fonts/truetype/dejavu/DejaVuSerif-Bold.ttf"], 40), fill=LINEN)
img.save(ROOT / "og.png")
print("assets built")
