from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request,re
root=Path('outputs/platform-logo-audit')
urls={'douyin-open':'https://open.douyin.com/','kuaishou-about':'https://www.kuaishou.com/about/','kuaishou-media':'https://www.kuaishou.com/media/'}
def read(item):
 name,url=item
 try:
  data=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'}),timeout=25).read().decode('utf-8',errors='replace')
  (root/(name+'.html')).write_text(data,encoding='utf-8')
  tags=re.findall(r'<(?:link|img)\b[^>]*>',data)
  return name+'\n'+'\n'.join(tags[:25])
 except Exception as e:return str(e)
print('\n\n'.join(ThreadPoolExecutor(max_workers=3).map(read,urls.items())))
