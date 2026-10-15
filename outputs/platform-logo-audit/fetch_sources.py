from concurrent.futures import ThreadPoolExecutor
from pathlib import Path
import re, urllib.request
ROOT = Path(__file__).parent
PAGES = {'douyin':'https://www.douyin.com/','kuaishou':'https://www2.kuaishou.com/','channels':'https://channels.weixin.qq.com/','tmall':'https://www.tmall.com/','jd':'https://www.jd.com/','pinduoduo':'https://www.pinduoduo.com/'}
def read(item):
 name,url=item
 try:
  req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0'})
  with urllib.request.urlopen(req,timeout=25) as response: html=response.read().decode('utf-8',errors='replace')
  (ROOT/(name+'.html')).write_text(html,encoding='utf-8')
  links=re.findall(r'<(?:link|img|script)\b[^>]*(?:src|href)=["\'][^"\']+["\'][^>]*>',html)
  return name+'\n'+'\n'.join([s for s in links if re.search(r'logo|icon|\.css|\.js',s,re.I)][:35])
 except Exception as exc: return name+': '+str(exc)
print('\n\n'.join(ThreadPoolExecutor(max_workers=6).map(read,PAGES.items())))
