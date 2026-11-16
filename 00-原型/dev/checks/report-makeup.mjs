import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export function reportMakeup(){
 const ctx=vm.createContext({shiftDate:(s,n)=>{const d=new Date(s+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+n);return d.toISOString().slice(0,10)}});
 for(const file of ['02-records.js','03-analysis-model.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/global-diagnosis/'+file,import.meta.url),'utf8'),ctx);
 assert.equal(ctx.gdReportDeadline('2026-10-31','日报'),'2026-11-01T09:00:00+08:00','日报跨月次日9点');
 assert.equal(ctx.gdReportDeadline('2026-10-19','周报'),'2026-10-26T09:00:00+08:00');
 assert.equal(ctx.gdReportDeadline('2026-10-25','周报'),'2026-10-26T09:00:00+08:00','周日所属周的下一周一');
 assert.equal(ctx.gdReportDeadline('2026-12-31','周报'),'2027-01-04T09:00:00+08:00','周报跨年');
 assert.equal(ctx.gdReportDeadline('2026-09-30','月报'),'2026-10-05T09:00:00+08:00','月报次月5日9点');
 assert.equal(ctx.gdReportDeadline('2026-12-31','月报'),'2027-01-05T09:00:00+08:00','月报跨年');
 assert.equal(ctx.gdReportDeadline('2028-02-29','月报'),'2028-03-05T09:00:00+08:00','闰月也按次月5日');
 const daily={id:'daily',type:'日报',missing:true,latestSubmittedAt:'2026-10-06T09:30:00+08:00'};
 const reports=[daily,{...daily,id:'weekly',type:'周报'},{...daily,id:'monthly',type:'月报'},{...daily,id:'submitted',missing:false}];
 const scoped=ctx.gdAnalysisRows({reports},'execution','missing');
 assert.equal(scoped.length,0,'旧缺报记录不进入部门周报下载区');
}
