# Probrands

A deal screen for US professional brands: branded chemical products that tradespeople and plant workers hold in their hand (WD-40, CRC, Oatey, Nu-Calgon, Kano and the like), mapped to the companies that own them. Built from the Professional Brands Market Map workbook. It started as a copy of the Home Base profiler but is now its own app, built around one question: which PE- and family-owned companies fit the pro brands playbook?

Live app: https://claude.ai/artifact/UkLSFqKaS38kQqd4JmvNhk (private to the owner until shared)

## Pages

- **The screen**: every owner ranked by its DNA score. Green (70+) at the top, amber (45 to 69) in the middle, red (under 45) at the bottom. Companies that fail "pro brands are most of revenue" are out of scope and hidden behind a toggle. Filter by product family, end market or search.
- **Company**: the DNA test check by check, SKU mix (package format, end market, brand, distributor), the brand list with who carries each one, deals, the workbook's write-up and sources.
- **Brands**: all 2,127 brands, searchable by brand, owner, product, maker or distributor, and filterable by owner status, owner type, product family, format, end market and distributor. Each brand has a page with its owner, where it's sold (with the broadline, specialty and retail split), package formats and every scraped SKU with links to the distributor listing.
- **Consolidators**: who is buying pro brands, ranked by add-on deals in the ledger and then by brands owned; PE sponsors and their platforms; add-ons by year; the deal log.
- **The web**: each consolidator is a hub with its brands on spokes. Brands that came in through an acquisition are yellow, and dashed lines tie PE sponsors to their platforms. Click a hub to list its brands below.
- **SKU mix**: format, end market, product family, distributors and brands across everything in the filter, plus the broadline, specialty and retail channel split.

The ownership filter in the left rail (PE, Family, ESOP, Private, Corporate) applies to every page. PE + Family is the default.

## Look

Navy (#0A2A44) and safety orange (#F26300) on industrial and foundation grays, set in Montserrat, following the user's Workmark brand board: heavy uppercase headlines with a short orange rule, spaced small-caps labels, navy bands and hero panels. DNA bands keep their own green, amber and red.

## Brand owners

- **Owner verified**: the market map's verified Companies tab (440 brands).
- **Owner unverified**: the workbook's prior (78).
- **Claude's guess**: for brands the workbook has no owner for, Claude's best guess from its knowledge and the maker name on distributor listings, with High, Medium or Low confidence (1,283). Stored in `import/brand_owners.json`. A guess that names a company already profiled links to it and shows under "Likely also owns" on that company. It does not count toward that company's DNA or SKU mix.
- **Owner not identified**: no clue at all (326).

## The DNA test

Seven checks, each Pass (full points), Partly (half) or Fail:

| Check | Points | Where it comes from |
|---|---|---|
| Fits in your hand | 15 | Share of scraped SKUs that are aerosols, tubes, cartridges, wipes, markers, kits, or bottles, cans and powders up to 1 gal, 4 L or 10 lb |
| Sold through pro distributors | 15 | Pro distributors carrying it (4+) and share of SKUs in pro rather than retail channels (70%+) |
| Pros ask for it by name | 15 | Claude's judgment |
| ITW Pro Brands would want it | 15 | Claude's judgment |
| Pro brands are most of revenue | 20 | Claude's judgment (fail means out of scope) |
| Used up and re-bought | 10 | Share of SKUs that are consumables, not tools, dispensers or equipment |
| Owns its brand | 10 | Business model: not private label, contract fill or a distributor house brand |

Claude's judgments for all owners are in `import/judgments.json`. They come from Claude's knowledge plus the workbook facts, without new web research. On a company page you can click any check to change it, which saves as "Your call", or ask Claude to re-check the three judgment calls. Overrides live in the `dna` collection (one document per company), so re-importing the workbook never erases them. Precedence: your call, then a re-check from the page, then the imported judgment, then the data rule.

Distributor channels (broadline MRO, trade specialty, retail-leaning) and the end-market groups are set in `import/build_import.py` (`RETAIL`, `BROADLINE`, `MARKET`).

## Data

```
python3 probrands/import/build_import.py Professional_Brands_Market_Map_v5.xlsx
```

This writes `import/out/data/*.json`, one file per document in the app's `data` collection: `co-N` (company summaries), `dt-N` (details), `br-N` (every brand), `deals`, `dists` and `index`. Every SKU goes in `import/out/sku/p-N.json`, the `sku` collection, which loads one document at a time when a brand page opens. Lists are split across documents because the database stores at most 256 KB per document; nothing is dropped. Load them with the ArtifactData tool (a `set` of each file). It also writes `import/out/judge/batch-N.json`, the facts behind the judgment calls, for scoring new owners.

Owners come from the Master tab. Clean-up rules:
- Owners listed twice are merged (in v5: DuPont, S.C. Johnson, Kimberly-Clark).
- The "Unknown" placeholder row gets no profile.
- Brands that only carry an unverified "Likely owner (PRIOR)" join a matching Master owner, or become an owner marked unverified.

The database still holds the earlier version's `companies`, `details` and `meta` collections. The app no longer reads them, so they can be cleared.

Loaded now: v5 (1 Oct 2026), with 287 owners, all 2,127 brands, 6,767 SKUs from 45 distributors, and 195 deals.
