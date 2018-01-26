import sys
import csv
import json
import urllib
import cStringIO
from PIL import Image

csvFile = sys.argv[1]
outFile = sys.argv[2]
output = {}

with open(csvFile, 'rb') as csvfile:
  reader = csv.reader(csvfile, delimiter=',')
  for row in reader:
    imageUrl = row[3]
    print row[2]
    imagePath = cStringIO.StringIO(urllib.urlopen(imageUrl).read())
    image = Image.open(imagePath)
    width, height = image.size
    rgb_image = image.convert('RGB')
    imageMatrix = []
    for y in range(0, width):
      imageMatrix.append([])
      for x in range(0, height):
        imageMatrix[y].append(rgb_image.getpixel((y, x)))

    output[row[0]] = {
      'pixelData': imageMatrix,
      'caption': row[2],
    }

    break

with open(outFile, 'wb') as outfile:
  json.dump(output, outfile)
