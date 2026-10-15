from pathlib import Path
from PIL import Image,ImageOps,ImageDraw
p=Path(r'E:\需求合集\产品链目视化看板\outputs\risk-revision-20261013')
for kind in ['rules','list','card']:
 ims=[]
 for i in range(1,7):
  im=Image.open(p/f'qa-{i}-{kind}.png').convert('RGB');im.thumbnail((1200,920));tile=Image.new('RGB',(1200,950),'white');tile.paste(im,(0,30));ImageDraw.Draw(tile).text((8,5),f'{i} {kind}',fill='black');ims.append(tile)
 out=Image.new('RGB',(2400,2850),'white')
 for j,im in enumerate(ims):out.paste(im,((j%2)*1200,(j//2)*950))
 out.save(p/f'contact-{kind}.png')
 print(kind,[Image.open(p/f'qa-{i}-{kind}.png').size for i in range(1,7)])

