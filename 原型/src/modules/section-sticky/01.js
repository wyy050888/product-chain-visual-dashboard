// 总看板十个模块共用原标题栏，不复制控件、不改变文档高度。
// 普通模块由 CSS 在自身边界释放；预警有分区导航时同样保持至本模块末尾。
const sectionStickyMain=$('main.page');
const sectionStickyModules=moduleIds.map(id=>$('#'+id)).filter(node=>node?.parentElement===sectionStickyMain);
for(const section of sectionStickyModules)section.dataset.moduleSticky='';
const sectionStickyRisk=$('#risk'),sectionStickyAiTitle=$('#ai>.sectionhead h2');
function sectionStickyMeasureTop(){
 const style=getComputedStyle(navigationToolbar),height=navigationToolbar.getBoundingClientRect().height;
 const top=Math.max(0,(parseFloat(style.top)||0)+height)+'px';
 if(sectionStickyMain.style.getPropertyValue('--module-sticky-top')!==top)return ()=>sectionStickyMain.style.setProperty('--module-sticky-top',top);
}
function sectionStickyMeasureBoundary(){
 const hasGroupNavigation=!!sectionStickyRisk.querySelector('#rp-group-navigation');
 const rect=(hasGroupNavigation?sectionStickyRisk:sectionStickyAiTitle).getBoundingClientRect();
 const head=sectionStickyRisk.querySelector(':scope>.sectionhead');
 const ended=String(rect.height>0&&(hasGroupNavigation?rect.bottom<=navigationToolbar.getBoundingClientRect().bottom+head.getBoundingClientRect().height:rect.top<innerHeight));
 if(sectionStickyRisk.dataset.moduleStickyEnded!==ended)return ()=>{sectionStickyRisk.dataset.moduleStickyEnded=ended};
}
function sectionStickyQueueBoundary(){dashboardQueueLayout(sectionStickyRisk,sectionStickyMeasureBoundary)}
function sectionStickyQueueLayout(){dashboardQueueLayout(sectionStickyMain,sectionStickyMeasureTop);sectionStickyQueueBoundary()}
const sectionStickyLayout=new ResizeObserver(sectionStickyQueueLayout);
for(const node of [navigationToolbar,$('.head')])sectionStickyLayout.observe(node);
const sectionStickyBoundary=new IntersectionObserver(sectionStickyQueueBoundary,{threshold:0});
sectionStickyBoundary.observe(sectionStickyAiTitle);
window.addEventListener('resize',sectionStickyQueueLayout,{passive:true});
window.addEventListener('scroll',sectionStickyQueueBoundary,{passive:true});
window.addEventListener('hashchange',sectionStickyQueueBoundary);
document.addEventListener('fullscreenchange',sectionStickyQueueLayout);
window.addEventListener('dashboard:ready',sectionStickyQueueLayout);
sectionStickyQueueLayout();
