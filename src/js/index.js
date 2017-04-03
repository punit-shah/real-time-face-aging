import $ from 'jquery';
import clm from './lib/clmtrackr/clmtrackr';
import pModel from './lib/clmtrackr/models/model_pca_20_svm';
import FaceDeformer from './lib/clmtrackr/js/face_deformer';

const tracker = new clm.tracker();
tracker.init(pModel);

const $video = $('#video');

$video.on('canplay', (e) => {
  startVideo(e.target);
});

const $gridCanvas = $('#grid');
const gridContext = $gridCanvas[0].getContext('2d');

const $maskCanvas = $('#mask');

const $videoframeCanvas = $('<canvas/>').attr('id', 'videoframe');
const videoframeContext = $videoframeCanvas[0].getContext('2d');

function setDimensionAttributes($element, width, height) {
  $element.attr('width', width);
  $element.attr('height', height);
}

function setVideoSize() {
  const width = $video.parent().width();
  const height = width / 4 * 3;
  setDimensionAttributes($video, width, height);
  setDimensionAttributes($gridCanvas, width, height);
  setDimensionAttributes($maskCanvas, width, height);
  setDimensionAttributes($videoframeCanvas, width, height);
}

setVideoSize();
$(window).resize(setVideoSize);

const fd = new FaceDeformer();
fd.init($maskCanvas[0]);

navigator.mediaDevices.getUserMedia({
  audio: false,
  video: true,
}).then((mediaStream) => {
  $video[0].srcObject = mediaStream;
});

function startVideo(video) {
  video.play();
  tracker.start(video);
  drawModel();
}

function clearGrid() {
  gridContext.clearRect(0, 0, $gridCanvas[0].width, $gridCanvas[0].height);
}

function drawModel() {
  clearGrid();
  tracker.draw($gridCanvas[0], tracker.getCurrentParameters(), 'vertices');

  const convergence = tracker.getConvergence();
  if (convergence < 0.4) {
    clearGrid();
    requestAnimationFrame(drawMask);
  } else {
    requestAnimationFrame(drawModel);
  }
}

function drawMask() {
  videoframeContext.drawImage($video[0], 0, 0, $videoframeCanvas[0].width, $videoframeCanvas[0].height);

  var positions = tracker.getCurrentPosition();
  if (positions) {
    fd.load($videoframeCanvas[0], positions, pModel);
    fd.draw(positions);
  }

  requestAnimationFrame(drawMask);
}
