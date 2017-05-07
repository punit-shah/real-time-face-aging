export default `
attribute vec2 a_subjectTexCoord;
attribute vec2 a_currentAvgTexCoord;
attribute vec2 a_targetAvgTexCoord;

attribute vec2 a_subjectPosition;
attribute vec2 a_currentAvgPosition;
attribute vec2 a_targetAvgPosition;

varying vec2 v_subjectTexCoord;
varying vec2 v_currentAvgTexCoord;
varying vec2 v_targetAvgTexCoord;

uniform vec2 u_resolution;

void main() {
  vec2 newPos = a_subjectPosition + 2.0 * (a_targetAvgPosition - a_currentAvgPosition);
  vec2 zeroToOne = newPos / u_resolution;
  vec2 zeroToTwo = zeroToOne * 2.0;
  vec2 clipSpace = zeroToTwo - 1.0;
  gl_Position = vec4(clipSpace * vec2(1, -1), 0, 1);

  v_subjectTexCoord = a_subjectTexCoord;
  v_currentAvgTexCoord = a_currentAvgTexCoord;
  v_targetAvgTexCoord = a_targetAvgTexCoord;
}
`;
