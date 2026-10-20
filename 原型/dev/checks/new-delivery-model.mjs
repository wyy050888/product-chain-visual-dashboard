import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
export function newDeliveryModel(){
 const shiftDate=(date,days)=>{const d=new Date(date+'T00:00:00Z');d.setUTCDate(d.getUTCDate()+days);return d.toISOString().slice(0,10)};
 const ctx=vm.createContext({shiftDate,pfCategory:p=>p.category});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/new-products/01-delivery-model.js',import.meta.url),'utf8'),ctx);
 const projects=Array.from({length:9},(_,id)=>({id,name:'project '+id,category:'环境类'}));
 const task=(projectId,planned,actual,taskId='task-'+projectId,kind='bulk-delivery')=>({projectId,planned,actual,taskId,kind});
 const tasks=[task(0,'2026-10-01','2026-10-11'),task(1,'2026-10-01','2026-10-12'),task(2,'2026-10-01',null),task(3,'2026-10-25','2026-10-25'),task(4,'2026-09-30','2026-10-01'),task(5,'2026-10-01','2026-10-01','design','design'),task(6,'bad','2026-10-01'),task(7,'2026-10-01','2026-10-01'),task(7,'2026-10-02','2026-10-13','task-7b')];
 const range={start:'2026-10-01',end:'2026-10-31',cutoff:'2026-10-19'};
 const result=ctx.nspDeliveryAssessment([...projects,projects[0]],[...tasks,tasks[0]],range);
 assert.equal(result.planned,5,'按项目去重，仅包含当期大货交付任务');
 assert.equal(result.ontime,1,'第10天算及时，第11天不算；未完成与截止日后完成均不计');
 assert.equal(result.rate,20);assert.equal(result.rows.find(p=>p.projectId===7).onTime,false,'同项目多条交付任务不能用单条完成代替');
 assert.equal(result.rows.find(p=>p.projectId===3).tasks[0].actual,null,'不提前读取未来完成记录');
 const earlier=ctx.nspDeliveryAssessment(projects,tasks,{...range,cutoff:'2026-10-10'});
 assert.equal(earlier.ontime,0,'按历史截止日复算');
 const empty=ctx.nspDeliveryAssessment(projects,[],range);assert.equal(empty.planned,0);assert.equal(empty.rate,null,'缺少任务不推断为0%');
}
