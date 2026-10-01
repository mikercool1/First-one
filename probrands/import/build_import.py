"""Build Probrands database documents from the Professional Brands Market Map workbook.

Usage: python3 probrands/import/build_import.py <Professional_Brands_Market_Map.xlsx>

Writes import/out/companies/<id>.json (summary), import/out/details/<id>.json,
import/out/meta/entities.json (every brand and acquired company, linked to its owner when
known) and import/out/meta/deals.json (deals that are not an owner's own acquisition).

Owners come from the Master tab (verified ownership, with facts from Companies, Profiles and
Sources). Brands that only carry Claude's unverified "Likely owner (PRIOR)" join a Master
owner when the names match, and otherwise become starter profiles with ownership rated Low.
"""
import collections, glob, json, os, re, sys, unicodedata

import openpyxl

SRC = sys.argv[1] if len(sys.argv) > 1 else "Professional_Brands_Market_Map.xlsx"
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "out")
NOW = "2026-10-01T12:00:00Z"
VERSION = re.search(r"v\d+", os.path.basename(SRC))
SEEDED = f"Professional Brands Market Map {VERSION.group(0) if VERSION else ''} (1 Oct 2026)".replace("  ", " ")

wb = openpyxl.load_workbook(SRC, data_only=True)
FIRST_COL = {"Rank", "ID", "Brand ID", "Year", "#", "Product name"}


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
    (r"lubric|(?<!de)grease|penetr|oil|anti.?seize|silicone spray|rust (prevent|inhib)|corrosion", "lubricants"),
    (r"adhesive|sealant|caulk|thread ?lock|epoxy|glue|gasket|retaining|cement|mastic|foam", "adhesives"),
    (r"clean|degreas|solvent|remover|towel|wipe|glass|janitor", "cleaners"),
]


def cat_sector(cat):
    for pat, sid in CAT_SECTOR:
        if re.search(pat, cat or "", re.I):
            return sid
    return "other"


OWNER_TYPE = {"Public": "Public", "Private (family)": "Family/founder-owned", "Founder / family": "Family/founder-owned",
              "PE-backed": "PE-owned", "ESOP / employee": "ESOP", "Subsidiary of public co": "Subsidiary of strategic",
              "Subsidiary of private co": "Subsidiary of strategic", "Private": "Other", "Unknown": "Other"}


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

unlinked = []
for b in brands:
    cid = s(b.get("Company ID"))
    if cid and cid in co_by_id:
        owners[s(co_by_id[cid]["Owner ID (rolls into)"])]["brands"].append(b)
        continue
    raw = s(b.get("Likely owner (PRIOR - unverified)"))
    if not raw:
        unlinked.append(b)
        continue
    name, parent = split_prior(raw)
    k = ALIASES.get(key(name), key(name))
    oid = by_key.get(k)
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
    ev_by_co[s(x["ID"])].append({"metric": s(x.get("Metric")), "value": s(x.get("Value"), 200), "year": s(x.get("Year")), "source_type": s(x.get("Source type")),
                                 "url": s(x.get("URL")), "quote": s(x.get("Quote"), 300)})

os.makedirs(f"{OUT}/companies", exist_ok=True); os.makedirs(f"{OUT}/details", exist_ok=True); os.makedirs(f"{OUT}/meta", exist_ok=True)
for f in glob.glob(f"{OUT}/*/*.json"):
    os.remove(f)

sizes = []
for oid, o in owners.items():
    cid, m, bs = ids[oid], o["master"], sorted(o["brands"], key=lambda b: -(n(b.get("# SKUs scraped")) or 0))
    c = owner_row.get(oid, {}) if o["verified"] else {}
    rolled = [x for x in cos if s(x.get("Owner ID (rolls into)")) == oid and s(x.get("Role")) != "Owner"]
    otype_raw = s(m.get("Owner type")) or o.get("otype", "")
    otype = OWNER_TYPE.get(otype_raw, otype_raw)
    pe = s(m.get("PE sponsor")) or (o["parent"] if otype == "PE-owned" else "")
    skus = sum(int(n(b.get("# SKUs scraped")) or 0) for b in bs) or int(n(m.get("# SKUs scraped")) or 0)

    # Sector mix and trade mix, weighted by SKUs scraped (at least 1 per brand).
    sec, trade = collections.Counter(), collections.Counter()
    for b in bs:
        w = max(1, int(n(b.get("# SKUs scraped")) or 0))
        sec[cat_sector(s(b.get("Primary product category")))] += w
        reached = {t for lab in s(b.get("Trades reached")).split(";") for t in trades_of(lab.strip())} or set(trades_of(b.get("Primary trade")))
        for t in reached:
            trade[t] += w / len(reached)
    if not sec and m:
        sec[cat_sector(s(m.get("Primary product category")))] += 1
    stot, ttot = sum(sec.values()) or 1, sum(trade.values()) or 1
    sectors = [{"sector": k, "pct": r1(v / stot * 100), "revenue_usd_m": None,
                "what": ", ".join(s(b["Brand"]) for b in bs if cat_sector(s(b.get("Primary product category"))) == k)[:300] or s(m.get("Primary product category"))}
               for k, v in sec.most_common()]
    em = {t: r1(n(m.get("% " + t)) * 100) for t in TRADES if n(m.get("% " + t))} or {t: r1(v / ttot * 100) for t, v in trade.most_common()}
    if not em and s(m.get("Primary trade")) in TRADES:
        em = {s(m["Primary trade"]): 100}
    prim_trade = s(m.get("Primary trade")) or (collections.Counter(s(b.get("Primary trade")) for b in bs).most_common(1)[0][0] if bs else "")
    scope = s(m.get("Pro relevance")) or ("Core" if any(s(b.get("Scope flag")) == "Core" for b in bs) else "Adjacent")
    brand_names = ", ".join(s(b["Brand"]) for b in bs) or s(m.get("Hero brands"))

    # Customers: the distributors that carry its brands in the scrape.
    carry, carried = collections.Counter(), collections.defaultdict(list)
    for b in bs:
        for d, k in sku_by[s(b["Brand"])].items():
            carry[d] += k; carried[d].append(s(b["Brand"]))
    customers = [{"name": d, "end_market": s(dists.get(d, {}).get("Primary end market")), "what": ", ".join(carried[d])[:200] + f" ({k} SKUs listed)",
                  "share_pct": None, "source": "Distributor scrape 2026-10-01", "confidence": "Medium"} for d, k in carry.most_common(15)]
    catalog = [{"category": s(b.get("Primary product category")) or "Uncategorised", "line": s(b["Brand"]),
                "named_products": s(b.get("Known for (hero product)")), "what_it_is": s(b.get("Primary form factor")), "applications": "",
                "end_markets": sorted({t for lab in s(b.get("Trades reached")).split(";") for t in trades_of(lab.strip())})[:6],
                "made_or_resold": "", "share_pct": None, "revenue_usd_m": None, "confidence": "Low"} for b in bs]

    scraped = "Market map distributor scrape, 1 Oct 2026"
    conf = {f: {"level": "Medium", "basis": scraped} for f in ["pro_brands", "skus_scraped", "customers"]}
    conf.update({"sectors": {"level": "Low", "basis": "Brand product categories weighted by SKUs scraped"},
                 "primary_sector": {"level": "Low", "basis": "Largest sector by SKUs scraped"},
                 "end_markets_total_platform": {"level": "Low", "basis": "Trades reached by the distributors carrying its brands, weighted by SKUs"},
                 "products": {"level": "Low", "basis": "One line per brand from the market map; Enhance builds the full catalog"}})
    if o["verified"]:
        lvl, src = s(m.get("Confidence")) or "Medium", s(m.get("Key source")) or "Market map Master tab"
        for f in ["name", "owner_type", "ultimate_parent", "pe_sponsor", "business_model", "primary_trade", "scope", "hq_address", "website"]:
            conf[f] = {"level": lvl, "basis": "Market map (verified): " + src}
    else:
        prior = "Market map: owner is Claude's prior knowledge, not yet verified"
        conf.update({f: {"level": "Low", "basis": prior} for f in ["name", "owner_type", "ultimate_parent", "pe_sponsor"]})
        conf.update({"primary_trade": {"level": "Low", "basis": scraped}, "scope": {"level": "Low", "basis": "Brand scope flag in the market map"}})

    rev = n(c.get("Total company rev ($M)")) or n(m.get("TOTAL PLATFORM REV ($M)"))
    ebitda = n(c.get("EBITDA reported ($M)")) or n(m.get("PLATFORM EBITDA ($M)"))
    rev_basis = s(c.get("Revenue basis / evidence"))
    if rev:
        conf["total_revenue_usd_m"] = {"level": "Low" if re.search(r"low|estimate|stale|historic|pre-acq", rev_basis, re.I) else "Medium", "basis": rev_basis or "Market map"}
    if ebitda:
        conf["total_ebitda_usd_m"] = {"level": "Low", "basis": "Market map starting margin by business model"}
    hq = ", ".join(x for x in [s(c.get("HQ city")), s(c.get("HQ state")) or s(m.get("HQ state"))] if x)
    pe_row = pe_entry.get(oid)
    parent = s(m.get("Ultimate parent / sponsor")) if o["verified"] else (o["parent"] if otype != "PE-owned" else "")
    summary = {
        "name": o["name"], "universe_id": oid if o["verified"] else "", "ultimate_parent": parent, "owner_type": otype,
        "pe_sponsor": pe, "pe_backed": otype == "PE-owned", "pe_rollup": s(m.get("PE roll-up")) == "Y",
        "pe_entry_year": pe_row["date"][:4] if pe_row else "", "pe_entry_ev_usd_m": pe_row["value_usd_m"] if pe_row else None,
        "business_model": s(m.get("Business model")), "primary_category": s(m.get("Primary product category")) or (s(bs[0].get("Primary product category")) if bs else ""),
        "primary_trade": prim_trade, "scope": scope, "pro_brands": brand_names[:1500], "brands_count": len(bs) or int(n(m.get("# brands")) or 0), "skus_scraped": skus,
        "hq_address": hq, "website": s(c.get("Website")), "total_revenue_usd_m": r1(rev), "total_revenue_year": s(c.get("Revenue year")),
        "total_ebitda_usd_m": r1(ebitda), "ebitda_margin_pct": r1(ebitda / rev * 100) if rev and ebitda else None,
        "employees_total": r1(n(c.get("Employees (total)")), 0), "rolled_in": "; ".join(s(x["Company"]) for x in rolled)[:1500],
        "sectors": sectors, "primary_sector": sectors[0]["sector"] if sectors else "other",
        "end_markets_total_platform": em, "revenue_by_business": [], "revenue_by_product": [],
        "acquisitions": acq.get(oid, []), "buyers": [], "addon_ideas": [], "competitors": [], "locked": [], "source_of_truth": [], "conf": conf,
        "confidence": s(m.get("Confidence")) or "Low", "status": "ready", "updated_at": NOW, "seeded_from": SEEDED, "owner_verified": o["verified"],
    }
    summary = {k: v for k, v in summary.items() if v not in ("", None) or k in ("ultimate_parent", "pe_sponsor")}

    ptxt = s((profiles.get(s(c.get("ID"))) or {}).get("Profile"))
    paras = [p.strip() for p in re.split(r"\n\s*\n", ptxt) if p.strip()]
    body = [p for p in paras if not p.startswith("# ") and not p.startswith("**") and not p.startswith("Brands:")]
    evidence = [e for x in [c] + rolled for e in ev_by_co.get(s(x.get("ID")), [])][:40]
    blunt = s(m.get("What it mostly is (blunt)"))
    detail = {
        "what_it_is": (body[0] if body else blunt if o["verified"] else f"Owns {len(bs)} professional brand{'s' if len(bs) != 1 else ''} in the market map: {brand_names[:300]}.")[:600],
        "bluntly": blunt, "profile_md": "\n\n".join(paras[1:]) if paras and paras[0].startswith("# ") else ptxt,
        "total_revenue_basis": rev_basis, "products": catalog, "customers": customers, "evidence": evidence,
        "key_sites": [{"type": "HQ", "address": "", "city": s(c.get("HQ city")), "state": s(c.get("HQ state"))}] if s(c.get("HQ city")) else [],
        "open_questions": [] if o["verified"] else ["Ownership is Claude's prior from the market map, not verified. Confirm the owner before relying on the profile."],
        "runs": [{"at": NOW, "kind": "Imported", "summary": f"From {SEEDED}: {'verified owner' if o['verified'] else 'unverified owner'}, {len(bs)} brands, {skus} SKUs scraped, {len(acq.get(oid, []))} deals, {len(evidence)} sourced facts."}],
    }
    detail = {k: v for k, v in detail.items() if v not in ("", None, [])} | {"runs": detail["runs"]}
    json.dump(summary, open(f"{OUT}/companies/{cid}.json", "w"))
    json.dump(detail, open(f"{OUT}/details/{cid}.json", "w"))
    sizes.append((len(json.dumps(summary)), len(json.dumps(detail)), cid))

# Brands and acquired companies, for search and Buyer finder: each points at its owner's profile when known.
entities = []
for x in cos:
    if s(x.get("Role")) != "Owner":
        oid = s(x["Owner ID (rolls into)"])
        entities.append({"name": s(x["Company"]), "role": s(x.get("Role")), "owner_id": ids.get(oid), "owner": owners[oid]["name"] if oid in owners else "",
                         "status": s(x.get("Status (verified)")) + (f" by {s(x.get('Acquired by'))} {s(x.get('Acquired date'))}" if s(x.get("Acquired by")) else ""),
                         "what": s(x.get("What it mostly is (blunt)"), 200), "state": s(x.get("HQ state"))})
for oid, o in owners.items():
    for b in o["brands"]:
        entities.append({"name": s(b["Brand"]), "role": "Brand", "owner_id": ids[oid], "owner": o["name"],
                         "status": "Owner unverified (prior)" if b.get("_prior") else "Owner verified",
                         "what": "; ".join(v for v in [s(b.get("Primary product category")), s(b.get("Known for (hero product)")), s(b.get("Primary trade"))] if v)[:200],
                         "skus": int(n(b.get("# SKUs scraped")) or 0), "scope": s(b.get("Scope flag"))})
for b in unlinked:
    entities.append({"name": s(b["Brand"]), "role": "Brand", "owner_id": None, "owner": "", "status": "Owner unknown",
                     "what": "; ".join(v for v in [s(b.get("Primary product category")), s(b.get("Known for (hero product)")), s(b.get("Primary trade"))] if v)[:200],
                     "skus": int(n(b.get("# SKUs scraped")) or 0), "scope": s(b.get("Scope flag"))})
json.dump({"entities": entities, "updated_at": NOW}, open(f"{OUT}/meta/entities.json", "w"))
json.dump({"deals": other_deals, "updated_at": NOW}, open(f"{OUT}/meta/deals.json", "w"))

print("owners", len(ids), "verified", sum(1 for o in owners.values() if o["verified"]), "unverified", sum(1 for o in owners.values() if not o["verified"]))
print("brands", len(brands), "linked to an owner", sum(len(o["brands"]) for o in owners.values()), "no owner", len(unlinked))
print("deals: on owner M&A tabs", sum(len(v) for v in acq.values()), "in meta/deals", len(other_deals), "duplicates dropped", len(deal_rows) - len(seen_deals))
print("largest summary/detail bytes", max(x[0] for x in sizes), max(x[1] for x in sizes), "| entities KB", os.path.getsize(f"{OUT}/meta/entities.json") // 1024)
print("unverified:", ", ".join(o["name"] for o in owners.values() if not o["verified"]))
