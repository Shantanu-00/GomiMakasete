import subprocess

images = {
    'higashi_burn': 'https://www.city.kyoto.lg.jp/kankyo/cmsfiles/contents/0000020/20589/higashi01.JPG',
    'higashi_can': 'https://www.city.kyoto.lg.jp/kankyo/cmsfiles/contents/0000020/20602/higashi02.JPG',
    'higashi_pla': 'https://www.city.kyoto.lg.jp/kankyo/cmsfiles/contents/0000311/311025/higasiyamaku.png',
    'higashi_metal': 'https://www.city.kyoto.lg.jp/kankyo/cmsfiles/contents/0000020/20617/higashi03.JPG',
    'nakagyo_burn': 'https://www.city.kyoto.lg.jp/kankyo/cmsfiles/contents/0000020/20588/nakagyo01.JPG',
    'nakagyo_can': 'https://www.city.kyoto.lg.jp/kankyo/cmsfiles/contents/0000020/20601/nakagyo02.JPG',
    'nakagyo_pla': 'https://www.city.kyoto.lg.jp/kankyo/cmsfiles/contents/0000311/311024/nakagyouku.png',
    'nakagyo_metal': 'https://www.city.kyoto.lg.jp/kankyo/cmsfiles/contents/0000020/20616/nakagyo03.JPG',
    'shimogyo_burn': 'https://www.city.kyoto.lg.jp/kankyo/cmsfiles/contents/0000020/20591/shimogyo01.JPG',
    'shimogyo_can': 'https://www.city.kyoto.lg.jp/kankyo/cmsfiles/contents/0000020/20605/shimogyo02.JPG',
    'shimogyo_pla': 'https://www.city.kyoto.lg.jp/kankyo/cmsfiles/contents/0000311/311027/simogyouku.png',
    'shimogyo_metal': 'https://www.city.kyoto.lg.jp/kankyo/cmsfiles/contents/0000020/20619/shimogyo03.JPG',
}

for name, url in images.items():
    ext = url.split('.')[-1]
    out_file = f'kyoto_maps/{name}.{ext}'
    cmd = ['curl.exe', '-s', '-k', '-A', 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', url, '-o', out_file]
    res = subprocess.run(cmd)
    print(f'{name}: returncode {res.returncode}')
