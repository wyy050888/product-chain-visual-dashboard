from pathlib import Path
root=Path(r'E:\需求合集\产品链目视化看板\原型')
p=root/'src/modules/product-filters/00-categories.js'
s=p.read_text(encoding='utf-8-sig').replace('>产品属性</span>','>筛选产品类型</span>')
s=s.replace("const selected=keys.filter(k=>filters[k]&&filters[k]!=='all').map(k=>labels[k]+':'+(choices[k].find(x=>typeof x==='string'?x===filters[k]:x.value===filters[k])?.label||filters[k]));","const selected=keys.filter(k=>filters[k]&&filters[k]!=='all').map(k=>{const option=choices[k].find(x=>typeof x==='string'?x===filters[k]:x.value===filters[k]);return labels[k]+':'+(typeof option==='string'?option:option?.label||filters[k])});")
p.write_text(s,encoding='utf-8')
for name in ['inventory-detail/01.js','lifecycle-products/01.js','new-product-facts/01.js']:
 p=root/'src/modules'/name
 s=p.read_text(encoding='utf-8-sig').replace("'attribute','isNew','clearance'","'attribute','productType'")
 p.write_text(s,encoding='utf-8')
p=root/'src/modules/risk-presentation/03-filters.js'
s=p.read_text(encoding='utf-8-sig').replace('// 每榜筛选按Tab保存；产品属性拆为季品、新品、清仓三个独立字段。','// 每榜筛选按Tab保存；产品类型包含季品与属性（新品／老品／清仓品），两组组合查询。')
p.write_text(s,encoding='utf-8')
p=root/'README.md'
s=p.read_text(encoding='utf-8-sig')+'\n\n## 全局产品类型筛选（1013）\n\n共用控件统一为“筛选产品类型”，包含两组单选：季品（全部／夏季品／冬季品／四季品）及属性（全部／新品／老品／清仓品），两组按AND组合。移除是否新品、是否清仓品两个是／否筛选，所有产品列表使用同一控件及筛选模型。新品／老品读取明确的主档分组或新品标记，清仓品只读取明确的清仓标记，不生成演示清仓数据；缺失标记仅在全部范围内显示。\n'
p.write_text(s,encoding='utf-8')
