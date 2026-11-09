

// Product, project and R&D share components and the business ledger.
// Only one workspace is mounted at a time, preserving unique IDs and handlers.
const dwProfiles={
 product:{name:'产品部',center:'产品中心',tab:1,route:'department',excluded:[]},
 project:{name:'项目部',center:'项目部',tab:2,route:'project-department',excluded:['sales']},
 research:{name:'研发部',center:'研发部',tab:4,route:'rd-department',excluded:['sales']}
};
const dwModuleTemplate=dpModules.map(m=>[...m]);
let dwActive='product';
const dwClone=value=>JSON.parse(JSON.stringify(value));
const dwInitial={state:dwClone(dpState),panels:dwClone(dxStates),ai:dwClone(dxAI),scope:dxScope};
const dwStates=new Map();
function dwSave(){dwStates.set(dwActive,{state:dwClone(dpState),panels:dwClone(dxStates),ai:dwClone(dxAI),scope:dxScope})}
function dwReplace(target,value){Object.keys(target).forEach(k=>delete target[k]);Object.assign(target,dwClone(value))}
function dwSelect(key){
 if(key!==dwActive){dwSave();const saved=dwStates.get(key)||dwClone(dwInitial);dwReplace(dpState,saved.state);dwReplace(dxStates,saved.panels);dwReplace(dxAI,saved.ai);dxScope=saved.scope;if(!dwStates.has(key))dxAI.department=dwProfiles[key].name;dwActive=key;}
 dpDepartment=dwProfiles[key].name;
 dpModules.splice(0,dpModules.length,...dwModuleTemplate.filter(m=>!dwProfiles[key].excluded.includes(m[0])).map(m=>[...m]));
 const center=dwProfiles[key].center,titles={risk:center+'高危预警榜单 TOP6',ai:center+'AI 全局智能诊断',management:dpDepartment+'全局管理'};
 for(const m of dpModules)if(titles[m[0]])m[1]=m[2]=titles[m[0]];
 dpRiskCache.clear();dpProductCache.clear();dxModal=null;
}
const dwRender=renderDepartment;
renderDepartment=function(){
 dwRender();dpView.dataset.department=dwActive;dpView.setAttribute('aria-label',dpDepartment+'看板');
 if(dwActive!=='product')dpView.querySelectorAll('.dp-nav-links a').forEach(a=>{a.dataset.dwModule=a.hash.slice(4);a.href='#'+dwProfiles[dwActive].route+'-'+a.dataset.dwModule});
};
const dwSwitch=dpSwitchView;
function dwOpen(key,hash=true,module=null){
 closeModal();dwSelect(key);dwSwitch('department',false);dpNavButtons.forEach((n,i)=>{const on=i===dwProfiles[key].tab;n.classList.toggle('active',on);if(on)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current')});
 if($('.headright .optional'))$('.headright .optional').textContent=dpDepartment+'经营与执行中心';
 if(hash)history.replaceState(null,'','#'+dwProfiles[key].route+(module?'-'+module:''));
 if(module)$('#dp-'+module)?.scrollIntoView({block:'start',behavior:'instant'});
}
dpSwitchView=function(view,hash=true){
 if(view==='department')return dwOpen('product',hash);
 closeModal();dwSelect('product');dwSwitch(view,hash);dpNavButtons.forEach((n,i)=>{n.classList.toggle('active',i===0);if(i===0)n.setAttribute('aria-current','page');else n.removeAttribute('aria-current')});
};
const dwPurchasing=pbSwitchView;
pbSwitchView=function(hash=true){closeModal();dwSelect('product');return dwPurchasing(hash)};
for(const key of ['project','research']){const button=dpNavButtons[dwProfiles[key].tab];button.disabled=false;button.removeAttribute('title');button.dataset.view=key;button.onclick=()=>dwOpen(key)}
document.addEventListener('click',e=>{const link=e.target.closest('[data-dw-module]');if(!link)return;e.preventDefault();history.replaceState(null,'',link.getAttribute('href'));$('#dp-'+link.dataset.dwModule)?.scrollIntoView({block:'start',behavior:'smooth'})});
function dwRoute(){for(const key of ['project','research']){const prefix='#'+dwProfiles[key].route;if(location.hash===prefix||location.hash.startsWith(prefix+'-')){const module=location.hash.slice(prefix.length+1);dwOpen(key,false,dxModuleOrder.includes(module)?module:null);return}}}
window.addEventListener('hashchange',dwRoute);
requestAnimationFrame(dwRoute);