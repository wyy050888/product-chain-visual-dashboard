// 面板只展示经营信号，点击明细不改变右侧产品表的筛选或分页。
const kpmManagementPurpose={changes:'识别产品升降级，判断主力是否走弱',cycles:'判断既有方案是否带来经营改善',structure:'观察利润支柱补充与尾部产品变化'};
function kpmManagementLamp(tone,label){
 const labels={red:'红灯',yellow:'黄灯',green:'绿灯'};
 return `<span data-up-basic class="kpm-management-lamp ${tone||'neutral'}"><i aria-hidden="true"></i>${esc(label||labels[tone]||'跟进')}</span>`;
}
// 金额保留两位小数，单位沿用元/万元阈值，占比作为次要信息同列展示。
function kpmStructureGsv(row){
 const large=Math.abs(row.gsv)>1000000,amount=(row.gsv/(large?1000000:100)).toFixed(2)+(large?'w':'元');
 return `<span class="kpm-structure-gsv">${amount}</span><span class="kpm-structure-share">（${upPercent(row.share)}）</span>`;
}
function kpmManagementView(rows){
 const tabs=Object.entries(kpmManagementTabs).map(([key,label])=>`<button type="button" role="tab" data-kpm-management-tab="${key}" aria-selected="${key===kpmManagementTab}">${label}</button>`).join('');
 const signals=`<div class="kpm-management-rows">${kpmManagementGroups(rows).map(g=>`<button type="button" class="kpm-management-row ${g.tone}" data-kpm-management-pick="${g.key}" ${g.ids.length?'':'disabled'}>${kpmManagementLamp(g.tone)}<span><b>${g.label}</b></span><strong>${g.ids.length}<small>个</small></strong><i aria-hidden="true">›</i></button>`).join('')}</div>`;
 const structure=kpmManagementTab==='structure'?`<table class="kpm-structure-table"><thead><tr><th data-up-basic>等级</th><th data-up-basic>个数</th><th data-up-basic>GSV</th><th data-up-basic>利润率</th></tr></thead><tbody>${kpmManagementStructure(rows).map(s=>`<tr><td><button class="link" data-kpm-management-pick="grade-${s.level}" ${s.count?'':'disabled'}>${s.level==='unrated'?'待分级':s.level}</button></td><td>${s.count}<small>${s.count===s.before?'持平':(s.count>s.before?'↑':'↓')+Math.abs(s.count-s.before)}</small></td><td>${kpmStructureGsv(s)}</td><td class="${s.margin<0?'negative':''}">${upPercent(s.margin)}</td></tr>`).join('')}</tbody></table>`:'';
 return `<section class="kpm-management" data-management-view="${kpmManagementTab}" aria-label="产品分级经营预警"><header><h3>产品分级经营预警</h3></header><div class="kpm-management-tabs" role="tablist">${tabs}</div><div class="kpm-management-purpose"><span aria-hidden="true">i</span><small>${kpmManagementPurpose[kpmManagementTab]}</small></div><div class="kpm-management-body">${signals}${structure}</div></section>`;
}
function kpmRenderManagementOnly(){
 const host=$('#matrix.kpm-main #matrix-ai-summary');if(!host)return;
 withPeriod('matrix',()=>{host.innerHTML=kpmManagementView(kpmFilterRows(kpmRows()))});
}
document.addEventListener('click',event=>{
 const tab=event.target.closest('#matrix.kpm-main [data-kpm-management-tab]');
 if(tab){kpmManagementTab=tab.dataset.kpmManagementTab;kpmRenderManagementOnly();return}
 const pick=event.target.closest('#matrix.kpm-main [data-kpm-management-pick]');
 if(pick)kpmOpenManagementList(pick.dataset.kpmManagementPick);
});
document.addEventListener('product-todos-updated',kpmRenderManagementOnly);
document.addEventListener('keydown',event=>{
 const tab=event.target.closest('#matrix.kpm-main [data-kpm-management-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();const keys=Object.keys(kpmManagementTabs),index=keys.indexOf(tab.dataset.kpmManagementTab);
 const next=event.key==='Home'?0:event.key==='End'?keys.length-1:(index+(event.key==='ArrowLeft'?-1:1)+keys.length)%keys.length;
 kpmManagementTab=keys[next];kpmRenderManagementOnly();document.querySelector('[data-kpm-management-tab="'+keys[next]+'"]').focus({preventScroll:true});
});
