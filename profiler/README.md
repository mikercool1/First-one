# Profiler

A chemicals company repository for deal work, organised by sector (water treatment, lubricants, personal care and professional beauty, food ingredients, coatings and more; custom sectors can be added). Each company has business lines in one or more sectors and a primary sector. "Build out this sector" on the Sectors page has Claude add a sector's leading companies as starter profiles.

A company repository for deal work. Each company gets a profile with revenue, EBITDA, margin, pie charts by end market, segment and product, and tabs for customers, products, competitors, acquisitions, potential buyers and add-on ideas.

Live app: https://claude.ai/artifact/KCB1rWzeMTqDnqVXoQz3eG (private to the owner until shared)

## How it works

- **Profiles are saved** in the artifact's shared database (`companies/<slug>`), so they persist across sessions.
- **New company**: add a name. The profile starts empty. Click *Run deep dive* and Claude drafts the whole profile, then it saves.
- **Edit anything**: click a number or text, type, press Enter. The change saves, and that field is marked *Your edit*.
- **Source of truth**: edited fields and anything added with *Add a fact* are passed to the next run as ground truth. *Re-run with my facts* re-derives the rest of the profile around them without overwriting them.
- **Targets**: every acquisition, add-on idea and named buyer across all profiles, searchable by target. For a profiled target, it ranks the best-fit platforms by shared end-market exposure.
- **Precedents**: every deal from every profile, plus sponsor entries with a known EV, with EV / revenue.
- **End markets**: rank companies by exposure to an end market, as a share or in dollars.

In-page deep dives run on Claude's own knowledge (no web browsing). For a web-researched dive, ask Claude in chat to research a company into Profiler, and it writes the profile to the same database.

## Data

The repository holds the full US Water Treatment Chemicals index (v8 workbook, built 26 Sep 2026): 558 ultimate owners as profiles, 804 add-on deals on their Acquisitions tabs, 148 outside and sponsor deals, and 281 add-on, excluded and duplicate entities for Targets. The 10 September 27 deep dives (P05A/P05B) take precedence over the workbook rows for those companies.

Each company is two database documents: `companies/<id>` (summary used by lists and screens) and `details/<id>` (write-up, evidence, sites, customers, competitors, run history), loaded when a profile opens. `meta/deals` and `meta/entities` hold the deal log and non-owner entities.

To rebuild the import from a new workbook version: `python3 profiler/import/build_import.py <workbook.xlsx>`, then load `profiler/import/out/` into the artifact database.

## Files

- `index.html`: the app (single file, published as a claude.ai artifact).
- `import/build_import.py`: converts the workbook into database documents.
- `seed/*.json`: the 10 profiles imported from the WTC deep-dive batches P05A and P05B. Customers, competitors and buyers on these were added from the deep-dive text.
