const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
const A = require('../shop-config-src/engine.js');
const {seed,regions,supervisors} = vm.runInNewContext(fs.readFileSync(require.resolve('../shop-config-src/data.js'),'utf8')+';({seed,regions,supervisors})');
const today = '2026-09-24';
const independent = {type:'long',start:'2026-10-02',region:'抖音一区',owner:'王梦宇'};
assert.equal(A.validate(independent,{configs:[]},today,{regions,supervisors}),'');
for (const change of [{region:''},{owner:''},{region:'不存在'},{owner:'不存在'}]) {
  assert.match(A.validate({...independent,...change},{configs:[]},today,{regions,supervisors}),/请选择运营大区及运营主管/);
}
assert.equal(A.validate({type:'annual',start:'2026-10-02',segments:[{sm:1,sd:1,em:12,ed:31,region:'抖音一区',owner:'王梦宇'}]},{configs:[]},today,{regions,supervisors}),'');
for (const shop of seed) {
  for (const c of shop.configs) assert.equal(A.validate(c,{configs:[]},A.shift(c.start,-1),{regions,supervisors}),'');
  A.syncSnapshots(shop,today);
  if (!shop.configs.length) {
    assert.equal(A.resolve(shop,today),null);
    assert.equal(A.recordsAt(shop,today).length,0);
    continue;
  }
  assert.equal(A.recordsAt(shop,today)[0].owner,A.resolve(shop,today).owner);
  const records = shop.snapshots;
  for (let i=1;i<records.length;i++) assert.equal(records[i-1].end,A.shift(records[i].start,-1));
  assert(records.every(r=>r.start<=today));
}
const life = seed[0], annual = life.configs[0];
assert.equal(A.resolve(life,'2028-02-29').owner,'陈昱龙');
assert.equal(A.resolve(life,'2028-03-01').owner,'杨潇鹏');
assert.equal(A.resolve(life,'2026-08-31').owner,'杨潇鹏');
assert.equal(A.resolve(life,'2026-09-01').owner,'陈昱龙');
assert.equal(life.snapshots.length,5);
assert.equal(A.next(life,today).date,'2027-03-01');
assert.match(A.coverage([{...annual.segments[0]},{...annual.segments[1],ed:28}]),/2 月 29 日/);
assert.match(A.coverage([annual.segments[0]]),/本次配置未覆盖/);
assert.equal(A.coverage([annual.segments[1]]),'本次配置未覆盖：每年 3 月 1 日至8 月 31 日，请补齐后保存。');
assert.match(A.coverage([...annual.segments,annual.segments[0]]),/重叠/);
assert.equal(A.coverage([annual.segments[0],{...annual.segments[1],em:11,ed:1}]),'本次配置未覆盖：每年 11 月 2 日至次年 2 月 29 日（平年到 2 月 28 日），请补齐后保存。');
assert.match(A.coverage([{...annual.segments[0],sm:1,sd:2,em:12,ed:30}]),/12 月 31 日至次年 1 月 1 日/);
assert.match(A.coverage([{...annual.segments[0],sm:1,sd:1,em:3,ed:31},{...annual.segments[1],sm:5,sd:1,em:9,ed:30}]),/4 月 1 日至4 月 30 日、10 月 1 日至12 月 31 日/);
const end29 = structuredClone(annual.segments); end29[1].ed = 29;
assert.equal(A.coverage(end29),'');
assert(A.hits(end29[1],'2027-02-28'));
assert(!A.hits(end29[1],'2027-03-01'));
assert(A.hits(end29[1],'2028-02-29'));
const from29 = {sm:2,sd:29,em:12,ed:31,region:'抖音三区',owner:'王韶'};
const until28 = {sm:1,sd:1,em:2,ed:28,region:'抖音二区',owner:'赵明'};
assert.equal(A.coverage([until28,from29]),'');
const leapShop = {id:'leap',configs:[{id:'leap-config',type:'annual',start:'2026-01-01',segments:[until28,from29]}]};
assert.equal(A.validate(leapShop.configs[0],{configs:[]},'2025-12-31',{regions,supervisors}),'');
assert.equal(A.next(leapShop,'2027-02-28').date,'2027-03-01');
assert.equal(A.next(leapShop,'2028-02-28').date,'2028-02-29');
A.syncSnapshots(leapShop,'2028-03-01');
assert(leapShop.snapshots.every(r => A.validDate(r.start) && (!r.end || A.validDate(r.end))));
const leapOnly = {...from29,em:2,ed:29};
assert(!A.hits(leapOnly,'2027-02-28')); assert(!A.hits(leapOnly,'2027-03-01')); assert(A.hits(leapOnly,'2028-02-29'));
assert.equal(A.coverage([until28,leapOnly,{...from29,sm:3,sd:1}]),'');
assert.equal(A.validate({...annual,id:null,start:today},life,today,{regions,supervisors}).includes('不能改写'),true);
assert.match(A.validate({...annual,start:'2026-10-01'},life,today,{regions,supervisors}),/不可修改/);
const env = seed[1];
assert.equal(A.next(env,today).date,'2026-10-01');
assert.equal(A.resolve(env,'2027-03-01').owner,'程壹涵'); // Replacement stops all old yearly rotations.
const frozen = JSON.stringify(env.snapshots.slice(0,-1));
A.syncSnapshots(env,'2028-03-01');
assert.equal(JSON.stringify(env.snapshots.slice(0,-2)),frozen);
assert.equal(env.snapshots.at(-1).start,'2026-10-01');
const unchanged = JSON.stringify(env.snapshots); A.syncSnapshots(env,'2028-03-01');
assert.equal(JSON.stringify(env.snapshots),unchanged); // Idempotent reconciliation.
assert.equal(A.recordsAt(env,today)[0].end,null); // Date inspection does not expose later outcomes.
const run = seed[2];
assert.match(A.validate({id:null,start:'2026-10-01',type:'long',region:'抖音二区',owner:'赵明'},run,today,{regions,supervisors}),/已有待生效/);
assert.equal(A.resolve(run,'2026-09-04').owner,'蔡龙坤');
assert.equal(A.resolve(run,'2026-09-05').owner,'杨潇鹏');
console.log('PASS engine: full-year coverage, leap day, cross-year, immutable history, replacement, pending conflicts and snapshots.');
