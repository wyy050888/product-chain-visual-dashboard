import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
export function verifyResourceReportedMetrics(){
 const ctx=vm.createContext({});vm.runInContext(fs.readFileSync(new URL('../../src/modules/supplier-planning/00-resource-metrics.js',import.meta.url),'utf8'),ctx);
 assert.equal(ctx.scpResourceReportedMetrics(2025).rate,112.5,'2025固定样例补齐9/8的年度达成率');
 assert.deepEqual([1,2,3,4].map(q=>ctx.scpResourceReportedMetrics(2025,q).rate),[150,300,100,0]);
 const records=[{year:2026,period:'year',target:20,rate:47.5},{year:2026,period:'Q1',target:0,rate:80},{year:2026,period:'Q2',target:9,rate:0}];
 assert.equal(ctx.scpResourceReportedMetrics(2026,null,records).rate,47.5,'年度达成保留导入值，不从季度平均或数量反算');
 assert.equal(ctx.scpResourceReportedMetrics(2026,1,records).target,0,'有效零目标不冒充缺失');assert.equal(ctx.scpResourceReportedMetrics(2026,1,records).rate,80,'导入达成不依赖目标分母');
 assert.equal(ctx.scpResourceReportedMetrics(2026,2,records).rate,0);assert.equal(ctx.scpResourceReportedMetrics(2027,null,records).target,null);assert.equal(ctx.scpResourceReportedMetrics(2027,null,records).rate,null);
 assert.equal(ctx.scpResourceReportedMetrics(2026,3,records).rate,null,'缺失季度不得由全年补算');
 assert.equal(ctx.scpResourceReportedMetrics(2026,1,[{year:2026,period:'Q1',target:-1,rate:NaN}]).target,null);
 assert.equal(ctx.scpResourceReportedMetrics(2026,1,[{year:2026,period:'Q1',target:2,rate:120}]).rate,120,'超额完成保留原值');
}
