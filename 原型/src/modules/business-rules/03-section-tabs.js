// 二级模块只控制展示；草稿与保存范围仍按业务对象管理。
const brcActiveSections=new Map();
function brcRuleSections(group){return group==='new'?brcNewSections:brcObjectSections(group)}
function brcCurrentSection(group){
 const sections=brcRuleSections(group),id=group==='new'?brcActiveNewSection:brcActiveSections.get(group);
 return sections.find(section=>section.id===id)||sections[0];
}
function brcSelectSection(group,id){if(group==='new')brcActiveNewSection=id;else brcActiveSections.set(group,id)}
function brcSectionTabId(group,id){return group==='new'?'brc-new-tab-'+id:'brc-section-'+group+'-'+id}
function brcRenderSections(group){
 const sections=brcRuleSections(group),active=brcCurrentSection(group),isNew=group==='new';
 if(!active)return '';
 const panelId=isNew?'brc-new-panel':'brc-section-panel';
 const tabs=sections.map(section=>{
  const selected=section.id===active.id;
  return `<button type="button" role="tab" id="${brcSectionTabId(group,section.id)}" data-brc-section-tab="${section.id}" ${isNew?`data-brc-new-tab="${section.id}"`:''} aria-controls="${panelId}" aria-selected="${selected}" tabindex="${selected?0:-1}">${esc(section.title)}${brcNewSectionDirty(section)?'<i class="brc-dirty" aria-label="未保存"></i>':''}</button>`;
 }).join('');
 const title=brcGroups.find(([id])=>id===group)[1],content=isNew?brcNewSectionContent(active.id):active.render();
 return `<nav class="brc-new-tabs" role="tablist" aria-label="${title}规则模块">${tabs}</nav><section class="brc-new-card" id="${panelId}" role="tabpanel" aria-labelledby="${brcSectionTabId(group,active.id)}" data-brc-section="${active.id}" ${isNew?`data-brc-new-section="${active.id}"`:''}><div class="brc-new-body">${content}</div></section>`;
}
function brcUpdateSectionTabs(){
 for(const section of brcRuleSections(brcActiveGroup)){
  const tab=document.getElementById(brcSectionTabId(brcActiveGroup,section.id));if(!tab)continue;
  tab.querySelector('.brc-dirty')?.remove();if(brcNewSectionDirty(section))tab.insertAdjacentHTML('beforeend','<i class="brc-dirty" aria-label="未保存"></i>');
 }
}
function brcRevealErrorSection(key){
 const section=brcRuleSections(brcActiveGroup).find(item=>item.keys.includes(key));
 if(section)brcSelectSection(brcActiveGroup,section.id);
}
