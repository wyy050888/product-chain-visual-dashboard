// 编辑表单月份：保留规范年月值，使用公共年月网格；输入只作快捷输入。
(() => {
  const app=GoalPrototype;
  let fields=[];
  const normalize=value=>value.trim().replace(/^(\d{4})[年/-](\d{1,2})月?$/,(_,year,month)=>`${year}-${month.padStart(2,'0')}`);
  function attach(input,signal) {
    const wrapper=document.createElement('span'), button=document.createElement('button');
    wrapper.className='month-field';input.before(wrapper);wrapper.append(input,button);
    input.type='text';input.value=input.value.replace('-','/');input.placeholder='YYYY/MM';input.dataset.combo=input.name;
    button.type='button';button.className='calendar-trigger month-field-trigger';button.disabled=input.disabled;
    button.setAttribute('aria-label','选择目标月份');button.setAttribute('aria-haspopup','dialog');button.setAttribute('aria-expanded','false');button.setAttribute('aria-controls','periodPicker');
    let previous=normalize(input.value);
    const open=()=>{
      const value=normalize(input.value),now=app.calendarGrid.current(),valid=/^\d{4}-(0[1-9]|1[0-2])$/.test(value)&&Number(value.slice(0,4))>=1900;
      app.periodPicker.openMonth(button,{year:valid?Number(value.slice(0,4)):now.year,month:valid?Number(value.slice(5)):now.month,
        commit:(year,month)=>{input.value=`${year}/${String(month).padStart(2,'0')}`;previous=normalize(input.value);input.dispatchEvent(new Event('change',{bubbles:true}));}});
    };
    input.setAttribute('aria-label','目标月份，格式YYYY/MM');
    button.addEventListener('click',open,{signal});input.addEventListener('click',open,{signal});
    input.addEventListener('keydown',event=>{if(['ArrowDown','ArrowUp'].includes(event.key)){event.preventDefault();open();}},{signal});
    input.addEventListener('blur',()=>{const value=normalize(input.value);if(value!==previous){previous=value;input.dispatchEvent(new Event('change',{bubbles:true}));}},{signal});
    fields.push({input,wrapper});
  }
  function detach() {
    if(fields.length)app.periodPicker.close();
    fields.forEach(({input,wrapper})=>{const value=normalize(input.value);wrapper.replaceWith(input);input.type='month';input.value=value;});fields=[];
  }
  app.monthField={attach,detach,value:normalize};
})();
