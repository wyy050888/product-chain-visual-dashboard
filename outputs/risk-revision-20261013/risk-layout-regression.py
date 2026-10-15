from pathlib import Path
r=Path(r'E:\需求合集\产品链目视化看板')
p=r/'outputs/risk-revision-20261013/final-ui-check.cjs'
s=p.read_text(encoding='utf-8-sig')
start=s.index("await p.locator('#close').click();await p.locator('#close').click();")
end=s.index("await p.locator('#riskrail [data-risk=\"0\"]').click();await p.screenshot",start)
s=s[:start]+"await p.locator('#close').click();await p.locator('#close').click();assert.equal(await p.locator('.pf-main-scope').count(),0);\n"+s[end:]
s=s.replace('GLOBAL STOCK FILTER','NO GLOBAL SCOPE')
(r/'outputs/risk-revision-20261013/risk-layout-regression.cjs').write_text(s,encoding='utf-8')

