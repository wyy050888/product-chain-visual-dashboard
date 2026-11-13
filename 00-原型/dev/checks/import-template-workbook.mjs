import {execFileSync} from 'node:child_process';
import path from 'node:path';
import os from 'node:os';

const python=process.env.DASHBOARD_PYTHON_PATH||path.join(os.homedir(),'.cache/codex-runtimes/codex-primary-runtime/dependencies/python/python.exe');
const script=String.raw`
import base64,io,json,sys,zipfile,xml.etree.ElementTree as E
p=json.loads(sys.stdin.buffer.read().decode('utf-8')); ns='http://schemas.openxmlformats.org/spreadsheetml/2006/main'; q=lambda x:'{'+ns+'}'+x
with zipfile.ZipFile(io.BytesIO(base64.b64decode(p['workbook']))) as z:
 strings=[''.join(t.text or '' for t in n.iter(q('t'))) for n in E.fromstring(z.read('xl/sharedStrings.xml'))] if 'xl/sharedStrings.xml' in z.namelist() else []
 sheetPath='xl/worksheets/sheet'+str(p.get('sheet',1))+'.xml'
 sheet=E.fromstring(z.read(sheetPath)); rows=[]; marks=[]
 def text(c):
  v=c.find(q('v'))
  return strings[int(v.text)] if c.get('t')=='s' and v is not None else ''.join(t.text or '' for t in c.iter(q('t'))) if c.get('t')=='inlineStr' else v.text or '' if v is not None else ''
 for r in sheet.iter(q('row')):
  values=[]
  for c in r:
   values.append(text(c))
   inline=c.find(q('is'))
   rich=inline if inline is not None else E.fromstring(z.read('xl/sharedStrings.xml'))[int(c.find(q('v')).text)] if c.get('t')=='s' else []
   runs=[{'text':t.find(q('t')).text or '', 'color':t.find(q('rPr')+'/'+q('color')).get('rgb') if t.find(q('rPr')+'/'+q('color')) is not None else ''} for t in rich if t.tag==q('r')]
   if runs: marks.append({'cell':c.get('r'),'text':text(c),'runs':runs})
  rows.append({'row':int(r.get('r')),'values':values})
 styles={}
 if p.get('styles'):
  root=E.fromstring(z.read('xl/styles.xml')); fills=root.find(q('fills')); formats=root.find(q('cellXfs'))
  def color(index):
   pattern=fills[index].find(q('patternFill')); foreground=pattern.find(q('fgColor'))
   return foreground.get('rgb') if pattern.get('patternType')=='solid' and foreground is not None else None
  fonts=root.find(q('fonts'))
  def font_color(c):
   font=fonts[int(formats[int(c.get('s','0'))].get('fontId','0'))]; ink=font.find(q('color'))
   return ink.get('rgb') if ink is not None else None
  styles={'defaultFill':color(int(formats[0].get('fillId','0'))),'cellFills':{c.get('r'):color(int(formats[int(c.get('s','0'))].get('fillId','0'))) for c in sheet.iter(q('c'))},'cellFonts':{c.get('r'):font_color(c) for c in sheet.iter(q('c'))}}
 if p.get('fill') is None:
  print(json.dumps({'rows':rows,'marks':marks,'sheetNames':[n.get('name') for n in E.fromstring(z.read('xl/workbook.xml')).iter(q('sheet'))],**styles},ensure_ascii=False))
 else:
  data=sheet.find(q('sheetData')); header=p['header']
  for r in list(data):
   if int(r.get('r'))>header and not (p.get('keepExample') and int(r.get('r'))==header+1 and text(list(r)[0]).startswith('【示例】')):data.remove(r)
  dataRow=header+2 if p.get('keepExample') else header+1
  records=p['fill'] if p.get('multipleRows') else [p['fill']]
  for offset,values in enumerate(records):
   at=dataRow+offset;row=E.SubElement(data,q('row'),{'r':str(at)})
   for i,value in enumerate(values):
    n=i+1; col=''
    while n:n,d=divmod(n-1,26);col=chr(65+d)+col
    if isinstance(value,dict) and 'formula' in value:
     c=E.SubElement(row,q('c'),{'r':col+str(at),'t':value.get('type','n')})
     E.SubElement(c,q('f')).text=value['formula']
     if value.get('cached') is not None: E.SubElement(c,q('v')).text=str(value['cached'])
    else:
     c=E.SubElement(row,q('c'),{'r':col+str(at),'t':'inlineStr'});E.SubElement(E.SubElement(c,q('is')),q('t')).text=str(value)
  out=io.BytesIO()
  with zipfile.ZipFile(out,'w',zipfile.ZIP_DEFLATED) as result:
   for item in z.infolist():result.writestr(item,E.tostring(sheet,encoding='utf-8',xml_declaration=True) if item.filename==sheetPath else z.read(item.filename))
  sys.stdout.buffer.write(out.getvalue())
`;
function run(workbook,extra={}){return execFileSync(python,['-X','utf8','-c',script],{input:JSON.stringify({workbook:workbook.toString('base64'),...extra}),maxBuffer:15*1024*1024})}
export const inspectImportWorkbook=(buffer,options={})=>JSON.parse(run(buffer,options).toString('utf8'));
export const fillImportWorkbook=(buffer,header,fill,options={})=>run(buffer,{header,fill,...options});
export const fillImportWorkbookRows=(buffer,header,rows,options={})=>run(buffer,{header,fill:rows,multipleRows:true,...options});
export const cleanTemplateHeader=value=>String(value).trim().replace(/^[*＊]\s*|\s*[*＊]$/g,'').replace(/（(?:实际降本必填|钉钉名称|填写产品时必填|填报目标时必填|YYYY\/MM\/DD|YYYY\/MM)）$/,'').trim();
export function importTemplateHeader(book){
 const header=book.rows.find(row=>row.values.some(value=>String(value).startsWith('*')));
 if(!header)throw Error('未找到模板表头');
 return header;
}
