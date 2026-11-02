function kpmFormatGradeRange(fact){return fact.start.replaceAll('-','/')+' — '+fact.end.replaceAll('-','/')}
function kpmChangeText(assessment){
 const {current,previous}=assessment;
 return (previous.level||'未分级')+' → '+(current.level||'未分级');
}
function kpmChangeMarkup(p){
 const {current,previous}=p.assessment;
 const badge=level=>`<span class="kpm-change-grade ${level||'unrated'}">${level||'未分级'}</span>`;
 return `<span class="kpm-change ${p.assessment.change}" data-kpm-grade-change="${p.spuId}">${badge(previous.level)}<span class="kpm-change-arrow" aria-hidden="true">→</span>${badge(current.level)}</span>`;
}
// 升降由上方卡片切换；仅为其他经营异动显示可清除的条件。
function kpmRenderChangeCondition(){
 const rule=kpmChangeSignals.find(rule=>rule.key===kpmSelectedChange&&!['up','down'].includes(rule.key)),condition=$('#kpm-active-change');
 if(condition)condition.innerHTML=rule?'<button type="button" class="kpm-change-condition" data-kpm-clear-change aria-label="清除异动条件：'+esc(rule.label)+'">异动：'+esc(rule.label)+'<span aria-hidden="true">×</span></button>':'';
}
// 仅保留一个异动条件；从概览进入时定位到主表，并把焦点放在可操作条件上。
function kpmSelectChangeFilter(key,{reveal=false}={}){
 if(!kpmChangeSignals.some(rule=>rule.key===key))return;
 if(['up','down'].includes(key)){kpmSelectedGrade='all';kpmSelectedOperating=null;}
 kpmSelectedChange=key;kpmPage.value=1;kpmRender();
 if(reveal)$('#matrix .matrixlist')?.scrollIntoView({block:'start',behavior:'auto'});
 const control=$('#matrix [data-kpm-summary-change="'+key+'"]')||$('#matrix [data-kpm-clear-change]');
 control?.focus({preventScroll:true});
}

document.addEventListener('click',e=>{
 if(e.target.closest('#matrix.kpm-main [data-kpm-clear-change]'))return kpmSelectChangeFilter('up');
});
