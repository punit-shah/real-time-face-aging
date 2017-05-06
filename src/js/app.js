import FaceTracker from './face_tracker';
import FaceAger from './face_ager';
import { createCanvas, setElementSize } from './utils';

import currentAvgPoints from './average_points/mw13-18';
import targetAvgPoints from './average_points/mw55';

class App {
  constructor(containerElement) {
    this.containerElement = containerElement;
  }

  init() {
    this.initFaceTracker();
    this.initCanvases();

    this.setSizes();
    window.addEventListener('resize', () => {
      this.setSizes();
    });

    this.initFaceAger();
  }

  initFaceTracker() {
    this.faceTracker = new FaceTracker(this.containerElement, () => {
      this.drawMask();
    });
    this.faceTracker.init();
  }

  initCanvases() {
    // canvas to copy video frames to
    // does not need to be appended to DOM
    this.videoframeCanvas = createCanvas('videoframe');
    this.videoframeContext = this.videoframeCanvas.getContext('2d');

    // canvas to draw webgl mask
    this.maskCanvas = createCanvas('mask');
    this.containerElement.appendChild(this.maskCanvas);
  }

  setSizes() {
    const width = this.faceTracker.video.width;
    const height = this.faceTracker.video.height;

    setElementSize(this.maskCanvas, width, height);
    setElementSize(this.videoframeCanvas, width, height);
  }

  initFaceAger() {
    this.faceAger = new FaceAger(this.maskCanvas);
  }

  drawMask() {
    // copy video frame to canvas
    this.videoframeContext.drawImage(this.faceTracker.video, 0, 0,
        this.videoframeCanvas.width, this.videoframeCanvas.height);

    const subjectPositions = this.faceTracker.tracker.getCurrentPosition();
    if (subjectPositions) {
      this.faceAger.load(this.videoframeCanvas, subjectPositions, this.faceTracker.getVertices());
      this.faceAger.draw(subjectPositions, currentAvgPoints, targetAvgPoints);
    }

    requestAnimationFrame(this.drawMask.bind(this));
  }
}

export default App;
