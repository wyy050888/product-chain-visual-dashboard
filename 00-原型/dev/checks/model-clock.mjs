import fs from 'node:fs';
import vm from 'node:vm';
// 独立模型测试复用真实日期工具，默认时钟固定到原有样例的截止日。
export function modelClock(today='2026-10-10'){
 const instant=today+'T04:00:00Z';
 class FixtureDate extends Date{constructor(...args){super(...(args.length?args:[instant]))}static now(){return Date.parse(instant)}}
 const context=vm.createContext({Date:FixtureDate,Intl});
 const source=fs.readFileSync(new URL('../../src/modules/period/01.js',import.meta.url),'utf8').split('const moduleIds=')[0];
 vm.runInContext(source,context);
 return {dashboardToday:context.dashboardToday,dashboardYears:context.dashboardYears};
}
