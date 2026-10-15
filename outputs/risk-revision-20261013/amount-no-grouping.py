from pathlib import Path
import re,json
root=Path(r'E:\需求合集\产品链目视化看板')
p=root/'原型/src/modules/product-filters/04-display.js'
s=p.read_text(encoding='utf-8-sig')
old="return Math.abs(value)>10000?fmt(value/10000,1)+'w':fmt(value,1)+'元';"
new="return fmt(Math.abs(value)>10000?value/10000:value,1).replaceAll(',','')+(Math.abs(value)>10000?'w':'元');"
assert old in s
p.write_text(s.replace(old,new),encoding='utf-8')
def strip(s):
 return re.sub(r'(?<=\d),(?=\d{3}(?:\D|$))','',s)
folder=root/'.artifact-build-risk-rules'
p=folder/'revision-data.json'
boards=json.loads(p.read_text(encoding='utf-8-sig'))
for board in boards:
 for m in board['metrics']:
  if '元' in m['sample'] or 'w' in m['sample']:m['sample']=strip(m['sample'])
p.write_text(json.dumps(boards,ensure_ascii=False,indent=2),encoding='utf-8')
p=folder/'global-review.json'
data=json.loads(p.read_text(encoding='utf-8-sig'))
for row in data:
 if row[0]=='金额与比率':row[1]=strip(row[1]).replace('金额、百分比及偏差保留1位小数','金额不使用千位逗号；金额、百分比及偏差保留1位小数')
p.write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')
p=folder/'build.mjs'
s=p.read_text(encoding='utf-8-sig').replace('＞10,000元','＞10000元').replace('否则元，金额与百分比1位','否则元；金额不使用千位逗号，金额与百分比1位')
p.write_text(s,encoding='utf-8')
p=root/'原型/README.md'
s=p.read_text(encoding='utf-8-sig')
s=s.replace('金额绝对值大于10,000元显示w，不超过10,000元显示元','金额绝对值大于10000元显示w，不超过10000元显示元；金额不使用千位逗号').replace('13,000元→1.3w、4,000元→4,000.0元、10,000元→10,000.0元','13000元→1.3w、4000元→4000.0元、10000元→10000.0元')
p.write_text(s,encoding='utf-8')
for name in ['display-workbook-check.py','display-precision-check.cjs']:
 p=root/'outputs/risk-revision-20261013'/name
 s=p.read_text(encoding='utf-8-sig').replace('4,000.0元','4000.0元').replace('10,000.0元','10000.0元').replace('7,000.0元','7000.0元')
 if name.endswith('.cjs'):
  s=s.replace("assert.ok(!/\\d+\\.\\d{2}(?:w|元)/.test(content));","assert.ok(!/\\d+\\.\\d{2}(?:w|元)/.test(content));assert.ok(!/\\d,\\d{3}\\.\\d(?:w|元)/.test(content));")
 p.write_text(s,encoding='utf-8')
