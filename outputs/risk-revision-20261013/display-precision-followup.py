from pathlib import Path
import re
root=Path(r'E:\需求合集\产品链目视化看板\原型/src/modules')
for p in root.rglob('*.js'):
 s=p.read_text(encoding='utf-8-sig')
 new=re.sub(r"(\.toFixed\()2(\)\s*\+\s*['\"]%)",r'\g<1>1\2',s)
 new=re.sub(r'(\d+\.\d)\d+(?=%)',r'\1',new)
 if p.parent.name=='cost-evaluation':new=new.replace("num=n=>fmt(n,2),money=n=>num(n)+'元',pp=n=>num(n)+'%'","num=n=>fmt(n,1),money=n=>pfMoneyYuan(n),pp=n=>fmt(n,1)+'%'")
 if p.parent.name=='new-product-returns':new=new.replace("gap<.005?'＜0.0%'","gap<.05?'＜0.1%'")
 if new!=s:p.write_text(new,encoding='utf-8')

