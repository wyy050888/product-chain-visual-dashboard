from pathlib import Path
import json,re
p=Path('.artifact-build-risk-rules/revision-data.json');d=json.loads(p.read_text(encoding='utf-8-sig'))
for b in d:
 for x in b['metrics']:
  def money(m):
   parts=m.group(0)[:-1].split('.')
   original='.'.join(parts[:2])
   return format(float(original.replace(',','')),',.2f')+'元'
  x['sample']=re.sub(r'\d[\d,]*(?:\.\d+)*元',money,x['sample'])
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
p=Path('原型/src/modules/risk-presentation/02-cards.js');s=p.read_text(encoding='utf-8-sig')
s=s.replace("`型号 ${model}${k===0||k===6?' · '+(r.platform||r.channel):''}`", "`${k===0||k===6?(r.platform||r.channel)+' · ':''}SPU ${p?.spuCode||'--'}`")
s=s.replace('${esc(r.name)}${k===1&&drawerPlatformLogos[r.channel]?', '${k===1?\'<span>\'+esc(r.name)+\'</span>\':esc(r.name)}${k===1&&drawerPlatformLogos[r.channel]?')
s=s.replace('<b title="${esc(r.name)}">','<b class="${k===1?\'rp-shop-name\':\'\'}" title="${esc(r.name)}">')
p.write_text(s,encoding='utf-8')
