from pathlib import Path
root=Path(r'E:\需求合集\产品链目视化看板\原型')
p=root/'src/modules/product-filters/02-scopes.js'
s=p.read_text(encoding='utf-8-sig')
start=s.index("document.addEventListener('change'")
p.write_text('// 品质分类只作用于当前榜单；不设置跨模块公共产品筛选。\n'+s[start:],encoding='utf-8')
for name in ['risk-presentation/03-filters.js','risk-presentation/04-lists.js']:
 p=root/'src/modules'/name
 s=p.read_text(encoding='utf-8-sig').replace('...rpDefaultFilters(),...pfMainState','...rpDefaultFilters()')
 p.write_text(s,encoding='utf-8')
p=root/'src/modules/risk-presentation/02-platforms.js'
s=p.read_text(encoding='utf-8-sig')
s=s.replace(".filter(r=>k===1||pfMatches(r,pfMainState))","")
p.write_text(s,encoding='utf-8')
p=root/'styles/35-risk-reading.css'
s=p.read_text(encoding='utf-8-sig')
s=s.replace('.page>#risk {padding:0;border:0;background:transparent;box-shadow:none}', '.page>#risk {padding:18px;border:1px solid #e0e7f0;border-radius:9px;background:#fff;box-shadow:0 2px 6px #25446304}')
s=s.replace('#risk>.sectionhead {margin:0 0 16px;padding:12px 18px;min-height:54px;background:var(--module-header-background);border:1px solid #e0e7f0;border-bottom-color:#e7edf4;border-radius:9px;gap:12px 18px}', '#risk>.sectionhead {margin:-18px -18px 16px;padding:12px 18px;min-height:54px;background:var(--module-header-background);border:0;border-bottom:1px solid #e7edf4;border-radius:9px 9px 0 0;gap:12px 18px}')
s=s.replace('grid-auto-rows:minmax(140px,auto)', 'grid-auto-rows:minmax(118px,auto)')
s=s.replace('padding:6px 0;min-height:140px', 'padding:9px 0;min-height:118px')
s=s.replace('background:#f6f9fd}', 'background:#f8faff}')
s=s.replace('min-height:34px;margin-bottom:4px', 'min-height:34px;margin-bottom:6px')
s=s.replace('gap:6px 10px;padding:4px 8px;margin:0;min-height:0;border:0;border-radius:5px;background:#f7f9fc', 'gap:6px 12px;padding:0 8px;margin:0;min-height:0;border:0;border-radius:0;background:transparent')
s=s.replace('#riskrail .rp-entry-bottom {display:block;margin-top:3px}', '#riskrail .rp-entry-bottom {display:block;margin-top:6px}')
s=s.replace('#riskrail .rp-key-metrics .rp-item,#riskrail .rp-support-metrics .rp-item {flex-direction:column;gap:0;align-items:flex-start}', '#riskrail .rp-key-metrics .rp-item {flex-direction:column;gap:0;align-items:flex-start}\\n#riskrail .rp-support-metrics .rp-item {flex-direction:row;gap:5px;align-items:baseline}')
s=s.replace('#riskrail .rp-key-metrics .rp-item small,#riskrail .rp-support-metrics .rp-item small {line-height:16px}', '#riskrail .rp-key-metrics .rp-item small {line-height:16px}\\n#riskrail .rp-support-metrics .rp-item small {line-height:20px}')
s=s.replace(' .page>#risk {padding:0}', ' .page>#risk {padding:14px}')
s=s.replace(' #risk>.sectionhead {margin:0 0 12px;padding:10px 14px;align-items:flex-start;flex-wrap:wrap}', ' #risk>.sectionhead {margin:-14px -14px 12px;padding:10px 14px;align-items:flex-start;flex-wrap:wrap}')
s=s.replace('\\n','\n')
s += '\n/* 辅助指标只保留一行名称和值，窄卡片才换行，指标顺序和内容不变。 */\n#riskrail .rp-support-metrics .rp-item small{white-space:nowrap;color:#7e8da2}\n#riskrail .rp-support-metrics .rp-item-value{flex:none}\n#riskrail .rp-entry-main .rp-identity b{font-weight:600}\n#riskrail .rp-key-metrics .rp-item + .rp-item{border-left:1px solid #edf1f6;padding-left:10px}\n@media(max-width:1499px){#riskrail .rp-support-metrics .rp-item{flex-wrap:wrap;gap:0 5px}}\n@media(max-width:600px){#riskrail .rp-support-metrics .rp-item{flex-direction:column;align-items:flex-start}#riskrail .rp-key-metrics .rp-item + .rp-item{padding-left:0;border:0}}\n'
p.write_text(s,encoding='utf-8')

