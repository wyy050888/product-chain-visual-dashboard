from pathlib import Path
import json,re
p=Path('原型/src/modules/sales-review/02-view.js');s=p.read_text(encoding='utf-8-sig')
start=s.index(' return \'<div class="ms-mini-metrics">')
end=s.index('\n}',start)
new=" return '<div class=\"ms-mini-metrics\">'+[msMoney(r.sale),msPercent(r.actualMargin),msPercent(r.scaleRate)].map((v,i)=>'<strong class=\"'+(i===2?msTone(r.scaleDeviation):'')+'\">'+esc(v)+'</strong>').join('')+'</div><div class=\"ms-mini-deltas\"><span class=\"'+msTone(r.gsvDeviation)+'\" title=\"GSV达成减时间进度\">偏差 '+msDeviation(r.gsvDeviation)+'</span><span class=\"'+msTone(r.marginGap)+'\">差额 '+msDeviation(r.marginGap)+'</span><span class=\"'+msTone(r.scaleDeviation)+'\">偏差 '+msDeviation(r.scaleDeviation)+'</span></div>';"
s=s[:start]+new+s[end:]
s=s.replace("view+'\">'+visible.map", "view+'\"><div class=\"ms-breakdown-head\"><span>'+msPeriodText()+'GSV</span><span>利润率</span><span>规模达成</span></div>'+visible.map")
p.write_text(s,encoding='utf-8')
p=Path('.artifact-build-risk-rules/build.mjs');s=p.read_text(encoding='utf-8-sig')
s=s.replace("band('卡片已选指标的计算口径", "band(b.sales?'抽屉字段随月／季／年变更周期名称，分品牌／分渠道共用计算口径；品牌搜索前置。卡片指标口径见本模块第6部分。':'卡片已选指标的计算口径")
p.write_text(s,encoding='utf-8')
p=Path('.artifact-build-risk-rules/revision-data.json');d=json.loads(p.read_text(encoding='utf-8-sig'))
for b in d:
 for x in b['metrics']:
  x['sample']=re.sub(r'([\d,]+)(?![\d.])元',lambda m:format(float(m.group(1).replace(',','')),',.2f')+'元',x['sample'])
p.write_text(json.dumps(d,ensure_ascii=False,indent=2),encoding='utf-8')
p=Path('outputs/risk-revision-20261013/workbook-check.py');s=p.read_text(encoding='utf-8-sig').replace('六大榜单规则与指标展示规划_1013更新.xlsx','看板规则与指标展示规划_1013文档修订.xlsx').replace("'退货恶化榜']","'退货恶化榜','销售达成管控','全局展示与交互规范']").replace("'six_boards':True","'six_boards_and_sales':True");p.write_text(s,encoding='utf-8')
p=Path('outputs/risk-revision-20261013/revision-check.cjs');s=p.read_text(encoding='utf-8-sig')
s=s.replace("await p.locator('.pf-main-scope [data-pf-filter=\"clearance\"]').selectOption('yes')", "await p.locator('.pf-main-scope .pf-attribute summary').click();await p.locator('.pf-main-scope [data-pf-attribute-key=\"clearance\"][data-pf-attribute-choice=\"yes\"]').click()")
s=s.replace("await p.locator('[data-rp-filter=\"clearance\"]').selectOption('yes')", "await p.locator('#dialogbody .pf-attribute summary').click();await p.locator('#dialogbody [data-pf-attribute-key=\"clearance\"][data-pf-attribute-choice=\"yes\"]').click()")
s=s.replace("await p.locator('.new-all-filters [data-pf-filter=\"clearance\"]').selectOption('yes')", "await p.locator('.new-all-filters .pf-attribute summary').click();await p.locator('.new-all-filters [data-pf-attribute-key=\"clearance\"][data-pf-attribute-choice=\"yes\"]').click()")
p.write_text(s,encoding='utf-8')
p=Path('outputs/risk-revision-20261013/final-ui-check.cjs');s=p.read_text(encoding='utf-8-sig').replace("await p.locator('.pf-main-scope [data-pf-filter=\"clearance\"]').selectOption('yes')", "await p.locator('.pf-main-scope .pf-attribute summary').click();await p.locator('.pf-main-scope [data-pf-attribute-key=\"clearance\"][data-pf-attribute-choice=\"yes\"]').click()");p.write_text(s,encoding='utf-8')
