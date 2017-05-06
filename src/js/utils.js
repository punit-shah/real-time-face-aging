function createCanvas(id) {
  const canvas = document.createElement('canvas');
  canvas.classList.add('canvas');
  canvas.id = id;
  return canvas;
}

function setElementSize(element, width, height) {
  element.width = width;
  element.height = height;
}

function loadImages(imageSources, callback) {
  const images = {};
  const numOfImages = Object.keys(imageSources).length;

  let loadedImages = 0;

  for (let key in imageSources) {
    const img = new Image();
    img.onload = () => {
      loadedImages++;
      if (loadedImages >= numOfImages) {
        callback(images);
      }
    };
    img.src = imageSources[key];
    images[key] = img;
  }
}

export { createCanvas, setElementSize, loadImages };
