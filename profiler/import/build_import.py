"""Convert US_Water_Treatment_Chemicals workbook into Profiler database documents.

Writes import/out/companies/<id>.json (summary), import/out/details/<id>.json,
import/out/meta/deals.json, import/out/meta/entities.json.
"""
import json, re, sys, os, glob, datetime, collections
import openpyxl

SRC = sys.argv[1]
OUT = os.path.join(os.path.dirname(__file__), "out")
SEED = os.path.join(os.path.dirname(__file__), "..", "seed")
DETAIL_KEYS = {"what_it_is", "bluntly", "profile_md", "total_revenue_basis", "ebitda_basis", "employees_basis",
               "us_water_treatment_arithmetic", "open_questions", "addon_corrections", "what_changed_vs_prior",
               "evidence", "key_sites", "chemistries", "customers", "competitors", "runs", "prior_owners"}
BUCKETS = ["Municipal", "Energy & chemicals", "Heavy industry", "Commercial & institutional",
           "Light industry & high-purity", "Pool & spa", "Agriculture & farm", "Other"]
DETAILED = {"Municipal drinking water": "Municipal drinking water", "Municipal wastewater": "Municipal wastewater",
            "Power generation": "Power generation", "Oil & gas / refining": "Oil & gas / refining",
            "Chemicals & petrochem": "Chemicals & petrochem", "Pulp & paper": "Pulp & paper",
            "Food & beverage": "Food & beverage", "Mining & metals": "Mining & metals",
            "Primary metals/steel": "Primary metals/steel", "Commercial HVAC / buildings": "Commercial HVAC / buildings",
            "Healthcare & institutional": "Healthcare & institutional", "Data centers": "Data centers",
            "Pharma/life sciences": "Pharma/life sciences", "Microelectronics/semis": "Microelectronics/semis",
            "Manufacturing (general industrial)": "Manufacturing (general industrial)",
            "Pools & recreational": "Pools & spa", "Agriculture": "Agriculture & farm", "Other": "Other"}
CATS = ["Water treatment - industrial/commercial", "Water treatment - municipal", "Bleach / hypochlorite",
        "Chlor-alkali / commodity inorganics", "Pool & spa", "Agriculture / farm", "Oilfield / production chemicals",
        "Pulp & paper process", "Cleaning, hygiene & sanitation", "Distribution (non-water)",
        "Specialty / intermediate (non-water)", "Media, membranes & equipment", "Other"]
SEED_IDS = {29: "sylmar-group", 9: "nouryon", 7: "buckman", 81: "seven-seas-water-group", 746: "carmeuse-americas",
            596: "southern-ionics", 314: "kuehne-chemical", 404: "crb-water", 128: "haviland-products", 641: "italmatch-chemicals"}

wb = openpyxl.load_workbook(SRC, data_only=True, read_only=True)
def table(name):
    rs = list(wb[name].iter_rows(values_only=True))
    hi = next(i for i, r in enumerate(rs) if r and r[0] in ("ID", "Rank", "Year"))
    h = rs[hi]
    return [dict(zip(h, r)) for r in rs[hi + 1:] if any(v is not None for v in r)]

def n(v):
    try:
        if v is None or v == "": return None
        return float(v)
    except (TypeError, ValueError): return None
def r1(v, k=1):
    return None if v is None else round(v, k)
def s(v, lim=None):
    if v is None: return ""
    v = str(v).strip()
    return v[:lim] if lim else v
def slug(name):
    x = re.sub(r"\(.*?\)", "", name).lower()
    x = re.sub(r"[^a-z0-9]+", "-", x).strip("-")
    return x[:50] or "co"

ents = {e["ID"]: e for e in table("Entities") if e.get("ID") is not None}
master = [m for m in table("Master") if m.get("Owner ID") is not None]
profiles = {p["ID"]: p for p in table("Profiles") if p.get("ID") is not None}
deals = [d for d in table("Deals") if d.get("Target") or d.get("Acquirer")]
sources = collections.defaultdict(list)
for sr in table("Sources"):
    if sr.get("ID") is not None: sources[sr["ID"]].append(sr)

# ids
ids, used = {}, set(SEED_IDS.values())
for m in master:
    oid = m["Owner ID"]
    if oid in SEED_IDS: ids[oid] = SEED_IDS[oid]; continue
    b = slug(m["Owner (ultimate, in universe)"]); x = b; i = 2
    while x in used: x = f"{b}-{i}"; i += 1
    used.add(x); ids[oid] = x
owner_by_name = {s(m["Owner (ultimate, in universe)"]).lower(): m["Owner ID"] for m in master}

# deals -> acquisitions per owner, others -> meta
acq = collections.defaultdict(list); other_deals = []
def deal_row(d):
    tgt = ents.get(d.get("Target ID")) or {}
    return {"date": s(d.get("Date")) or s(d.get("Year")), "target": s(d.get("Target")),
            "what_it_does": s(tgt.get("What it mostly is (blunt)"), 160), "revenue_usd_m": r1(n(d.get("Target US water rev ($M)"))) or None,
            "value_usd_m": r1(n(d.get("Value ($M, if disclosed)"))) or None, "source_url": s(d.get("Source")), "deal_type": s(d.get("Deal type"))}
for d in deals:
    own = d.get("Acquirer ultimate owner")
    oid = owner_by_name.get(s(own).lower()) if own else None
    row = deal_row(d)
    if oid is not None and d.get("Deal type") == "Add-on by universe company":
        if row["what_it_does"] == "" : row["what_it_does"] = ""
        acq[oid].append(row)
    else:
        t = ents.get(d.get("Target ID")) or {}
        row.update({"acquirer": s(d.get("Acquirer")), "target_owner_id": ids.get(t.get("Owner ID (rolls into)")) if t else None})
        other_deals.append(row)

def yr(x):
    m = re.search(r"(19|20)\d{2}", x or ""); return int(m.group(0)) if m else 0

os.makedirs(f"{OUT}/companies", exist_ok=True); os.makedirs(f"{OUT}/details", exist_ok=True); os.makedirs(f"{OUT}/meta", exist_ok=True)
for f in glob.glob(f"{OUT}/*/*.json"): os.remove(f)
NOW = "2026-09-26T00:00:00Z"
sizes = []
for m in master:
    oid = m["Owner ID"]; e = ents.get(oid, {}); cid = ids[oid]
    rev = n(m["TOTAL PLATFORM REVENUE ($M, pro forma)"]) or n(m["Total company rev ($M)"])
    ebitda = n(m["TOTAL PLATFORM EBITDA ($M, pro forma)"])
    marg = n(m["Platform EBITDA margin"])
    em = {DETAILED[k]: r1(n(e.get("% " + k)) * 100) for k in DETAILED if n(e.get("% " + k))}
    buckets = {b: r1(n(m.get("% " + b)) * 100) for b in BUCKETS if n(m.get("% " + b))}
    segs = [{"business": c, "category": c, "revenue_usd_m": r1(n(m.get("Platform % " + c)) * rev) if rev else None,
             "pct": r1(n(m.get("Platform % " + c)) * 100)} for c in CATS if n(m.get("Platform % " + c))]
    pe = s(m.get("PE entry")); pe_parts = [p.strip() for p in pe.split("|")] if pe else []
    ev = None
    for p in pe_parts:
        mm = re.search(r"EV \$([\d,.]+)M", p)
        if mm: ev = n(mm.group(1).replace(",", ""))
    hq = ", ".join(x for x in [s(e.get("HQ street")), s(m.get("HQ city")) or s(e.get("HQ city")), s(m.get("HQ state")) or s(e.get("HQ state"))] if x)
    summary = {
        "name": s(m["Owner (ultimate, in universe)"]), "universe_id": oid, "rank": int(n(m["Rank"])) if n(m["Rank"]) else None,
        "platform_name": s(m.get("Ultimate parent / sponsor")), "ultimate_parent": s(m.get("Ultimate parent / sponsor")),
        "owner_type": s(m.get("Owner type")), "pe_sponsor": s(m.get("PE sponsor")), "pe_backed": s(m.get("PE-backed")) == "Y",
        "pe_rollup": s(m.get("PE roll-up")) == "Y", "pe_entry_year": pe_parts[0] if pe_parts else "", "pe_entry_ev_usd_m": ev,
        "pe_entry_multiple": pe_parts[2] if len(pe_parts) > 2 else "",
        "business_model": s(m.get("Business model class")), "value_chain": s(m.get("Value-chain layer")), "scope": s(m.get("Scope")),
        "primary_category": s(m.get("Primary category")), "water_relevance": s(m.get("Water relevance")),
        "deep_dive": s(m.get("Top-100 deep dive")) == "Y", "hq_address": hq, "website": s(e.get("Website")),
        "total_revenue_usd_m": r1(rev), "total_revenue_year": s(e.get("Revenue year")), "total_ebitda_usd_m": r1(ebitda),
        "ebitda_margin_pct": r1(marg * 100) if marg else None, "ebitda_year": s(e.get("Revenue year")),
        "us_water_treatment_revenue_usd_m": r1(n(m["US WATER TREATMENT REV ($M, pro forma)"])),
        "us_market_share_pct": r1((n(m["US market share"]) or 0) * 100, 2),
        "us_water_ebitda_usd_m": r1(n(m.get("US water EBITDA ($M)"))),
        "employees_total": r1(n(m.get("Total employees (owner)")), 0), "confidence": s(m.get("Confidence")),
        "end_markets_total_platform": em, "end_market_buckets": buckets, "revenue_by_business": segs, "revenue_by_product": [],
        "rolled_in": s(m.get("Rolled-in companies"), 1500),
        "acquisitions": sorted(acq.get(oid, []), key=lambda a: -yr(a["date"])),
        "buyers": [], "addon_ideas": [], "locked": [], "source_of_truth": [], "status": "ready",
        "updated_at": NOW, "imported_from": "US_Water_Treatment_Chemicals_v8_final.xlsx",
    }
    ptxt = s((profiles.get(oid) or {}).get("Profile"))
    lines = ptxt.split("\n")
    wi = next((l for l in lines[1:6] if l and not l.startswith("**") and not l.startswith("Bluntly") and not l.startswith("#") and not l.startswith("Total platform")), "")
    ev_rows = [{"metric": s(x.get("Metric")), "value": s(x.get("Value"), 200), "year": s(x.get("Year")), "source_type": s(x.get("Source type")),
                "url": s(x.get("URL")), "quote": s(x.get("Quote"), 300)} for x in sources.get(oid, [])][:40]
    sites = []
    if s(e.get("HQ street")): sites.append({"type": "HQ", "address": s(e.get("HQ street")), "city": s(e.get("HQ city")), "state": s(e.get("HQ state"))})
    for part in re.split(r";\s*", s(e.get("Other sites (from site research)"))):
        if part: sites.append({"type": "Site", "address": part[:200], "city": "", "state": ""})
    detail = {
        "what_it_is": wi, "bluntly": s(m.get("What it mostly is (blunt)")), "profile_md": "\n".join(lines[1:]) if lines and lines[0].startswith("# ") else ptxt,
        "total_revenue_basis": s(m.get("Revenue basis (owner)")) or s(e.get("Revenue basis / evidence")), "ebitda_basis": s(m.get("Platform EBITDA basis")),
        "employees_basis": s(e.get("Employees basis")),
        "chemistries": [{"product_line": p.strip(), "made_or_resold": "", "brands": ""} for p in re.split(r";\s*", s(m.get("Top chemistries"))) if p.strip()][:12],
        "evidence": ev_rows, "key_sites": sites[:40], "customers": [], "competitors": [],
        "runs": [{"at": NOW, "kind": "Imported", "summary": "Imported from US Water Treatment Chemicals v8 workbook."}],
    }
    if oid in SEED_IDS:  # richer Sep-27 deep dive wins; add workbook-only fields
        sd = json.load(open(f"{SEED}/{SEED_IDS[oid]}.json")); sd.pop("id", None)
        for k in ["rank", "business_model", "value_chain", "scope", "end_market_buckets", "us_market_share_pct", "us_water_ebitda_usd_m",
                  "pe_backed", "pe_rollup", "deep_dive", "rolled_in", "imported_from"]:
            sd[k] = summary[k]
        sd["revenue_by_product"] = sd.get("revenue_by_product", [])
        summary = {k: v for k, v in sd.items() if k not in DETAIL_KEYS}
        detail = {k: v for k, v in sd.items() if k in DETAIL_KEYS}
        detail["runs"] = sd.get("runs", [])
    json.dump(summary, open(f"{OUT}/companies/{cid}.json", "w"))
    json.dump(detail, open(f"{OUT}/details/{cid}.json", "w"))
    sizes.append((len(json.dumps(summary)), len(json.dumps(detail)), cid))

# non-owner entities, for Targets reverse search
extra = []
for e in ents.values():
    if e.get("Role") == "Owner": continue
    extra.append({"name": s(e.get("Company")), "role": s(e.get("Role")), "owner_id": ids.get(e.get("Owner ID (rolls into)")),
                  "owner": s(e.get("Ultimate owner (in this universe)")), "status": s(e.get("Status (verified Sep-2026)"), 160),
                  "what": s(e.get("What it mostly is (blunt)"), 200), "us_rev": r1(n(e.get("US water treatment rev ($M, standalone)"))),
                  "state": s(e.get("HQ state")),
                  "buckets": {b: r1(n(e.get("% " + b)) * 100) for b in BUCKETS if n(e.get("% " + b))}})
json.dump({"entities": extra, "updated_at": NOW}, open(f"{OUT}/meta/entities.json", "w"))
json.dump({"deals": sorted(other_deals, key=lambda a: -yr(a["date"])), "updated_at": NOW}, open(f"{OUT}/meta/deals.json", "w"))
print("owners", len(master), "acq", sum(len(v) for v in acq.values()), "other deals", len(other_deals), "entities", len(extra))
print("summary total KB", sum(a for a, b, c in sizes) // 1024, "max", max(sizes), "detail max", max(sizes, key=lambda x: x[1]))
print("meta KB", os.path.getsize(f"{OUT}/meta/entities.json") // 1024, os.path.getsize(f"{OUT}/meta/deals.json") // 1024)
