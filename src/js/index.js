import clm from './lib/clmtrackr/clmtrackr';
import pModel from './lib/clmtrackr/models/model_pca_20_svm';
import FaceAger from './face_ager';
import mw13_18_points from './average_points/mw13-18';
import mw55_points from './average_points/mw55';

const tracker = new clm.tracker();
tracker.init(pModel);

const video = document.getElementById('video');

video.addEventListener('canplay', (e) => {
  startVideo(e.target);
});

const gridCanvas = document.getElementById('grid');
const gridContext = gridCanvas.getContext('2d');

const maskCanvas = document.getElementById('mask');

const videoframeCanvas = document.createElement('canvas');
videoframeCanvas.id = 'videoframe';
const videoframeContext = videoframeCanvas.getContext('2d');

function setDimensions(element, width, height) {
  element.width = width;
  element.height = height;
}

function setVideoSize() {
  const width = video.parentElement.offsetWidth;
  const height = width / 4 * 3;
  setDimensions(video, width, height);
  setDimensions(gridCanvas, width, height);
  setDimensions(maskCanvas, width, height);
  setDimensions(videoframeCanvas, width, height);
}

window.onresize = setVideoSize;
window.onresize();

const faceAger = new FaceAger(maskCanvas);

navigator.mediaDevices.getUserMedia({
  audio: false,
  video: true,
}).then((mediaStream) => {
  video.srcObject = mediaStream;
});

function startVideo(video) {
  video.play();
  tracker.start(video);
  drawModel();
}

function clearGrid() {
  gridContext.clearRect(0, 0, gridCanvas.width, gridCanvas.height);
}

function drawModel() {
  clearGrid();
  tracker.draw(gridCanvas, tracker.getCurrentParameters(), 'vertices');

  const convergence = tracker.getConvergence();
  if (convergence < 0.4) {
    clearGrid();
    requestAnimationFrame(drawMask);
  } else {
    requestAnimationFrame(drawModel);
  }
}

function drawMask() {
  videoframeContext.drawImage(video, 0, 0, videoframeCanvas.width, videoframeCanvas.height);

  var subjectPositions = tracker.getCurrentPosition();
  if (subjectPositions) {
    faceAger.load(videoframeCanvas, subjectPositions, pModel);
    faceAger.draw(subjectPositions, mw13_18_points, mw55_points);
  }

  requestAnimationFrame(drawMask);
}
