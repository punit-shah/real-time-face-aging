function initQuestionsUI(startButtonClick) {
  const questions = document.getElementsByClassName('question');
  const radioButtons = document.getElementsByClassName('question__checkbox');
  const userDetails = {};

  for (let radioButton of radioButtons) {
    radioButton.addEventListener('change', radioButtonChange);
  }

  document.getElementById('gender-btn').addEventListener('click', () => {
    userDetails.gender = document.querySelector('.question__checkbox[name="gender"]:checked')
      .value;
    questions[0].classList.remove('question--active');
    questions[1].classList.add('question--active');
  });

  document.getElementById('age-group-btn').addEventListener('click', () => {
    userDetails.ageGroup = document.querySelector('.question__checkbox[name="age-group"]:checked')
      .value;
    questions[1].classList.remove('question--active');
    questions[2].classList.add('question--active');
  });

  document.getElementById('ethnicity-btn').addEventListener('click', () => {
    userDetails.ethnicity = document.querySelector('.question__checkbox[name="ethnicity"]:checked')
      .value;
    questions[2].classList.remove('question--active');
    startButtonClick(userDetails);
  });
}

function radioButtonChange() {
  const radioGroup = document.getElementsByName(this.name);
  for (let radioButton of radioGroup) {
    const parent = radioButton.parentElement.parentElement;
    // first remove the selected class from all options in the group
    parent.classList.remove('question__option--selected');
    // add the selected class only if the radio button is checked
    if (radioButton.checked) {
      parent.classList.add('question__option--selected');
    }
  }

  // enable the next/start button for this question
  const questionButton = document.getElementById(`${this.name}-btn`);
  if (questionButton.disabled) {
    questionButton.disabled = false;
  }
}

export default initQuestionsUI;
