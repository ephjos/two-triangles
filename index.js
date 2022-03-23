
// ----------------------------------------------------------------------------
// Utils

// ----------------------------------------------------------------------------
// Globals

let gl;

// ----------------------------------------------------------------------------
// Common wrapper for building a shader program with a vertex and fragment shader
function ShaderWrapper(vertexSource, fragmentSource, attributeNames, uniformNames) {
  this.shaderProgram = ShaderWrapper.createShaderProgram(vertexSource, fragmentSource);

  this.attributes = {};
  for (const attributeName of attributeNames) {
    this.attributes[attributeName] = gl.getAttribLocation(this.shaderProgram, attributeName);
  }

  this.uniforms = {};
  for (const uniformName of uniformNames) {
    this.uniforms[uniformName] = gl.getUniformLocation(this.shaderProgram, uniformName);
  }
}
ShaderWrapper.createShaderProgram = function(vertexSource, fragmentSource) {
  function loadShader(gl, type, source) {
    const shader = gl.createShader(type);

    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      alert('An error occurred compiling the shaders: ' + gl.getShaderInfoLog(shader));
      gl.deleteShader(shader);
      return null;
    }

    return shader;
  }

  // Create shaders, combine into program
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert('Unable to initialize the shader program: ' + gl.getProgramInfoLog(shaderProgram));
    return null;
  }

  return shaderProgram;
};

// ----------------------------------------------------------------------------
// Program objects that implement a full program.
//   constructor: create shader wrapper and any initial data
//   update: called once every render loop before the render function
//   render: called once every render loop to produce output
//   create: optional, async constructor hook

function CoreProgram(renderWrapper, displayWrapper) {
  this.renderWrapper = renderWrapper;
  this.displayWrapper = displayWrapper;

  this.positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
  const positions = [
    -1.0, -1.0,
    -1.0,   1.0,
    1.0,   1.0,
    1.0,   -1.0,
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

  this.framebuffer = gl.createFramebuffer();

  const type = gl.getExtension('OES_texture_float') ? gl.FLOAT : gl.UNSIGNED_BYTE;
  this.textures = [];
  for(let i = 0; i < 2; i++) {
    this.textures.push(gl.createTexture());
    gl.bindTexture(gl.TEXTURE_2D, this.textures[i]);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.canvas.width, gl.canvas.height, 0, gl.RGB, type, null);
  }
  gl.bindTexture(gl.TEXTURE_2D, null);
}

CoreProgram.create = async function() {
  const vertexSource = `
    attribute vec4 aVertexPosition;

    void main(void) {
      gl_Position = aVertexPosition;
    }
  `;

  // Moved fragment shader to a separate file loaded at runtime to make dev
  // easier. This way is inefficient but removes the need for a bundling tool.
  const renderFragmentSource = await fetch("./fragment.glsl").then(res => res.text());
  const renderProgram = new ShaderWrapper(vertexSource, renderFragmentSource, ["aVertexPosition"], ["uResolution", "uTime", "uTexture"]);

  const displayFragmentSource = `
    precision highp float;
    uniform sampler2D uTexture;
    uniform vec2 uResolution;
    void main() {
      gl_FragColor = texture2D(uTexture, gl_FragCoord.xy / uResolution);
    }
  `;
  const displayProgram = new ShaderWrapper(vertexSource, displayFragmentSource, ["aVertexPosition"], ["uResolution", "uTexture"]);
  return new CoreProgram(renderProgram, displayProgram);
}

CoreProgram.prototype.update = function(context) {
  const wrapper = this.renderWrapper;
  const attributes = wrapper.attributes;
  const uniforms = wrapper.uniforms;

  // render to texture
  gl.useProgram(wrapper.shaderProgram);
  gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
  gl.bindFramebuffer(gl.FRAMEBUFFER, this.framebuffer);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, this.textures[1], 0);

  gl.vertexAttribPointer(
    attributes.aVertexPosition,
    2,
    gl.FLOAT,
    false,
    0,
    0);
  gl.enableVertexAttribArray(
    attributes.aVertexPosition);

  gl.uniform2fv(uniforms.uResolution, [gl.canvas.width, gl.canvas.height]);
  gl.uniform1f(uniforms.uTime, context.now / 1000);

  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.flush();
  gl.bindFramebuffer(gl.FRAMEBUFFER, null);

  // ping pong textures
  this.textures.reverse();
}
CoreProgram.prototype.render = function(context) {
  const wrapper = this.displayWrapper;
  const attributes = wrapper.attributes;
  const uniforms = wrapper.uniforms;

  gl.useProgram(wrapper.shaderProgram);
  gl.bindTexture(gl.TEXTURE_2D, this.textures[0]);
  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
  gl.vertexAttribPointer(attributes.aVertexPosition, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(
    attributes.aVertexPosition);
  gl.uniform2fv(uniforms.uResolution, [gl.canvas.width, gl.canvas.height]);
  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.flush();
}

// ----------------------------------------------------------------------------

// Main draw function
function draw(gl, programs, context) {
  const coreProgram = programs.coreProgram;
  coreProgram.update(context);
  coreProgram.render(context);

  window.requestAnimationFrame((now) => {
    context.now = now;
    draw(gl, programs, context);
  });
}

// Entrypoint
async function main() {
  const canvas = document.querySelector('#glcanvas');
  gl = canvas.getContext('webgl');

  if (!gl) {
    alert('Unable to initialize WebGL. Your browser or machine may not support it.');
    return;
  }

  const coreProgram = await CoreProgram.create();
  const programs = {
    coreProgram,
  };
  const context = {
    now: 0,
  };

  draw(gl, programs, context);
}

window.onload = main;

