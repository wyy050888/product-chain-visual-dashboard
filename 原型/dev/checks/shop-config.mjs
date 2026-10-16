import {compassShopConfig} from './shop-admin.mjs';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
export async function shopConfig(page){
 const raw=[{shopId:'123',channel:'抖音',shopCategory:'旗舰店',assessed:false},{shopId:'123',channel:'天猫',shopCategory:'其他',assessed:true}];
 const ctx=vm.createContext({localStorage:{getItem:()=>null,setItem:()=>{}},sampleShopRows:()=>raw});
 vm.runInContext(fs.readFileSync(new URL('../../src/modules/shop-config/01-model.js',import.meta.url),'utf8'),ctx);
 assert.equal(ctx.shcSetShop('抖音|123',{shopCategory:'C店',assessed:true}).ok,true);
 assert.equal(ctx.shcApplyConfig(raw[0]).shopCategory,'C店');assert.equal(ctx.shcApplyConfig(raw[1]).shopCategory,'其他','同ID跨平台配置独立');
 assert.equal(ctx.shcSetShop('抖音|123',{shopCategory:'未知'}).ok,false);assert.equal(ctx.shcSetShop('抖音|123',{assessed:'yes'}).ok,false);
 assert.equal(ctx.shcSetShop('京东|不存在',{assessed:true}).ok,false);
 await compassShopConfig(page);
}
