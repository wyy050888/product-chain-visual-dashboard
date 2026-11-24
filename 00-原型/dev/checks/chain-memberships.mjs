import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

const linkedPerson={id:'product-center:张晓阳',name:'张晓阳'};

function checkChainScope(roles,groups,departments,chains,{purchase,product,board={id:'total'}}){
 const context=vm.createContext({rmDepartmentNames:departments,filterCatalog:{chains}});
 for(const file of ['04-role-store.js','06-chain-memberships.js']){
  const source=new URL('../../src/modules/system-management/'+file,import.meta.url);
  vm.runInContext(fs.readFileSync(source,'utf8'),context);
 }
 const rows=context.smChainAccessRows(linkedPerson,board,{id:'key-work',type:'department'},roles,groups);
 assert.equal(rows.find(row=>row.department==='采购部').chains.join('、'),purchase);
 assert.equal(rows.find(row=>row.department==='产品中心').chains.join('、'),product);
}

export async function chainMemberships(page){
 await page.locator('#lt-system-nav').click();
 const menu=page.locator('#lt-system .lt-sidebar');
 await menu.getByText('权限管理',{exact:true}).click();
 const usersLink=menu.getByRole('link',{name:'用户管理',exact:true});
 await usersLink.click();
 const users=page.locator('#system-user-page');
 assert.deepEqual(await users.getByRole('tab').allTextContents(),['系统账号','供应商账号','链群配置']);
 const chainsTab=users.getByRole('tab',{name:'链群配置',exact:true});
 assert.equal(await chainsTab.getAttribute('aria-selected'),'true');
 const userRoute=page.url();
 for(const name of ['系统账号','供应商账号']){
  const tab=users.getByRole('tab',{name,exact:true});
  assert(await tab.isDisabled());
  const rect=await tab.boundingBox();
  await page.mouse.click(rect.x+rect.width/2,rect.y+rect.height/2);
  assert.equal(page.url(),userRoute);
 }
 await chainsTab.press('ArrowLeft');
 assert.equal(await chainsTab.getAttribute('aria-selected'),'true');
 const matrix=users.getByRole('table',{name:'部门与链群用户配置'});
 const headers=await matrix.getByRole('columnheader').allTextContents();
 const [, ...chains]=headers;
 const departmentsInMatrix=await matrix.getByRole('rowheader').allTextContents();
 assert.deepEqual(headers,['部门','环境','清洁','厨电','个护','健康']);
 assert.equal(await users.getByRole('table').count(),1);
 assert.equal(await users.getByText('看板权限核对',{exact:true}).count(),0);
 const memberCell=(department,chain)=>matrix.getByRole('button',{name:`配置${department} · ${chain}的用户`,exact:true});
 assert.equal(await memberCell('产品中心','环境').innerText(),'张晓阳、张泽昆');
 const assign=async(department,chain,people)=>{
  await memberCell(department,chain).click();
  const editor=page.getByRole('dialog',{name:'选择用户',exact:true});
  assert(await editor.getByText(`${department} · ${chain}`,{exact:true}).isVisible());
  const picker=editor.getByRole('button',{name:'选择人员',exact:true});
  assert.equal(await picker.count(),1);
  assert((await picker.boundingBox()).width>=450);
  await picker.click();
  assert(await editor.getByRole('option',{name:'梁勋进',exact:true}).isVisible());
  assert.equal(await editor.getByRole('option',{name:/演示账号/}).count(),0);
  const search=editor.getByRole('combobox',{name:'搜索并多选人员',exact:true});
  for(const name of people){
   await search.fill(name);
   await editor.getByRole('option',{name,exact:true}).click();
  }
  assert.equal(await editor.locator('[data-people-remove]').count(),people.length);
  await editor.getByRole('button',{name:'保存',exact:true}).click();
  await editor.waitFor({state:'hidden'});
 };
 await assign('产品中心','厨电',['梁勋进','刘萱','张晓阳']);
 await assign('采购部','清洁',[linkedPerson.name]);
 assert.equal(await memberCell('产品中心','厨电').innerText(),'梁勋进、刘萱、张晓阳');

 await menu.getByRole('link',{name:'角色管理',exact:true}).click();
 const role=page.locator('#system-role-page').getByRole('row').filter({has:page.getByRole('cell',{name:'链主',exact:true})});
 await role.getByRole('button',{name:'更多',exact:true}).click();
 await role.getByRole('button',{name:'分配用户',exact:true}).click();
 const roleUsers=page.getByRole('dialog',{name:'分配用户',exact:true});
 await roleUsers.getByRole('checkbox',{name:linkedPerson.name,exact:true}).check();
 await roleUsers.getByRole('button',{name:'提交',exact:true}).click();
 await roleUsers.waitFor({state:'hidden'});
 await role.getByRole('button',{name:'修改',exact:true}).click();
 const permissions=page.getByRole('dialog',{name:'修改角色'});
 await permissions.getByRole('tab',{name:'产品链看板',exact:true}).click();
 await permissions.getByRole('tab',{name:'总看板',exact:true}).click();
 await permissions.getByRole('tabpanel',{name:'总看板',exact:true}).getByRole('checkbox',{name:'重点工作清单可见',exact:true}).check();
 const departments=permissions.getByRole('button',{name:'总看板 · 重点工作清单部门',exact:true});
 await departments.click();
 await permissions.getByRole('group',{name:'总看板 · 重点工作清单部门选项',exact:true}).getByRole('checkbox',{name:'采购部',exact:true}).check();
 await departments.click();
 await permissions.getByRole('combobox',{name:'总看板 · 重点工作清单链群',exact:true}).selectOption('chain');
 await permissions.getByRole('button',{name:'保存',exact:true}).click();
 await permissions.waitFor({state:'hidden'});

 const readGroups=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('pc-system-chain-memberships-v1')));
 const roles=await page.evaluate(()=>JSON.parse(localStorage.getItem('pc-system-roles-v1')));
 checkChainScope(roles,await readGroups(),departmentsInMatrix,chains,{purchase:'清洁',product:''});
 const productBoard={id:'product',department:'产品中心'};
 checkChainScope(roles,await readGroups(),departmentsInMatrix,chains,{purchase:'',product:'环境、厨电',board:productBoard});
 const configured=structuredClone(roles);
 configured.find(role=>role.code==='chain-owner').dashboards.product.departments['key-work'].采购部='chain';
 checkChainScope(configured,await readGroups(),departmentsInMatrix,chains,{purchase:'清洁',product:'环境、厨电',board:productBoard});
 const switchedOff=structuredClone(roles);
 const access=switchedOff.find(role=>role.code==='chain-owner').dashboards.total;
 access.modules=access.modules.filter(id=>id!=='key-work');
 checkChainScope(switchedOff,await readGroups(),departmentsInMatrix,chains,{purchase:'',product:''});
 await usersLink.click();
 await page.reload();
 assert.equal(await memberCell('采购部','清洁').innerText(),linkedPerson.name);
 await memberCell('采购部','清洁').click();
 const edit=page.getByRole('dialog',{name:'选择用户',exact:true});
 const picker=edit.getByRole('button',{name:'选择人员',exact:true});
 assert.equal(await picker.innerText(),linkedPerson.name);
 await picker.click();
 await edit.getByRole('button',{name:`移除${linkedPerson.name}`,exact:true}).click();
 await page.keyboard.press('Escape');
 assert(await picker.isVisible());
 await edit.getByRole('button',{name:'保存',exact:true}).click();
 assert.equal(await memberCell('采购部','清洁').innerText(),'配置用户');
 checkChainScope(roles,await readGroups(),departmentsInMatrix,chains,{purchase:'',product:''});

 await page.evaluate(personId=>{
  const key='pc-system-chain-memberships-v1';
  const groups=JSON.parse(localStorage.getItem(key));
  groups['采购部']['个护&健康']=[personId,'chain-owner-demo'];
  localStorage.setItem(key,JSON.stringify(groups));
 },linkedPerson.id);
 await page.reload();
 assert.equal(await memberCell('采购部','个护').innerText(),linkedPerson.name);
 assert.equal(await memberCell('采购部','健康').innerText(),linkedPerson.name);
 checkChainScope(roles,await readGroups(),departmentsInMatrix,chains,{purchase:'个护、健康',product:''});
 await memberCell('采购部','个护').click();
 assert.equal(await picker.innerText(),linkedPerson.name);
 await picker.click();
 await edit.getByRole('button',{name:`移除${linkedPerson.name}`,exact:true}).click();
 await edit.getByRole('button',{name:'保存',exact:true}).click();
 await edit.waitFor({state:'hidden'});
 await page.reload();
 assert.equal(await memberCell('采购部','个护').innerText(),'配置用户');
 assert.equal(await memberCell('采购部','健康').innerText(),linkedPerson.name);
 checkChainScope(roles,await readGroups(),departmentsInMatrix,chains,{purchase:'健康',product:''});

 await page.setViewportSize({width:390,height:844});
 assert(await chainsTab.isVisible());
 assert(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));
 await memberCell('产品中心','环境').click();
 assert((await edit.boundingBox()).width<=370);
 await edit.getByRole('button',{name:'取消',exact:true}).click();
 console.log('通过：产品中心人员多选、选择框宽度、角色联动及链群配置重载回显。');
}
