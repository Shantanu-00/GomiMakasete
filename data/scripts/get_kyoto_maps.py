import urllib.request
import re
import os

urls = {
    'higashi_can': 'https://www.city.kyoto.lg.jp/kankyo/page/0000020602.html',
    'higashi_pla': 'https://www.city.kyoto.lg.jp/kankyo/page/0000311025.html',
    'higashi_metal': 'https://www.city.kyoto.lg.jp/kankyo/page/0000020617.html',
    'nakagyo_burn': 'https://www.city.kyoto.lg.jp/kankyo/page/0000020588.html',
    'nakagyo_can': 'https://www.city.kyoto.lg.jp/kankyo/page/0000020601.html',
    'nakagyo_pla': 'https://www.city.kyoto.lg.jp/kankyo/page/0000311024.html',
    'nakagyo_metal': 'https://www.city.kyoto.lg.jp/kankyo/page/0000020616.html',
    'shimogyo_burn': 'https://www.city.kyoto.lg.jp/kankyo/page/0000020591.html',
    'shimogyo_can': 'https://www.city.kyoto.lg.jp/kankyo/page/0000020605.html',
    'shimogyo_pla': 'https://www.city.kyoto.lg.jp/kankyo/page/0000311027.html',
    'shimogyo_metal': 'https://www.city.kyoto.lg.jp/kankyo/page/0000020619.html',
}

headers = {'User-Agent': 'Mozilla/5.0'}
base_url = 'https://www.city.kyoto.lg.jp/kankyo/'

os.makedirs('kyoto_maps', exist_ok=True)

for k, u in urls.items():
    try:
        req = urllib.request.Request(u, headers=headers)
        with urllib.request.urlopen(req) as resp:
            html = resp.read().decode('utf-8', errors='ignore')
            # find cmsfiles
            matches = re.findall(r'(\./cmsfiles/contents/[^\"\'>\s]+)', html)
            print(f'{k}: {matches}')
            if matches:
                img_rel = matches[0].replace('./', '')
                img_url = base_url + img_rel
                img_ext = os.path.splitext(img_rel)[1]
                dest_path = f'kyoto_maps/{k}{img_ext}'
                urllib.request.urlretrieve(img_url, dest_path)
                print(f'Downloaded {dest_path}')
    except Exception as e:
        print(f'{k} error: {e}')
