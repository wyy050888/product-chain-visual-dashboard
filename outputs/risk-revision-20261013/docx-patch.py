from pathlib import Path
import json
root=Path('原型')
p=root/'src/modules/product-filters/01-model.js'
s=p.read_text(encoding='utf-8-sig')
s=s.replace("chain:source?.chain??record.chain,attribute:","chain:source?.chain??record.chain,category:pfCategory(source||record),attribute:")
s=s.replace(":String(p[key])===String(value);",":key==='chain'&&pfCategories.includes(value)?p.category===value:String(p[key])===String(value);")
s=s.replace("chain:chains.map((label,value)=>({label,value:String(value)}))","chain:pfCategories")
s=s.replace("chain:'类目（产品链）'","chain:'类目'")
old="return keys.map(key=>"+s.split("return keys.map(key=>",1)[1].split("\n}",1)[0]
new="""const field=key=>`<label>${labels[key]}<select ${attr}=\"${key}\" aria-label=\"${labels[key]}\">${pfOptions(choices[key],filters[key])}</select></label>`;
 const properties=keys.filter(k=>['attribute','isNew','clearance'].includes(k));
 return keys.filter(k=>!properties.includes(k)).map(field).join('')+(properties.length?pfAttributeField(filters,properties,attr,choices,labels):'');"""
s=s.replace(old,new)
p.write_text(s,encoding='utf-8')
p=root/'manifest.json'; m=json.loads(p.read_text(encoding='utf-8-sig')); i=next(i for i,x in enumerate(m['scripts']) if x['file'].endswith('product-filters/01-model.js'))
m['scripts'].insert(i,{'file':'src/modules/product-filters/00-categories.js','module':'产品类目与三合一属性组件'})
p.write_text(json.dumps(m,ensure_ascii=False,indent=2),encoding='utf-8')
