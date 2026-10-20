import {modelClock} from './model-clock.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
export function verifySupplierTargetsModel(){
 const source=fs.readFileSync(new URL('../../src/data/filter-catalog.js',import.meta.url),'utf8')+'\n'+['supplier-planning/00-reference.js','supplier-targets/01-model.js'].map(name=>fs.readFileSync(new URL('../../src/modules/'+name,import.meta.url),'utf8')).join('\n');
 const make=(saved=null,fail=false)=>{const memory={value:saved},sandbox={...modelClock(),brands:['美的','海尔','苏泊尔','康佳','创维','小米','戴森'],pfCategories:['个护类','环境类','清洁类','厨电类','健康类'],window:{},localStorage:{getItem:()=>memory.value,setItem:(key,value)=>{if(fail)throw Error('quota');memory.value=value}}};vm.createContext(sandbox);vm.runInContext(source,sandbox);return vm.runInContext('({stMachine,stMaterial,stStandards,stGrade,stSetValue,stSetGrade,stBrands,stEditor,stPageBrands})',sandbox)};
 const model=make();assert.deepEqual(Array.from(model.stMachine(2026)),[2,3,3,2]);assert.deepEqual(Array.from(model.stMachine(2027)),[0,0,0,0]);
 for(const value of [-1,1.5,100000,Infinity,NaN])assert.equal(model.stSetValue({year:2026,type:'machine',quarter:0},value).ok,false);
 assert.equal(model.stSetValue({year:2026,type:'machine',quarter:4},3).ok,false);assert.equal(model.stSetValue({year:2026,type:'material',brand:'不存在',quarter:0},3).ok,false);assert.equal(model.stSetValue({year:2026,type:'standards',key:'materialAdmitted'},0).ok,false);assert.equal(model.stSetValue({year:2026,type:'standards',key:'unknown'},1).ok,false);assert.equal(model.stSetGrade('美的','C').ok,false);
 assert.equal(model.stSetValue({year:2026,type:'machine',quarter:0},0).ok,true);assert.equal(model.stMachine(2026)[0],0);assert.equal(model.stMachine(2025)[0],2);
 assert.equal(model.stSetValue({year:2026,type:'material',brand:'美的',category:'个护类',quarter:3},4).ok,true);assert.equal(model.stMaterial(2026,'美的','个护类')[3],4);assert.equal(model.stMaterial(2026,'美的')[3],2,'类目目标不累加覆盖品牌去重目标');
 const extra=make();assert.deepEqual(Array.from(extra.stMaterial(2026,'小米')),[0,0,0,0]);assert.equal(extra.stGrade('小米'),'');assert.equal(extra.stSetValue({year:2026,type:'material',brand:'小米',quarter:2},6).ok,true);assert.equal(extra.stMaterial(2026,'小米')[2],6);assert.equal(extra.stSetGrade('小米','A').ok,true);assert.equal(extra.stGrade('小米'),'A');
 const paging=make();paging.stBrands.push(...Array.from({length:10},(_,i)=>['分页品牌'+i,'']));assert.equal(paging.stPageBrands().length,10);paging.stEditor.materialPage=2;assert.equal(paging.stPageBrands().length,7);assert.equal(paging.stPageBrands()[0][0],'分页品牌3');paging.stEditor.materialPage=99;assert.equal(paging.stPageBrands().length,7);assert.equal(paging.stEditor.materialPage,2);
 const blocked=make(null,true);assert.equal(blocked.stSetValue({year:2026,type:'machine',quarter:3},9).ok,false);assert.equal(blocked.stMachine(2026)[3],2);assert.equal(blocked.stSetGrade('美的','B').ok,false);assert.equal(blocked.stGrade('美的'),'A');
 const corrupt=make(JSON.stringify({version:1,years:{2026:{machine:[1,-1,2,3],standards:{materialAdmitted:0}}},grades:{'美的':'C'}}));assert.deepEqual(Array.from(corrupt.stMachine(2026)),[2,3,3,2]);assert.equal(corrupt.stStandards(2026).materialAdmitted,5);assert.equal(corrupt.stGrade('美的'),'A');
 console.log('通过：供应商目标整数/范围校验、年份隔离、品牌与类目口径独立、坏缓存及保存失败保护');
}
