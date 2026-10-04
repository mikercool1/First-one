"""Builds out/audit/main.json (db doc audit/main) from the consolidated end-market research audit PDF.
b12/b34 hold the per-category reviews (batches 1-2 and 3-4) transcribed from the PDF text; findings.json is its
highest-priority findings table. Categories are keyed by their index in data/cats.json names."""
import json, os
H = os.path.dirname(os.path.abspath(__file__)); O = os.path.join(H, "..", "out")
C = json.load(open(os.path.join(O, "data", "cats.json")))["names"]
xs = json.load(open(os.path.join(H, "b12.json"))) + json.load(open(os.path.join(H, "b34.json")))
notes = {**json.load(open(os.path.join(H, "b12_notes.json"))), **json.load(open(os.path.join(H, "b34_notes.json")))}
doc = {"title": "Consolidated End-Market Research Audit - Batches 1-4", "date": "2026-10-03",
       "findings": json.load(open(os.path.join(H, "findings.json"))), "batches": {k: notes[k] for k in sorted(notes)},
       "cats": {str(C.index(x["cat"])): x for x in xs},
       "key": "Keep: existing view is well supported. Refine / Split / Rename: economics may be right but taxonomy obscures important verticals. Sensitivity: test a different mix without overwriting the base case. Bridge: reconcile revenue stage or scope before changing TAM. Correct: a factual or current-regulatory issue should be fixed."}
os.makedirs(os.path.join(O, "audit"), exist_ok=True)
json.dump(doc, open(os.path.join(O, "audit", "main.json"), "w"), ensure_ascii=False)
print(len(doc["cats"]), "categories")
