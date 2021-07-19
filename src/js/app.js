import FaceTracker from './face_tracker';
import FaceAger from './face_ager';
import { createCanvas, setElementSize, loadImages, loadDataFiles } from './utils';

class App {
  /**
   * @param containerElement a container element for the application
   */
  constructor(containerElement) {
    this.containerElement = containerElement;
  }

  /**
   * initialise the application
   * @param userDetails an object containing details chosen by the user. used to select which
   *                    average textures to use
   */
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

  /**
   * initialises the face tracker. calls drawMask() when the tracker has converged
   */
  initFaceTracker() {
    this.faceTracker = new FaceTracker(this.containerElement, () => {
      this.drawMask();
    });
    this.faceTracker.init();
  }

  /**
   * creates canvases for the face ager
   */
  initCanvases() {
    // canvas to copy video frames to
    // does not need to be appended to DOM
    this.videoframeCanvas = createCanvas('videoframe');
    this.videoframeContext = this.videoframeCanvas.getContext('2d');

    // canvas to draw aged face
    this.maskCanvas = createCanvas('mask');
    this.containerElement.appendChild(this.maskCanvas);
  }

  /**
   * sets the sizes of the canvases to the size of the webcam video
   */
  setSizes() {
    const width = this.faceTracker.video.width;
    const height = this.faceTracker.video.height;

    setElementSize(this.maskCanvas, width, height);
    setElementSize(this.videoframeCanvas, width, height);
  }

  /**
   * initialise the face ager
   */
  initFaceAger() {
    this.faceAger = new FaceAger(this.maskCanvas, this.faceTracker.getVertices());

    // load average points
    loadDataFiles({
      currentAvgPoints: `/data/${this.getAverageFilename(true)}.json`,
      targetAvgPoints: `/data/${this.getAverageFilename(false)}.json`
    }, (data) => {
      // load average texture images
      loadImages({
        currentAvgImage: this.getAverageImagePath(true),
        targetAvgImage: this.getAverageImagePath(false)
      }, (images) => {
        this.faceAger.setCurrentAvg(images.currentAvgImage, data.currentAvgPoints);
        this.faceAger.setTargetAvg(images.targetAvgImage, data.targetAvgPoints);
      });
    });
  }

  /**
   * initialises the reset button
   */
  initResetButton() {
    const resetButton = this.createResetButton();
    this.containerElement.appendChild(resetButton);
    resetButton.addEventListener('click', () => {
      this.reset();
    });
  }

  /**
   * uses the face ager to draw the aged face
   */
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

  /**
   * stops the application and goes back to the question UI
   */
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

  /**
   * uses the user details to get the filename for an average
   * @param {boolean} current if true, gets filename for the current average. if false, gets
   *                          filename for the target average
   */
  getAverageFilename(current) {
    let filename = this.userDetails.gender + this.userDetails.ethnicity;
    filename += current ? this.userDetails.ageGroup : '55';

    return filename;
  }

  /**
   * uses the user details to get the filepath to an average texture image
   * @param {boolean} current if true, gets filepath for the current average. if false, gets
   *                          filepath for the target average
   */
  getAverageImagePath(current) {
    const ethnicityMap = {
      a: 'AfroCaribbean/',
      c: 'Caucasian/',
      e: 'East-Asian/',
      w: 'West-Asian/'
    };

    let imagePath = '/img/blends/';
    imagePath += current ? 'smooth/' : 'textured/';
    imagePath += ethnicityMap[this.userDetails.ethnicity];
    imagePath += `${this.getAverageFilename(current)}.jpg`;

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
