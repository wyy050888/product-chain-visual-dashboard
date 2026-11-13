import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export function managementScoreFixture(source){
 const people=Array.from({length:20},(_,i)=>'人员'+i),calls={life:0,projects:0,newMetrics:0,products:0};let version=1;
 const store={weights:[20,15,15,10,12,10,8,10],marginTarget:12,overrides:{'p1:人员0':{score:99}}};
 const context=vm.createContext({people,dpState:{chain:'all'},dpStore:store,periodKey:()=>'p'+version,
  dpDocuments:()=>people.flatMap((_,person)=>[{person,type:0,state:'按期提交',complete:true,approved:true,issue:'无偏差'},{person,type:2,state:'迟交',complete:person%2===0,approved:person%3!==0,issue:'需复核'}]),
  dpSalesRows:()=>Array.from({length:4},(_,index)=>({index,rate:70+index*10,profit:9+index})),salesRate:row=>row.rate,
  dpLifeRows:stage=>{calls.life++;return Array.from({length:4},(_,chain)=>({chain,target:10,actual:stage+version,yearTarget:120,yearActual:12}))},
  lifeSumRows:rows=>Object.fromEntries(['target','actual','yearTarget','yearActual'].map(key=>[key,rows.reduce((n,r)=>n+r[key],0)])),
  dpProjects:()=>{calls.projects++;return people.flatMap(owner=>[{owner,status:'绿灯'},{owner,status:'红灯'}])},
  dpNewMetrics:chain=>{calls.newMetrics++;return {planned:10,sold:6+Number(chain)}},
  productRows:()=>{calls.products++;return []},dpSum:(rows,key)=>rows.reduce((n,r)=>n+r[key],0)
 });
 vm.runInContext(source,context);
 return {calls,store,scope(value){context.dpState.chain=value},version(value){version=value},reset(){for(const key of Object.keys(calls))calls[key]=0},score:()=>JSON.parse(JSON.stringify(vm.runInContext('dpScoreRows()',context)))};
}
export function managementScoreBatch(){
 const source=fs.readFileSync(new URL('../../src/modules/product-workspace/01.js',import.meta.url),'utf8');
 const fixture=managementScoreFixture(source.slice(source.indexOf('function dpScoreRows(){'),source.indexOf('function dpPlan(')));
 const all=fixture.score();assert.equal(all.length,20);assert.equal(all.find(row=>row.name==='人员0').total,99);
 assert.deepEqual(fixture.calls,{life:4,projects:1,newMetrics:4,products:0},'评分事实不按人数重复生成');
 assert(all.every((row,i)=>i===0||all[i-1].total>=row.total));
 for(const row of all){assert.equal(row.scores.length,8);assert.equal(row.result+row.process,row.scores.reduce((n,v)=>n+v,0));}
 fixture.scope('2');fixture.reset();assert.deepEqual(fixture.score(),all.filter(row=>row.chain===2).map((row,i)=>({...row,improve:i>=4})));
 assert.deepEqual(fixture.calls,{life:4,projects:1,newMetrics:1,products:0});
 fixture.version(2);const next=fixture.score();assert(next.every(row=>row.factors[2]>all.find(old=>old.name===row.name).factors[2]),'下一次查询必须读取最新期间事实');
 console.log('人员评分：共用事实、链群范围、八项分数、排序/覆盖及跨查询更新通过');
}
