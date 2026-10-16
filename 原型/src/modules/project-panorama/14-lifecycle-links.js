// 生命周期完成数量 → 项目明细：上线按实际日期，其余规划按立项日期。
const ppLifecyclePlans=[
 {type:'自研开发',date:'actual'},
 {type:'自选开发',date:'actual'},
 {type:'自研开发',date:'started'},
 {type:'自选开发',date:'started'},
 {type:'产品迭代',date:'started'},
 {type:'品质整改',date:'started'},
 {type:'研发创新',date:'started'}
];
const ppLifecycleCategories=[['清洁类'],['厨电类'],['环境类'],['个护类','健康类']];
function ppOpenFromLifecycle(scope,dimension,rowIndex){
 const plan=ppLifecyclePlans[lifeIndex];if(!plan||!['period','year'].includes(scope))return false;
 const source=withPeriod('lifecycle',()=>({period:copyPeriod(periodFor()),range:bounds()}));
 const start=scope==='year'?source.period.year+'-01-01':source.range.start,end=source.range.cutoff;
 // 清除旧查询条件，完成明细包含所有项目状态；可见日期范围保持至统计截止日。
 Object.assign(ppState,{category:dimension==='chain'?[...(ppLifecycleCategories[rowIndex]||[])]:[],type:[plan.type],projectState:[],brand:[],light:[],riskLight:[],stage:[],department:[],query:'',plan:null,actual:null,started:null,link:null,page:1,distribution:'type',sort:{key:'plan',direction:'asc'}});
 ppState[plan.date]={mode:'range',year:source.period.year,start,end};
 localPeriods.projects=copyPeriod(source.period);
 renderTimeControls('projects');renderProjects();
 const link=document.querySelector('a[href="#projects"]');if(link)link.click();else $('#projects').scrollIntoView({block:'start',behavior:'smooth'});
 return true;
}
