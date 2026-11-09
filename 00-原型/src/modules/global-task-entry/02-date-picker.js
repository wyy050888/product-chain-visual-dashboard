// 任务单日选择复用全局日历；字段名、边界和校验由调用方传入。
function gdTaskDatePickerMarkup({name='due',label='计划完成日期',value='',required=true}={}){
 return '<span class="gd-task-date-field" data-gd-task-date><input type="text" name="'+esc(name)+'" value="'+esc(value)+'" aria-label="'+esc(label)+'" placeholder="请选择日期" pattern="[0-9]{4}(?:-|/)[0-9]{2}(?:-|/)[0-9]{2}" maxlength="10" autocomplete="off" '+(required?'required':'')+' aria-haspopup="dialog" aria-expanded="false"><button type="button" data-gd-date-open aria-label="选择'+esc(label)+'"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2ZM7 2v5M17 2v5M3 10h18M7 13h2M11 13h2M15 13h2M7 16h2M11 16h2M15 16h2"/></svg></button><button type="button" data-gd-date-clear aria-label="清空'+esc(label)+'" hidden>×</button></span>';
}
function gdBindTaskDatePicker(row,options={}){
 const field=row.querySelector('[data-gd-task-date]'),input=field.querySelector('input'),button=field.querySelector('[data-gd-date-open]'),clear=field.querySelector('[data-gd-date-clear]'),events=new AbortController();let calendar=null;
 const close=()=>calendar?.close(false);
 const sync=()=>{clear.hidden=!input.value||input.disabled;button.disabled=input.disabled;if(input.disabled)close()};
 const open=()=>{
  if(input.disabled)return;
  if(calendar){close();return}
  let value='';try{value=(options.validate||upTodoValidateExecutionDue)(input.value.replaceAll('/','-'))}catch{/* 未完成或无效的手输内容不作为日历初值。 */}
  calendar=openDateRangePicker(input,{start:value,end:value},date=>{
   input.value=options.iso?date:date.replaceAll('-','/');input.setCustomValidity('');input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));
  },{single:true,boundary:field,min:options.min||(()=>aiToday()),max:options.max||'9999-12-31',presets:[],id:'gd-task-date-popover',label:'选择'+input.getAttribute('aria-label'),onClose:()=>{calendar=null}});
  calendar.panel.gdTaskDateField=field;
 };
 input.addEventListener('click',open,{signal:events.signal});
 button.addEventListener('click',event=>{event.preventDefault();open()},{signal:events.signal});
 clear.addEventListener('click',event=>{event.preventDefault();input.value='';input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}));input.focus({preventScroll:true})},{signal:events.signal});
 input.addEventListener('keydown',event=>{if(event.key==='ArrowDown'||event.key==='Enter'){event.preventDefault();if(!calendar)open()}},{signal:events.signal});
 input.addEventListener('input',()=>{input.setCustomValidity('');sync();close()},{signal:events.signal});
 field.gdDatePickerOpen=open;sync();return {open,sync,destroy:()=>{close();events.abort()}};
}
