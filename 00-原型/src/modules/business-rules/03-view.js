const brcRoute='#system-business-rules';
let brcActiveGroup=brcGroups[0][0],brcDraft={...brcSaved.values},brcDraftConditions=brcCopyConditions(brcSaved.conditions),brcError='',brcErrorField='';
function brcDirty(group=brcActiveGroup){return brcConfigurableItems.some(item=>item.group===group&&(item.kind==='parameter'?brcDraft[item.key]!==brcSaved.values[item.key]:!brcSameCondition(brcDraftConditions[item.key],brcSaved.conditions[item.key])))}
function brcField(item,instance='table'){return brcTableField(item.key,instance)}
function brcRender(){
 const host=$('#business-rule-page');if(!host)return;
 host.querySelector('#brc-tabs').innerHTML=brcGroups.map(([key,name])=>`<button type="button" role="tab" class="${key===brcActiveGroup?'active':''}" id="brc-tab-${key}" aria-controls="brc-panel" aria-selected="${key===brcActiveGroup}" tabindex="${key===brcActiveGroup?0:-1}" data-brc-tab="${key}">${name}${brcDirty(key)?'<i class="brc-dirty" aria-label="未保存"></i>':''}</button>`).join('');
 host.querySelector('#brc-panel').setAttribute('aria-labelledby','brc-tab-'+brcActiveGroup);
 host.querySelector('#brc-cards').classList.toggle('brc-new-layout',brcActiveGroup==='new');
 host.querySelector('#brc-cards').innerHTML=brcRenderSections(brcActiveGroup);
 host.querySelector('.brc-footer').hidden=brcActiveGroup==='new'&&brcActiveNewSection==='success';
 host.querySelector('#brc-error').textContent=brcError;host.querySelector('[data-brc-save]').disabled=!brcDirty();host.querySelector('[data-brc-cancel]').disabled=!brcDirty()&&!brcError;requestAnimationFrame(brcEnsureActiveTab);
}
smRegisterPage({route:brcRoute,id:'business-rule-page',title:'规则配置',group:'业务配置',menuOrder:10,markup:`<header class="lt-page-head sm-target-head"><h2 class="sm-page-title">规则配置</h2><nav id="brc-tabs" class="sm-page-tabs" role="tablist" aria-label="业务对象"></nav></header><section class="lt-panel brc-panel"><form id="brc-panel" role="tabpanel" novalidate><div id="brc-cards"></div><p id="brc-error" role="alert"></p><footer class="brc-footer"><button type="button" class="link" data-brc-defaults>恢复默认值</button><div><button type="button" class="btn" data-brc-cancel>取消更改</button><button type="submit" class="btn primary" data-brc-save>保存配置</button></div></footer></form></section>`,onShow:brcRender});

const brcPage=$('#business-rule-page'),brcClearedConditions=new Map();
