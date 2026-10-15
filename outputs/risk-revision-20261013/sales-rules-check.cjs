const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const period={mode:'month',year:2026,value:10};
const context={window:{},Number,Math,fmt:(n,d)=>n.toFixed(d),pfMoneyYuan:n=>n.toFixed(2),periodFor:()=>period,aiFlowDayDiff:(a,b)=>(Date.parse(b)-Date.parse(a))/86400000,bounds:()=>({start:'2026-10-01',end:'2026-10-10',cutoff:'2026-10-08'}),salesTargetStore:{years:{2026:{profitRates:{demo:10}}}}};
vm.runInNewContext(fs.readFileSync('原型/src/modules/sales-review/01-model.js','utf8').replace(/^\uFEFF/,''),context);
const r=context.msFacts({name:'demo',sale:130.5,target:150,gross:15.66});
const equal=(a,b)=>assert.ok(Math.abs(a-b)<1e-9,a+' != '+b);
equal(r.gsvRate,87);equal(r.gsvDeviation,7);equal(r.marginGap,2);equal(r.scaleRate,104.4);equal(r.scaleDeviation,24.4);
assert.equal(context.msTone(-10.000001),'red');assert.equal(context.msTone(-10),'orange');assert.equal(context.msTone(-.001),'orange');assert.equal(context.msTone(0),'green');
assert.equal(context.msFacts({name:'missing',sale:130.5,target:150,gross:15.66}).scaleRate,null);
assert.equal(context.msFacts({name:'demo',sale:130.5,target:0,gross:15.66}).gsvRate,null);
context.salesTargetStore.years[2026].profitRates.demo=0;
assert.equal(context.msFacts({name:'demo',sale:130.5,target:150,gross:15.66}).scaleRate,null);
assert.equal(context.msRatio(null,10),null);assert.equal(context.msPercent(0),'0.0%');
context.salesTargetStore.years[2026].profitRates={a:10,b:10};
assert.deepEqual(Array.from(context.msSort([{name:'missing',sale:500,target:100,gross:50},{name:'a',sale:100,target:100,gross:10},{name:'b',sale:120,target:100,gross:12}]),r=>r.name),['b','a','missing']);
console.log('GSV / weighted profit scale / deviations / -10 & 0 boundaries / missing & zero denominators / rank ordering passed');

