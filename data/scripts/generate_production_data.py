import json
import re

# Load all 171 parsed Shinjuku rows
with open('data/raw/all_shinjuku_rows.json', 'r', encoding='utf-8') as f:
    shinjuku_raw_rows = json.load(f)

# Comprehensive Japan Post postal code mapping for Shinjuku-ku towns
SHINJUKU_POSTAL_CODES = {
    "愛住町": "160-0005", "赤城下町": "162-0803", "赤城元町": "162-0817", "揚場町": "162-0824",
    "荒木町": "160-0007", "市谷加賀町": "162-0844", "市谷甲良町": "162-0832", "市谷砂土原町": "162-0842",
    "市谷左内町": "162-0846", "市谷鷹匠町": "162-0848", "市谷田町": "162-0843", "市谷台町": "162-0066",
    "市谷長ノ坂町": "162-0847", "市谷船河原町": "162-0826", "市谷本村町": "162-0845", "市谷八幡町": "162-0844",
    "市谷薬王寺町": "162-0063", "市谷柳町": "162-0061", "市谷山伏町": "162-0852", "岩戸町": "162-0831",
    "榎町": "162-0806", "大久保": "169-0072", "改代町": "162-0802", "神楽河岸": "162-0823",
    "神楽坂": "162-0825", "霞ヶ丘町": "160-0013", "片町": "160-0001", "歌舞伎町": "160-0021",
    "上落合": "161-0034", "河田町": "162-0054", "喜久井町": "162-0044", "北新宿": "169-0074",
    "北町": "162-0834", "北山伏町": "162-0853", "細工町": "162-0838", "左門町": "160-0017",
    "信濃町": "160-0016", "下落合": "161-0033", "下宮比町": "162-0814", "白銀町": "162-0816",
    "新小川町": "162-0814", "新宿": "160-0022", "水道町": "162-0811", "須賀町": "160-0018",
    "住吉町": "162-0065", "大京町": "160-0015", "高田馬場": "169-0075", "箪笥町": "162-0833",
    "築地町": "162-0818", "津久戸町": "162-0821", "筑土八幡町": "162-0815", "天神町": "162-0808",
    "戸塚町": "169-0071", "富久町": "162-0067", "戸山": "162-0052", "内藤町": "160-0014",
    "中井": "161-0035", "中落合": "161-0032", "中里町": "162-0804", "中町": "162-0835",
    "納戸町": "162-0837", "西落合": "161-0031", "西五軒町": "162-0812", "西新宿": "160-0023",
    "二十騎町": "162-0836", "西早稲田": "169-0051", "払方町": "162-0841", "原町": "162-0053",
    "馬場下町": "162-0045", "東榎町": "162-0807", "東五軒町": "162-0813", "百人町": "169-0073",
    "袋町": "162-0828", "舟町": "160-0006", "弁天町": "162-0851", "本塩町": "160-0003",
    "南町": "162-0836", "南榎町": "162-0852", "南元町": "160-0012", "南山伏町": "162-0854",
    "山吹町": "162-0801", "矢来町": "162-0805", "横寺町": "162-0831", "余丁町": "162-0055",
    "四谷": "160-0004", "四谷坂町": "160-0002", "若葉": "160-0011", "若松町": "162-0056",
    "若宮町": "162-0827", "早稲田町": "162-0042", "早稲田鶴巻町": "162-0041", "早稲田南町": "162-0043"
}

ROMAJI_MAP = {
    "愛住町": "Aizumicho", "赤城下町": "Akagishitamachi", "赤城元町": "Akagimotomachi", "揚場町": "Agebacho",
    "荒木町": "Arakicho", "市谷加賀町": "Ichigaya Kagacho", "市谷甲良町": "Ichigaya Koracho",
    "市谷砂土原町": "Ichigaya Sadoharacho", "市谷左内町": "Ichigaya Sanaicho", "市谷鷹匠町": "Ichigaya Takajocho",
    "市谷田町": "Ichigaya Tamachi", "市谷台町": "Ichigaya Daimachi", "市谷長ノ坂町": "Ichigaya Naganosakacho",
    "市谷船河原町": "Ichigaya Funagawaramachi", "市谷本村町": "Ichigaya Honmuracho", "市谷八幡町": "Ichigaya Hachimancho",
    "市谷薬王寺町": "Ichigaya Yakuojicho", "市谷柳町": "Ichigaya Yanagicho", "市谷山伏町": "Ichigaya Yamabushicho",
    "岩戸町": "Iwatocho", "榎町": "Enokicho", "大久保": "Okubo", "改代町": "Kaitacho",
    "神楽河岸": "Kaguragashi", "神楽坂": "Kagurazaka", "霞ヶ丘町": "Kasumigaokamachi", "片町": "Katamachi",
    "歌舞伎町": "Kabukicho", "上落合": "Kamiochiai", "河田町": "Kawadacho", "喜久井町": "Kikuicho",
    "北新宿": "Kita-Shinjuku", "北町": "Kitamachi", "北山伏町": "Kitayamabushicho", "細工町": "Saikucho",
    "左門町": "Samoncho", "信濃町": "Shinanomachi", "下落合": "Shimoochiai", "下宮比町": "Shimomiyabicho",
    "白銀町": "Shiroganecho", "新小川町": "Shin-Ogawamachi", "新宿": "Shinjuku", "水道町": "Suidocho",
    "須賀町": "Sugacho", "住吉町": "Sumiyoshicho", "大京町": "Daikyocho", "高田馬場": "Takadanobaba",
    "箪笥町": "Tansumachi", "築地町": "Tsukijimachi", "津久戸町": "Tsukudocho", "筑土八幡町": "Tsukudo-Hachimancho",
    "天神町": "Tenjincho", "戸塚町": "Totsukacho", "富久町": "Tomihisacho", "戸山": "Toyama",
    "内藤町": "Naitomachi", "中井": "Nakai", "中落合": "Nakaochiai", "中里町": "Nakazatocho",
    "中町": "Nakamachi", "納戸町": "Nandocho", "西落合": "Nishiochiai", "西五軒町": "Nishi-Gokencho",
    "西新宿": "Nishi-Shinjuku", "二十騎町": "Nijikkicho", "西早稲田": "Nishi-Waseda", "払方町": "Harakatamachi",
    "原町": "Haramachi", "馬場下町": "Babashitacho", "東榎町": "Higashi-Enokicho", "東五軒町": "Higashi-Gokencho",
    "百人町": "Hyakunincho", "袋町": "Fukurocho", "舟町": "Funamachi", "弁天町": "Bentencho",
    "本塩町": "Honshiocho", "南町": "Minamicho", "南榎町": "Minami-Enokicho", "南元町": "Minamimotomachi",
    "南山伏町": "Minamiyamabushicho", "山吹町": "Yamabukicho", "矢来町": "Yaraicho", "横寺町": "Yokoderacho",
    "余丁町": "Yochocho", "四谷": "Yotsuya", "四谷坂町": "Yotsuya Sakamachi", "若葉": "Wakaba",
    "若松町": "Wakamatsucho", "若宮町": "Wakamiyacho", "早稲田町": "Wasedamachi", "早稲田鶴巻町": "Waseda Tsurumakicho",
    "早稲田南町": "Waseda Minamicho"
}

DAY_MAP = {
    '月曜日': 'Monday', '火曜日': 'Tuesday', '水曜日': 'Wednesday',
    '木曜日': 'Thursday', '金曜日': 'Friday', '土曜日': 'Saturday', '日曜日': 'Sunday'
}

def parse_days(text):
    return [DAY_MAP.get(p.strip(), p.strip()) for p in text.split('・') if p.strip()]

def parse_metal(text):
    m = re.match(r'([0-9・]+)番目の(.+曜日)', text)
    if m:
        nums = m.group(1).split('・')
        day = DAY_MAP.get(m.group(2).strip(), m.group(2).strip())
        ord_map = {'1': '1st', '2': '2nd', '3': '3rd', '4': '4th', '5': '5th'}
        return [f"{ord_map.get(n, n + 'th')} {day}" for n in nums]
    return [text]

# 1. Deduplicate standard Shinjuku schedules
sched_groups = {}
star_rows = []

for r in shinjuku_raw_rows:
    initial, addr, res, comb, mcg, center, cal = r[0], r[1], r[2], r[3], r[4], r[5], r[6]
    if '*' in res or '*' in comb or '*' in mcg:
        star_rows.append(r)
        continue
    key = (res, comb, mcg)
    if key not in sched_groups:
        sched_groups[key] = []
    sched_groups[key].append(r)

# Sort by frequency descending
sorted_keys = sorted(sched_groups.keys(), key=lambda k: -len(sched_groups[k]))
pattern_id_map = {}
patterns = []

for idx, k in enumerate(sorted_keys, 1):
    pid = f"PATTERN_SHINJUKU_{idx:02d}"
    pattern_id_map[k] = pid
    patterns.append({
        "pattern_id": pid,
        "municipality_id": "tokyo_shinjuku",
        "morning_deadline": "08:00 AM",
        "schedules": {
            "combustible": parse_days(k[1]),
            "resources": parse_days(k[0]),
            "metal_ceramics_glass": parse_metal(k[2])
        }
    })

# Add PATTERN_SHINJUKU_SPECIAL for high-density commercial district
patterns.append({
    "pattern_id": "PATTERN_SHINJUKU_SPECIAL",
    "municipality_id": "tokyo_shinjuku",
    "morning_deadline": "N/A",
    "schedules": {
        "combustible": ["Daily / On-Demand Building Collection"],
        "resources": ["Commercial Route Collection"],
        "metal_ceramics_glass": ["On-Demand Commercial Collection"]
    },
    "notes": "High-density commercial district managed directly via Kabukicho Clean Center / private building collection."
})

# 2. Process all Shinjuku neighborhoods (171 rows)
neighborhoods = []

def make_slug(name):
    # e.g. "市谷加賀町1・2丁目" -> "ichigaya_kagacho_1_2"
    # "荒木町（21から23番地）" -> "araki_21_23"
    name_clean = re.sub(r'[\(\)（）]', ' ', name)
    # romanize known base
    for ja, ro in ROMAJI_MAP.items():
        if ja in name_clean:
            base_slug = ro.lower().replace('-', '_').replace(' ', '_')
            rem = name_clean.replace(ja, '').strip()
            # replace numbers
            rem = rem.replace('丁目', '').replace('番地', '').replace('番', '')
            rem = rem.replace('から', '_to_').replace('・', '_').replace('、', '_')
            rem = rem.replace('上記を除く', 'other').replace('の一部', '_part')
            rem = re.sub(r'[^a-zA-Z0-9_]', '', rem)
            rem = re.sub(r'_+', '_', rem).strip('_')
            return f"shinjuku_{base_slug}" + (f"_{rem}" if rem else "")
    return "shinjuku_" + re.sub(r'[^a-zA-Z0-9_]', '', name_clean).strip('_')

for r in shinjuku_raw_rows:
    raw_addr = r[1]
    res, comb, mcg = r[2], r[3], r[4]
    
    # Check if special star row
    if '*' in res or '*' in comb or '*' in mcg:
        pid = "PATTERN_SHINJUKU_SPECIAL"
    else:
        pid = pattern_id_map[(res, comb, mcg)]
    
    # Extract base town and address range
    m_range = re.search(r'（(.*?)）|\((.*?)\)', raw_addr)
    address_range = None
    base_town = raw_addr
    if m_range:
        address_range = (m_range.group(1) or m_range.group(2)).strip()
        base_town = raw_addr[:m_range.start()].strip()
    
    # Base postal code & romaji
    # Find matching postal code
    matched_postal = "160-0022" # fallback
    matched_en_base = "Shinjuku"
    for k_town, pcode in SHINJUKU_POSTAL_CODES.items():
        if k_town in base_town:
            matched_postal = pcode
            matched_en_base = ROMAJI_MAP.get(k_town, k_town)
            break
            
    # Format English name
    chome_match = re.search(r'([0-9０-９・から]+)丁目', base_town)
    if chome_match:
        chome_str = chome_match.group(1)
        en_name = f"{matched_en_base} {chome_str}-chome"
    else:
        en_name = matched_en_base
        
    if address_range:
        if "上記を除く" in address_range:
            en_name += " (Except designated banchi)"
        else:
            en_name += f" (Banchi: {address_range})"

    nid = make_slug(raw_addr)
    
    neighborhoods.append({
        "neighborhood_id": nid,
        "municipality_id": "tokyo_shinjuku",
        "name_en": en_name,
        "name_ja": raw_addr,
        "postal_code": matched_postal,
        "pattern_id": pid,
        "address_range": address_range
    })

# Deduplicate any identical neighborhood_ids if present
seen_nids = set()
for n in neighborhoods:
    original_nid = n["neighborhood_id"]
    counter = 1
    while n["neighborhood_id"] in seen_nids:
        n["neighborhood_id"] = f"{original_nid}_{counter}"
        counter += 1
    seen_nids.add(n["neighborhood_id"])

# 3. Add Yokohama City (3 Demo Neighborhoods)
yokohama_patterns = [
    {
        "pattern_id": "PATTERN_YOKOHAMA_01",
        "municipality_id": "kanagawa_yokohama",
        "morning_deadline": "08:00 AM",
        "schedules": {
            "combustible": ["Tuesday", "Saturday"],
            "resources": ["Friday"],
            "plastic_packaging": ["Monday"],
            "small_metal_nonburnable": ["Tuesday", "Saturday"]
        }
    },
    {
        "pattern_id": "PATTERN_YOKOHAMA_02",
        "municipality_id": "kanagawa_yokohama",
        "morning_deadline": "08:00 AM",
        "schedules": {
            "combustible": ["Monday", "Friday"],
            "resources": ["Tuesday"],
            "plastic_packaging": ["Thursday"],
            "small_metal_nonburnable": ["Monday", "Friday"]
        }
    },
    {
        "pattern_id": "PATTERN_YOKOHAMA_03",
        "municipality_id": "kanagawa_yokohama",
        "morning_deadline": "08:00 AM",
        "schedules": {
            "combustible": ["Monday", "Friday"],
            "resources": ["Saturday"],
            "plastic_packaging": ["Thursday"],
            "small_metal_nonburnable": ["Monday", "Friday"]
        }
    }
]
patterns.extend(yokohama_patterns)

yokohama_neighborhoods = [
    {
        "neighborhood_id": "yokohama_nishi_minatomirai_2",
        "municipality_id": "kanagawa_yokohama",
        "name_en": "Minato Mirai 2-chome, Nishi Ward",
        "name_ja": "西区みなとみらい2丁目",
        "postal_code": "220-0012",
        "pattern_id": "PATTERN_YOKOHAMA_01",
        "address_range": None
    },
    {
        "neighborhood_id": "yokohama_naka_yamashitacho",
        "municipality_id": "kanagawa_yokohama",
        "name_en": "Yamashitacho, Naka Ward",
        "name_ja": "中区山下町",
        "postal_code": "231-0023",
        "pattern_id": "PATTERN_YOKOHAMA_02",
        "address_range": None
    },
    {
        "neighborhood_id": "yokohama_kohoku_shinyokohama_2",
        "municipality_id": "kanagawa_yokohama",
        "name_en": "Shin-Yokohama 2-chome, Kohoku Ward",
        "name_ja": "港北区新横浜2丁目",
        "postal_code": "222-0033",
        "pattern_id": "PATTERN_YOKOHAMA_03",
        "address_range": None
    }
]
neighborhoods.extend(yokohama_neighborhoods)

# 4. Add Kyoto City (3 Demo Neighborhoods)
kyoto_patterns = [
    {
        "pattern_id": "PATTERN_KYOTO_01",
        "municipality_id": "kyoto_kyoto",
        "morning_deadline": "08:00 AM",
        "schedules": {
            "combustible": ["Tuesday", "Friday"],
            "resources": ["Wednesday"],
            "plastic_packaging": ["Thursday"],
            "small_metal_sprays": ["2nd Wednesday"]
        }
    },
    {
        "pattern_id": "PATTERN_KYOTO_02",
        "municipality_id": "kyoto_kyoto",
        "morning_deadline": "08:00 AM",
        "schedules": {
            "combustible": ["Monday", "Thursday"],
            "resources": ["Thursday"],
            "plastic_packaging": ["Wednesday"],
            "small_metal_sprays": ["3rd Wednesday"]
        }
    },
    {
        "pattern_id": "PATTERN_KYOTO_03",
        "municipality_id": "kyoto_kyoto",
        "morning_deadline": "08:00 AM",
        "schedules": {
            "combustible": ["Monday", "Thursday"],
            "resources": ["Friday"],
            "plastic_packaging": ["Wednesday"],
            "small_metal_sprays": ["2nd Wednesday"]
        }
    }
]
patterns.extend(kyoto_patterns)

kyoto_neighborhoods = [
    {
        "neighborhood_id": "kyoto_higashiyama_gionmachi_minamigawa",
        "municipality_id": "kyoto_kyoto",
        "name_en": "Gionmachi Minamigawa, Higashiyama Ward",
        "name_ja": "東山区祇園町南側",
        "postal_code": "605-0074",
        "pattern_id": "PATTERN_KYOTO_01",
        "address_range": None
    },
    {
        "neighborhood_id": "kyoto_nakagyo_daikokucho",
        "municipality_id": "kyoto_kyoto",
        "name_en": "Daikokucho (Kawaramachi-Sanjo), Nakagyo Ward",
        "name_ja": "中京区大黒町（河原町通三条下る）",
        "postal_code": "604-8031",
        "pattern_id": "PATTERN_KYOTO_02",
        "address_range": None
    },
    {
        "neighborhood_id": "kyoto_shimogyo_shijo_karasuma",
        "municipality_id": "kyoto_kyoto",
        "name_en": "Shijo-Karasuma Area (Naginatabokocho), Shimogyo Ward",
        "name_ja": "下京区烏丸通周辺（四条烏丸・長刀鉾町）",
        "postal_code": "600-8008",
        "pattern_id": "PATTERN_KYOTO_03",
        "address_range": None
    }
]
neighborhoods.extend(kyoto_neighborhoods)

# 5. Add Kamikatsu Town (Zero Curbside Municipality)
kamikatsu_pattern = {
    "pattern_id": "PATTERN_KAMIKATSU_STATION",
    "municipality_id": "tokushima_kamikatsu",
    "morning_deadline": "02:00 PM",
    "schedules": {
        "combustible": [],
        "resources": [],
        "central_station_dropoff": [
            "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
        ]
    },
    "facility": {
        "name": "Kamikatsu Zero Waste Center (Hibigaya Waste Station)",
        "name_ja": "日比ヶ谷ごみステーション",
        "hours": "07:30 AM - 02:00 PM (Year-round drop-off)",
        "sorting_categories": 45
    },
    "notes": "Town-wide zero curbside collection. Residents self-sort waste into 45 separate categories directly at the Zero Waste Center."
}
patterns.append(kamikatsu_pattern)

kamikatsu_neighborhood = {
    "neighborhood_id": "tokushima_kamikatsu_all",
    "municipality_id": "tokushima_kamikatsu",
    "name_en": "Kamikatsu Town (All Districts)",
    "name_ja": "勝浦郡上勝町全域",
    "postal_code": "771-4501",
    "pattern_id": "PATTERN_KAMIKATSU_STATION",
    "address_range": None
}
neighborhoods.append(kamikatsu_neighborhood)

# Save production files to data/
with open('data/patterns.json', 'w', encoding='utf-8') as f:
    json.dump(patterns, f, ensure_ascii=False, indent=2)

with open('data/neighborhoods.json', 'w', encoding='utf-8') as f:
    json.dump(neighborhoods, f, ensure_ascii=False, indent=2)

print(f"SUCCESS!")
print(f"Generated data/patterns.json with {len(patterns)} patterns.")
print(f"Generated data/neighborhoods.json with {len(neighborhoods)} neighborhood records.")
