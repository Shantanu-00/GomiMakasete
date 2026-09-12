import json
from collections import defaultdict

with open('all_shinjuku_rows.json', 'r', encoding='utf-8') as f:
    rows = json.load(f)

schedules = defaultdict(list)
star_rows = []

# Day mapping
day_map_ja_to_en = {
    '月曜日': 'Monday',
    '火曜日': 'Tuesday',
    '水曜日': 'Wednesday',
    '木曜日': 'Thursday',
    '金曜日': 'Friday',
    '土曜日': 'Saturday',
    '日曜日': 'Sunday'
}

def parse_combustible(comb_str):
    parts = comb_str.split('・')
    return [day_map_ja_to_en.get(p.strip(), p.strip()) for p in parts]

def parse_resources(res_str):
    parts = res_str.split('・')
    return [day_map_ja_to_en.get(p.strip(), p.strip()) for p in parts]

def parse_metal(metal_str):
    # e.g. "2・4番目の土曜日", "1・3番目の水曜日"
    # format: ["2nd Saturday", "4th Saturday"] or ["1st Wednesday", "3rd Wednesday"]
    res = []
    import re
    m = re.match(r'([0-9・]+)番目の(.+曜日)', metal_str)
    if m:
        nums = m.group(1).split('・')
        day = day_map_ja_to_en.get(m.group(2).strip(), m.group(2).strip())
        ord_map = {'1': '1st', '2': '2nd', '3': '3rd', '4': '4th', '5': '5th'}
        for n in nums:
            res.append(f"{ord_map.get(n, n + 'th')} {day}")
        return res
    return [metal_str]

for r in rows:
    initial, addr, res, comb, mcg, jurisdiction = r[0], r[1], r[2], r[3], r[4], r[5]
    if '*' in res or '*' in comb or '*' in mcg:
        star_rows.append(r)
        continue
    key = (res, comb, mcg)
    schedules[key].append((initial, addr, jurisdiction))

# Sort schedules by count descending
sorted_patterns = sorted(schedules.items(), key=lambda x: -len(x[1]))

pattern_list = []
pattern_lookup = {}

for idx, (sched, towns) in enumerate(sorted_patterns, 1):
    pid = f"PATTERN_SHINJUKU_{idx:02d}"
    res_en = parse_resources(sched[0])
    comb_en = parse_combustible(sched[1])
    mcg_en = parse_metal(sched[2])
    pattern_entry = {
        "pattern_id": pid,
        "municipality_id": "tokyo_shinjuku",
        "morning_deadline": "08:00 AM",
        "schedules": {
            "combustible": comb_en,
            "resources": res_en,
            "metal_ceramics_glass": mcg_en
        },
        "_raw": {
            "resources": sched[0],
            "combustible": sched[1],
            "metal_ceramics_glass": sched[2]
        },
        "_town_count": len(towns)
    }
    pattern_list.append(pattern_entry)
    pattern_lookup[sched] = pid

with open('shinjuku_patterns_preview.json', 'w', encoding='utf-8') as f:
    json.dump(pattern_list, f, ensure_ascii=False, indent=2)

with open('shinjuku_patterns_summary.txt', 'w', encoding='utf-8') as f:
    f.write(f"Total Unique Patterns: {len(pattern_list)}\n")
    f.write(f"Total Standard Towns: {sum(p['_town_count'] for p in pattern_list)}\n")
    f.write(f"Total Star Towns: {len(star_rows)}\n\n")
    for p in pattern_list:
        f.write(f"{p['pattern_id']} ({p['_town_count']} areas):\n")
        f.write(f"  Combustible: {p['schedules']['combustible']} (raw: {p['_raw']['combustible']})\n")
        f.write(f"  Resources:   {p['schedules']['resources']} (raw: {p['_raw']['resources']})\n")
        f.write(f"  Metal/Glass: {p['schedules']['metal_ceramics_glass']} (raw: {p['_raw']['metal_ceramics_glass']})\n\n")
    f.write("\n--- STAR ROWS (* MARK) ---\n")
    for sr in star_rows:
        f.write(f"Town: {sr[1]} | Resources: {sr[2]} | Combustible: {sr[3]} | Metal: {sr[4]} | Center: {sr[5]}\n")

print(f"Summary written to shinjuku_patterns_summary.txt. Total patterns: {len(pattern_list)}")
