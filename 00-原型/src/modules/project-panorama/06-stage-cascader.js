// 阶段按“项目类型 + 阶段”保存，避免不同类型的同名阶段互相命中。
let ppStageActiveType='';
function ppStageTypes(){return ppState.type.length?ppState.type:Object.keys(ppStages)}
function ppStageLabel(){return ppState.stage.map(p=>p.type+' / '+p.stage).join('、')||'全部'}
function ppStageOptions(type){
 return (ppStages[type]||[]).map(stage=>`<label class="pp-stage-option"><input type="checkbox" data-pp-stage-type="${esc(type)}" data-pp-stage-value="${esc(stage)}" aria-label="${esc(type+' / '+stage)}" ${ppState.stage.some(p=>p.type===type&&p.stage===stage)?'checked':''}><span>${esc(stage)}</span></label>`).join('');
}
function ppStageCascader(){
 const types=ppStageTypes();if(!types.includes(ppStageActiveType))ppStageActiveType=types[0];
 return `<details class="pp-stage-cascader"><summary aria-label="卡点阶段筛选"><span>卡点阶段</span><span class="pp-stage-value" title="${esc(ppStageLabel())}">${esc(ppStageLabel())}</span><i aria-hidden="true"></i></summary><div class="pp-stage-menu"><div class="pp-stage-types" role="group" aria-label="项目类型"><button type="button" data-pp-stage-clear>全部阶段</button>${types.map(type=>`<button type="button" data-pp-stage-branch="${esc(type)}" aria-pressed="${type===ppStageActiveType}"><span>${esc(type)}</span><span aria-hidden="true">›</span></button>`).join('')}</div><div class="pp-stage-options" role="group" aria-label="${esc(ppStageActiveType)}阶段">${ppStageOptions(ppStageActiveType)}</div></div></details>`;
}
function ppStageChooseBranch(button){
 const menu=button.closest('.pp-stage-cascader');ppStageActiveType=button.dataset.ppStageBranch;
 for(const branch of menu.querySelectorAll('[data-pp-stage-branch]'))branch.setAttribute('aria-pressed',String(branch===button));
 const options=menu.querySelector('.pp-stage-options');options.innerHTML=ppStageOptions(ppStageActiveType);options.setAttribute('aria-label',ppStageActiveType+'阶段');
}
function ppStageSync(menu){
 const value=menu.querySelector('.pp-stage-value');value.textContent=ppStageLabel();value.title=ppStageLabel();
 for(const box of menu.querySelectorAll('[data-pp-stage-value]'))box.checked=ppState.stage.some(p=>p.type===box.dataset.ppStageType&&p.stage===box.dataset.ppStageValue);
 ppState.page=1;ppRefreshTable();
}
document.addEventListener('change',e=>{
 const box=e.target.closest('#projects.pp-main [data-pp-stage-value]');if(!box)return;
 const path={type:box.dataset.ppStageType,stage:box.dataset.ppStageValue};
 ppState.stage=ppState.stage.filter(p=>p.type!==path.type||p.stage!==path.stage);
 if(box.checked)ppState.stage.push(path);ppStageSync(box.closest('.pp-stage-cascader'));
});
document.addEventListener('click',e=>{
 const branch=e.target.closest('#projects.pp-main [data-pp-stage-branch]');if(branch)ppStageChooseBranch(branch);
 const clear=e.target.closest('#projects.pp-main [data-pp-stage-clear]');if(clear){ppState.stage=[];ppStageSync(clear.closest('.pp-stage-cascader'))}
 const menu=document.querySelector('#projects.pp-main .pp-stage-cascader');if(menu&&!menu.contains(e.target))menu.open=false;
});
document.addEventListener('pointerover',e=>{
 const branch=e.target.closest('#projects.pp-main [data-pp-stage-branch]');if(branch&&branch.dataset.ppStageBranch!==ppStageActiveType)ppStageChooseBranch(branch);
});
document.addEventListener('keydown',e=>{
 const menu=document.querySelector('#projects.pp-main .pp-stage-cascader[open]');if(e.key==='Escape'&&menu){menu.open=false;menu.querySelector('summary').focus()}
});
