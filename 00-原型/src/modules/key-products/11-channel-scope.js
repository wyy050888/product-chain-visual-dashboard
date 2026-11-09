// 业务范围仅约束经营台账；当前六个平台互斥分组，库存仍保留公司快照。
const kpmBusinessScopes={
 all:{label:'公司整体',platforms:'all'},
 retail:{label:'一类电商',platforms:['天猫','京东','拼多多']},
 interest:{label:'兴趣电商',platforms:['抖音','快手','视频号']}
};
let kpmBusinessScope='all';
function kpmBusinessPlatforms(){return kpmBusinessScopes[kpmBusinessScope].platforms}
function kpmRenderBusinessSwitch(section){
 let control=section.querySelector('[data-kpm-scope-switch]');
 if(!control){control=document.createElement('div');control.className='kpm-scope-switch';control.dataset.kpmScopeSwitch='';control.setAttribute('role','group');control.setAttribute('aria-label','关键产品业务范围');section.querySelector('.sectionhead .titlegroup').after(control)}
 control.innerHTML=Object.entries(kpmBusinessScopes).map(([key,scope])=>`<button type="button" data-kpm-scope="${key}" aria-pressed="${key===kpmBusinessScope}">${scope.label}</button>`).join('');
}
document.addEventListener('click',event=>{
 const button=event.target.closest('#matrix.kpm-main [data-kpm-scope]');if(!button)return;
 const key=button.dataset.kpmScope;if(!kpmBusinessScopes[key]||key===kpmBusinessScope)return;
 kpmBusinessScope=key;kpmPage.value=1;kpmRender();
 document.querySelector('#matrix [data-kpm-scope="'+key+'"]').focus({preventScroll:true});
});
document.addEventListener('keydown',event=>{
 const button=event.target.closest('#matrix.kpm-main [data-kpm-scope]');
 if(!button||!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
 event.preventDefault();const keys=Object.keys(kpmBusinessScopes),index=keys.indexOf(button.dataset.kpmScope);
 const next=event.key==='Home'?0:event.key==='End'?keys.length-1:(index+(event.key==='ArrowLeft'?-1:1)+keys.length)%keys.length;
 document.querySelector('#matrix [data-kpm-scope="'+keys[next]+'"]').click();
});
