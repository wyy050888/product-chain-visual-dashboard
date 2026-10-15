from pathlib import Path
import re,urllib.request
html=Path('outputs/platform-logo-audit/douyin-open.html').read_text(encoding='utf-8')
print('\n'.join(re.findall(r'.{0,80}(?:logo|favicon).{0,140}',html)))
urls=['https://s3a.bytecdn.cn/aweme/resource/web/static/image/logo/favicon_v2_7145ff0.ico','https://lf-developer-cdn.open-douyin.com/obj/open-platform-scm/ies/tiktok_open_pc/common/base.c84dde96.css']
for i,u in enumerate(urls):
 try:
  data=urllib.request.urlopen(u,timeout=15).read()
  if i==0:Path('outputs/platform-logo-audit/douyin.ico').write_bytes(data);print('alternate CDN ico',len(data))
  else:
   text=data.decode();Path('outputs/platform-logo-audit/douyin-base.css').write_text(text,encoding='utf-8');print('\n'.join(re.findall(r'.{0,40}logo.{0,400}',text)[:12]))
 except Exception as e:print(u,str(e))
