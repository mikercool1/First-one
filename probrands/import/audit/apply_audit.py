"""Applies the end-market research audit (Oct 2026) to the market studies, without changing the model:
- corrects statements the audit shows are wrong (WD-40 anchor, Washington copper rule, methylene chloride rule, HFC aerosol limits);
- widens the market-size range where a published estimate differs (metalworking fluids, greases) and lowers that sizing confidence;
- adds the new published market data as a "Market data (Oct 2026)" item, with sources.
End-market splits, point estimates, pro shares and scores are untouched. Idempotent: re-running changes nothing."""
import json, os
H = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(H, "..", "out")
A = json.load(open(os.path.join(O, "audit", "main.json")))["cats"] if os.path.exists(os.path.join(O, "audit", "main.json")) else None
if A is None:
    import subprocess; subprocess.run(["python3", os.path.join(H, "build_audit.py")], check=True); A = json.load(open(os.path.join(O, "audit", "main.json")))["cats"]
cats_p = os.path.join(O, "data", "cats.json"); cats = json.load(open(cats_p))
st = lambda ci: json.load(open(os.path.join(O, "study", f"{ci}.json")))
changed = set()

def rep(doc, path, old, new):
    o = doc
    for k in path[:-1]: o = next(x for x in o if x[0] == k[1:]) if isinstance(k, str) and k.startswith("@") else o[k]
    if old in o[path[-1]]: o[path[-1]] = o[path[-1]].replace(old, new); return True
    assert new in o[path[-1]], (path, old)
    return False

FIX = {
  25: [(["built"], "WD-40 Co. FY25 Americas sales $290.6M (Multi-Use is primarily a penetrant/lubricant; US ~ $230-260M estimated), and WD-40 is assumed",
        "WD-40 Co. FY25 total US net sales were $210.2M across all products (10-K); Multi-Use was $224.8M for the whole Americas segment (US, Canada, Latin America), and Multi-Use is a multi-use product (penetrant, lubricant, rust protection), so only part of it is penetrant. WD-40 is assumed")],
  55: [(["bear", 2], "Copper antifouling restrictions (Washington state <0.5% Cu from 2026; California studies) force costly reformulation",
        "Copper antifouling pressure forces reformulation: California has capped copper leach rates for recreational-boat paints since 2018; Washington's copper restriction is postponed (not 2026; Ecology reports again by June 30, 2029)"),
       (["know", "@Regulation", 1, 0], "Washington copper limit <0.5% for recreational vessels from Jan 2026",
        "Washington copper antifouling restriction for recreational vessels postponed (will not take effect in 2026; Ecology reports again by June 30, 2029), Irgarol/cybutryne prohibited in Washington since 2023, California maximum copper leach rate since 2018"),
       (["src", 1, 2], "Washington copper limit <0.5% from Jan 2026", "Washington copper restriction since postponed (not 2026)"),
       (["regs"], "copper antifouling ban for recreational boats repeatedly delayed", "copper antifouling restriction for recreational boats postponed, will not take effect in 2026, next report by June 30, 2029")],
  52: [(["regs"], "2024 rule banning commercial paint/coating removal",
        "2024 rule prohibiting most industrial and commercial uses, in force since April 28, 2026, including paint/coating and adhesive/caulk removal (limited furniture-refinishing extension to May 8, 2029)"),
       (["know", "@Regulation", 1, 0], "2024 final rule restricting nearly all commercial methylene chloride paint-stripping uses",
        "2024 final rule prohibiting most industrial and commercial methylene chloride uses since April 28, 2026, including paint/coating and adhesive/caulk removal (furniture refinishing extended to May 8, 2029)")],
  23: [(["regs"], "(134a banned for most aerosol uses)",
        "(134a banned for most aerosol uses; EPA's 150-GWP limit applies to consumer aerosols from Jan 2025 and technical aerosols from Jan 2028, and HFC-152a at GWP 124 is under that cap)"),
       (["know", "@Regulation", 1, 0], "AIM Act HFC phase-down affects dusters (HFC-152a allowances, shift to HFO)",
        "AIM Act HFC phase-down affects dusters through HFC-152a allowances; 152a (GWP 124) is under EPA's 150-GWP aerosol limit (consumer from 2025, technical from 2028), so HFOs are an option, not a forced switch")],
}
# Different published views of market size -> range ($M)
RANGE = {22: dict(hi=2770, conf="Medium", note="Grand View Research sizes US metalworking fluids at $2,768.5M (2025), about 1.9x the MarketsandMarkets figure; the range's high end reflects it."),
         21: dict(lo=607, note="Grand View Research sizes the US greases market at $606.8M (2025), at manufacturer level; the range's low end reflects it.")}
# New published market data
NEW = {
  42: ["ACA: US automotive refinish coatings $3.16B and industrial maintenance/protective coatings $2.67B (2025); architectural is 46% of US coatings value, applied 66% by pros / 34% DIY (2026 outlook)."],
  54: ["IMR: automotive chemical parts and services run about 52% DIY / 48% DIFM; gas treatment, washer fluid and octane boosters are mostly DIY, flushes mostly DIFM."],
  57: ["NPMA: US structural pest control services $13.4B (2025), 16,565 firms, 81.4% with one or two locations; pest-control product spend above $1B (2024)."],
  44: ["Grand View: US building-care chemicals $4.53B (2025), 70.4% sold under contract."],
  58: ["Leslie's: residential pool aftermarket about 70% DIY / 30% DIFM, plus a separate professional pool aftermarket of about $4.4B (service pros and operators)."],
  49: ["Grand View: US floor-care chemicals $4.00B (2025), which includes floor disinfectants."],
  43: ["Ken Research: US wood coatings about $2.7B (2025); furniture and cabinetry are 58% of value."],
  46: ["Kline: professional (I&I) hand care in the US was nearly $1.5B in 2015, with hospitals the largest end use."],
  31: ["US concrete repair mortars about $682M (2025), structural repair about 65%; North America about $1.01B."],
  30: ["North American building & construction sealants about $1.43B (2024); US construction silicones $288M (2025), commercial construction 38.3%."],
  37: ["North American DIY and household adhesives & sealants about $1.45B (2024)."],
  22: ["MarketsandMarkets: US metalworking fluids $1,472.3M (2025) to $1,715.1M by 2030 (3.1% a year); Grand View: $2,768.5M (2025). Machinery is the largest end use (41.6% globally)."],
  53: ["Compass Minerals: highway deicing was 63% of FY2025 salt sales; that bulk road salt is outside this packaged ice-melt market."],
  21: ["Grand View: US greases $606.8M (2025), at manufacturer level."],
  55: ["NMMA: US recreational marine retail spending $54B (2025), including $12.1B of aftermarket accessories."],
  23: ["Grand View: US electric air dusters $64.8M (2025), growing about 8% a year, a substitute for canned dusters. The broad US solvents market is about $7.3B (2025), mostly outside this packaged shelf."],
  51: ["MarketsandMarkets: US industrial absorbents $1,087.0M (2025): oil & gas $542.6M, chemical $247.3M, food processing $149.6M, healthcare $100.6M. EPA SPCC rules treat sorbents and spill kits as required containment at regulated oil facilities."],
  56: ["Emergen Research: US cleanroom disinfectants $685M (2025), 61.2% pharma/biopharma; the rest of the $1.0B (about $315M of critical cleaners and decontaminants) is estimated, not published."],
  52: ["EPA: most industrial and commercial methylene chloride uses prohibited since April 28, 2026, including paint and adhesive removal; furniture refinishing extended to May 8, 2029."],
  25: ["WD-40 Company FY2025 10-K: total US net sales $210.2M; Americas Multi-Use $224.8M (US, Canada and Latin America)."],
  24: ["Fact.MR: global acid-free rust removers about $270M (2026), a narrow slice of this category (removers only)."],
}
TITLE = "Market data (Oct 2026)"
for ci in sorted(set(FIX) | set(RANGE) | set(NEW)):
    d = st(ci); before = json.dumps(d, sort_keys=True)
    for path, old, new in FIX.get(ci, []): rep(d, path, old, new)
    if ci in RANGE:
        R = RANGE[ci]; s = cats["study"][str(ci)]
        lo, hi = R.get("lo", s["lo"]), R.get("hi", s["hi"]); s["lo"], s["hi"] = float(lo), float(hi)
        d["Range ($M)"] = f"{lo:,.0f} – {hi:,.0f}"; d["size"]["Low / high ($M)"] = f"{lo:.0f} / {hi:.0f}"
        if "conf" in R: s["conf"] = d["TAM confidence"] = d["size"]["Confidence"] = R["conf"]
        if R["note"] not in d["built"]: d["built"] = d["built"].rstrip() + " " + R["note"]
    if ci in NEW:
        d["know"] = [k for k in d["know"] if k[0] != TITLE]; d["know"].insert(0, [TITLE, NEW[ci]])
        have = {x[1] for x in d["src"] if len(x) > 1}
        for t, u in A.get(str(ci), {}).get("sources", []):
            if u and u not in have: d["src"].append([t, u, "Oct 2026 market data"]); have.add(u)
    if json.dumps(d, sort_keys=True) != before:
        json.dump(d, open(os.path.join(O, "study", f"{ci}.json"), "w"), ensure_ascii=False); changed.add(f"study/{ci}")
json.dump(cats, open(cats_p, "w"), ensure_ascii=False)
print("changed:", sorted(changed))
