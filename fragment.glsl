#ifdef GL_ES
precision highp float;
#endif

uniform vec2 uResolution;
uniform float uTime;
uniform sampler2D uTexture;

void main(void) {
  // Normalized pixel coordinates (from 0 to 1)
  vec2 uv = gl_FragCoord.xy/uResolution;

  // Time varying pixel color
  vec4 col = vec4(0.5 + 0.5*cos(uTime+uv.xyx+vec3(0,2,4)), 1.0);
  gl_FragColor = mix(texture2D(uTexture, uv), col, 0.005);
}

