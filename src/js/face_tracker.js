import clm from './lib/clmtrackr/clmtrackr';
import model from './lib/clmtrackr/models/model_pca_20_svm';
import { createCanvas, setElementSize } from './utils';

class FaceTracker {
  constructor(containerElement, convergedCallback) {
    this.containerElement = containerElement;
    this.convergedCallback = convergedCallback;
  }

  // initialises the tracker, video and grid canvas
  init() {
    this.initTracker();
    this.initVideo();
    this.initGridCanvas();

    this.setSizes();
    window.addEventListener('resize', () => {
      this.setSizes();
    });

    this.requestWebcam();
  }

  // initialise the tracker with the point distribution model
  initTracker() {
    this.tracker = new clm.tracker();
    this.tracker.init(model);
  }

  // creates a new video element and appends it to the container element
  initVideo() {
    this.video = document.createElement('video');
    this.video.id = 'video';
    this.containerElement.appendChild(this.video);

    this.video.addEventListener('canplay', () => {
      this.startVideo();
    });
  }

  // creates a new canvas element for the grid and appends it to the container element
  initGridCanvas() {
    this.gridCanvas = createCanvas('grid');
    this.containerElement.appendChild(this.gridCanvas);
  }

  // sets the sizes of the video and grid canvas to the specified width and height
  // if the width and height are not specified, the video and canvas will span the width of
  // the container element with an aspect ratio of 4:3
  setSizes(w, h) {
    const width = w || this.containerElement.offsetWidth;
    const height = h || width / 4 * 3;

    setElementSize(this.video, width, height);
    setElementSize(this.gridCanvas, width, height);
  }

  requestWebcam() {
    navigator.mediaDevices.getUserMedia({
      audio: false,
      video: true,
    }).then((mediaStream) => {
      this.video.srcObject = mediaStream;
    });
  }

  startVideo() {
    this.video.play();
    this.tracker.start(this.video);
    this.drawGrid();
  }

  clearGrid() {
    this.gridCanvas.getContext('2d').clearRect(0, 0, this.gridCanvas.width,
      this.gridCanvas.height);
  }

  drawGrid() {
    this.clearGrid();
    this.tracker.draw(this.gridCanvas, this.tracker.getCurrentParameters(), 'vertices');

    if (this.convergedCallback) {
      const convergence = this.tracker.getConvergence();

      if (convergence < 0.4) {
        this.clearGrid();
        this.convergedCallback();
      } else {
        this.drawGridRequestId = requestAnimationFrame(this.drawGrid.bind(this));
      }
    } else {
      this.drawGridRequestId = requestAnimationFrame(this.drawGrid.bind(this));
    }
  }

  stop() {
    if (this.drawGridRequestId) {
      cancelAnimationFrame(this.drawGridRequestId);
      this.drawGridRequestId = undefined;
    }
    this.tracker.stop();
  }

  getVertices() {
    return model.path.vertices;
  }
}

export default FaceTracker;
