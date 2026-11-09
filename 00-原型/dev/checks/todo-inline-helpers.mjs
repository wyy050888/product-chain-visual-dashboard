// 通过用户可见的字段值进入编辑，不从隐藏控件绕过点击交互。
export function todoExecutionGroup(row){return row.locator('xpath=ancestor-or-self::*[@data-execution-group][1]')}
export function todoOwnerPicker(row){return todoExecutionGroup(row).locator('[data-responsibility-owners]')}
export async function editTodoField(root,key){
 const scope=key==='action'&&await root.getAttribute('data-responsibility-row')?todoExecutionGroup(root):root;
 const field=scope.locator('[data-todo-field="'+key+'"]').first();
 if(!await field.locator('[data-inline-value]').count())await field.locator('[data-todo-field-edit]').click();
 return field;
}
export async function setTodoRoleStatus(row,value){
 const field=await editTodoField(row,'status');await field.locator('select').selectOption(value);
}
export async function fillTodoRoleFeedback(row,value){
 const field=await editTodoField(row,'feedback'),input=field.locator('textarea');await input.fill(value);await input.press('Tab');
}
