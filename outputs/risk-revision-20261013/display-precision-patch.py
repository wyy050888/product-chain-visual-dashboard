from pathlib import Path
import re,json
from decimal import Decimal, ROUND_HALF_UP
root=Path(r'E:\需求合集\产品链目视化看板')
base=root/'原型/src/modules'
changed=[]
# Only format calls followed by an explicit monetary/percent unit are display calls.
# Score, quantity and source formulas keep their existing precision.
def close_call(s,pos):
 depth=1;quote=None;escape=False;commas=[];i=pos
 while i<len(s):
  c=s[i]
  if quote:
   if escape:escape=False
   elif c=='\\':escape=True
   elif c==quote:quote=None
  elif c in "'\"\x60":quote=c
  elif c in '([{':depth+=1
  elif c in ')]}':
   depth-=1
   if depth==0:return i,commas
  elif c==',' and depth==1:commas.append(i)
  i+=1
 return None,[]
def display_source(s):
 edits=[]
 for match in re.finditer(r'\bfmt\(',s):
  start=match.start();end,commas=close_call(s,match.end())
  if end is None:continue
  split=commas[0] if commas else end;value=s[match.end():split]
  after=s[end+1:];unit=re.match(r"\s*\+\s*(['\"])(万元|万|元|%|％)([^'\"]*)\1",after)
  template=re.match(r'\}(\s*)(万元|万|元|%|％)',after)
  if not unit and not template:continue
  symbol=unit.group(2) if unit else template.group(2)
  if symbol in ['%','％']:
   edits.append((start,end+1,'fmt('+value+',1)'))
  else:
   expr='pfMoneyYuan('+('('+value+')*10000' if symbol in ['万元','万'] else value)+')'
   if unit:
    rest=unit.group(3);expr+=("+"+unit.group(1)+rest+unit.group(1)) if rest else ''
    edits.append((start,end+1+unit.end(),expr))
   else:edits.append((start,end+1+template.end(),expr+'}'))
 for start,end,value in reversed(edits):s=s[:start]+value+s[end:]
 # Signed percent helpers have an explicit unit argument.
 s=re.sub(r"\brrSigned\(([^;\n]*?),\s*2\s*,\s*(['\"])%\2\)",r"rrSigned(\1,1,'%')",s)
 return s
for p in base.rglob('*.js'):
 if p.name.endswith('04-display.js') and p.parent.name=='product-filters':continue
 s=p.read_text(encoding='utf-8-sig');new=display_source(s)
 if new!=s:p.write_text(new,encoding='utf-8');changed.append(str(p.relative_to(base)))
p=base/'product-filters/04-display.js'
s=p.read_text(encoding='utf-8-sig').replace('Math.abs(value)>=10000','Math.abs(value)>10000').replace('fmt(value/10000,2)','fmt(value/10000,1)').replace('fmt(value,2)','fmt(value,1)')
p.write_text(s,encoding='utf-8');changed.append(str(p.relative_to(base)))
# Workbook follows the existing builder and original single-sheet structure.
folder=root/'.artifact-build-risk-rules'
boards=json.loads((folder/'revision-data.json').read_text(encoding='utf-8-sig'))
def rounded(v):return format(Decimal(v.replace(',','')).quantize(Decimal('0.1'),rounding=ROUND_HALF_UP),',.1f')
def sample(s):
 def money(m):
  val=Decimal(m.group(1).replace(',',''));unit=m.group(2);yuan=val*10000 if unit in ['w','万元'] else val
  return rounded(str(yuan/10000))+'w' if abs(yuan)>10000 else rounded(str(yuan))+'元'
 s=re.sub(r'([+-]?\d[\d,]*(?:\.\d+)?)(w|万元|元)',money,s)
 s=re.sub(r'([+-]?\d[\d,]*(?:\.\d+)?)(%|pp)',lambda m:rounded(m.group(1))+'%',s)
 return s.replace('10pp','10%')
for b in boards:
 for m in b['metrics']:
  old=m['name'];new=old.replace('10pp','10%')
  m['name']=new;b['card']=[new if n==old else n for n in b['card']]
  m['sample']=sample(m['sample'])
  keep_precision=any(x in old for x in ['评分','考核','库存周转率'])
  if not keep_precision:
   if isinstance(m['dp'],int) and m['dp']==2:m['dp']=1
   elif isinstance(m['dp'],str):m['dp']=m['dp'].replace('2位','1位')
  m['calc']=m['calc'].replace('单位pp','展示%符号，数值为两项百分比之差').replace('偏差用pp','偏差用%符号').replace('10pp','10%')
 # Business threshold formulas remain unrounded.
(folder/'revision-data.json').write_text(json.dumps(boards,ensure_ascii=False,indent=2),encoding='utf-8')
globals=json.loads((folder/'global-review.json').read_text(encoding='utf-8-sig'))
for row in globals:
 if row[0]=='金额与比率':
  row[1]='金额绝对值大于10,000元显示w，不超过10,000元显示元；金额、百分比及偏差保留1位小数，件数／次数0位。例平台罚款：4,000.0元/2次；资金冻结：4.2w/3次；边界：10,000.0元。先按原值选单位再四舍五入；计算、排序和风险判定使用原始精度。偏差用%符号，数值按实际率减目标率。'
  row[2]='本次显示规则确认；w代表万元'
(folder/'global-review.json').write_text(json.dumps(globals,ensure_ascii=False,indent=2),encoding='utf-8')
p=folder/'build.mjs';s=p.read_text(encoding='utf-8-sig')
s=s.replace('退货率显示实际＋目标偏差pp','退货率显示实际＋目标偏差%')
s=s.replace('金额绝对值≥10,000元用w，否则元，金额与比率2位','金额绝对值＞10,000元用w，否则元，金额与百分比1位')
s=s.replace('差额用pp','差额用%符号')
s=s.replace('看板规则与指标展示规划_1013文档修订.xlsx','看板规则与指标展示规划_1013显示规则更新.xlsx')
s=s.replace('2026-10-13 文档修订','2026-10-13 显示规则更新')
p.write_text(s,encoding='utf-8')
print(json.dumps({'display_sources_updated':changed},ensure_ascii=False))

