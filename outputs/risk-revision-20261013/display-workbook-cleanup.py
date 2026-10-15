from pathlib import Path
import json,re
root=Path(r'E:\需求合集\产品链目视化看板/.artifact-build-risk-rules')
data=json.loads((root/'revision-data.json').read_text(encoding='utf-8-sig'))
def clean(s):
 return s.replace('≥1万元用万','大于10,000元用w，不超过10,000元用元').replace('保留2位展示','保留1位展示').replace('文档百分比差统一用pp表达','百分比差统一用%符号展示').replace('百分点（pp）','百分点，页面用%符号展示').replace('（pp）','（页面用%符号展示）').replace('pp','%')
for b in data:
 b['rules']=[[clean(x) if isinstance(x,str) else x for x in row] for row in b['rules']]
 for m in b['metrics']:
  m['calc']=clean(m['calc']);m['status']=clean(m['status'])
  if '偏差' in m['name'] or '差额' in m['name']:
   if '（' in m['sample']:m['sample']=re.sub(r'（(\d[\d,.]*%)',r'（+\1',m['sample'])
   elif '%' in m['sample']:m['sample']=re.sub(r'：(\d[\d,.]*%)',r'：+\1',m['sample'])
  if '环比' in m['name']:
   m['sample']=re.sub(r'环比(\d[\d,.]*%)',r'环比+\1',m['sample'])
   if m['name'].endswith('环比'):m['sample']=re.sub(r'：(\d[\d,.]*%)',r'：+\1',m['sample'])
(root/'revision-data.json').write_text(json.dumps(data,ensure_ascii=False,indent=2),encoding='utf-8')

