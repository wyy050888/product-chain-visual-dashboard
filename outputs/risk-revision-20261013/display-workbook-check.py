from zipfile import ZipFile
from pathlib import Path
from xml.etree import ElementTree as E
import re,json
p=Path(r'E:\需求合集\产品链目视化看板\outputs\risk-revision-20261013\看板规则与指标展示规划_1013显示规则更新_无千位逗号.xlsx')
ns={'m':'http://schemas.openxmlformats.org/spreadsheetml/2006/main'}
with ZipFile(p) as z:
 w=E.fromstring(z.read('xl/workbook.xml'));assert len(w.findall('m:sheets/m:sheet',ns))==1
 strings=E.fromstring(z.read('xl/sharedStrings.xml')) if 'xl/sharedStrings.xml' in z.namelist() else None
 values=[''.join(x.itertext()) for x in strings] if strings is not None else []
 text='\n'.join(values+[t.text or '' for name in z.namelist() if name.startswith('xl/worksheets/sheet') and name.endswith('.xml') for t in E.fromstring(z.read(name)).findall('.//m:v',ns)])
 for name in ['品质风险榜','高危店铺榜','亏损产品榜','库存风险榜','滞销产品榜','退货恶化榜','销售达成管控','全局展示与交互规范']:assert name in text,name
 for field in ['指标名称','保留小数位','数据来源','计算口径','展示样例']:assert field in text,field
 assert not re.search(r'(?<![A-Za-z0-9])[EF][3-9](?![A-Za-z0-9])',text)
 for token in ['#REF!','#DIV/0!','#VALUE!','#NAME?']:assert token not in text
 for sample in ['4000.0元/2次','4.2w/3次','10000.0元']:assert sample in text,sample
 print(json.dumps({'file':str(p),'sheets':1,'six_boards_and_sales':True,'five_metric_fields':True,'no_cell_coordinate_provenance':True,'bytes':p.stat().st_size},ensure_ascii=False))

