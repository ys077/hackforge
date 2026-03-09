from PIL import Image
import os
os.chdir(os.path.dirname(__file__))
img = Image.new('RGB', (224,224), (255,255,255))
img.save('sample.png')
img.save('sample.pdf')
print('created', os.path.abspath('sample.pdf'))
