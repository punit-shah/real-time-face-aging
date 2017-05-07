import FaceTracker from './face_tracker';
import FaceAger from './face_ager';
import { createCanvas, setElementSize, loadImages, loadDataFiles } from './utils';

class App {
  constructor(containerElement) {
    this.containerElement = containerElement;
  }

  init(userDetails) {
    this.userDetails = userDetails;

    this.initFaceTracker();
    this.initCanvases();

    this.setSizes();
    window.addEventListener('resize', () => {
      this.setSizes();
    });

    this.initFaceAger();
    this.initResetButton();
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
    this.faceAger = new FaceAger(this.maskCanvas, this.faceTracker.getVertices());
    loadDataFiles({
      currentAvgPoints: `/data/${this.getBlendFilename(true)}.json`,
      targetAvgPoints: `/data/${this.getBlendFilename(false)}.json`
    }, (data) => {
      loadImages({
        currentAvgImage: this.getBlendImagePath(true),
        targetAvgImage: this.getBlendImagePath(false)
      }, (images) => {
        this.faceAger.setCurrentAvg(data.currentAvgPoints, images.currentAvgImage);
        this.faceAger.setTargetAvg(data.targetAvgPoints, images.targetAvgImage);
      });
    });
  }

  initResetButton() {
    const resetButton = this.createResetButton();
    this.containerElement.appendChild(resetButton);
    resetButton.addEventListener('click', () => {
      this.stop();
    });
  }

  drawMask() {
    // copy video frame to canvas
    this.videoframeContext.drawImage(this.faceTracker.video, 0, 0,
        this.videoframeCanvas.width, this.videoframeCanvas.height);

    const subjectPositions = this.faceTracker.tracker.getCurrentPosition();
    if (subjectPositions) {
      this.faceAger.load(this.videoframeCanvas, subjectPositions);
      this.faceAger.draw(subjectPositions);
    }

    this.drawMaskRequestId = requestAnimationFrame(this.drawMask.bind(this));
  }

  // stops the application and goes back to the question UI
  reset() {
    if (this.drawMaskRequestId) {
      cancelAnimationFrame(this.drawMaskRequestId);
      this.drawMaskRequestId = undefined;
    }
    this.faceTracker.stop();
    this.userDetails = undefined;
    while (this.containerElement.hasChildNodes()) {
      this.containerElement.removeChild(this.containerElement.lastChild);
    }
    document.getElementsByClassName('question')[0].classList.add('question--active');
  }

  getBlendFilename(current) {
    let filename = this.userDetails.gender + this.userDetails.ethnicity;
    filename += current ? this.userDetails.ageGroup : '55';

    return filename;
  }

  getBlendImagePath(current) {
    const ethnicityMap = {
      a: 'AfroCaribbean/',
      c: 'Caucasian/',
      e: 'East-Asian/',
      w: 'West-Asian/'
    };

    let imagePath = '/img/blends/';
    imagePath += current ? 'smooth/' : 'textured/';
    imagePath += ethnicityMap[this.userDetails.ethnicity];
    imagePath += `${this.getBlendFilename(current)}.jpg`;

    return imagePath;
  }

  createResetButton() {
    const resetButton = document.createElement('button');
    resetButton.classList.add('btn', 'btn--reset');
    resetButton.id = 'reset-btn';
    resetButton.textContent = 'Reset';
    return resetButton;
  }
}

export default App;
