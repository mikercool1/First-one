# Probrands

A company profiler for US professional brands: professionally branded chemical products held by tradespeople and plant workers (WD-40, Loctite, CRC, Oatey, RectorSeal and the like), mapped to the companies that own them. It is a copy of the Home Base profiler (`profiler/` on the `claude/profiler-app` branch), narrowed to this one industry and given its own database.

Live app: https://claude.ai/artifact/UkLSFqKaS38kQqd4JmvNhk (private to the owner until shared)

## What changed from Home Base

- **One industry.** A single vertical ("Professional brands") with a single group ("Pro brands"); the vertical switcher is hidden.
- **Sectors are product families**: lubricants, greases & penetrants; adhesives, sealants & threadlockers; cleaners & degreasers; hand care; disinfectants, sanitation & pest; paints, coatings & markers; plumbing, HVAC/R, electrical, welding & metalworking, automotive & fleet, construction, and water & wastewater chemicals; other.
- **End markets are the trades** from the market map: Industrial MRO, Plumbing, HVAC/R, Electrical, Construction & Contractor, Facilities & Janitorial, Automotive & Fleet, Welding & Fabrication, Water & Wastewater, Other.
- **Research prompts** (profile builder, chat, sector build-out, market size, deep research) carry the market map's definitions: what counts as a professional brand, pro brand revenue versus total platform revenue, Core versus Adjacent, the five business-model classes and their starting EBITDA margins, and the pro distributor channel.
- **Profiles** show pro relevance, primary trade, pro brands and SKUs scraped. The Companies list filters by Core / Adjacent.
- Everything else works as in Home Base: deep dives, chat with web search, deals, precedents, buyer finder, PE pages, in market, campaign and market size.

## Data

`import/build_import.py` turns the Professional Brands Market Map workbook into database documents:

```
python3 probrands/import/build_import.py Professional_Brands_Market_Map_v5.xlsx
```

It writes `import/out/` (not committed): `companies/<id>`, `details/<id>`, `meta/entities` (every brand and acquired company with a known owner) and `meta/deals`. Load those into the artifact database with the ArtifactData tool.

Owners come from the Master tab, which is verified ownership. Each one gets its facts from Companies (HQ, website, employees, revenue where researched), its write-up from Profiles, its evidence from Sources, and the acquired companies that roll into it. Deals where an owner bought a business go on that owner's M&A tab. Ownership changes (sponsor buyouts, take-privates) and deals outside the universe go to `meta/deals`. For PE-backed owners, the latest deal where the named sponsor bought in sets the entry year. Brands that only carry the unverified "Likely owner (PRIOR)" join a Master owner when the names match (for example, ITW joins "Illinois Tool Works (ITW Pro Brands)"). Otherwise they become starter profiles, tagged "From market map", with ownership rated Low.

Clean-up rules:
- Owners that Master lists twice under different IDs (v5 has DuPont, S.C. Johnson and Kimberly-Clark) are merged into the one with more brands. The other row becomes a rolled-in company.
- A Master row named "Unknown" is a bucket of brands whose maker wasn't found, so it gets no profile and its brands stay unowned.
- Brands with no owner are left out of `meta/entities`, because the app only uses brands that point at a profile and a database document is capped at 256 KB.

Loaded now: v5 (1 Oct 2026) has 287 profiles. 272 are verified owners and 15 are unverified starters (WD-40, Dow, Sika and other large strategics). 98 deals sit on owners' M&A tabs and 97 are in the deal log. 518 of 2,127 brands are linked to an owner. Each profile also has a sector mix and trade mix weighted by SKUs scraped, one product line per brand, and the distributors that carry its brands as customers.
