#!/usr/bin/env python3
"""Embed the CRM (crm/crm.html) into the Probrands app (index.html).

The CRM runs in its own frame inside Probrands. Its page is stored in index.html as a JSON string between the
<!--HB--> markers and loaded as the frame's srcdoc. Run this after every change to crm.html:

    python3 probrands/crm/embed.py
"""
import json, pathlib, re

here = pathlib.Path(__file__).resolve().parent
app = here.parent / "index.html"
hb = (here / "crm.html").read_text()
# crm.html is written like a published page body; the frame needs a whole document (standards mode).
if not hb.lstrip().lower().startswith("<!doctype"):
    hb = ("<!doctype html><html><head><meta charset=utf-8><meta name=viewport content=\"width=device-width,initial-scale=1,viewport-fit=cover\">"
          "<style>*,*::before,*::after{box-sizing:border-box}html,body{margin:0}</style></head><body>" + hb + "</body></html>")
blob = json.dumps(hb).replace("<", "\\u003c")
s = app.read_text()
new, n = re.subn(r"<!--HB-->.*?<!--/HB-->", lambda m: '<!--HB--><script type="application/json" id="hbsrc">' + blob + "</script><!--/HB-->", s, flags=re.S)
assert n == 1, "markers not found in index.html"
app.write_text(new)
print(f"embedded {len(hb):,} chars; index.html now {len(new):,} chars")
