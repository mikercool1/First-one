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
python3 probrands/import/build_import.py Professional_Brands_Market_Map_v1.xlsx
```

It writes `import/out/` (not committed): `companies/<id>`, `details/<id>`, `meta/entities` (every brand, linked to its owner when known) and `meta/deals`. Load those into the artifact database with the ArtifactData tool.

v1 of the workbook has no verified owners yet (Phase 3), so each brand's *Likely owner (PRIOR - unverified)* becomes a starter profile: 51 owners covering 100 of the 495 brands. Ownership fields on these are rated Low and the profiles are tagged "From market map". Each starter has one product line per brand, a sector mix and trade mix weighted by SKUs scraped, and the distributors that carry its brands as customers. Once the Master tab is filled in, the importer uses it instead, with its owner type, sponsor, revenue, EBITDA and trade mix.
