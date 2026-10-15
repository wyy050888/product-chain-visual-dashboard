from pathlib import Path
root=Path(r'E:\需求合集\产品链目视化看板')
p=root/'原型/src/modules/cost-import/01.js'
s=p.read_text(encoding='utf-8-sig')
old="const cwNumber=(v,suffix='')=>v===null||v===undefined?'—':fmt(v,2)+suffix;"
new="const cwNumber=(v,suffix='')=>!Number.isFinite(v)?'—':suffix.trim()==='元'?pfMoneyYuan(v):fmt(v,suffix==='%'?1:2)+suffix;"
assert old in s
p.write_text(s.replace(old,new),encoding='utf-8')
p=root/'原型/README.md'
s=p.read_text(encoding='utf-8-sig')
s+='\n\n## 1013 金额和百分比显示规则更新\n\n本节替代上文两位小数金额和比率展示规范。金额绝对值大于10,000元显示w，不超过10,000元显示元；金额、百分比及偏差统一保留一位小数。例：13,000元→1.3w、4,000元→4,000.0元、10,000元→10,000.0元、18.37%→18.4%。先按原值选择单位，再四舍五入；计算、排序、风险判定及目标录入保留原始精度，件数和次数仍为整数，平台评分仍按业务精度。共用格式化位于product-filters/04-display.js。最新规则Excel：outputs/risk-revision-20261013/看板规则与指标展示规划_1013显示规则更新.xlsx。\n'
p.write_text(s,encoding='utf-8')
p=root/'outputs/risk-revision-20261013/sales-rules-check.cjs'
s=p.read_text(encoding='utf-8-sig').replace("context.msPercent(0),'0.00%'","context.msPercent(0),'0.0%'")
p.write_text(s,encoding='utf-8')
p=root/'outputs/risk-revision-20261013/workbook-check.py'
s=p.read_text(encoding='utf-8-sig').replace('1013文档修订.xlsx','1013显示规则更新.xlsx')
s=s.replace("print(json.dumps(","for sample in ['4,000.0元/2次','4.2w/3次','10,000.0元']:assert sample in text,sample\n print(json.dumps(")
p=root/'outputs/risk-revision-20261013/display-workbook-check.py'
p.write_text(s,encoding='utf-8')

