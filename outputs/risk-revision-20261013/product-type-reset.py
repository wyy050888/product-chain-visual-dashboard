from pathlib import Path
root=Path(r'E:\需求合集\产品链目视化看板\原型/src/modules')
p=root/'product-filters/00-categories.js'
s=p.read_text(encoding='utf-8-sig')
needle="document.addEventListener('click',e=>{"
helper="""// 从实际控件值同步摘要及选中态，筛选重置后不保留旧显示。
function pfAttributeSync(root){for(const menu of root.querySelectorAll('.pf-attribute')){
 for(const select of menu.querySelectorAll('.pf-attribute-row select'))for(const radio of select.parentElement.querySelectorAll('[role=radio]'))radio.setAttribute('aria-checked',String(radio.dataset.pfAttributeChoice===select.value));
 menu.querySelector('.pf-attribute-value').textContent=[...menu.querySelectorAll('select')].filter(s=>s.value!=='all').map(s=>s.getAttribute('aria-label')+':'+s.selectedOptions[0].textContent).join(' / ')||'全部';
}}
"""
s=s.replace(needle,helper+needle,1)
old="menu.querySelector('.pf-attribute-value').textContent=[...menu.querySelectorAll('select')].filter(s=>s.value!=='all').map(s=>s.getAttribute('aria-label')+':'+s.selectedOptions[0].textContent).join(' / ')||'全部';"
# Replace only the click handler copy; keep the helper body.
at=s.index("document.addEventListener('click'")
s=s[:at]+s[at:].replace(old,'pfAttributeSync(bar);',1)
p.write_text(s,encoding='utf-8')
for name,scope in [('new-product-facts/01.js','.new-all-filters'),('inventory-detail/01.js','.ipd-filters')]:
 p=root/name
 s=p.read_text(encoding='utf-8-sig')
 old="for(const s of $$(\""+scope+" [data-pf-filter]\"))s.value='all';"
 old=old.replace('"',"'")
 assert old in s,old
 s=s.replace(old,old+"pfAttributeSync($('"+scope+"'));",1)
 p.write_text(s,encoding='utf-8')
