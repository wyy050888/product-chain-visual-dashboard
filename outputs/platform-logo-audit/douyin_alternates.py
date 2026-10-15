from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
import urllib.request,re
urls={'douyin-download':'https://m.douyin.com/app_download','douyin-favicon':'https://www.douyin.com/favicon.ico','douyin-rooticon':'https://douyin.com/favicon.ico'}
def read(item):
 name,url=item
 try:
  r=urllib.request.urlopen(url,timeout=18);data=r.read();print(name,len(data),r.headers.get('Content-Type'),flush=True)
  Path('outputs/platform-logo-audit/'+name+('.html' if 'html' in r.headers.get('Content-Type','') else '.ico')).write_bytes(data)
  if 'html' in r.headers.get('Content-Type',''):
   s=data.decode('utf-8',errors='replace');print('\n'.join(re.findall(r'.{0,60}(?:logo|\.png|favicon).{0,180}',s)[:20]),flush=True)
 except Exception as e:print(name,str(e),flush=True)
list(ThreadPoolExecutor(max_workers=3).map(read,urls.items()))
