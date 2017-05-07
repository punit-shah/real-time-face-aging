import vertexShaderCode from './vertex_shader';
import fragmentShaderCode from './fragment_shader';
import procrustesAlign from './procrustes_align';
import { createCanvas } from './utils';

class FaceAger {
  /**
   * initialise the face ager
   * @param  webglCanvas - a canvas element to draw on
   * @param  vertices    - face model vertices
   */
  constructor(webglCanvas, vertices) {
    this.gl = window.getWebGLContext(webglCanvas);
    this.shaderProgram = this.createShaderProgram(vertexShaderCode, fragmentShaderCode);
    this.vertices = vertices;
  }

  /**
   * creates a shader program from a vertex shader and fragment shader
   * @param  {string} vertexShaderCode   the vertex shader code in GLSL
   * @param  {string} fragmentShaderCode the fragment shader code in GLSL
   * @return                             the shader program
   */
  createShaderProgram(vertexShaderCode, fragmentShaderCode) {
    // loadShader and createProgram functions exported to window by clmtrackr
    const vertexShader = window.loadShader(this.gl, vertexShaderCode, this.gl.VERTEX_SHADER);
    const fragmentShader = window.loadShader(this.gl, fragmentShaderCode,
      this.gl.FRAGMENT_SHADER);

    return window.createProgram(this.gl, [vertexShader, fragmentShader]);
  }

  /**
   * set the current average texture information
   * @param  image  the current average image to use for the texture
   * @param  points the positions of the face vertices in the image
   */
  setCurrentAvg(image, points) {
    const dimensions = findMinMaxDimensions(points);
    this.currentAvgTexCoords = this.createTextureCoords(points, dimensions);

    // create canvas to draw image on
    const canvas = createCanvas('current-avg');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    // get cropped image
    const currentAvgImage = context.getImageData(
      dimensions.minX, dimensions.minY,
      dimensions.width, dimensions.height
    );

    this.currentAvg = {
      points: points,
      image: currentAvgImage
    };
  }

  /**
   * set the target average texture information
   * @param  image  the current average image to use for the texture
   * @param  points the positions of the face vertices in the image
   */
  setTargetAvg(image, points) {
    const dimensions = findMinMaxDimensions(points);
    this.targetAvgTexCoords = this.createTextureCoords(points, dimensions);

    // create canvas to draw image on
    const canvas = createCanvas('target-avg');
    canvas.width = image.width;
    canvas.height = image.height;
    const context = canvas.getContext('2d');
    context.drawImage(image, 0, 0, canvas.width, canvas.height);
    // get cropped image
    const targetAvgImage = context.getImageData(
      dimensions.minX, dimensions.minY,
      dimensions.width, dimensions.height
    );

    this.targetAvg = {
      points: points,
      image: targetAvgImage
    };
  }

  /**
   * load the face to age
   * @param  faceCanvas a canvas with the subject's face on it
   * @param  points     the positions of the face vertices on the canvas
   */
  load(faceCanvas, points) {
    // load texture coordinates
    const subjectDimensions = findMinMaxDimensions(points);
    const subjectTextureCoords = this.createTextureCoords(points, subjectDimensions);
    this.loadTextureCoordinates(subjectTextureCoords, 'a_subjectTexCoord');
    this.loadTextureCoordinates(this.currentAvgTexCoords, 'a_currentAvgTexCoord');
    this.loadTextureCoordinates(this.targetAvgTexCoords, 'a_targetAvgTexCoord');

    // get image from faceCanvas cropped to subject's face
    const subjectImage = faceCanvas.getContext('2d').getImageData(subjectDimensions.minX,
      subjectDimensions.minY, subjectDimensions.width, subjectDimensions.height);

    const images = [subjectImage, this.currentAvg.image, this.targetAvg.image];
    const textures = [];

    // create textures from images and add them to textures array
    for (let image of images) {
      const texture = this.createTexture(image);
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

    // set resolution uniform
    const resolutionLocation = this.gl.getUniformLocation(this.shaderProgram, 'u_resolution');
    this.gl.uniform2f(resolutionLocation, this.gl.drawingBufferWidth,
      this.gl.drawingBufferHeight);
  }

  /**
   * draws the aged face on the webGL canvas
   * @param  points the positions of face vertices to draw the face at
   */
  draw(points) {
    // aligns the average points to the given points
    const alignedCurrentAvgPoints = procrustesAlign(this.currentAvg.points, points);
    const alignedTargetAvgPoints = procrustesAlign(this.targetAvg.points, points);

    // create position vertices
    const subjectPositionVertices = this.createPositionVertices(points);
    const currentAvgPositionVertices = this.createPositionVertices(alignedCurrentAvgPoints);
    const targetAvgPositionVertices = this.createPositionVertices(alignedTargetAvgPoints);

    // send positions to shader
    this.loadPositionVertices(subjectPositionVertices, 'a_subjectPosition');
    this.loadPositionVertices(currentAvgPositionVertices, 'a_currentAvgPosition');
    this.loadPositionVertices(targetAvgPositionVertices, 'a_targetAvgPosition');

    // draw the aged face
    this.gl.drawArrays(this.gl.TRIANGLES, 0, this.vertices.length * 3);
  }

  /**
   * clears the webgl canvas
   */
  clear() {
    this.gl.clear(this.gl.COLOR_BUFFER_BIT);
  }

  /**
   * creates position vertices from points
   * @return the position vertices
   */
  createPositionVertices(points) {
    const positionVertices = [];

    for (let i = 0; i < this.vertices.length; i++) {
      positionVertices.push(points[this.vertices[i][0]][0]);
      positionVertices.push(points[this.vertices[i][0]][1]);
      positionVertices.push(points[this.vertices[i][1]][0]);
      positionVertices.push(points[this.vertices[i][1]][1]);
      positionVertices.push(points[this.vertices[i][2]][0]);
      positionVertices.push(points[this.vertices[i][2]][1]);
    }

    return positionVertices;
  }

  /**
   * sends position vertices to the shader
   * @param  positionVertices       position vertices created with createPositionVertices()
   * @param  {string} attributeName name of the shader attribute
   */
  loadPositionVertices(positionVertices, attributeName) {
    const positionBuffer = this.gl.createBuffer();
    this.gl.bindBuffer(this.gl.ARRAY_BUFFER, positionBuffer);
    this.gl.bufferData(this.gl.ARRAY_BUFFER, new Float32Array(positionVertices),
      this.gl.STATIC_DRAW);

    const attributeLocation = this.gl.getAttribLocation(this.shaderProgram, attributeName);
    this.gl.enableVertexAttribArray(attributeLocation);
    this.gl.vertexAttribPointer(attributeLocation, 2, this.gl.FLOAT, false, 0, 0);
  }

  /**
   * creates texture coordinates from points
   * @param  points     position of face vertices on texture image
   * @param  dimensions dimensions created with findMinMaxDimensions()
   * @return            the texture coordinates
   */
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

  /**
   * sends texture coordinates to the shader
   * @param  textureCoords texture coordinates
   * @param  attribute     name of the shader attribute
   */
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

  /**
   * creates a webGL texture from an image
   * @param  image the texture image
   * @return       the webGL texture
   */
  createTexture(image) {
    // create new texture
    const texture = this.gl.createTexture();
    this.gl.bindTexture(this.gl.TEXTURE_2D, texture);

    // prevent texture repeating
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_S, this.gl.CLAMP_TO_EDGE);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_WRAP_T, this.gl.CLAMP_TO_EDGE);
    // use filters that don't mipmap
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MIN_FILTER, this.gl.LINEAR);
    this.gl.texParameteri(this.gl.TEXTURE_2D, this.gl.TEXTURE_MAG_FILTER, this.gl.LINEAR);

    // upload image into the texture
    this.gl.texImage2D(this.gl.TEXTURE_2D, 0, this.gl.RGBA, this.gl.RGBA, this.gl.UNSIGNED_BYTE,
      image);

    return texture;
  }
}

/**
 * finds the minimum and maximum values from a set of points
 * used to crop textures and when creating texture coordinates
 * @param  points [description]
 * @return        an object with the following properties:
 *                minX: minimum x value
 *                maxX: maximum x value
 *                minY: minimum y value
 *                maxY: maximum y value
 *                width: distance between minimum and maximum x values
 *                height: distance between minimum and maximum y values
 */
function findMinMaxDimensions(points) {
  const xValues = points.map((point) => point[0]);
  const yValues = points.map((point) => point[1]);

  const minX = Math.floor(Math.min.apply(null, xValues));
  const maxX = Math.ceil(Math.max.apply(null, xValues));
  const minY = Math.floor(Math.min.apply(null, yValues));
  const maxY = Math.ceil(Math.max.apply(null, xValues));
  const width = maxX - minX;
  const height = maxY - minY;

  return { minX, maxX, minY, maxY, width, height };
}

/**
 * corrects points to correspond to cropped texture
 * @param  points the points that need to be corrected
 * @param  minX   minimum x value from points
 * @param  minY   minimum y value from points
 * @return        corrected points
 */
function correctPoints(points, minX, minY) {
  // subtract minX from each x value and minY from each y value
  return points.map((point) => {
    const x = point[0] - minX;
    const y = point[1] - minY;
    return [x, y];
  });
}

export default FaceAger;
