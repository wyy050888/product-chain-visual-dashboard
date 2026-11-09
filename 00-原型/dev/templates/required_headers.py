"""统一静态模板的深蓝表头及必填富文本，保留工作表、说明区和数据。"""
from pathlib import Path
import re
import sys
import zipfile
import xml.etree.ElementTree as ET
from copy import deepcopy

NS = 'http://schemas.openxmlformats.org/spreadsheetml/2006/main'
Q = lambda name: '{' + NS + '}' + name
TASK_REQUIRED = {'事项名称', '问题描述', '执行事项', '负责人', '计划完成日期'}
LEDGER_REQUIRED = {'登记日期', '优先级', '任务', '状态', '责任人', '所属部门', '计划完成日期'}


def mark_headers(path, kind):
    path = Path(path)
    with zipfile.ZipFile(path) as source:
        parts = {item.filename: (item, source.read(item.filename)) for item in source.infolist()}
    task_template = kind in {'task', 'task-ledger'}
    required_labels = LEDGER_REQUIRED if kind == 'task-ledger' else TASK_REQUIRED
    strings = []
    if 'xl/sharedStrings.xml' in parts:
        strings = [''.join(node.itertext()) for node in ET.fromstring(parts['xl/sharedStrings.xml'][1])]
    styles = ET.fromstring(parts['xl/styles.xml'][1])
    fonts, formats = styles.find(Q('fonts')), styles.find(Q('cellXfs'))
    fills = styles.find(Q('fills'))
    header_fill = ET.Element(Q('fill'))
    pattern = ET.SubElement(header_fill, Q('patternFill'), {'patternType': 'solid'})
    ET.SubElement(pattern, Q('fgColor'), {'rgb': 'FF294D79'})
    ET.SubElement(pattern, Q('bgColor'), {'indexed': '64'})
    fill_id = next((i for i, fill in enumerate(fills) if fill.find(Q('patternFill')+'/'+Q('fgColor')) is not None and fill.find(Q('patternFill')+'/'+Q('fgColor')).get('rgb') == 'FF294D79'), None)
    if fill_id is None:
        fill_id = len(fills)
        fills.append(header_fill)
        fills.set('count', str(len(fills)))
    header_styles = {}

    def style_header(cell):
        source_id = int(cell.get('s', '0'))
        if source_id not in header_styles:
            font = deepcopy(fonts[int(formats[source_id].get('fontId', '0'))])
            color = font.find(Q('color'))
            if color is not None:
                font.remove(color)
            ET.SubElement(font, Q('color'), {'rgb': 'FFFFFFFF'})
            if font.find(Q('b')) is None:
                ET.SubElement(font, Q('b'))
            font_id = len(fonts)
            fonts.append(font)
            fonts.set('count', str(len(fonts)))
            fmt = deepcopy(formats[source_id])
            fmt.set('fontId', str(font_id))
            fmt.set('fillId', str(fill_id))
            fmt.set('applyFill', '1')
            fmt.set('applyFont', '1')
            header_styles[source_id] = len(formats)
            formats.append(fmt)
            formats.set('count', str(len(formats)))
        cell.set('s', str(header_styles[source_id]))

    def cell_font(cell):
        font_id = int(formats[int(cell.get('s', '0'))].get('fontId', '0'))
        return fonts[font_id]

    def run_font(cell, red, label_color):
        # WPS富文本不可靠地继承单元格字体，逐段显式保留字号、字重与字色。
        properties = deepcopy(cell_font(cell))
        properties.tag = Q('rPr')
        name = properties.find(Q('name'))
        if name is not None:
            name.tag = Q('rFont')
        color = properties.find(Q('color'))
        if color is not None:
            properties.remove(color)
        properties.append(ET.Element(Q('color'), {'rgb': 'FFD92848'}) if red else deepcopy(label_color))
        # 按富文本属性顺序输出，字体与字色均显式设置，避免表格软件回退。
        order = ['rFont', 'charset', 'family', 'b', 'i', 'strike', 'outline', 'shadow', 'condense', 'extend', 'color', 'sz', 'u', 'vertAlign', 'scheme']
        properties[:] = sorted(properties, key=lambda child: order.index(child.tag.split('}')[-1]) if child.tag.split('}')[-1] in order else len(order))
        return properties
    def text(cell):
        value = cell.find(Q('v'))
        if cell.get('t') == 's' and value is not None:
            return strings[int(value.text)]
        if cell.get('t') == 'inlineStr':
            return ''.join(node.text or '' for node in cell.iter(Q('t')))
        return value.text or '' if value is not None else ''
    count = 0
    for name, (info, data) in list(parts.items()):
        if not re.fullmatch(r'xl/worksheets/sheet\d+\.xml', name):
            continue
        sheet = ET.fromstring(data)
        if not task_template:
            for cell in sheet.iter(Q('c')):
                value = text(cell)
                updated = value.replace('人员需为钉钉组织架构姓名', '人员填写钉钉名称').replace('人员需为钉钉名称', '人员填写钉钉名称').replace('钉钉组织架构姓名', '钉钉名称')
                if updated == value:
                    continue
                for child in list(cell):
                    cell.remove(child)
                cell.set('t', 'inlineStr')
                ET.SubElement(ET.SubElement(cell, Q('is')), Q('t')).text = updated
        for row in sheet.iter(Q('row')):
            values = [text(cell).strip().strip('*').strip() for cell in row]
            if kind == 'task-ledger':
                is_header = {'登记日期', '任务', '状态', '责任人'} <= set(values)
            else:
                is_header = ('事项名称' in values and '负责人' in values) if task_template else ('月份' in values and '产品名称（SPU）' in values)
            if not is_header:
                continue
            label_color = ET.Element(Q('color'), {'rgb': 'FFFFFFFF'})
            for cell, label in zip(row, values):
                if not label:
                    continue
                style_header(cell)
                required = label in required_labels if task_template else label != '产品名称（SPU）'
                for child in list(cell):
                    cell.remove(child)
                cell.set('t', 'inlineStr')
                inline = ET.SubElement(cell, Q('is'))
                runs = [('*', True), (label, False)] if required else [(label, False)]
                for value, red in runs:
                    run = ET.SubElement(inline, Q('r'))
                    run.append(run_font(cell, red, label_color))
                    if red:
                        count += 1
                    ET.SubElement(run, Q('t'), {'{http://www.w3.org/XML/1998/namespace}space': 'preserve'}).text = value
        if count:
            # 保留原命名空间前缀，避免改变样式/扩展属性绑定。
            for prefix, uri in re.findall(rb'xmlns(?::([\w]+))?="([^"]+)"', data):
                if not re.fullmatch(rb'ns\d+', prefix):
                    ET.register_namespace(prefix.decode(), uri.decode())
            parts[name] = (info, ET.tostring(sheet, encoding='utf-8', xml_declaration=True))
    if not count:
        raise ValueError('未找到模板表头：' + str(path))
    for prefix, uri in re.findall(rb'xmlns(?::([\w]+))?="([^"]+)"', parts['xl/styles.xml'][1]):
        if not re.fullmatch(rb'ns\d+', prefix):
            ET.register_namespace(prefix.decode(), uri.decode())
    parts['xl/styles.xml'] = (parts['xl/styles.xml'][0], ET.tostring(styles, encoding='utf-8', xml_declaration=True))
    with zipfile.ZipFile(path, 'w') as output:
        for info, data in parts.values():
            output.writestr(info, data)
    print(str(path) + ': ' + str(count) + ' 个红色必填标记')


if __name__ == '__main__':
    mark_headers(sys.argv[1], sys.argv[2])
