import rigidAlign from './rigid_align';

class FaceAger {
  constructor(webglCanvas) {
    this.gl = window.getWebGLContext(webglCanvas);
    this.shaderProgram = createShaderProgram(this.gl);
    this.texCoordBuffer = this.gl.createBuffer();
  }

  load(textureCanvas, subjectPoints, pModel) {
    this.pModel = pModel;
    this.vertices = this.pModel.path.vertices;
    this.dimensions = findDimensions(subjectPoints, textureCanvas.width, textureCanvas.height);
    this.subjectPoints = correctPoints(subjectPoints, this.dimensions.minX, this.dimensions.minY);
    this.textureVertices = createTextureVertices(this.vertices, this.subjectPoints,
      this.dimensions.width, this.dimensions.height);

    // put texture coordinates in buffer
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.texCoordBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(this.textureVertices),
      this.gl.STATIC_DRAW);

    // load shader program
    this.gl.useProgram(this.shaderProgram);

    // look up location of texture coordinate attribute
    this.texCoordLocation = this.gl.getAttribLocation(this.shaderProgram, 'a_subjectTexCoord');
    // pull data from buffer into attribute
    this.gl.enableVertexAttribArray(this.texCoordLocation);
    this.gl.vertexAttribPointer(this.texCoordLocation, 2, this.gl.FLOAT, false, 0, 0);

    // create texture and bind it
    const textureImage = textureCanvas.getContext('2d')
      .getImageData(this.dimensions.minX, this.dimensions.minY, this.dimensions.width,
        this.dimensions.height);
    createTexture(this.gl, textureImage);

    // set the resolution
    const resolutionLocation = this.gl.getUniformLocation(this.shaderProgram, 'u_resolution');
    this.gl.uniform2f(resolutionLocation, this.gl.drawingBufferWidth,
      this.gl.drawingBufferHeight);
  }

  draw(subjectPoints, currentAvgPoints, targetAvgPoints) {
    const alignedCurrentAvgPoints = rigidAlign(currentAvgPoints, subjectPoints);
    const alignedTargetAvgPoints = rigidAlign(targetAvgPoints, subjectPoints);

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
}

function findDimensions(points, textureWidth, textureHeight) {
  let maxX = 0;
  let minX = textureWidth;
  let maxY = 0;
  let minY = textureHeight;

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

function createTextureVertices(vertices, points, width, height) {
  const textureVertices = [];

  for (let i = 0; i < vertices.length; i++) {
    textureVertices.push(points[vertices[i][0]][0] / width);
    textureVertices.push(points[vertices[i][0]][1] / height);
    textureVertices.push(points[vertices[i][1]][0] / width);
    textureVertices.push(points[vertices[i][1]][1] / height);
    textureVertices.push(points[vertices[i][2]][0] / width);
    textureVertices.push(points[vertices[i][2]][1] / height);
  }

  return textureVertices;
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
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positionVertices), gl.STATIC_DRAW);

  const attributeLocation = gl.getAttribLocation(shaderProgram, attributeName);
  gl.enableVertexAttribArray(attributeLocation);
  gl.vertexAttribPointer(attributeLocation, 2, gl.FLOAT, false, 0, 0);
}

function createShaderProgram(gl) {
  const vertexShaderCode = `
    attribute vec2 a_subjectTexCoord;

    attribute vec2 a_subjectPosition;
    attribute vec2 a_currentAvgPosition;
    attribute vec2 a_targetAvgPosition;

    varying vec2 v_subjectTexCoord;
    varying vec2 v_currentAvgTexCoord;
    varying vec2 v_targetAvgTexCoord;

    uniform vec2 u_resolution;

    void main() {
      vec2 newPos = a_subjectPosition + 1.0 * (a_targetAvgPosition - a_currentAvgPosition);
      vec2 zeroToOne = newPos / u_resolution;
      vec2 zeroToTwo = zeroToOne * 2.0;
      vec2 clipSpace = zeroToTwo - 1.0;
      gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

      v_subjectTexCoord = a_subjectTexCoord;
    }
  `;

  const fragmentShaderCode = `
    precision mediump float;

    uniform sampler2D u_image;

    varying vec2 v_subjectTexCoord;

    void main() {
      gl_FragColor = texture2D(u_image, v_subjectTexCoord);
    }
  `;

  const vertexShader = window.loadShader(gl, vertexShaderCode, gl.VERTEX_SHADER);
  const fragmentShader = window.loadShader(gl, fragmentShaderCode, gl.FRAGMENT_SHADER);

  return window.createProgram(gl, [vertexShader, fragmentShader]);
}

function createTexture(gl, image) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);

  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  // Upload the image into the texture.
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, image);
}

export default FaceAger;
