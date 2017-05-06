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

export { createCanvas, setElementSize };
