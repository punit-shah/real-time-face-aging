import procrustesAlign from './procrustes_align';
import { createCanvas } from './utils';

class FaceAger {
  // initialise the face ager with a canvas to draw the mask on
  // @param webglCanvas - a canvas element
  constructor(webglCanvas, vertices) {
    this.gl = window.getWebGLContext(webglCanvas);
    this.shaderProgram = createShaderProgram(this.gl);
    this.vertices = vertices;
  }

  setCurrentAvg(points, image) {
    const dimensions = findMinMaxDimensions(points, image.width, image.height);
    this.currentAvgTexCoords = this.createTextureCoords(points, dimensions);

    const canvas = createCanvas('current-avg');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const currentAvgImage = context.getImageData(
      dimensions.minX, dimensions.minY,
      dimensions.width, dimensions.height
    );

    this.currentAvg = {
      points: points,
      image: currentAvgImage
    };
  }

  setTargetAvg(points, image) {
    const dimensions = findMinMaxDimensions(points, image.width, image.height);
    this.targetAvgTexCoords = this.createTextureCoords(points, dimensions);

    const canvas = createCanvas('target-avg');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    const targetAvgImage = context.getImageData(
      dimensions.minX, dimensions.minY,
      dimensions.width, dimensions.height
    );

    this.targetAvg = {
      points: points,
      image: targetAvgImage
    };
  }

  // load the face to age
  load(faceCanvas, subjectPoints) {
    const subjectDimensions = findMinMaxDimensions(subjectPoints, faceCanvas.width,
      faceCanvas.height);
    const subjectTextureCoords = this.createTextureCoords(subjectPoints, subjectDimensions);
    this.loadTextureCoordinates(subjectTextureCoords, 'a_subjectTexCoord');
    this.loadTextureCoordinates(this.currentAvgTexCoords, 'a_currentAvgTexCoord');
    this.loadTextureCoordinates(this.targetAvgTexCoords, 'a_targetAvgTexCoord');

    // textures
    const textureImage = faceCanvas.getContext('2d').getImageData(subjectDimensions.minX,
      subjectDimensions.minY, subjectDimensions.width, subjectDimensions.height);

    const images = [textureImage, this.currentAvg.image, this.targetAvg.image];
    const textures = [];

    // create textures from images and add them to textures array
    for (let i = 0; i < images.length; i++) {
      const texture = createTexture(this.gl, images[i]);
      textures.push(texture);
    }

    // get sampler locations
    const u_subjectImageLocation = this.gl.getUniformLocation(this.shaderProgram,
      'u_subjectImage');
    const u_currentAvgImageLocation = this.gl.getUniformLocation(this.shaderProgram,
      'u_currentAvgImage');
    const u_targetAvgImageLocation = this.gl.getUniformLocation(this.shaderProgram,
      'u_targetAvgImage');

    // set texture unit to use for each sampler
    this.gl.uniform1i(u_subjectImageLocation, 0);
    this.gl.uniform1i(u_currentAvgImageLocation, 1);
    this.gl.uniform1i(u_targetAvgImageLocation, 2);

    // bind texture to each texture unit
    this.gl.activeTexture(this.gl.TEXTURE0);
    this.gl.bindTexture(this.gl.TEXTURE_2D, textures[0]);
    this.gl.activeTexture(this.gl.TEXTURE1);
    this.gl.bindTexture(this.gl.TEXTURE_2D, textures[1]);
    this.gl.activeTexture(this.gl.TEXTURE2);
    this.gl.bindTexture(this.gl.TEXTURE_2D, textures[2]);

    // set the resolution
    const resolutionLocation = this.gl.getUniformLocation(this.shaderProgram, 'u_resolution');
    this.gl.uniform2f(resolutionLocation, this.gl.drawingBufferWidth,
      this.gl.drawingBufferHeight);
  }

  draw(subjectPoints) {
    const alignedCurrentAvgPoints = procrustesAlign(this.currentAvg.points, subjectPoints);
    const alignedTargetAvgPoints = procrustesAlign(this.targetAvg.points, subjectPoints);

    sendPositionsToShader(this.gl, this.shaderProgram, this.vertices, subjectPoints,
      'a_subjectPosition');
    sendPositionsToShader(this.gl, this.shaderProgram, this.vertices, alignedCurrentAvgPoints,
      'a_currentAvgPosition');
    sendPositionsToShader(this.gl, this.shaderProgram, this.vertices, alignedTargetAvgPoints,
      'a_targetAvgPosition');

    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertices.length * 3);
  }

  clear() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  createTextureCoords(points, dimensions) {
    const correctedPoints = correctPoints(points, dimensions.minX, dimensions.minY);
    const textureCoords = [];

    for (let i = 0; i < this.vertices.length; i++) {
      textureCoords.push(correctedPoints[this.vertices[i][0]][0] / dimensions.width);
      textureCoords.push(correctedPoints[this.vertices[i][0]][1] / dimensions.height);
      textureCoords.push(correctedPoints[this.vertices[i][1]][0] / dimensions.width);
      textureCoords.push(correctedPoints[this.vertices[i][1]][1] / dimensions.height);
      textureCoords.push(correctedPoints[this.vertices[i][2]][0] / dimensions.width);
      textureCoords.push(correctedPoints[this.vertices[i][2]][1] / dimensions.height);
    }

    return textureCoords;
  }

  loadTextureCoordinates(textureCoords, attribute) {
    // put texture coordinates in buffer
    const texCoordBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, texCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(textureCoords),
      this.gl.STATIC_DRAW);

    // load shader program
    this.gl.useProgram(this.shaderProgram);

    // look up location of texture coordinate attribute
    this.texCoordLocation = this.gl.getAttribLocation(this.shaderProgram, attribute);
    // pull data from buffer into attribute
    this.gl.enableVertexAttribArray(this.texCoordLocation);
    this.gl.vertexAttribPointer(this.texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);
  }
}

// finds the minimum and maximum x and y coordinates
function findMinMaxDimensions(points, frameWidth, frameHeight) {
  let maxX = 0;
  let minX = frameWidth;
  let maxY = 0;
  let minY = frameHeight;

  for (let i = 0; i < points.length; i++) {
    if (points[i][0] > maxX) maxX = points[i][0];
    if (points[i][0] < minX) minX = points[i][0];
    if (points[i][1] > maxY) maxY = points[i][1];
    if (points[i][1] < minY) minY = points[i][1];
  }

  minX = Math.floor(minX);
  maxX = Math.ceil(maxX);
  minY = Math.floor(minY);
  maxY = Math.ceil(maxY);
  const width = maxX - minX;
  const height = maxY - minY;

  return { minX, maxX, minY, maxY, width, height };
}

function correctPoints(points, minX, minY) {
  const correctedPoints = [];

  for (let i = 0; i < points.length; i++) {
    correctedPoints[i] = [];
    correctedPoints[i][0] = points[i][0] - minX;
    correctedPoints[i][1] = points[i][1] - minY;
  }

  return correctedPoints;
}

function createPositionVertices(vertices, points) {
  const positionVertices = [];

  for (let i = 0; i < vertices.length; i++) {
    positionVertices.push(points[vertices[i][0]][0]);
    positionVertices.push(points[vertices[i][0]][1]);
    positionVertices.push(points[vertices[i][1]][0]);
    positionVertices.push(points[vertices[i][1]][1]);
    positionVertices.push(points[vertices[i][2]][0]);
    positionVertices.push(points[vertices[i][2]][1]);
  }

  return positionVertices;
}

function sendPositionsToShader(gl, shaderProgram, vertices, points, attributeName) {
  const positionVertices = createPositionVertices(vertices, points);

  const positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positionVertices),
    gl.STATIC_DRAW);

  const attributeLocation = gl.getAttribLocation(shaderProgram, attributeName);
  gl.enableVertexAttribArray(attributeLocation);
  gl.vertexAttribPointer(attributeLocation, 2, gl.FLOAT, false, 0, 0);
}

function createShaderProgram(gl) {
  const vertexShaderCode = `
    attribute vec2 a_subjectTexCoord;
    attribute vec2 a_currentAvgTexCoord;
    attribute vec2 a_targetAvgTexCoord;

    attribute vec2 a_subjectPosition;
    attribute vec2 a_currentAvgPosition;
    attribute vec2 a_targetAvgPosition;

    varying vec2 v_subjectTexCoord;
    varying vec2 v_currentAvgTexCoord;
    varying vec2 v_targetAvgTexCoord;

    uniform vec2 u_resolution;

    void main() {
      vec2 newPos = a_subjectPosition + 0.75 * (a_targetAvgPosition - a_currentAvgPosition);
      vec2 zeroToOne = newPos / u_resolution;
      vec2 zeroToTwo = zeroToOne * 2.0;
      vec2 clipSpace = zeroToTwo - 1.0;
      gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

      v_subjectTexCoord = a_subjectTexCoord;
      v_currentAvgTexCoord = a_currentAvgTexCoord;
      v_targetAvgTexCoord = a_targetAvgTexCoord;
    }
  `;

  const fragmentShaderCode = `
    precision mediump float;

    uniform sampler2D u_subjectImage;
    uniform sampler2D u_currentAvgImage;
    uniform sampler2D u_targetAvgImage;

    varying vec2 v_subjectTexCoord;
    varying vec2 v_currentAvgTexCoord;
    varying vec2 v_targetAvgTexCoord;

    void main() {
      vec4 subjectColor = texture2D(u_subjectImage, v_subjectTexCoord);
      vec4 currentAvgColor = texture2D(u_currentAvgImage, v_currentAvgTexCoord);
      vec4 targetAvgColor = texture2D(u_targetAvgImage, v_targetAvgTexCoord);
      gl_FragColor = subjectColor + 0.75 * (targetAvgColor - currentAvgColor);
    }
  `;

  const vertexShader = window.loadShader(gl, vertexShaderCode, gl.VERTEX_SHADER);
  const fragmentShader = window.loadShader(gl, fragmentShaderCode, gl.FRAGMENT_SHADER);

  return window.createProgram(gl, [vertexShader, fragmentShader]);
}

function createTexture(gl, image) {
  // create new texture
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  // prevent texture repeating
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  // use filters that don't mipmap
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // upload image into the texture
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);

  return texture;
}

export default FaceAger;
