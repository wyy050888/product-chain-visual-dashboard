import vm from 'node:vm';
import fs from 'node:fs';
const definitions=fs.readFileSync(new URL('../../src/modules/business-rules/00-definitions.js',import.meta.url),'utf8');
export function businessRuleContext(environment={}){
 const context=vm.createContext(environment);vm.runInContext(definitions,context);
 if(typeof context.brcNumber!=='function')vm.runInContext('function brcNumber(key){return brcDefaults[key]}',context);
 for(const file of ['00-refurb-cycle.js','00-condition-catalog.js','00-condition-math.js','00-score-rules.js','00-grade-scale.js','00-condition-runtime.js','00-result-groups.js','01-validation.js','01-success-periods.js'])vm.runInContext(fs.readFileSync(new URL('../../src/modules/business-rules/'+file,import.meta.url),'utf8'),context);
 return context;
}

export async function revealBusinessRule(page,key){
 const data=await page.evaluate(()=>window.businessRuleConfigSnapshot()),item=data.items.find(rule=>rule.key===key);
 if(!item)throw new Error('无可编辑配置：'+key);
 if(data.activeGroup!==item.group)await page.locator('[data-brc-tab="'+item.group+'"]').click();
 const section=data.sections[item.group].find(part=>part.keys.includes(key));
 await page.locator('[data-brc-section-tab="'+section.id+'"]').click();
}
