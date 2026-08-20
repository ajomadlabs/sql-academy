#!/usr/bin/env python3
"""Append a content hash to every asset URL in the HTML.

GitHub Pages serves assets with a long cache lifetime, so a deploy can
leave browsers running an old script against new markup — which is how a
fixed sync bug appeared to persist. Hashing the URL means the filename
changes only when the file does: unchanged assets stay cached, changed
ones are fetched immediately.
"""
import hashlib, pathlib, re

root = pathlib.Path(__file__).resolve().parent.parent

def digest(name):
    f = root / "assets" / name
    return hashlib.md5(f.read_bytes()).hexdigest()[:8]

hashes = {p.name: digest(p.name) for p in (root / "assets").glob("*.*")}

pat = re.compile(r'(assets/([A-Za-z0-9_.-]+\.(?:js|css)))(\?v=[a-f0-9]+)?')
changed = 0
for html in list(root.rglob("*.html")):
    s = html.read_text(encoding="utf-8")
    new = pat.sub(lambda m: f"{m.group(1)}?v={hashes.get(m.group(2), '0')}", s)
    if new != s:
        html.write_text(new, encoding="utf-8")
        changed += 1

print(f"stamped {changed} html file(s)")
for n, h in sorted(hashes.items()):
    print(f"  {n:<16} v={h}")


# dashboard.js is injected by dashboard-boot.js rather than a <script> tag,
# so the regex above cannot see it. Stamp its version separately or the
# boot pins whatever hash happened to be current when it was written.
idx = root / "index.html"
if idx.exists():
    html = idx.read_text(encoding="utf-8")
    new = re.sub(r'window\.__DASH_V="[a-f0-9]*"',
                 f'window.__DASH_V="{hashes.get("dashboard.js", "1")}"', html)
    if new != html:
        idx.write_text(new, encoding="utf-8")
        print(f"  dashboard.js  boot v={hashes.get('dashboard.js')}")


# day.js is injected by day-boot.js rather than a <script> tag, so the
# regex above cannot see it either.
day_v = hashes.get("day.js")
if day_v:
    for page in sorted(root.glob("day/*/index.html")):
        html = page.read_text(encoding="utf-8")
        new = re.sub(r'window\.__DAY_V="[a-f0-9]*"', f'window.__DAY_V="{day_v}"', html)
        if new != html:
            page.write_text(new, encoding="utf-8")
    print(f"  day.js        boot v={day_v}")


# ---------------------------------------------------------------
# The landing page states the size of the course in prose, where no
# amount of care keeps it true: it said 253 problems for a while after
# the practice/rehearse split moved the real figure to 241, and nothing
# noticed. The page reads "no traps", so a stale number there is worse
# than a cosmetic bug. Fail the build instead of shipping it.
# ---------------------------------------------------------------
import re as _re

_cat = root / "assets" / "catalog.js"
_idx = root / "index.html"
if _cat.exists() and _idx.exists():
    _src = _cat.read_text(encoding="utf-8")
    _days = _re.findall(r'"np"\s*:\s*(\d+)', _src) or _re.findall(r'\bnp:\s*(\d+)', _src)
    _n_days, _n_probs = len(_days), sum(int(x) for x in _days)

    _html = _idx.read_text(encoding="utf-8")
    _claims = [(int(d), int(p)) for d, p in
               _re.findall(r'(\d+)\s+days?,\s*(\d+)\s+checked problems', _html)]
    for _d, _p in _claims:
        if (_d, _p) != (_n_days, _n_probs):
            raise SystemExit(
                f"stamp-assets: index.html claims {_d} days / {_p} problems, "
                f"curriculum has {_n_days} / {_n_probs}. Update the copy.")
    if _claims:
        print(f"  curriculum    copy matches ({_n_days} days, {_n_probs} problems)")
