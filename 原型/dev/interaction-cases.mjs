// 控件事件与用户应用选择相同；准备与导航耗时不计入选择生效后的耗时。
const mode=(module,value)=>({id:module+'-mode-'+value,module,selector:'#'+module+' [data-time-mode="'+value+'"]',type:'click'});
const value=(module,field,value,suffix='')=>({id:module+'-'+field+'-'+value+suffix,module,selector:'#'+module+' [data-time-'+field+']',value:String(value)});
const filter=(id,module,selector,value,type='change')=>({id,module,selector,value,type});
export const interactionCases=[
 ...['risk','sales','new','matrix','lifecycle','cost'].flatMap(module=>[
  mode(module,'month'),value(module,'value',9),value(module,'value',10),mode(module,'year'),
  value(module,'year',2025),value(module,'year',2026),value(module,'year',2025,'-repeat')
 ]),
 filter('risk-platform-fast','risk','[data-rp-card-platform="0"]','快手'),
 filter('risk-platform-all','risk','[data-rp-card-platform="0"]','all'),
 filter('risk-season-winter','risk','[data-rp-card-season="4"]','冬季品'),
 filter('risk-season-all','risk','[data-rp-card-season="4"]','all'),
 filter('new-brand','new','[data-nsp-filter="brand"]','创维'),
 filter('new-brand-all','new','[data-nsp-filter="brand"]','all'),
 filter('new-platform','new','[data-nsp-filter="channel"]','抖音'),
 filter('new-platform-all','new','[data-nsp-filter="channel"]','all'),
 filter('new-search','new','[data-nsp-search]','创维','input'),
 filter('new-search-clear','new','[data-nsp-search]','','input'),
 filter('matrix-brand','matrix','[data-kpm-filter="brand"]','康佳'),
 filter('matrix-brand-all','matrix','[data-kpm-filter="brand"]','all'),
 filter('matrix-search','matrix','[data-kpm-search]','创维','input'),
 filter('matrix-search-clear','matrix','[data-kpm-search]','','input'),
 filter('project-brand','projects','[data-pp-filter="brand"]','创维'),
 filter('project-brand-all','projects','[data-pp-filter="brand"]','all'),
 filter('inventory-season','inventory','#ip-season','冬季品'),
 filter('inventory-season-all','inventory','#ip-season','all'),
 filter('inventory-month','inventory','[data-ip-time-value]','9'),
 filter('inventory-month-repeat','inventory','[data-ip-time-value]','10'),
 filter('supplier-year','suppliers','[data-scp-period="resource"] [data-scp-year]','2025'),
 filter('supplier-year-repeat','suppliers','[data-scp-period="resource"] [data-scp-year]','2026')
];

export async function applyMeasuredInteraction(page,step){
 return page.evaluate(step=>new Promise((resolve,reject)=>{
  const element=document.querySelector(step.selector);if(!element)return reject(new Error('控件缺失 '+step.id+' '+step.selector));
  const start=performance.now();
  if(step.type==='click')element.click();
  else{
   if(element.tagName==='SELECT'){
    if(![...element.options].some(option=>option.value===step.value))return reject(new Error('选项缺失 '+step.id));
    for(const option of element.options)option.selected=option.value===step.value;
   }else element.value=step.value;
   element.dispatchEvent(new Event(step.type||'change',{bubbles:true}));
  }
  const handlerMs=performance.now()-start;
  requestAnimationFrame(()=>requestAnimationFrame(()=>requestAnimationFrame(()=>resolve({handlerMs,frameMs:performance.now()-start}))));
 }),step);
}
