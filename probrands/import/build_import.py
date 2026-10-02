"""Build the Probrands database from the Professional Brands Market Map workbook.

Usage: python3 probrands/import/build_import.py <Professional_Brands_Market_Map.xlsx>

Writes import/out/data/*.json, one file per document of the app's "data" collection:
  co-N   company summaries (owner, model, SKU mix, the metrics behind the DNA test, Claude's judgment)
  dt-N   company details (write-up, brand-by-brand list, acquisitions, sources)
  br-N   every brand: owner (verified, unverified prior, Claude's guess or unknown), channels, formats
  deals  every deal in the ledger, with the acquiring and target owners resolved
  dists  the distributor list with channel class and end market
Writes import/out/sku/p-N.json, the "sku" collection: every scraped SKU, grouped by brand, loaded on demand.
Also writes import/out/judge/batch-N.json: the facts Claude needs for the judgment tests.
Judgments live in import/judgments.json (company id -> verdicts) and are merged into co-N.
Claude's best-guess owners for brands the workbook has no owner for live in import/brand_owners.json (brand name -> guess).

Owners come from the Master tab (verified ownership, with facts from Companies, Profiles and
Sources). Brands that only carry Claude's unverified "Likely owner (PRIOR)" join a Master owner
when the names match, and otherwise become owners of their own with ownership marked unverified.
"""
import collections, glob, json, math, os, re, sys, unicodedata

import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else "Professional_Brands_Market_Map.xlsx"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
NOW = "2026-10-01T12:00:00Z"
VERSION = re.search(r"v\d+", os.path.basename(SRC))
SEEDED = f"Professional Brands Market Map {VERSION.group(0) if VERSION else ''} (1 Oct 2026)".replace("  ", " ")

wb = openpyxl.load_workbook(SRC, data_only=True)
FIRST_COL = {"Rank", "ID", "Brand ID", "Year", "#", "Product name", "Segment", "Distributor"}


def table(name):
    """Rows of a tab as dicts, keyed by its header row (the first row whose first cell is a known header)."""
    rows = list(wb[name].iter_rows(values_only=True))
    hi = next(i for i, r in enumerate(rows) if r and r[0] in FIRST_COL)
    head, seen = [], collections.Counter()
    for h in rows[hi]:  # duplicate headers ("% Other" twice) get a suffix
        h = str(h).strip() if h is not None else ""
        seen[h] += 1
        head.append(h if seen[h] == 1 else f"{h} ({seen[h]})")
    return [dict(zip(head, r)) for r in rows[hi + 1:] if any(v not in (None, "") for v in r)]


def n(v):
    try:
        f = float(v) if v not in (None, "") else None
        return f if f else None  # formula cells read 0 when the input is blank
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


SUFFIX = r"\b(the|co|cos|company|companies|corporation|corp|inc|llc|ltd|group|ag|plc|spa|s p a|nv|sa|holdings?|international)\b"


def key(name):
    """Comparable core of a company name: 'The Quikrete Companies' and 'Quikrete Cos.' both give 'quikrete'."""
    t = unicodedata.normalize("NFKD", s(name).lower()).encode("ascii", "ignore").decode()
    t = re.split(r"\s*\(|\s+/\s+", t)[0]
    t = re.sub(r"\s*(&|and)\s+sons?\b", " ", t.replace(".", " "))
    t = re.sub(SUFFIX, " ", t)
    return re.sub(r"[^a-z0-9]", "", t)


ALIASES = {"itw": "illinoistoolworks"}  # prior name -> Master key

# Product family of a category (first match wins).
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
    (r"lubric|(?<!de)grease|penetr|oil|anti.?seize|silicone spray|rust (prevent|inhib)|corrosion", "lubricants"),
    (r"adhesive|sealant|caulk|thread ?lock|epoxy|glue|gasket|retaining|cement|mastic|foam", "adhesives"),
    (r"clean|degreas|solvent|remover|towel|wipe|glass|janitor", "cleaners"),
]


def cat_sector(cat):
    for pat, sid in CAT_SECTOR:
        if re.search(pat, cat or "", re.I):
            return sid
    return "other"


def split_prior(raw):
    """'CRC Industries (Berwind)' -> ('CRC Industries', 'Berwind'); 'Valvoline / Saudi Aramco' -> ('Valvoline', 'Saudi Aramco')."""
    raw = s(raw)
    m = re.match(r"^(.*?)\s*\((.+)\)\s*$", raw)
    if m:
        return m.group(1).strip(), m.group(2).strip()
    if " / " in raw:
        a, b = raw.split(" / ", 1)
        return a.strip(), b.strip()
    return raw, ""


brands = [b for b in table("Brands") if s(b.get("Brand"))]
products = table("Products")
dists = {s(d["Distributor"]): d for d in table("Distributors") if s(d.get("Distributor"))}
master = [m for m in table("Master") if s(m.get("Owner (ultimate)"))]
cos = [c for c in table("Companies") if s(c.get("Company"))]
deal_rows = [d for d in table("Deals") if s(d.get("Target"))]
profiles = {s(p.get("ID")): p for p in table("Profiles") if s(p.get("Company"))}
sources = [x for x in table("Sources") if s(x.get("Company"))]

# The same ultimate owner sometimes appears twice in Master under different IDs (two divisions of
# DuPont, say). Fold each duplicate into the one with the most brands; its company row rolls in.
canon = {}
for m in sorted(master, key=lambda m: (-(n(m.get("# brands")) or 0), n(m.get("Owner ID")) or 0)):
    canon.setdefault(key(m["Owner (ultimate)"]), s(m["Owner ID"]))
dupes = {s(m["Owner ID"]): canon[key(m["Owner (ultimate)"])] for m in master if canon[key(m["Owner (ultimate)"])] != s(m["Owner ID"])}
master = [m for m in master if s(m["Owner ID"]) not in dupes]
for c in cos:
    oid = s(c.get("Owner ID (rolls into)"))
    if oid in dupes:
        c["Owner ID (rolls into)"] = dupes[oid]
        if s(c.get("Role")) == "Owner":
            c["Role"], c["In owner figure? Owner/Y/N/X"] = "Merged duplicate", "Y"

# A Master row named "Unknown" is a bucket of brands whose maker wasn't found, not a company: its brands stay unowned.
placeholder = {s(m["Owner ID"]) for m in master if key(m["Owner (ultimate)"]) in ("unknown", "unidentified", "notidentified")}
master = [m for m in master if s(m["Owner ID"]) not in placeholder]

co_by_id = {s(c["ID"]): c for c in cos}
owner_row = {s(c["Owner ID (rolls into)"]): c for c in cos if s(c.get("Role")) == "Owner"}

# SKUs per brand per distributor, from the raw scrape.
sku_by = collections.defaultdict(collections.Counter)
for p in products:
    if s(p.get("Brand")):
        sku_by[s(p["Brand"])][s(p.get("Distributor"))] += 1

# ---- owners: verified (Master), then unverified priors that match no Master owner
owners = collections.OrderedDict()  # owner key -> {name, master, verified, brands, prior_parent}
ids = {}
for m in master:
    oid = s(m["Owner ID"])
    owners[oid] = {"name": s(m["Owner (ultimate)"]), "master": m, "verified": True, "brands": [], "parent": ""}
name_key = {}  # owner names only, for matching deal acquirers
for oid, o in owners.items():
    name_key.setdefault(key(o["name"]), oid)
by_key = dict(name_key)  # plus parent names, for merging priors into Master owners
for oid, o in owners.items():
    hero_parent = key(s(o["master"].get("Ultimate parent / sponsor")))
    if hero_parent and len(hero_parent) >= 5:
        by_key.setdefault(hero_parent, oid)
    for part in re.findall(r"\(([^)]+)\)", o["name"]):  # "Victor Technologies (ESAB)" is also ESAB
        if len(key(part)) >= 3:
            by_key.setdefault(key(part), oid)


def prior_owner(k):
    """A Master owner for an unverified prior name: exact key, else the one owner whose name starts with it."""
    if k in by_key:
        return by_key[k]
    hits = {o for nk, o in name_key.items() if len(k) >= 3 and nk.startswith(k)}
    return hits.pop() if len(hits) == 1 else None

unlinked = []
for b in brands:
    cid = s(b.get("Company ID"))
    if cid and cid in co_by_id:
        oid = s(co_by_id[cid]["Owner ID (rolls into)"])
        (owners[oid]["brands"] if oid in owners else unlinked).append(b)
        continue
    raw = s(b.get("Likely owner (PRIOR - unverified)"))
    if not raw:
        unlinked.append(b)
        continue
    name, parent = split_prior(raw)
    k = ALIASES.get(key(name), key(name))
    oid = prior_owner(k)
    if not oid:
        oid = "prior:" + k
        by_key[k] = oid
        owners[oid] = {"name": name, "master": {}, "verified": False, "brands": [], "parent": parent,
                       "otype": s(b.get("Owner type (PRIOR - unverified)"))}
    owners[oid]["brands"].append(b)
    b["_prior"] = True

for oid, o in owners.items():
    cid = slug(o["name"])
    while cid in ids.values():
        cid += "-2"
    ids[oid] = cid

# ---- deals: an owner's own acquisitions go on its M&A tab; ownership changes and the rest go to meta/deals
acq = collections.defaultdict(list)
other_deals, seen_deals = [], set()
pe_entry = {}
for d in sorted(deal_rows, key=lambda d: s(d.get("Date")) or s(d.get("Year")), reverse=True):
    tgt = co_by_id.get(s(d.get("Target ID")))
    date = s(d.get("Date")) or s(d.get("Year"))
    dk = (key(d["Target"])[:12], date[:4])
    if dk in seen_deals:  # the ledger repeats a few deals with slightly different names
        continue
    seen_deals.add(dk)
    row = {"date": date, "target": s(d["Target"]), "deal_type": s(d.get("Deal type")), "what_it_does": s(tgt.get("What it mostly is (blunt)"), 300) if tgt else "",
           "what_it_added": s(d.get("Target brands")), "value_usd_m": n(d.get("Value ($M, if disclosed)")), "source_url": s(d.get("Source")) if s(d.get("Source")).startswith("http") else "",
           "source": s(d.get("Source")), "confidence": "High" if s(d.get("Source")).startswith("http") else "Medium"}
    owner = s(tgt["Owner ID (rolls into)"]) if tgt else ""
    if tgt and s(tgt.get("Role")) != "Owner" and owner in owners:
        acq[owner].append(row)  # the owner bought one of the companies now rolled into it
        continue
    if tgt and s(tgt.get("Role")) == "Owner" and name_key.get(key(d.get("Acquirer"))) == owner:
        acq[owner].append(row)  # the owner bought the business that now carries its name (Clorox buying GOJO)
        continue
    if not tgt:  # match the acquirer's name to an owner
        a = name_key.get(key(d.get("Acquirer")))
        if a and a in owners:
            acq[a].append(row)
            continue
    # ownership change of an owner, or a deal between companies outside the universe
    other = {**row, "acquirer": s(d.get("Acquirer")), "target_owner_id": ids.get(owner) if owner in owners else None}
    other_deals.append(other)

# A PE-backed owner's entry: the latest deal on it (or a business now inside it) where the acquirer names its sponsor.
for d in sorted(deal_rows, key=lambda d: s(d.get("Date")) or s(d.get("Year")), reverse=True):
    tgt = co_by_id.get(s(d.get("Target ID")))
    owner = s(tgt["Owner ID (rolls into)"]) if tgt else next((o for k, o in name_key.items() if len(k) >= 6 and key(d["Target"])[:8] == k[:8]), "")
    m = owners[owner]["master"] if owner in owners else {}
    sp, acq_by = key(m.get("PE sponsor")), key(d.get("Acquirer"))  # key() drops anything in brackets
    if owner and owner not in pe_entry and s(m.get("PE-backed")) == "Y" and len(sp) >= 3 and len(acq_by) >= 3 and (acq_by.startswith(sp[:6]) or sp.startswith(acq_by[:6])):
        pe_entry[owner] = {"date": s(d.get("Date")) or s(d.get("Year")), "value_usd_m": n(d.get("Value ($M, if disclosed)"))}

ev_by_co = collections.defaultdict(list)
for x in sources:
    ev_by_co[s(x["ID"])].append({"metric": s(x.get("Metric")), "value": s(x.get("Value"), 200), "year": s(x.get("Year")),
                                 "url": s(x.get("URL")), "quote": s(x.get("Quote"), 300)})

# ---- channels: which distributors are pro channels, and which end market each serves
RETAIL = {"Tractor Supply", "Do it Best / Ace / True Value (coops)", "Rockler / Woodcraft", "Pool Geek", "INYOPools", "TCP Global",
          "The Home Depot (Pro desk)", "West Marine (Pro)", "AutoZone (Commercial)", "O'Reilly Auto Parts (Pro)",
          "Advance Auto Parts (Carquest)", "Leslie's Pro", "Amazon Business"}
BROADLINE = {"W.W. Grainger", "McMaster-Carr", "Fastenal", "MSC Industrial Supply", "Applied Industrial Technologies", "Motion Industries",
             "Global Industrial", "Zoro", "Kimball Midwest", "Lawson Products (DSG)", "ORS Nasco", "Uline", "Home Depot Pro (incl. HD Supply)"}
MARKET = {"Industrial MRO": "Industrial MRO", "Industrial MRO (wholesale)": "Industrial MRO", "Safety & PPE": "Industrial MRO",
          "Oil & Gas / Energy": "Industrial MRO", "Plumbing": "Plumbing", "HVAC/R": "HVAC/R", "Electrical": "Electrical",
          "Facilities Maintenance": "Facilities & jan-san", "Janitorial & Sanitation": "Facilities & jan-san", "Facilities / Shipping": "Facilities & jan-san",
          "Construction / Contractor": "Construction", "Roofing & Exteriors": "Construction", "Drywall & Interiors": "Construction",
          "Flooring & Tile": "Construction", "Paint & Coatings": "Construction", "Woodworking & Cabinetry": "Construction",
          "Automotive Aftermarket": "Auto & fleet", "Automotive Refinish": "Auto & fleet", "Heavy Duty / Fleet": "Auto & fleet",
          "Welding & Fabrication": "Welding", "Water & Wastewater": "Water & pool", "Pool & Irrigation": "Water & pool", "Pool & Spa": "Water & pool",
          "Marine": "Marine & aviation", "Aviation MRO": "Marine & aviation", "Agriculture": "Farm & landscape", "Landscape & Turf": "Farm & landscape",
          "Electronics Assembly": "Electronics & lab", "Lab & Cleanroom": "Electronics & lab", "Hardware": "Hardware", "Hardware (wholesale)": "Hardware"}


def channel(d):
    return "retail" if d in RETAIL else "broadline" if d in BROADLINE else "specialty"


def market(d):
    return MARKET.get(s(dists.get(d, {}).get("Primary end market")), "Other")


# v20+: the workbook's own channel type per distributor (Pro, Mixed pro-DIY, Retail store, DIY / enthusiast online)
CTYPE = {"Pro": "pro", "Mixed pro-DIY": "mixed", "Retail store": "retail", "DIY / enthusiast online": "diy"}


def ctype(d):
    return CTYPE.get(s(dists.get(d, {}).get("Channel type")), "")


FAMILY = {"lubricants": "Lubricants & penetrants", "adhesives": "Adhesives & sealants", "cleaners": "Cleaners & degreasers",
          "hand-care": "Hand care", "sanitation": "Disinfectants & pest", "paints": "Paints & markers", "plumbing": "Plumbing chemicals",
          "hvac": "HVAC/R chemicals", "electrical": "Electrical chemicals", "welding": "Welding & metalworking", "automotive": "Auto & fleet chemicals",
          "construction": "Construction chemicals", "water-ww": "Water treatment", "other": "Other"}

# ---- what a worker can hold: format, then pack size for bottles, cans and powders
HANDHELD = {"Aerosol", "Squeeze tube", "Cartridge", "Wipe", "Marker/Paint stick", "Kit"}
SIZED = {"Bottle/Liquid", "Paste/Can", "Powder"}
BULK_WORDS = re.compile(r"\b(drum|pail|tote|bulk|55[- ]?gal|5[- ]?gal|2\.5[- ]?gal|bag-in-box)\b", re.I)


def pack_ok(size, name):
    """True when a bottle, can or powder is hand-sized: up to 1 gal / 4 L, or 10 lb / 5 kg."""
    t = f"{size} {name}".lower()
    if BULK_WORDS.search(t):
        return False
    m = re.search(r"(\d+(?:\.\d+)?)\s*-?\s*(fl\.?\s*oz|oz|gal(?:lon)?s?|qt|quarts?|pt|pints?|lbs?|pounds?|ml|l\b|liters?|litres?|kg|g\b)", t)
    if not m:
        return True  # no size listed: most scraped bottles and cans are hand-sized
    v, u = float(m.group(1)), m.group(2)
    if u.startswith("gal"):
        return v <= 1
    if u.startswith(("lb", "pound")):
        return v <= 10
    if u == "kg":
        return v <= 5
    if u in ("l",) or u.startswith(("liter", "litre")):
        return v <= 4
    if u.startswith("qt") or u.startswith("quart"):
        return v <= 4
    return True  # oz, pt, ml, g


DURABLE = re.compile(r"dispens|\btool|\bgun\b|pump\b|sprayer|brush|equipment|machine|gauge|fitting|valve|hose|bucket|mop\b|applicator|"
                     r"trowel|tape measure|meter\b|cabinet|can opener|plug\b|torch|regulator|nozzle|wrench|blade|battery|charger|light|"
                     r"filter housing|stand\b|cart\b|holder", re.I)


def handheld(p):
    f = s(p.get("Form factor"))
    if f in HANDHELD:
        return True
    if f in SIZED:
        return pack_ok(s(p.get("Size / pack")), s(p.get("Product name")))
    return False


def consumable(p):
    if s(p.get("Form factor")) in HANDHELD | SIZED - {"Kit"}:
        return not DURABLE.search(s(p.get("Product category")))
    return not DURABLE.search(f"{s(p.get('Product category'))} {s(p.get('Product name'))}") and s(p.get("Form factor")) != "Other"


prod_by_brand = collections.defaultdict(list)
for p in products:
    if s(p.get("Brand")):
        prod_by_brand[s(p["Brand"])].append(p)

# ---- categories (v12+): the workbook gives each brand one normalized category in a segment. A brand's SKUs often
# span several, so each SKU's raw category is mapped to the normalized category most brands using that raw label
# sit in; a brand then counts in every category it has product in, not only its primary one.
comp_rows = [r for r in table("Competition") if s(r.get("Category (normalized)")) and not s(r["Category (normalized)"]).startswith("Total")] \
    if "Competition" in wb.sheetnames else []
SEG_OF = {s(r["Category (normalized)"]): s(r.get("Segment")) or "Unclassified" for r in comp_rows}
brand_ncat = {s(b["Brand"]): s(b.get("Category (normalized)")) for b in brands}
rawmap = collections.defaultdict(collections.Counter)
for p in products:
    nc = brand_ncat.get(s(p.get("Brand")))
    if nc and nc != "Unclassified" and s(p.get("Product category")):
        rawmap[s(p["Product category"]).lower()][nc] += 1


def sku_ncat(p, fallback):
    c = rawmap.get(s(p.get("Product category")).lower())
    if c:
        (top, k), tot = c.most_common(1)[0], sum(c.values())
        if tot >= 2 and k / tot >= 0.5:
            return top
    return fallback or "Unclassified"

REV_MIX = {"trade": ["% Industrial MRO", "% Plumbing", "% HVAC/R", "% Electrical", "% Construction & Contractor", "% Facilities & Janitorial",
                     "% Automotive & Fleet", "% Welding & Fabrication", "% Water & Wastewater"],
           "fmt": ["% Aerosol", "% Squeeze tube", "% Cartridge", "% Bottle/Liquid", "% Wipe", "% Marker/Paint stick", "% Paste/Can"]}
OWNER_CLASS = {"PE-backed": "pe", "Founder / family": "family", "Private (family)": "family", "ESOP / employee": "esop",
               "Subsidiary of private co": "sub_private", "Subsidiary of public co": "public", "Public": "public",
               "Unknown": "private", "Private": "private", "PE": "pe"}

out_co, out_dt, judge_in = {}, {}, []
for oid, o in owners.items():
    cid, m = ids[oid], o["master"]
    bs = sorted(o["brands"], key=lambda b: -(n(b.get("# SKUs scraped")) or 0))
    c = owner_row.get(oid, {}) if o["verified"] else {}
    rolled = [x for x in cos if s(x.get("Owner ID (rolls into)")) == oid and s(x.get("Role")) != "Owner"]
    raw_type = s(m.get("Owner type")) or o.get("otype", "")
    oclass = OWNER_CLASS.get(raw_type, "private")
    if oclass == "private" and s(m.get("PE-backed")) == "Y":
        oclass = "pe"

    fmt, mkt, dst, fam, brd, seg = (collections.Counter() for _ in range(6))
    hand = cons = pro = 0
    brand_rows, max_bd = [], 0
    for b in bs:
        ps = prod_by_brand.get(s(b["Brand"]), [])
        bd = collections.Counter(s(p.get("Distributor")) for p in ps if s(p.get("Distributor")))
        max_bd = max(max_bd, sum(1 for d in bd if channel(d) != "retail"))
        for p in ps:
            d = s(p.get("Distributor"))
            fmt[s(p.get("Form factor")) or "Other"] += 1
            mkt[market(d)] += 1
            dst[d] += 1
            nc = sku_ncat(p, s(b.get("Category (normalized)")))
            fam[nc] += 1
            seg[SEG_OF.get(nc, "Unclassified")] += 1
            brd[s(b["Brand"])] += 1
            hand += handheld(p)
            cons += consumable(p)
            pro += channel(d) != "retail"
        brand_rows.append({"name": s(b["Brand"]), "cat": s(b.get("Primary product category")), "hero": s(b.get("Known for (hero product)"), 140),
                           "form": s(b.get("Primary form factor")), "skus": len(ps), "ncat": s(b.get("Category (normalized)")),
                           "dists": [d for d, _ in bd.most_common()], "mkts": sorted({market(d) for d in bd}),
                           "verified": not b.get("_prior")})
    skus = sum(fmt.values())
    nd_pro = sum(1 for d in dst if channel(d) != "retail")
    rev = n(c.get("Total company rev ($M)")) or n(m.get("TOTAL PLATFORM REV ($M)"))
    pe = pe_entry.get(oid, {})
    ptxt = s((profiles.get(s(c.get("ID"))) or {}).get("Profile"))
    paras = [p.strip() for p in re.split(r"\n\s*\n", ptxt) if p.strip()]
    body = [p for p in paras if not p.startswith(("# ", "**", "Brands:"))]
    blunt = s(m.get("What it mostly is (blunt)"))
    what = (body[0] if body else blunt)[:600]
    summary = {
        "name": o["name"], "verified": o["verified"], "oclass": oclass, "otype": raw_type or "Unknown",
        "sponsor": s(m.get("PE sponsor")) or (o["parent"] if oclass == "pe" else ""),
        "parent": s(m.get("Ultimate parent / sponsor")) if o["verified"] else o["parent"],
        "pe_year": pe.get("date", "")[:4], "pe_ev": pe.get("value_usd_m"), "rollup": s(m.get("PE roll-up")) == "Y",
        "model": s(m.get("Business model")), "trade": s(m.get("Primary trade")) or (s(bs[0].get("Primary trade")) if bs else ""),
        "category": s(m.get("Primary product category")) or (s(bs[0].get("Primary product category")) if bs else ""),
        "blunt": blunt, "hq": ", ".join(x for x in [s(c.get("HQ city")), s(c.get("HQ state")) or s(m.get("HQ state"))] if x),
        "web": s(c.get("Website")), "rev": r1(rev), "rev_year": s(c.get("Revenue year")), "rev_basis": s(c.get("Revenue basis / evidence"), 200),
        "emp": r1(n(c.get("Employees (total)")), 0), "emp_band": s(c.get("Employees band")), "size_basis": s(c.get("Size basis")),
        "size_conf": s(c.get("Size confidence")), "linkedin": s(c.get("LinkedIn URL")), "li_emp": r1(n(c.get("LinkedIn employees (baseline Oct-2026)")), 0),
        "pro_rev": r1(n(c.get("Pro brand rev ($M, US)")) or n(m.get("PRO BRAND REV ($M, pro forma)"))),
        "ebitda": r1(n(c.get("EBITDA reported ($M)")) or n(m.get("PLATFORM EBITDA ($M)"))), "margin": r1(n(m.get("EBITDA margin")), 3),
        "rev_mix": {g: {k[2:]: r1(n(m.get(k)) * (100 if n(m.get(k)) <= 1 else 1)) for k in ks if n(m.get(k))} for g, ks in REV_MIX.items()
                    if any(n(m.get(k)) for k in ks)},
        "conf": s(m.get("Confidence")) or "Low",
        "brands": [x["name"] for x in brand_rows] or [b.strip() for b in s(m.get("Hero brands")).split(",") if b.strip()],
        "skus": skus, "acq": len(acq.get(oid, [])), "rolled": [s(x["Company"]) for x in rolled],
        "mix": {"fmt": dict(fmt), "mkt": dict(mkt), "dist": dict(dst.most_common(15)), "cat": dict(fam), "seg": dict(seg), "brand": dict(brd.most_common(15)),
                "ch": dict(collections.Counter(ctype(d) or "unknown" for d, v in dst.items() for _ in range(v)))},
        "m": {"hand": r1(hand / skus, 3) if skus else None, "cons": r1(cons / skus, 3) if skus else None, "pro": r1(pro / skus, 3) if skus else None,
              "nd": len(dst), "ndp": nd_pro, "maxbd": max_bd,
              "broad": r1(sum(v for d, v in dst.items() if channel(d) == "broadline") / skus, 3) if skus else None},
    }
    summary = {k: v for k, v in summary.items() if v not in ("", None, [], {})}
    out_co[cid] = summary
    out_dt[cid] = {k: v for k, v in {
        "what": what, "size_note": s(c.get("Size sources / note"), 600), "profile": "\n\n".join(paras[1:]) if paras and paras[0].startswith("# ") else ptxt,
        "brands": brand_rows, "acq": acq.get(oid, []),
        "evidence": [e for x in [c] + rolled for e in ev_by_co.get(s(x.get("ID")), [])][:30],
    }.items() if v not in ("", None, [])}
    judge_in.append({"id": cid, "name": o["name"], "owner": raw_type, "parent": summary.get("parent", ""), "model": summary.get("model", ""),
                     "category": summary.get("category", ""), "what": what[:400], "brands": [f"{x['name']} ({x['cat']}; {x['form']}; {x['skus']} SKUs)" for x in brand_rows[:12]],
                     "revenue_usd_m": summary.get("rev"), "skus": skus, "handheld_share": summary["m"]["hand"], "pro_channel_share": summary["m"]["pro"],
                     "pro_distributors": nd_pro})

# ---- every deal, with owners resolved where the ledger allows
deals_out, seen = [], set()
for d in sorted(deal_rows, key=lambda d: s(d.get("Date")) or s(d.get("Year")), reverse=True):
    date = s(d.get("Date")) or s(d.get("Year"))
    dk = (key(d["Target"])[:12], date[:4])
    if dk in seen:
        continue
    seen.add(dk)
    tgt = co_by_id.get(s(d.get("Target ID")))
    t_owner = s(tgt["Owner ID (rolls into)"]) if tgt else ""
    a_owner = name_key.get(key(d.get("Acquirer")))
    if not a_owner and tgt and s(tgt.get("Role")) != "Owner" and t_owner in owners:
        a_owner = t_owner  # the target now rolls into an owner, so that owner (or its predecessor) bought it
    self_buy = tgt is not None and s(tgt.get("Role")) == "Owner" and a_owner == t_owner
    kind = "addon" if a_owner in owners and (not tgt or s(tgt.get("Role")) != "Owner" or self_buy) else "ownership" if t_owner in owners else "other"
    src = s(d.get("Source"))
    deals_out.append({k: v for k, v in {
        "date": date, "year": int(date[:4]) if date[:4].isdigit() else None, "acquirer": s(d.get("Acquirer")),
        "acq_id": ids.get(a_owner) if a_owner in owners else None, "target": s(d["Target"]), "tgt_id": ids.get(t_owner) if t_owner in owners else None,
        "brands": s(d.get("Target brands")), "value": n(d.get("Value ($M, if disclosed)")), "type": s(d.get("Deal type")),
        "url": src if src.startswith("http") else "", "kind": kind}.items() if v not in ("", None)})

# ---- every brand: its owner (verified, unverified prior, Claude's guess, or unknown), products and channels
BOF = os.path.join(os.path.dirname(os.path.abspath(__file__)), "brand_owners.json")
guesses = json.load(open(BOF)) if os.path.exists(BOF) else {}
GUESS_CLASS = {"PE": "pe", "Family": "family", "Public": "public", "Subsidiary of public": "public",
               "Subsidiary of private": "sub_private", "Private (unknown)": "private", "Unknown": "private",
               "Founder / family": "family", "PE-backed": "pe", "Subsidiary of public co": "public", "Subsidiary of private co": "sub_private",
               "Public": "public", "ESOP": "esop"}
brand_owner = {s(b["Brand ID"]): (oid, "prior" if b.get("_prior") else "verified") for oid, o in owners.items() for b in o["brands"]}
maker = collections.defaultdict(collections.Counter)
for p in products:
    if s(p.get("Manufacturer as listed")):
        maker[s(p.get("Brand"))][re.sub(r"[®™]", "", s(p["Manufacturer as listed"]))] += 1
out_br, out_sku, wb_brand_id = {}, {}, {}


def parse_competitors(txt):
    """'Weld-On (IPS) (PE: Centerbridge Partners); Spears (Family)' -> [["Weld-On (IPS)", "PE: Centerbridge Partners"], ["Spears", "Family"]]"""
    out = []
    for x in (txt or "").split(";"):
        x = x.strip()
        if not x:
            continue
        if x.endswith(")") and " (" in x:
            out.append([x[:x.rfind(" (")].strip(), x[x.rfind(" (") + 2:-1].strip()])
        else:
            out.append([x, ""])
    return out

# v9 added a triage pass on every brand (bucket, owner guess, owner type, confidence)
TRIAGE = {"ACTIONABLE_CANDIDATE": "actionable", "UNKNOWN_BRAND": "unknown", "SUBSIDIARY_KNOWN": "sub_known",
          "SUBSIDIARY_PUBLIC": "sub_public", "OUT_OF_SCOPE_OTHER": "out", "NOT_CHEMICAL": "not_chem",
          "FOREIGN_MAKER": "foreign", "HOUSE_BRAND": "house", "CONSUMER_ONLY": "consumer", "SUBSIDIARY_OTHER_LARGE": "sub_large"}
guess_by_name = {key(k) or k.lower(): v for k, v in guesses.items()}
for b in brands:
    name = s(b["Brand"])  # brand ids come from the name: the workbook renumbers its Brand IDs between versions
    bid = slug(name) or "brand"
    while bid in out_br:
        bid += "-2"
    ps = prod_by_brand.get(name, [])
    bd = collections.Counter(s(p.get("Distributor")) for p in ps if s(p.get("Distributor")))
    fm = collections.Counter(s(p.get("Form factor")) or "Other" for p in ps)
    ncat = s(b.get("Category (normalized)")) or "Unclassified"
    cats = collections.Counter(sku_ncat(p, ncat) for p in ps)
    rec = {"name": name, "cat": s(b.get("Primary product category")), "ncat": ncat, "seg": s(b.get("Segment")) or SEG_OF.get(ncat, "Unclassified"),
           "cats": dict(cats.most_common()) if len(cats) > 1 else {},
           "wc": parse_competitors(s(b.get("Top competitors - same category, ranked by distributor reach (owner type; ? = unverified)"))),
           "wcmix": s(b.get("Competitor owner mix (top 10: PE / family+ESOP / public+public sub / other)")),
           "price": {k: v for k, v in {"pos": s(b.get("Price position")), "idx": r1(n(b.get("Price index vs category")), 2),
                     "ppo": r1(n(b.get("Avg $/oz - brand (main category)")), 3), "cpo": r1(n(b.get("Avg $/oz - category")), 3),
                     "n": r1(n(b.get("# priced items (main category)")), 0)}.items() if v not in ("", None)},
           "review": {k: v for k, v in {"site": s(b.get("Review site")), "prod": s(b.get("Most-reviewed product"), 140),
                      "n": r1(n(b.get("# reviews (that product)")), 0), "rating": r1(n(b.get("Avg rating (that product)")), 2),
                      "url": s(b.get("Review URL"), 300), "note": s(b.get("Review note"), 200)}.items() if v not in ("", None)},
           "wb_owner": s(b.get("Owner / sponsor (best available)")), "wb_otype": s(b.get("Owner type (best available)")),
           "wb_basis": s(b.get("Owner basis")),
           "hero": s(b.get("Known for (hero product)"), 160), "form": s(b.get("Primary form factor")), "fmt": dict(fm), "skus": len(ps),
           "dists": [d for d, _ in bd.most_common()], "mkts": sorted({market(d) for d in bd}), "scope": s(b.get("Scope flag")),
           "ch": dict(collections.Counter(ctype(s(p.get("Distributor"))) or "unknown" for p in ps)),
           "rscreen": {k: v for k, v in {"tier": s(b.get("Retail screen tier (big-box/mass search)")), "hits": s(b.get("Retail screen hits"), 200),
                       "signals": s(b.get("Consumer signals (screen)"), 300)}.items() if v},
           "maker": [m for m, _ in maker[name].most_common(2)], "tri": TRIAGE.get(s(b.get("Triage bucket (single-source)"))),
           "tri_owner": s(b.get("Triage owner guess")), "tri_type": s(b.get("Triage owner type guess")), "tri_conf": s(b.get("Triage confidence")), "rev": r1(n(b.get("Est. brand rev ($M)"))),
           "hand": r1(sum(handheld(p) for p in ps) / len(ps), 2) if ps else None}
    oid, status = brand_owner.get(s(b["Brand ID"]), (None, "unknown"))
    if oid:
        rec.update(owner_id=ids[oid], owner=owners[oid]["name"], status=status, oclass=out_co[ids[oid]]["oclass"])
    else:
        g = guesses.get(name) or guess_by_name.get(key(name) or name.lower()) or {}
        if not s(g.get("owner")) and s(b.get("Triage owner guess")) and s(b.get("Triage owner guess")).lower() not in ("unknown", "n/a"):
            g = {"owner": s(b["Triage owner guess"]), "type": s(b.get("Triage owner type guess")), "conf": s(b.get("Triage confidence")) or "Low",
                 "note": "The workbook's triage guess.", "src": "triage"}
        if s(g.get("owner")):
            hit = name_key.get(key(g["owner"])) or name_key.get(key(g.get("parent")))
            rec.update(status="guess", owner=s(g["owner"]), parent=s(g.get("parent")), oclass=GUESS_CLASS.get(s(g.get("type")), "private"),
                       sponsor=s(g.get("sponsor")), conf=s(g.get("conf")) or "Low", note=s(g.get("note"), 120), src=s(g.get("src")),
                       **({"owner_id": ids[hit]} if hit in owners else {}))
        else:
            rec.update(status="unknown", oclass="unknown")
    out_br[bid] = {k: v for k, v in rec.items() if v not in ("", None, [], {})}
    wb_brand_id[bid] = s(b["Brand ID"])
    out_sku[bid] = [[s(p.get("Product name"), 140), s(p.get("Form factor")), s(p.get("Size / pack"), 40), s(p.get("Distributor")),
                     s(p.get("Product URL"), 300), s(p.get("Product category"), 60), s(p.get("List price ($)")), s(p.get("Mfr part #"), 40)] for p in ps]

# ---- workbook competitor lists: link names to brand pages
bid_by_name = {}
for bid, r in out_br.items():
    bid_by_name.setdefault(key(r["name"]) or r["name"].lower(), bid)
for r in out_br.values():
    for e in r.get("wc", []):
        hit = bid_by_name.get(key(e[0]) or e[0].lower()) or bid_by_name.get(key(re.sub(r"\s*\(.*\)$", "", e[0])) or "")
        if hit:
            e.append(hit)


# ---- where Claude's owner guess and the workbook's triage guess name different companies: a verification worklist
def same_owner(a, b):
    a, b = key(a or ""), key(b or "")
    return bool(a and b and (a in b or b in a or a[:6] == b[:6]))


for r in out_br.values():
    w = r.get("wb_owner", "")
    if r.get("status") == "guess" and r.get("src") != "triage" and r.get("wb_basis", "").startswith("Triage") and w \
            and not re.match(r"unknown|n/a|none", w, re.I) and not same_owner(r.get("owner"), w) and not same_owner(r.get("parent"), w):
        r["odis"] = 1
print("owner disagreements (Claude guess vs workbook triage):", sum(1 for r in out_br.values() if r.get("odis")))

# ---- prices captured from distributor sites, per brand (loaded with the brand page)
out_q = collections.defaultdict(list)
if "Prices" in wb.sheetnames:
    for q in table("Prices"):
        bid = bid_by_name.get(key(s(q.get("Brand (mapped)"))) or s(q.get("Brand (mapped)")).lower())
        if bid:
            out_q[bid].append([s(q.get("Product"), 140), s(q.get("Size"), 30), r1(n(q.get("Pack qty")), 0), r1(n(q.get("Price ($)")), 2),
                               s(q.get("Price unit"), 12), r1(n(q.get("$ per oz")), 3), s(q.get("Use (Y/N)")) == "Y",
                               s(q.get("Excluded because"), 40), s(q.get("Distributor")), s(q.get("Product URL"), 300) or s(q.get("Source page"), 300),
                               s(q.get("Category (normalized)"))])

# ---- the Competition tab: one row per normalized category
cats_out = [{k: v for k, v in {
    "seg": s(r.get("Segment")), "cat": s(r["Category (normalized)"]), "n": r1(n(r.get("# core brands")), 0),
    "mix": {"pe": r1(n(r.get("PE-backed")), 0), "family": r1(n(r.get("Founder / family")), 0), "esop": r1(n(r.get("ESOP / employee")), 0),
            "sub_private": r1(n(r.get("Sub. of private co")), 0), "public": r1(n(r.get("Public / sub. of public")), 0),
            "other": r1(n(r.get("Unknown / house brand / other")), 0)},
    "pct_pe": r1(n(r.get("% PE-backed")), 3), "pct_priv": r1(n(r.get("% private (PE+family+ESOP+private sub)")), 3),
    "skus": r1(n(r.get("# SKUs (core brands)")), 0), "top": s(r.get("Top 10 brands by distributor reach in this category (owner type)")),
    "pe_players": s(r.get("PE-backed players")), "fam_players": s(r.get("Family / ESOP players (roll-up candidates)")), "notes": s(r.get("Notes")),
    "npriced": r1(n(r.get("# priced items")), 0), "cpo": r1(n(r.get("Avg $/oz (category)")), 3), "nrev": r1(n(r.get("# brands with reviews")), 0),
}.items() if v not in ("", None)} for r in comp_rows]

# ---- competitors: brands selling the same kind of product, by TF-IDF over product categories and SKU names,
# nudged up when they sit on the same distributors' shelves. Brands under the same owner are left out.
NOISE_CAT = re.compile(r"directory|supplier|manufacturer list|not observed|catalog", re.I)
STOP = set("and or the of for with to in a an by on oz fl gal lb lbs ml l kg g ct pk pack case each ea in. x w per qt pt pint quart gallon can "
           "bottle tube cartridge aerosol spray black white red blue clear gray grey green yellow orange new size pc pcs".split())
def toks(text, own):
    w = [x[:-1] if len(x) > 4 and x.endswith("s") and not x.endswith("ss") else x for x in re.findall(r"[a-z][a-z\-]+", text.lower())]
    w = [x for x in w if x not in STOP and x not in own and len(x) > 2]
    return w + [a + " " + b for a, b in zip(w, w[1:])]
vec = {}
for bid, r in out_br.items():
    own = set(re.findall(r"[a-z]+", r["name"].lower()))
    tf = collections.Counter()
    for x in toks(r.get("cat", ""), own) + toks(r.get("hero", ""), own):
        tf[x] += 2
    for p in prod_by_brand.get(r["name"], []):
        c = s(p.get("Product category"))
        if c and not NOISE_CAT.search(c):
            for x in toks(c, own): tf[x] += 1
        for x in toks(s(p.get("Product name")), own): tf[x] += 0.5
    vec[bid] = tf
df = collections.Counter(x for tf in vec.values() for x in tf)
N = len(vec)
idf = {x: math.log(N / d) for x, d in df.items() if 1 < d < N * 0.2}
post = collections.defaultdict(list)
for bid, tf in vec.items():
    v = {x: math.log1p(c) * idf[x] for x, c in tf.items() if x in idf}
    norm_ = math.sqrt(sum(w * w for w in v.values())) or 1
    vec[bid] = {x: w / norm_ for x, w in v.items()}
    for x, w in vec[bid].items(): post[x].append((bid, w))
def owner_of(r):
    return r.get("owner_id") or key(r.get("owner") or "") or None
for bid, r in out_br.items():
    sim = collections.Counter()
    for x, w in vec[bid].items():
        for o, w2 in post[x]: sim[o] += w * w2
    mine, dset = owner_of(r), set(r.get("dists", []))
    scored = []
    for o, cs in sim.items():
        if o == bid or cs < 0.12 or (mine and owner_of(out_br[o]) == mine):
            continue
        od = set(out_br[o].get("dists", []))
        jac = len(dset & od) / len(dset | od) if dset | od else 0
        scored.append((cs * (1 + 0.6 * jac), o))
    scored.sort(reverse=True)
    if scored:
        r["rv"] = [o for _, o in scored[:10]]
print("competitors: brands with rivals", sum(1 for r in out_br.values() if r.get("rv")), "of", len(out_br))

# ---- judgments (Claude's read on the tests the data can't answer), merged when present
JF = os.path.join(os.path.dirname(os.path.abspath(__file__)), "judgments.json")
judgments = json.load(open(JF)) if os.path.exists(JF) else {}
for cid, j in judgments.items():
    if cid in out_co:
        out_co[cid]["judge"] = j

dist_out = [{"name": k, "market": market(k), "end_market": s(v.get("Primary end market")), "channel": channel(k), "ctype": ctype(k),
             "status": s(v.get("Scrape status")), "skus": int(n(v.get("SKUs scraped")) or 0),
             **{k2: v2 for k2, v2 in {"web": s(v.get("Website")), "secondary": s(v.get("Secondary markets"), 200),
                                      "scope": s(v.get("Chemical categories to scrape"), 200), "priority": s(v.get("Scrape priority")),
                                      "found": int(n(v.get("Brands found (pipeline)")) or 0), "method": s(v.get("Scrape method / limits"), 240)}.items() if v2}}
            for k, v in dists.items()]

# ---- write: shards sized to stay well under the 256 KB document cap
for d in ("data", "judge", "sku"):
    os.makedirs(f"{OUT}/{d}", exist_ok=True)
    for f in glob.glob(f"{OUT}/{d}/*.json"):
        os.remove(f)


def shard(items, prefix, field, limit=180_000, folder="data"):
    docs, cur, size = [], {}, 0
    for k, v in items.items():
        z = len(json.dumps(v)) + len(k) + 6
        if cur and size + z > limit:
            docs.append(cur); cur, size = {}, 0
        cur[k] = v; size += z
    if cur:
        docs.append(cur)
    for i, d in enumerate(docs):
        json.dump({field: d, "updated_at": NOW, "source": SEEDED}, open(f"{OUT}/{folder}/{prefix}-{i}.json", "w"), separators=(",", ":"))
    return {k: i for i, d in enumerate(docs) for k in d}


nco = len(set(shard(out_co, "co", "companies").values()))
ndt = len(set(shard(out_dt, "dt", "details").values()))
where = shard({k: v for k, v in out_sku.items() if v}, "p", "skus", folder="sku")  # SKUs load on demand, per brand
for bid, rec in out_br.items():
    if bid in where:
        rec["p"] = where[bid]
# ---- compact the brand records: every brand loads at start-up, so repeated strings become indexes
CATS = [c["cat"] for c in cats_out] + [c for c in sorted({r.get("ncat") for r in out_br.values()} | {k for r in out_br.values() for k in r.get("cats", {})})
                                       if c and c not in {x["cat"] for x in cats_out}]
CAT_IX = {c: i for i, c in enumerate(CATS)}
BASIS = {"Verified": "v", "Triage guess (unverified)": "t", "Prior knowledge (unverified)": "p"}
for r in out_br.values():
    r["nc"] = CAT_IX[r.pop("ncat")]
    r.pop("seg", None)
    if r.get("cats"):
        r["cats"] = {CAT_IX[k]: v for k, v in r["cats"].items()}
    r["wc"] = [e[2] if len(e) > 2 else e[:2] for e in r.get("wc", [])]  # linked rivals by id; the rest by name and label
    if not r["wc"]:
        r.pop("wc")
    wcids = {e for e in r.get("wc", []) if isinstance(e, str)}
    r["rv"] = [x for x in r.get("rv", []) if x not in wcids][:8]  # the shelf match adds to the market map's list
    r.pop("mkts", None)  # rebuilt in the app from each distributor's end market
    r.pop("tri_type", None)
    if same_owner(r.get("tri_owner"), r.get("owner")):
        r.pop("tri_owner", None)
    if not r["rv"]:
        r.pop("rv")
    b = r.pop("wb_basis", "")
    w, wt = r.pop("wb_owner", ""), r.pop("wb_otype", "")
    if b and b != "Verified" and w and not same_owner(r.get("owner"), w):
        r["wb"] = [w, wt, BASIS.get(b, b)]  # the workbook's best-available owner, when it says something different
for c in cats_out:
    c["i"] = CAT_IX[c["cat"]]
print("brand data KB", len(json.dumps(out_br)) // 1024)
qwhere = shard(dict(out_q), "q", "prices", folder="sku")  # prices load with the brand page, like SKUs
for bid, i in qwhere.items():
    out_br[bid]["q"] = i
nbr = len(set(shard(out_br, "br", "brands").values()))
json.dump({"cats": cats_out, "names": CATS, "segs": {c: SEG_OF.get(c, "Unclassified") for c in CATS}, "updated_at": NOW}, open(f"{OUT}/data/cats.json", "w"), separators=(",", ":"))
json.dump({"deals": deals_out, "updated_at": NOW}, open(f"{OUT}/data/deals.json", "w"), separators=(",", ":"))
json.dump({"list": dist_out, "updated_at": NOW}, open(f"{OUT}/data/dists.json", "w"), separators=(",", ":"))
json.dump({"source": SEEDED, "updated_at": NOW, "co": nco, "dt": ndt, "br": nbr, "sku": len(set(where.values())), "q": len(set(qwhere.values()))}, open(f"{OUT}/data/index.json", "w"))
# the workbook's own IDs, so exports (the DNA workbook) can be joined back to the Master and Brands tabs
json.dump({"owners": {cid: oid for oid, cid in ids.items()}, "merged": {d: ids.get(c) for d, c in dupes.items()}, "brands": wb_brand_id},
          open(f"{OUT}/ids.json", "w"), indent=0)
for i in range(0, len(judge_in), 50):
    json.dump(judge_in[i:i + 50], open(f"{OUT}/judge/batch-{i // 50}.json", "w"), indent=1)

print("duplicate owners merged:", ", ".join(f"{d} into {c}" for d, c in dupes.items()) or "none")
print("owners", len(out_co), "verified", sum(1 for o in owners.values() if o["verified"]), "| judged", sum(1 for c in out_co.values() if "judge" in c))
print("brands", len(brands), "linked", sum(len(o["brands"]) for o in owners.values()), "| deals", len(deals_out),
      collections.Counter(d["kind"] for d in deals_out))
print("brand owners:", collections.Counter(b["status"] for b in out_br.values()), "| sku docs", len(set(where.values())))
print("shards: co", nco, "dt", ndt, "br", nbr, "| sizes KB", sorted(os.path.getsize(f) // 1024 for f in glob.glob(f"{OUT}/data/*.json")))
