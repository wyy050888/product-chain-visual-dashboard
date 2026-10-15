from pathlib import Path
root=Path(r'E:\需求合集\产品链目视化看板')
# Reuse the source-only formatter pass, including units with a leading space.
patch=(root/'outputs/risk-revision-20261013/display-precision-patch.py').read_text(encoding='utf-8-sig').split('# Workbook follows')[0]
patch=patch.replace("(['\"])(万元|万|元|%|％)","(['\"])\\s*(万元|万|元|%|％)")
exec(patch)
p=root/'原型/src/modules/inventory-period/01.js'
s=p.read_text(encoding='utf-8-sig').replace("digits=kind==='turn'||kind==='delivery'?2:0","digits=kind==='turn'?2:kind==='delivery'?1:0")
s=s.replace("fmt(r.amountCents/100,2)","pfMoneyYuan(r.amountCents*100)").replace("fmt(r.staleCents/100,2)","pfMoneyYuan(r.staleCents*100)")
s=s.replace('库存总金额（万元）','库存总金额').replace('呆滞库存金额（万元）','呆滞库存金额')
p.write_text(s,encoding='utf-8')

