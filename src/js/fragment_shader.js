export default `
precision mediump float;

uniform sampler2D u_subjectImage;
uniform sampler2D u_currentAvgImage;
uniform sampler2D u_targetAvgImage;

varying vec2 v_subjectTexCoord;
varying vec2 v_currentAvgTexCoord;
varying vec2 v_targetAvgTexCoord;

void main() {
  vec4 subjectColor = texture2D(u_subjectImage, v_subjectTexCoord);
  vec4 currentAvgColor = texture2D(u_currentAvgImage, v_currentAvgTexCoord);
  vec4 targetAvgColor = texture2D(u_targetAvgImage, v_targetAvgTexCoord);
  gl_FragColor = subjectColor + 0.75 * (targetAvgColor - currentAvgColor);
}
`;
