#ifdef GL_ES
precision highp float;
#endif

uniform vec2 uResolution;
uniform float uTime;

void main(void) {
  // Normalized pixel coordinates (from 0 to 1)
  vec2 uv = gl_FragCoord.xy/uResolution;

  // Time varying pixel color
  vec3 col = 0.5 + 0.5*cos(uTime+uv.xyx+vec3(0,2,4));
  gl_FragColor = vec4(col, 1.0);
}

