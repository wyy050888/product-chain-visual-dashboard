// 草稿按业务对象隔离；条件编辑不触发业务重算，保存后统一刷新。
function brcSyncDraft(items,source){
 for(const item of items){brcClearedConditions.delete(item.key);if(item.kind==='parameter')brcDraft[item.key]=source.values[item.key];else brcDraftConditions[item.key]=brcCloneCondition(source.conditions[item.key]);}
 brcDraft=brcProjectValues(brcDraft,brcDraftConditions);
}
function brcRefreshDraftState(){
 if(brcSuccessDialogState){brcSuccessRefreshDialog();brcRefreshConditionValues();return}
 brcError='';brcErrorField='';$('#brc-error').textContent='';
 brcPage.querySelectorAll('[aria-invalid]').forEach(el=>el.removeAttribute('aria-invalid'));
 brcPage.querySelector('[data-brc-save]').disabled=!brcDirty();brcPage.querySelector('[data-brc-cancel]').disabled=!brcDirty();
 const tab=$('#brc-tab-'+brcActiveGroup);tab.querySelector('.brc-dirty')?.remove();if(brcDirty())tab.insertAdjacentHTML('beforeend','<i class="brc-dirty" aria-label="未保存"></i>');
 brcRefreshConditionValues();
 brcUpdateNewPreview();
}
brcPage.addEventListener('click',event=>{
 const sectionTab=event.target.closest('[data-brc-section-tab]');if(sectionTab){brcSelectSection(brcActiveGroup,sectionTab.dataset.brcSectionTab);brcError='';brcErrorField='';brcRender();document.getElementById(brcSectionTabId(brcActiveGroup,brcCurrentSection(brcActiveGroup).id)).focus({preventScroll:true});return}
 const tab=event.target.closest('[data-brc-tab]');if(tab){brcActiveGroup=tab.dataset.brcTab;brcError='';brcErrorField='';brcRender();$('#brc-tab-'+brcActiveGroup).focus({preventScroll:true});return}
 const items=brcConfigurableItems.filter(i=>i.group===brcActiveGroup);
 if(event.target.closest('[data-brc-defaults]')){brcSyncDraft(items,{values:brcDefaults,conditions:brcDefaultConditions(brcDefaults)});brcError='';brcErrorField='';brcRender();return}
 if(event.target.closest('[data-brc-cancel]')){
  const latest=brcRead();if(latest&&latest.revision!==brcSaved.revision){const clean=brcGroups.filter(([key])=>!brcDirty(key)).map(([key])=>key);brcSyncDraft(brcEditorItems.filter(i=>clean.includes(i.group)),latest);brcSaved=latest;brcApply();}
  brcSyncDraft(items,brcSaved);brcError='';brcErrorField='';brcRender();
 }
});
brcBindConditionEditor(brcPage);
brcPage.addEventListener('submit',event=>{
 if(event.target.id!=='brc-panel')return;
 event.preventDefault();try{brcCommit(brcActiveGroup,brcDraft,brcDraftConditions);brcApply();brcSyncDraft(brcEditorItems.filter(i=>i.group===brcActiveGroup),brcSaved);brcError='';brcErrorField='';brcRender();toast('配置已保存')}
 catch(error){brcError=error.message;brcErrorField=error.field||'';if(brcErrorField.startsWith('success.'))brcActiveNewSection='success';else if(brcErrorField)brcRevealErrorSection(brcErrorField);brcRender();if(brcErrorField){const input=brcPage.querySelector('[data-brc-field="'+brcErrorField+'"],[data-brc-op="'+brcErrorField+'"],[data-brc-success-period="'+brcErrorField.replace('success.','')+'"]');input?.focus();input?.scrollIntoView({block:'nearest'});}}
});
brcPage.addEventListener('keydown',event=>{
 const tab=event.target.closest('[data-brc-section-tab]');if(!tab||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();const sections=brcRuleSections(brcActiveGroup),index=sections.findIndex(s=>s.id===tab.dataset.brcSectionTab),next=event.key==='Home'?0:event.key==='End'?sections.length-1:(index+(event.key==='ArrowRight'?1:-1)+sections.length)%sections.length;document.getElementById(brcSectionTabId(brcActiveGroup,sections[next].id)).click();
});
$('#brc-tabs').addEventListener('keydown',event=>{
 if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const index=brcGroups.findIndex(([key])=>key===brcActiveGroup),next=event.key==='Home'?0:event.key==='End'?brcGroups.length-1:(index+(event.key==='ArrowRight'?1:-1)+brcGroups.length)%brcGroups.length;$('#brc-tab-'+brcGroups[next][0]).click();
});
const brcEntry=document.createElement('button');brcEntry.type='button';brcEntry.id='configure-global-rules';brcEntry.className='brc-entry';brcEntry.textContent='配置全局规则';brcEntry.onclick=()=>smNavigate(brcRoute);navigationToolbar.insertBefore(brcEntry,navigationActions);
window.businessRuleConfigSnapshot=()=>({route:brcRoute,activeGroup:brcActiveGroup,activeNewSection:brcActiveNewSection,activeSection:brcCurrentSection(brcActiveGroup)?.id,sections:Object.fromEntries(brcGroups.map(([group])=>[group,brcRuleSections(group).map(({id,title,keys})=>({id,title,keys}))])),newSections:brcNewSections.map(s=>({...s})),revision:brcSaved.revision,successTimeline:brcSaved.successTimeline,successRuleView:{kind:brcSuccessView.kind,selected:{...brcSuccessView.selected}},values:{...brcSaved.values},draft:{...brcDraft},conditions:brcCopyConditions(brcSaved.conditions),draftConditions:brcCopyConditions(brcDraftConditions),items:brcConfigurableItems.map(item=>({...item})),definitions:brcDefinitions.map(rule=>({...rule}))});

// 只读集成审计：调用生产模型，检查配置保存后对象、判定与提示是否同步。
window.businessRuleRuntimeSnapshot=()=>({
 attainment100:status(100),returnGap3:rpQualityReturnRule(13,10).tone,receivedGap1:rpQualityReturnRule(9,8,'received').tone,
 grade650:kpmClassifyGrade(650,13),aiGrade650:upAiClassify(650000000,13).grade,gradeRules:JSON.parse(JSON.stringify(kpmGradeRules)),aiPrompt:upAiSummaryPrompt,
 qualityGrowth4:qrbReturnDecision(100,4,0,true),qualityGrowth1:qrbReturnDecision(100,1,0,true),qualityGrowth6:qrbReturnDecision(100,6,0,true),contactGrowth21:qrbContactDecision(21,0).hit,
 contactGrowth1:qrbContactDecision(1,0).hit,contactGrowth4:qrbContactDecision(4,0).hit,contactGrowth6:qrbContactDecision(6,0).hit,
 qualityGroupReturn:qrbQualityDecision({orders:100,returnRate:4,contactRate:0},{returnRate:0,contactRate:0}),
 qualityGroupContact:qrbQualityDecision({orders:0,returnRate:0,contactRate:21},{returnRate:0,contactRate:0}),
 qualityGroupBoth:qrbQualityDecision({orders:100,returnRate:4,contactRate:21},{returnRate:0,contactRate:0}),
 worsening4:pfReturnCauses({netSales:101,returnRate:4,previousRate:0,receivedRate:0,previousReceivedRate:0}),
 shop47:rpShopScoreTone('抖音',4.7),shopHint:rpShopScoreHint('抖音'),
 shopPenalty1Fine6000:sbDecide({channel:'抖音',score:4.7,qualityPenaltyCount:1,qualityFine:6000,frozenAmount:0,returnProducts:[]}).signals.some(item=>item.label.startsWith('店铺评分红灯且当月品质处罚')),
 shopFine6000Count1:sbDecide({channel:'抖音',score:4.7,qualityPenaltyCount:1,qualityFine:6000,frozenAmount:0,returnProducts:[]}).signals.some(item=>item.label.startsWith('品质罚款')),
 stockCoverage10Total40:upStockRiskTags({warehouse:100,coverage15:10,totalCoverage15:40}),
 pdd31:sbPddHitCount([31,32,33,0,0,0]),stock65:upStockRiskTags({warehouse:100,coverage15:65,totalCoverage15:40}),
 stockMixedPlatform:irReasons({profitRate:5,returnRate:10,receivedRate:1,violation:'正常',slow:false}).length,
 stockOnlyViolation:irReasons({profitRate:20,returnRate:10,receivedRate:1,violation:'红色',violationCount:3,slow:false}).length,
 stockAllFour:irReasons({profitRate:5,returnRate:60,receivedRate:31,violation:'红色',violationCount:3,slow:false}).length,
 stockMissingRatiosViolation:irReasons({profitRate:null,returnRate:null,receivedRate:null,violationCount:3,slow:false}).length,
 inventoryTurn05:ipSignal('turn',.5,'month'),net20:upNetEstimate({gsvCents:100000,profitCents:20000,profitRate:20}).profitRate,
 new550:nspSuccessPass({gsvCents:550000000,profitRate:20,returnRate:5},'四季品',false),
 delivery10:nspDeliveryAssessment([{id:0,name:'audit',chain:0}], [{projectId:0,taskId:'audit-delivery',kind:'bulk-delivery',planned:'2026-01-01',actual:'2026-01-11'}],{start:'2026-01-01',end:'2026-01-31',cutoff:'2026-01-31'}).ontime,
 refurb40:ipRefurbSummary([{refurbOrders:[{spuId:'audit',requisitionId:'audit-refurb',initiatedAt:'2026-01-01',quotedAt:'2026-01-01',completedAt:'2026-02-10'}]}],'2026-02-28').onTime,
 refurbCycle:[40,41,44,45,49,50,59,60,70].map(days=>({days,bucket:ipRefurbBuckets.find(bucket=>bucket.hit(days))?.key})),
 riskRule:rpCardRuleSummary(0),stockRule:rpCardRuleSummary(3),newRule:metricDefinitions['新品上线及时率'],gradeHelp:kpmGradeHelpText(),supplierRule:scpStrategicRuleText()
});

function brcEnsureActiveTab(){
 for(const tabs of [$('#brc-tabs'),brcPage.querySelector('.brc-new-tabs')]){
  const active=tabs?.querySelector('[aria-selected=true]');if(!active)continue;
  const bounds=tabs.getBoundingClientRect(),box=active.getBoundingClientRect();if(box.left<bounds.left)tabs.scrollLeft+=box.left-bounds.left;else if(box.right>bounds.right)tabs.scrollLeft+=box.right-bounds.right;
 }
}
new ResizeObserver(brcEnsureActiveTab).observe($('#brc-tabs'));
