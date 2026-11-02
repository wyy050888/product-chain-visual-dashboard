import {modelClock} from './model-clock.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

export function verifyCostDepartmentAliases(){
 const sandbox={...modelClock(),ccDepartments:[{id:'purchase',name:'采购部（去计划）',metrics:['产品降本']},{id:'shipping',name:'发货部（去仓储）',metrics:['快递降价']}],ccItems:[{id:'purchase-0',department:'purchase',category:'product',metricIndex:0,metric:'产品降本'},{id:'shipping-0',department:'shipping',category:'logistics',metricIndex:0,metric:'快递降价'}],ccMetrics:[],ccLedger:[],DATA_CUTOFF:'2026-10-10',localStorage:{getItem:()=>null}};
 vm.createContext(sandbox);vm.runInContext(fs.readFileSync(new URL('../../src/modules/cost-control/00-categories.js',import.meta.url),'utf8'),sandbox);
 for(const name of ['00-metric-catalog.js','01-model.js','02-import.js','02-annual-import.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/cost-config/'+name,import.meta.url),'utf8'),sandbox);
 const annualHeaders=['责任部门','降本指标','年度','数据类型',...Array.from({length:12},(_,i)=>(i+1)+'月'),'备注'];
 const annual=(department,metric,type,value)=>[department,metric,'2026',type,value,...Array(11).fill(''),''];
 const result=sandbox.cecValidateImport([annualHeaders,annual('采购部（去计划）','产品降本','目标值','123.45'),annual('采购部','产品降本','实际达成','67.89'),annual('发货部(去仓储)','快递降价','目标值','-9.87')]);
 assert.equal(result.errors.length,0);assert.equal(result.entries.length,2);
 assert.equal(result.next.months['purchase-0|2026-01'].targetCents,12345);
 assert.equal(result.next.months['purchase-0|2026-01'].actualCents,6789);
 assert.equal(result.next.months['shipping-0|2026-01'].targetCents,-987);
 assert.deepEqual(Array.from(result.entries,r=>r.department),['采购部（去计划）','发货部（去仓储）']);
 const duplicate=sandbox.cecValidateImport([annualHeaders,annual('采购部（去计划）','产品降本','目标值','1'),annual('采购部','产品降本','目标值','2')]);
 assert.match(duplicate.errors[0].message,/重复/);assert.equal(duplicate.entries.length,0);
 const legacyHeaders=['项目编号','项目名称','责任部门','降本指标','责任人','年月','目标金额','实际降本金额','备注'];
 const monthly=sandbox.cecValidateImport([legacyHeaders,['','','发货部（去仓储）','快递降价','','2026-02','100','20','']]);
 assert.equal(monthly.errors.length,0);assert.equal(monthly.next.months['shipping-0|2026-02'].actualCents,2000);
 const invalid=sandbox.cecValidateImport([annualHeaders,annual('采购部（扣计划）','产品降本','目标值','1')]);
 assert.match(invalid.errors[0].message,/责任部门不存在/);
 assert.equal(sandbox.ccItems.length,2);assert.equal(sandbox.ccLedger.length,0,'导入预校验不修改现有金额');
}
