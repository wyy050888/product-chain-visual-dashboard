// 任务日期复用全局日历，只选择一个计划完成日；业务校验仍由执行事项模型负责。
function gdTaskDatePickerMarkup(){
 return '<span class="gd-task-date-field" data-gd-task-date><input type="text" name="due" aria-label="计划完成日期" placeholder="请选择日期" pattern="[0-9]{4}(?:-|/)[0-9]{2}(?:-|/)[0-9]{2}" maxlength="10" autocomplete="off" required aria-haspopup="dialog" aria-expanded="false"><button type="button" data-gd-date-open aria-label="选择计划完成日期"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM7 2v5M17 2v5M3 10h18M7 13h2M11 13h2M15 13h2M7 16h2M11 16h2M15 16h2"/></svg></button><button type="button" data-gd-date-clear aria-label="清空计划完成日期" hidden>×</button></span>';
}
function gdBindTaskDatePicker(row){
 const field=row.querySelector('[data-gd-task-date]'),input=field.querySelector('input'),button=field.querySelector('[data-gd-date-open]'),clear=field.querySelector('[data-gd-date-clear]'),events=new AbortController();let calendar=null;
 const close=()=>calendar?.close(false);
 const open=()=>{
  if(calendar){close();return}
  let value='';try{value=upTodoValidateExecutionDue(input.value.replaceAll('/','-'))}catch{/* 未完成或无效的手输内容不作为日历初值。 */}
  calendar=openDateRangePicker(input,{start:value,end:value},date=>{
   input.value=date.replaceAll('-','/');input.setCustomValidity('');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
  },{single:true,boundary:field,min:()=>aiToday(),max:'9999-12-31',presets:[],id:'gd-task-date-popover',label:'选择计划完成日期',onClose:()=>{calendar=null}});
 };
 input.addEventListener('click',open,{signal:events.signal});
 button.addEventListener('click',event=>{event.preventDefault();open()},{signal:events.signal});
 clear.addEventListener('click',event=>{event.preventDefault();input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.focus({preventScroll:true})},{signal:events.signal});
 input.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();if(!calendar)open()}},{signal:events.signal});
 input.addEventListener('input',()=>{input.setCustomValidity('');clear.hidden=!input.value;close()},{signal:events.signal});
 return {destroy:()=>{close();events.abort()}};
}
