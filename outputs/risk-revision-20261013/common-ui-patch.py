from pathlib import Path
import re
root=Path(r'E:\需求合集\产品链目视化看板\原型')
p=root/'src/modules/risk-presentation/02-cards.js'
s=p.read_text(encoding='utf-8-sig')
s=s.replace('function rpIdentityMarkup(k,r,list=false){','function rpIdentityMarkup(k,r,list=false,detail=false){')
s=s.replace("`${k===0||k===6?(r.platform||r.channel)+' · ':''}SPU ${p?.spuCode||'--'}`","`型号 ${model}${k===0||k===6?' · '+(r.platform||r.channel):''}`")
start=s.index(' return `<div class="rp-identity">')
end=s.index('\n}',start)
s=s[:start]+''' const name=`<b class="${k===1?'rp-shop-name':''}" title="${esc(r.name)}">${k===1?'<span>'+esc(r.name)+'</span>':esc(r.name)}${k===1&&drawerPlatformLogos[r.channel]?'<img class="rp-shop-platform-mark" src="assets/platform-logos/'+drawerPlatformLogos[r.channel]+'.png" alt="'+esc(r.channel)+'" title="'+esc(r.channel)+'">':''}</b>`;
 const title=detail?`<div class="rp-identity-title">${name}<button type="button" class="link rp-detail-link" ${rpDetailAttr(k,r)} aria-label="查看${esc(r.name)}详情">详情 ›</button></div>`:name;
 return `<div class="rp-identity">${riskThumbnail(r.name,k===1)}<div>${title}<small title="${esc(full)}">${esc(sub)}</small></div></div>`;'''+s[end:]
old='${rpIdentityMarkup(k,r)}<div class="rp-entry-context"><button type="button" class="link" ${rpDetailAttr(k,r)}>详情 ›</button></div>'
assert old in s
s=s.replace(old,'${rpIdentityMarkup(k,r,false,true)}').replace(' style="--rp-visible-rows:${Math.max(1,max.length)}"','')
p.write_text(s,encoding='utf-8')
p=root/'styles/35-risk-reading.css'
s=p.read_text(encoding='utf-8-sig')
replacements={
 'align-items:stretch;gap:16px':'align-items:start;gap:16px',
 'box-shadow:0 3px 12px #27435f05':'box-shadow:none',
 'flex:1;grid-auto-rows:minmax(118px,auto)':'flex:none;grid-auto-rows:auto;align-content:start',
 'justify-content:center;box-sizing:border-box':'justify-content:flex-start;box-sizing:border-box',
 'padding:6px 0;min-height:118px':'padding:7px 0;min-height:0',
 'min-height:34px;margin-bottom:4px':'min-height:30px;margin-bottom:5px',
 'width:34px;height:34px':'width:30px;height:30px',
 'gap:6px 12px;padding:0 8px':'gap:4px 10px;padding:0',
 'display:block;margin-top:4px':'display:block;margin-top:3px',
 'gap:0 12px;padding:0 8px':'gap:0 10px;padding:0',
 '#riskrail .rp-items:has(>.rp-entry) {grid-template-rows:repeat(var(--rp-visible-rows,6),minmax(0,1fr))}':'#riskrail .rp-items:has(>.rp-entry) {grid-template-rows:none}',
 '#riskrail .rp-key-metrics .rp-item + .rp-item{border-left:1px solid #edf1f6;padding-left:10px}':'#riskrail .rp-key-metrics .rp-item + .rp-item{border:0;padding-left:0}',
 '#riskrail .rp-entry {min-height:0;padding:10px 0}':'#riskrail .rp-entry {min-height:0;padding:8px 0}',
 '#riskrail .rp-key-metrics {padding:5px 6px}':'#riskrail .rp-key-metrics {padding:0}',
 'gap:2px 8px;padding:0 6px':'gap:2px 8px;padding:0',
}
for a,b in replacements.items():
 assert a in s,a
 s=s.replace(a,b)
at=s.index('#riskrail .rp-entry-context {')
s=s[:at]+'''#riskrail .rp-identity>div {flex:1;min-width:0}
#riskrail .rp-identity-title {display:flex;align-items:center;gap:8px;min-width:0}
#riskrail .rp-identity-title>b {flex:0 1 auto;min-width:0}
#riskrail .rp-detail-link {flex:none;white-space:nowrap;font-size:12px;line-height:20px;padding:0;min-height:0}
#riskrail .rp-detail-link:focus-visible {outline:2px solid #1677ff;outline-offset:3px;border-radius:2px}
'''+s[at:]
for selector in ['#riskrail .rp-entry-context','#riskrail .rp-entry-context>.link','#riskrail .rp-risk','#riskrail .rp-risk.red::before,#riskrail .rp-risk.orange::before']:
 s=re.sub(re.escape(selector)+r' \{[^}]*\}\n','',s)
s=s.replace(' #riskrail .rp-entry-context {margin-left:auto;gap:6px}\n','').replace(' #riskrail .rp-risk {font-size:11px}\n','').replace(' #riskrail .rp-entry-context>.link {padding-left:6px}\n','')
p.write_text(s,encoding='utf-8')
p=root/'README.md'
s=p.read_text(encoding='utf-8-sig')+'\n\n## 六榜共同阅读问题修正（1013）\n\n六榜保留三列、TOP6及全部指标。移除卡片条目最小高度、等高网格和指标间竖线，按内容自然排高；每条只留横向轻分隔与悬浮底色，卡片阴影取消。详情移至产品／店铺名称旁，名称过长时截断且完整名称保留提示；卡片产品副行改为短型号（品质／退货保留所属平台），完整SPU码仍在悬浮提示和列表／详情显示。身份区、主指标及辅助指标保持固定阅读顺序与统一字号，未修改入榜、排序、计算或筛选逻辑。\n'
p.write_text(s,encoding='utf-8')
