const STATIC_ASSET_HOST = PRODUCTION ? HOMEPAGE : '';

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
    img.src = STATIC_ASSET_HOST + imageSources[key];
    images[key] = img;
  }
}

function loadDataFiles(fileSources, callback) {
  const data = {};
  const numOfFiles = Object.keys(fileSources).length;

  let loadedFiles = 0;

  for (let key in fileSources) {
    const xhr = new XMLHttpRequest();
    xhr.onload = function () {
      loadedFiles++;
      data[key] = JSON.parse(this.responseText);
      if (loadedFiles >= numOfFiles) {
        callback(data);
      }
    };
    xhr.open('GET', STATIC_ASSET_HOST + fileSources[key]);
    xhr.send();
  }
}

export { createCanvas, setElementSize, loadImages, loadDataFiles };
