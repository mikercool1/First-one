"""Build Probrands database documents from the Professional Brands Market Map workbook.

Usage: python3 probrands/import/build_import.py <Professional_Brands_Market_Map.xlsx>

Writes import/out/companies/<id>.json (summary), import/out/details/<id>.json,
import/out/meta/entities.json (every brand, linked to its owner when known) and
import/out/meta/deals.json (the Deals tab).

Owners come from the Master tab once it is filled in (Phase 3). Until then, v1 has
no verified owners, so each brand's "Likely owner (PRIOR - unverified)" becomes a
starter profile, with every ownership field rated Low and marked unverified.
"""
import collections, glob, json, os, re, sys, unicodedata

import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else "Professional_Brands_Market_Map_v1.xlsx"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
NOW = "2026-10-01T00:00:00Z"
SEEDED = "Professional Brands Market Map v1 (1 Oct 2026)"

wb = openpyxl.load_workbook(SRC, data_only=True)


def table(name, header_row=4):
    ws = wb[name]
    rows = list(ws.iter_rows(min_row=header_row, values_only=True))
    head = [str(h).strip() if h is not None else "" for h in rows[0]]
    return [dict(zip(head, r)) for r in rows[1:] if r and r[0] not in (None, "")]


def n(v):
    try:
        return float(v) if v not in (None, "") else None
    except (TypeError, ValueError):
        return None


def r1(v, k=1):
    return round(v, k) if v is not None else None


def s(v, lim=None):
    t = "" if v is None else str(v).strip()
    return t[:lim] if lim else t


def slug(name):
    t = unicodedata.normalize("NFKD", re.sub(r"\(.*?\)", "", name.lower())).encode("ascii", "ignore").decode()
    t = re.sub(r"[^\w\s-]", "", t).strip()
    return re.sub(r"[\s_-]+", "-", t)[:60] or "co"


# Trades: the app's end markets. Workbook trade labels map onto them.
TRADES = ["Industrial MRO", "Plumbing", "HVAC/R", "Electrical", "Construction & Contractor", "Facilities & Janitorial",
          "Automotive & Fleet", "Welding & Fabrication", "Water & Wastewater", "Other"]
TRADE_MAP = {"Industrial MRO": ["Industrial MRO"], "Plumbing": ["Plumbing"], "HVAC/R": ["HVAC/R"], "Electrical": ["Electrical"],
             "Plumbing/HVAC/Electrical": ["Plumbing", "HVAC/R", "Electrical"], "Construction": ["Construction & Contractor"],
             "Construction & Contractor": ["Construction & Contractor"], "Facilities & Janitorial": ["Facilities & Janitorial"],
             "Automotive": ["Automotive & Fleet"], "Heavy Duty / Fleet": ["Automotive & Fleet"], "Automotive & Fleet": ["Automotive & Fleet"],
             "Welding": ["Welding & Fabrication"], "Welding & Fabrication": ["Welding & Fabrication"], "Water & Wastewater": ["Water & Wastewater"]}


def trades_of(label):
    return TRADE_MAP.get(s(label), ["Other"] if s(label) and s(label) != "Multi-trade" else [])


# Sector ids match BASE_SECTORS in index.html; the regexes mirror CAT_SECTOR there (first match wins).
CAT_SECTOR = [
    (r"hand (cleaner|wipe|soap|care)|skin|barrier cream|sunscreen", "hand-care"),
    (r"disinfect|sanitiz|insecticide|wasp|hornet|pest|rodent|odor|deodor", "sanitation"),
    (r"coil clean|ice machine|refrigera|vacuum pump|leak detect|hvac|condensate|duct seal|duct mastic|nitrogen", "hvac"),
    (r"pvc|cpvc|abs cement|solvent cement|pipe (thread|joint|dope)|thread seal|drain|septic|plumb|flux.*(solder|plumb)|boiler|hydronic|descal", "plumbing"),
    (r"wire pull|dielectric|anti.?oxid|joint compound|electrical|contact clean|fiber optic|arc|insulating|splic", "electrical"),
    (r"weld|spatter|cutting (fluid|oil)|tapping|layout|cold galv|soldering|brazing|metalworking|coolant", "welding"),
    (r"brake|carb|throttle|motor oil|oil additive|fuel|radiator|cooling system|antifreeze|body filler|automotive|fleet|def\b|diesel|transmission", "automotive"),
    (r"grout|mortar|concrete|cure|curing|form release|waterproof|firestop|anchor|masonry|bonding agent|tile|stucco|patch", "construction"),
    (r"water treat|dechlor|wastewater|test kit|reagent|chlorin|lift station", "water-ww"),
    (r"paint|marker|crayon|coating|primer|galvaniz|stain|lacquer", "paints"),
    (r"lubric|grease|penetr|oil|anti.?seize|silicone spray|rust (prevent|inhib)|corrosion", "lubricants"),
    (r"adhesive|sealant|caulk|thread ?lock|epoxy|glue|gasket|retaining|cement|mastic|foam", "adhesives"),
    (r"clean|degreas|solvent|remover|towel|wipe|glass|janitor", "cleaners"),
]


def cat_sector(cat):
    for pat, sid in CAT_SECTOR:
        if re.search(pat, cat or "", re.I):
            return sid
    return "other"


OWNER_TYPE = {"Public": "Public", "Private (family)": "Family/founder-owned", "PE-backed": "PE-owned", "Private": "Other",
              "Founder / family": "Family/founder-owned", "ESOP / employee": "ESOP", "Subsidiary": "Subsidiary of strategic"}


def split_owner(raw):
    """'CRC Industries (Berwind)' -> ('CRC Industries', 'Berwind'); 'Valvoline / Saudi Aramco' -> ('Valvoline', 'Saudi Aramco')."""
    raw = s(raw)
    m = re.match(r"^(.*?)\s*\((.+)\)\s*$", raw)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    if " / " in raw:
        a, b = raw.split(" / ", 1)
        return a.strip(), b.strip()
    return raw, ""


brands = table("Brands")
products = table("Products")
dists = {s(d["Distributor"]): d for d in table("Distributors")}
master = [m for m in table("Master") if s(m.get("Owner (ultimate)"))]
deal_rows = [d for d in table("Deals") if s(d.get("Target"))]

# SKUs per brand per distributor, from the raw scrape.
sku_by = collections.defaultdict(collections.Counter)
for p in products:
    if s(p.get("Brand")):
        sku_by[s(p["Brand"])][s(p.get("Distributor"))] += 1

# Group brands by owner: verified owner when the workbook has one, else the unverified prior.
by_owner = collections.OrderedDict()
for b in brands:
    raw = s(b.get("Ultimate owner")) or s(b.get("Likely owner (PRIOR - unverified)"))
    if not raw:
        continue
    by_owner.setdefault(raw, {"verified": bool(s(b.get("Ultimate owner"))), "brands": []})["brands"].append(b)
master_by = {s(m["Owner (ultimate)"]): m for m in master}
for name in master_by:
    by_owner.setdefault(name, {"verified": True, "brands": []})["verified"] = True

os.makedirs(f"{OUT}/companies", exist_ok=True); os.makedirs(f"{OUT}/details", exist_ok=True); os.makedirs(f"{OUT}/meta", exist_ok=True)
for f in glob.glob(f"{OUT}/*/*.json"):
    os.remove(f)

ids, sizes = {}, []
for raw, g in by_owner.items():
    name, parent = split_owner(raw)
    cid = slug(name)
    while cid in ids.values():
        cid += "-2"
    ids[raw] = cid
    bs = sorted(g["brands"], key=lambda b: -(n(b.get("# SKUs scraped")) or 0))
    m = master_by.get(raw, {})
    otype_raw = s(m.get("Owner type")) or s(bs[0].get("Owner type (PRIOR - unverified)") if bs else "")
    otype = OWNER_TYPE.get(otype_raw, otype_raw)
    pe = s(m.get("PE sponsor")) or (parent if otype == "PE-owned" else "")
    skus = sum(int(n(b.get("# SKUs scraped")) or 0) for b in bs)

    # Sector mix and trade mix, weighted by SKUs scraped (at least 1 per brand).
    sec, trade = collections.Counter(), collections.Counter()
    for b in bs:
        w = max(1, int(n(b.get("# SKUs scraped")) or 0))
        sec[cat_sector(s(b.get("Primary product category")))] += w
        reached = [t for lab in s(b.get("Trades reached")).split(";") for t in trades_of(lab.strip())]
        reached = reached or trades_of(b.get("Primary trade"))
        for t in set(reached):
            trade[t] += w / len(set(reached))
    stot, ttot = sum(sec.values()) or 1, sum(trade.values()) or 1
    sectors = [{"sector": k, "pct": r1(v / stot * 100), "revenue_usd_m": None,
                "what": ", ".join(s(b["Brand"]) for b in bs if cat_sector(s(b.get("Primary product category"))) == k)[:300]}
               for k, v in sec.most_common()]
    em = {t: r1(v / ttot * 100) for t, v in trade.most_common()}
    if m:  # Master trade mix wins once it exists
        mm = {t: r1(n(m.get("% " + t)) * 100) for t in TRADES if n(m.get("% " + t))}
        em = mm or em
    prim_trade = s(m.get("Primary trade")) or (collections.Counter(s(b.get("Primary trade")) for b in bs).most_common(1)[0][0] if bs else "")
    scope = s(m.get("Pro relevance")) or ("Core" if any(s(b.get("Scope flag")) == "Core" for b in bs) else "Adjacent")
    brand_names = ", ".join(s(b["Brand"]) for b in bs)

    # Customers: the distributors that carry its brands in the scrape.
    carry = collections.Counter(); carried = collections.defaultdict(list)
    for b in bs:
        for d, k in sku_by[s(b["Brand"])].items():
            carry[d] += k; carried[d].append(s(b["Brand"]))
    customers = [{"name": d, "end_market": s(dists.get(d, {}).get("Primary end market")), "what": ", ".join(carried[d])[:200] + f" ({k} SKUs listed)",
                  "share_pct": None, "source": "Distributor scrape 2026-10-01", "confidence": "Medium"} for d, k in carry.most_common(15)]

    catalog = [{"category": s(b.get("Primary product category")) or "Uncategorised", "line": s(b["Brand"]),
                "named_products": s(b.get("Known for (hero product)")), "what_it_is": s(b.get("Primary form factor")),
                "applications": "", "end_markets": [t for lab in s(b.get("Trades reached")).split(";") for t in trades_of(lab.strip())][:6],
                "made_or_resold": "", "share_pct": None, "revenue_usd_m": None, "confidence": "Low"} for b in bs]

    prior = "Market map v1: owner is Claude's prior knowledge, not yet verified (Phase 3)"
    scraped = "Market map v1 distributor scrape, 1 Oct 2026"
    conf = {f: {"level": "Low", "basis": prior} for f in ["name", "owner_type", "ultimate_parent", "pe_sponsor"]}
    conf.update({f: {"level": "Medium", "basis": scraped} for f in ["pro_brands", "skus_scraped", "customers"]})
    conf.update({"sectors": {"level": "Low", "basis": "Brand product categories weighted by SKUs scraped"},
                 "primary_sector": {"level": "Low", "basis": "Largest sector by SKUs scraped"},
                 "end_markets_total_platform": {"level": "Low", "basis": "Trades reached by the distributors carrying its brands, weighted by SKUs"},
                 "products": {"level": "Low", "basis": "One line per brand from the market map; Enhance builds the full catalog"},
                 "primary_trade": {"level": "Low", "basis": scraped}, "scope": {"level": "Low", "basis": "Brand scope flag in the market map"}})
    if g["verified"]:
        for f in ["name", "owner_type", "ultimate_parent", "pe_sponsor"]:
            conf[f] = {"level": s(m.get("Confidence")) or "Medium", "basis": s(m.get("Key source")) or "Market map Master tab"}

    rev = n(m.get("TOTAL PLATFORM REV ($M)")); pro_rev = n(m.get("PRO BRAND REV ($M, pro forma)")); ebitda = n(m.get("PLATFORM EBITDA ($M)"))
    summary = {
        "name": name, "platform_name": "", "ultimate_parent": parent if otype != "PE-owned" else "", "owner_type": otype,
        "pe_sponsor": pe, "pe_backed": otype == "PE-owned", "business_model": s(m.get("Business model")),
        "primary_category": s(m.get("Primary product category")) or (s(bs[0].get("Primary product category")) if bs else ""),
        "primary_trade": prim_trade, "scope": scope, "pro_brands": brand_names[:1500], "brands_count": len(bs), "skus_scraped": skus,
        "hq_address": s(m.get("HQ state")), "total_revenue_usd_m": r1(rev), "pro_brand_revenue_usd_m": r1(pro_rev),
        "total_ebitda_usd_m": r1(ebitda), "rolled_in": s(m.get("Rolled-in companies"), 1500),
        "sectors": sectors, "primary_sector": sectors[0]["sector"] if sectors else "other",
        "end_markets_total_platform": em, "revenue_by_business": [], "revenue_by_product": [], "acquisitions": [],
        "buyers": [], "addon_ideas": [], "competitors": [], "locked": [], "source_of_truth": [], "conf": conf,
        "confidence": "Low", "status": "ready", "updated_at": NOW, "seeded_from": SEEDED, "owner_verified": g["verified"],
    }
    summary = {k: v for k, v in summary.items() if v not in ("", None) or k in ("ultimate_parent", "pe_sponsor")}
    detail = {
        "what_it_is": f"Owns {len(bs)} professional brand{'s' if len(bs) != 1 else ''} in the market map: {brand_names[:300]}." if bs else "",
        "bluntly": s(m.get("What it mostly is (blunt)")),
        "products": catalog, "customers": customers,
        "open_questions": [] if g["verified"] else ["Ownership is Claude's prior from the market map, not verified. Confirm the owner before relying on the profile."],
        "runs": [{"at": NOW, "kind": "Imported", "summary": f"Starter profile from {SEEDED}: {len(bs)} brands, {skus} SKUs scraped, {len(customers)} distributors."}],
    }
    json.dump(summary, open(f"{OUT}/companies/{cid}.json", "w"))
    json.dump(detail, open(f"{OUT}/details/{cid}.json", "w"))
    sizes.append((len(json.dumps(summary)), len(json.dumps(detail)), cid))

# Every brand, for search and Buyer finder: owned brands point at their owner's profile.
entities = []
for b in brands:
    raw = s(b.get("Ultimate owner")) or s(b.get("Likely owner (PRIOR - unverified)"))
    entities.append({"name": s(b["Brand"]), "role": "Brand", "owner_id": ids.get(raw), "owner": split_owner(raw)[0] if raw else "",
                     "status": ("Owner unverified (prior)" if raw and not s(b.get("Ultimate owner")) else "Owner verified" if raw else "Owner unknown"),
                     "what": "; ".join(x for x in [s(b.get("Primary product category")), s(b.get("Known for (hero product)")), s(b.get("Primary trade"))] if x)[:200],
                     "skus": int(n(b.get("# SKUs scraped")) or 0), "scope": s(b.get("Scope flag"))})
entities = [e for e in entities if e["name"]]
json.dump({"entities": entities, "updated_at": NOW}, open(f"{OUT}/meta/entities.json", "w"))
deals = [{"date": s(d.get("Date")) or s(d.get("Year")), "acquirer": s(d.get("Acquirer")), "target": s(d.get("Target")),
          "target_brands": s(d.get("Target brands")), "value_usd_m": n(d.get("Value ($M, if disclosed)")), "deal_type": s(d.get("Deal type")),
          "source": s(d.get("Source"))} for d in deal_rows]
json.dump({"deals": deals, "updated_at": NOW}, open(f"{OUT}/meta/deals.json", "w"))

print("owners", len(ids), "verified", sum(1 for g in by_owner.values() if g["verified"]), "brands", len(entities),
      "owned brands", sum(1 for e in entities if e["owner_id"]), "deals", len(deals))
print("largest summary/detail bytes", max(x[0] for x in sizes), max(x[1] for x in sizes))
print("entities KB", os.path.getsize(f"{OUT}/meta/entities.json") // 1024)
