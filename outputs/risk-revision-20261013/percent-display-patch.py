from pathlib import Path
root=Path(r'E:\需求合集\产品链目视化看板\原型')
for file in ['sales-review/01-model.js','risk-presentation/01-fields.js','unified-product/05-operating-view.js']:
 p=root/'src/modules'/file
 s=p.read_text(encoding='utf-8-sig')
 s=s.replace("'pp'","'%'").replace('10pp','10%').replace('−10pp','−10%').replace('0pp','0%')
 if file=='sales-review/01-model.js':
  s=s.replace('百分比差以百分点显示','偏差按百分点差计算，页面统一使用%符号')
  s=s.replace('偏差/差额＜', '偏差/差额按百分比直接相减，不计算相对增长率；＜')
 if file=='risk-presentation/01-fields.js':
  s=s.replace(",2,'个百分点')",",2,'%')")
 p.write_text(s,encoding='utf-8')

