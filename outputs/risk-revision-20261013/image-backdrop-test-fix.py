from pathlib import Path
p=Path(r'E:\需求合集\产品链目视化看板\outputs\risk-revision-20261013\image-backdrop-check.cjs')
s=p.read_text(encoding='utf-8-sig')
s=s.replace("await p.locator('#riskrail .riskcard').first().locator('[data-qr-detail]').first().click();","await thumb.locator('xpath=ancestor::article').locator('[data-qr-detail]').click();")
p.write_text(s,encoding='utf-8')
