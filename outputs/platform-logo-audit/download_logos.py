from pathlib import Path
from concurrent.futures import ThreadPoolExecutor
from PIL import Image,ImageDraw
from io import BytesIO
import urllib.request,json,hashlib
root=Path('原型/assets/platform-logos');root.mkdir(parents=True,exist_ok=True)
audit=Path('outputs/platform-logo-audit')
items=[('douyin','抖音','https://www.douyin.com/','https://www.douyin.com/favicon.ico'),('kuaishou','快手','https://www.kuaishou.com/about/','https://s2-11673.kwimgs.com/udata/pkg/fe/favicon.70ff1fcc.ico'),('channels','视频号','https://channels.weixin.qq.com/','https://res.wx.qq.com/t/wx_fed/finder/helper/finder-helper-web/res/favicon-v2.ico'),('tmall','天猫','https://www.tmall.com/','https://img.alicdn.com/tfs/TB1XlF3RpXXXXc6XXXXXXXXXXXX-16-16.png'),('jd','京东','https://www.jd.com/','https://storage.360buyimg.com/retail-mall/mall-common-component/favicon.ico'),('pinduoduo','拼多多','https://www.pinduoduo.com/','https://www.pinduoduo.com/favicon.png')]
def fetch(item):
 key,name,page,url=item
 rawpath=audit/(key+('.ico' if url.endswith('.ico') else '-source.png'))
 if rawpath.exists():raw=rawpath.read_bytes()
 else:
  print('Downloading '+key,flush=True)
  raw=urllib.request.urlopen(urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0','Referer':page}),timeout=25).read()
 (audit/(key+('.ico' if url.endswith('.ico') else '-source.png'))).write_bytes(raw)
 img=Image.open(BytesIO(raw))
 if img.format=='ICO':img=img.ico.getimage(max(img.ico.sizes(),key=lambda x:x[0]*x[1]))
 img=img.convert('RGBA');img.save(root/(key+'.png'))
 return {'key':key,'name':name,'page':page,'asset':url,'file':'assets/platform-logos/'+key+'.png','size':img.size,'sha256':hashlib.sha256(raw).hexdigest(),'note':'Official asset pixels preserved; ICO largest image converted to PNG without redrawing.'}
rows=list(ThreadPoolExecutor(max_workers=6).map(fetch,items))
(root/'sources.json').write_text(json.dumps({'verified':'2026-10-13','logos':rows},ensure_ascii=False,indent=2),encoding='utf-8')
canvas=Image.new('RGB',(720,180),'#edf1f7');d=ImageDraw.Draw(canvas)
for i,r in enumerate(rows):
 img=Image.open(root/(r['key']+'.png'));img.thumbnail((72,72),Image.Resampling.LANCZOS);canvas.paste(img,(i*120+(120-img.width)//2,24),img)
 d.text((i*120+10,118),r['key'],fill='#333333');d.text((i*120+10,140),str(r['size']),fill='#666666')
canvas.save(audit/'official-logos.png');print(json.dumps(rows,ensure_ascii=False,indent=2))
