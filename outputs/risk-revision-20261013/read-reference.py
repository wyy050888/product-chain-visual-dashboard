from zipfile import ZipFile
from xml.etree import ElementTree as E
from pathlib import Path
import json
p=Path(r'C:\Users\嗡嗡\Downloads\待修改项.docx')
ns={'w':'http://schemas.openxmlformats.org/wordprocessingml/2006/main'}
def paragraph(p):
 runs=[]
 for r in p.findall('.//w:r',ns):
  text=''.join(r.itertext()) if False else ''.join(t.text or '' for t in r.findall('w:t',ns))
  if not text:continue
  prop=r.find('w:rPr',ns)
  b=prop.find('w:b',ns) if prop is not None else None
  color=prop.find('w:color',ns) if prop is not None else None
  runs.append({'text':text,'bold':b is not None and b.get('{'+ns['w']+'}val')!='0','color':color.get('{'+ns['w']+'}val') if color is not None else None})
 return {'text':''.join(r['text'] for r in runs),'runs':runs}
with ZipFile(p) as z:
 root=E.fromstring(z.read('word/document.xml'));body=root.find('w:body',ns);blocks=[]
 for child in body:
  if child.tag.endswith('}p'):
   item=paragraph(child)
   if item['text']:blocks.append(item)
  elif child.tag.endswith('}tbl'):
   rows=[]
   for row in child.findall('w:tr',ns):
    rows.append([[paragraph(p) for p in c.findall('.//w:p',ns)] for c in row.findall('w:tc',ns)])
   blocks.append({'table':rows})
 comments=z.read('word/comments.xml').decode('utf-8') if 'word/comments.xml' in z.namelist() else ''
 images=[n for n in z.namelist() if n.startswith('word/media/')]
 out=Path(r'E:\需求合集\产品链目视化看板\outputs\risk-revision-20261013\reference-docx.json')
 out.write_text(json.dumps({'blocks':blocks,'comments_xml':comments,'images':images},ensure_ascii=False,indent=2),encoding='utf-8')
 print(json.dumps({'blocks':blocks,'images':images,'comments_xml':comments},ensure_ascii=False))

