import initQuestionsUI from './questions_ui';
import App from './app';

const containerElement = document.getElementById('video-container');
const app = new App(containerElement);

function startButtonClick(userDetails) {
  app.init(userDetails);
}

initQuestionsUI(startButtonClick);
