from pathlib import Path
from PIL import Image, ImageDraw

out = Path(__file__).resolve().parent.parent / 'icons'
out.mkdir(exist_ok=True)
im = Image.new('RGB', (1024, 1024), '#203f38')
d = ImageDraw.Draw(im)
# A treasure chest inside the maskable safe area.
d.ellipse((160, 160, 864, 864), fill='#2e584b')
d.rounded_rectangle((260, 340, 764, 710), radius=55, fill='#d6a250', outline='#f7df9e', width=18)
d.line((270, 480, 754, 480), fill='#203f38', width=22)
d.rectangle((330, 350, 370, 700), fill='#f7df9e')
d.rectangle((654, 350, 694, 700), fill='#f7df9e')
d.rounded_rectangle((465, 440, 559, 554), radius=14, fill='#203f38')
d.ellipse((498, 467, 526, 495), fill='#f7df9e')
d.rectangle((507, 488, 517, 522), fill='#f7df9e')
d.polygon([(512, 220), (526, 258), (564, 272), (526, 286), (512, 324), (498, 286), (460, 272), (498, 258)], fill='#f7df9e')
for name, size in [('icon-512.png',512),('icon-192.png',192),('apple-touch-icon.png',180),('favicon.png',32)]:
    im.resize((size,size), Image.Resampling.LANCZOS).save(out/name)
