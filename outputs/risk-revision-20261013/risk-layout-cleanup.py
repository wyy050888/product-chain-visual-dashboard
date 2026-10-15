from pathlib import Path
r=Path(r'E:\需求合集\产品链目视化看板\原型')
for name in ['inventory-period/01.js','inventory-detail/01.js','director-quadrants/03.js']:
 p=r/'src/modules'/name
 s=p.read_text(encoding='utf-8-sig').replace('.filter(r=>pfMatches(r,pfMainState))','')
 p.write_text(s,encoding='utf-8')
p=r/'styles/35-risk-reading.css'
s=p.read_text(encoding='utf-8-sig').replace('padding:9px 0;min-height:118px','padding:6px 0;min-height:118px').replace('min-height:34px;margin-bottom:6px','min-height:34px;margin-bottom:4px').replace('#riskrail .rp-entry-bottom {display:block;margin-top:6px}','#riskrail .rp-entry-bottom {display:block;margin-top:4px}')
s += '\n#riskrail .rp-key-metrics em{line-height:15px}\n'
p.write_text(s,encoding='utf-8')
p=Path(r'E:\需求合集\产品链目视化看板\outputs\risk-revision-20261013\risk-layout-check.cjs')
s=p.read_text(encoding='utf-8-sig').replace('console.log(JSON.stringify(box));','assert.ok(box.entry<140);')
p.write_text(s,encoding='utf-8')

