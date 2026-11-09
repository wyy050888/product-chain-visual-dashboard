function gdTaskExecutionEditorMarkup(){
 const label=text=>'<span class="gd-task-required" aria-hidden="true">*</span>'+text;
 return '<section class="gd-task-executions gd-task-entry-wide" data-gd-task-executions><header><h4>任务下发</h4><button type="button" class="link" data-gd-execution-add>新增执行事项</button></header><div class="gd-task-execution-columns" aria-hidden="true"><span>'+label('执行事项')+'</span><span>'+label('负责人')+'</span><span>'+label('计划完成日期')+'</span><span></span></div><div data-gd-execution-rows></div></section>';
}
function gdBindTaskExecutionEditor(form){
 const host=form.querySelector('[data-gd-task-executions]'),list=host.querySelector('[data-gd-execution-rows]'),pickers=new Map();let sequence=0;
 const sync=()=>{
  for(const row of list.children)row.querySelector('[data-gd-execution-remove]').disabled=list.children.length===1;
  const planned=form.querySelector('[data-ledger-field="due"] input'),dates=[...list.querySelectorAll('[name=due]')].map(input=>input.value.replaceAll('/','-')).filter(uiPeriodValidDate).sort();
  if(planned){planned.value=dates.at(-1)||'';planned.title='取执行事项中最晚的计划完成日期'}
 };
 list.addEventListener('input',event=>{if(event.target.name==='due')sync()});
 list.addEventListener('change',event=>{if(event.target.name==='due')sync()});
 const add=focus=>{
  const row=document.createElement('div'),id=sequence++?'gd-task-assignee-options-'+crypto.randomUUID():'gd-task-assignee-options';row.className='gd-task-execution-row';row.dataset.gdExecutionRow='';
  const field=(label,control)=>'<label><span class="gd-task-row-label"><span class="gd-task-required" aria-hidden="true">*</span>'+label+'</span>'+control+'</label>';
  row.innerHTML=field('执行事项','<textarea name="plan" aria-label="执行事项" placeholder="填写执行事项" required rows="2" maxlength="3000"></textarea>')+field('负责人',gdTaskAssigneePickerMarkup(id))+field('计划完成日期',gdTaskDatePickerMarkup())+upTodoExecutionIcon('data-gd-execution-remove','删除执行事项','<path d="M3 6h18M9 6V4h6v2M6 6l1 14h10l1-14M10 10v6M14 10v6"/>');
  list.append(row);const ownerPicker=gdBindTaskAssigneePicker(row),datePicker=gdBindTaskDatePicker(row);pickers.set(row,{destroy:()=>{ownerPicker.destroy();datePicker.destroy()}});sync();if(focus)row.querySelector('textarea').focus();
 };
 host.querySelector('[data-gd-execution-add]').onclick=()=>add(true);
 list.addEventListener('click',event=>{const button=event.target.closest('[data-gd-execution-remove]');if(!button||button.disabled)return;const row=button.closest('[data-gd-execution-row]');pickers.get(row).destroy();pickers.delete(row);row.remove();sync()});
 form.closest('dialog').addEventListener('close',()=>{for(const picker of pickers.values())picker.destroy();pickers.clear()},{once:true});add(false);
 return {read:()=>[...list.children].map(row=>({action:row.querySelector('[name=plan]').value,assignees:row.querySelector('[name=assignee]').value,due:row.querySelector('[name=due]').value.replaceAll('/','-')}))};
}
