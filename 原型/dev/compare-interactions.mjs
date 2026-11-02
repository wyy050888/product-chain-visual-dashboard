import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const folder=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../../outputs/performance');
const read=label=>JSON.parse(fs.readFileSync(path.join(folder,label+'.json'),'utf8'));
const before=read(process.argv[2]||'interactions-before-20261026'),after=read(process.argv[3]||'interactions-final-20261026');
const median=values=>{const sorted=values.slice().sort((a,b)=>a-b);return sorted[Math.floor(sorted.length/2)]};
const measure=(report,id,key)=>median(report.runs.map(run=>run.samples.find(sample=>sample.id===id)[key]));
const round=value=>Math.round(value*10)/10;
const cases=before.cases.map(step=>{
 const old=before.runs[0].samples.find(s=>s.id===step.id),current=after.runs[0].samples.find(s=>s.id===step.id);
 const result={id:step.id,module:step.module,sameText:old.signature===current.signature,sameRows:old.rows===current.rows,samePeriod:JSON.stringify(old.period)===JSON.stringify(current.period)};
 for(const key of ['handlerMs','frameMs']){const b=measure(before,step.id,key),a=measure(after,step.id,key);result[key]={before:round(b),after:round(a),improvementPercent:round((1-a/b)*100)}}
 return result;
});
const tests=['interaction-checks-20261026','quality-period-checks-20261026','interaction-final-checks-20261026','interaction-release-checks-20261026'].map(label=>({label,...read(label)}));
const equivalence=read('interaction-facts-equivalence-20261026');
const result={date:'2026-10-26',method:{viewport:'1920×1080',browser:'Microsoft Edge headless',transport:'local file',fixedDate:'2026-10-26',runs:after.runs.length,cases:cases.length,metric:'控件事件开始至后续三次 requestAnimationFrame 回调；包括处理、DOM和布局，不等于正式INP或线上网络耗时',isolation:'同机串行、每轮独立浏览器上下文；工作区同时有其他会话维护，另有同源提前展开/按需展开独立对照'},
 summary:{medianCaseFrameBefore:round(median(cases.map(row=>row.frameMs.before))),medianCaseFrameAfter:round(median(cases.map(row=>row.frameMs.after))),totalFrameBefore:round(median(before.runs.map(run=>run.samples.reduce((n,s)=>n+s.frameMs,0)))),totalFrameAfter:round(median(after.runs.map(run=>run.samples.reduce((n,s)=>n+s.frameMs,0)))),textDifferences:cases.filter(row=>!row.sameText).map(row=>row.id),rowDifferences:cases.filter(row=>!row.sameRows).map(row=>row.id),periodDifferences:cases.filter(row=>!row.samePeriod).map(row=>row.id),pageErrors:after.runs.flatMap(run=>run.errors)},
 sameSourceFacts:{equal:equivalence.equal,cases:equivalence.samples.length,pageErrors:equivalence.errors,report:'interaction-facts-equivalence-20261026.json'},
 comparisonLimits:['共享工作区期间新增00-new-success-samples业务样例，初始基准与最终版本有模块文本指纹变化，故此为同机观测，不是隔离因果基准；行数与期间无变化','同一份最终业务源代码中，替换回提前展开、完整风险/供应商刷新及无条件期间文本写入方式，64项模块文本指纹全部一致；风险局部刷新另与同条件完整刷新核对一致','保留原两期观察入口：省略上期判定会改变历史事件缓存的填充顺序，已撤回该项尝试，未采用其更快但不等价的计时结果','整体64项累计帧耗时下降，单项中位数并非全部下降；不承诺所有模块都达到同一时延'],
 changes:['品质/退货汇总合并保留按需趋势，列表不提前生成每日对象；保留两期原观察入口和事件缓存顺序','风险榜本次同步渲染内复用行集合；季品只刷新当前榜，平台只刷新联动三榜','供应商年份、项目搜索和类目筛选局部刷新；未滚动区域不重复写入零滚动值','新品/关键产品相同图表保留原SVG；真实尺寸变化继续由ResizeObserver处理','未变化的期间文本和图表无障碍标签不再重复写DOM；风险日期切换只更新自身时间栏'],
 checks:tests.flatMap(test=>test.results.map(({name,status,message})=>({name,status,...(message?{message}: {})}))),
 knownLegacyChecks:['keyProducts仍使用已移除的[data-kpm-change="all"]，而当前默认是等级上升；未为适配旧断言改变页面','newProducts旧年度列数断言为14，当前含指导价等字段实际为16；该失败前的筛选、排序和期间联动检查已执行'],cases};
const target=path.join(folder,'interaction-comparison-20261026.json');fs.writeFileSync(target,JSON.stringify(result,null,2));
console.log(JSON.stringify({target,summary:result.summary,highlights:cases.filter(row=>['risk-mode-year','risk-year-2025','risk-season-winter','risk-platform-all','new-value-9','new-mode-year','supplier-year'].includes(row.id)).map(({id,frameMs})=>({id,...frameMs}))},null,2));
