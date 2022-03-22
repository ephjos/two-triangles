
// ----------------------------------------------------------------------------
// Utils

// https://webglfundamentals.org/webgl/lessons/webgl-resizing-the-canvas.html
function resizeCanvasToDisplaySize(canvas) {
  // Lookup the size the browser is displaying the canvas in CSS pixels.
  const displayWidth  = canvas.clientWidth;
  const displayHeight = canvas.clientHeight;

  // Check if the canvas is not the same size.
  const needResize = canvas.width  !== displayWidth ||
    canvas.height !== displayHeight;

  if (needResize) {
    // Make the canvas the same size
    canvas.width  = displayWidth;
    canvas.height = displayHeight;
  }

  return needResize;
}

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

function CoreProgram(shaderWrapper) {
  this.shaderWrapper = shaderWrapper;

  this.positionBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
  const positions = [
    -1.0, -1.0,
    -1.0,   1.0,
    1.0,   1.0,
    1.0,   -1.0,
  ];

  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);
}

CoreProgram.create = async function() {
  const vsSource = `
    attribute vec4 aVertexPosition;

    void main(void) {
      gl_Position = aVertexPosition;
    }
  `;

  // Moved fragment shader to a separate file loaded at runtime to make dev
  // easier. This way is inefficient but removes the need for a bundling tool.
  const fsSource = await fetch("./fragment.glsl").then(res => res.text());

  const shaderProgram = new ShaderWrapper(vsSource, fsSource, ["aVertexPosition"], ["uResolution", "uTime"]);
  return new CoreProgram(shaderProgram);
}

CoreProgram.prototype.update = function() {}
CoreProgram.prototype.render = function(context) {
  gl.useProgram(this.shaderWrapper.shaderProgram);

  // Set vertex attribute
  const numComponents = 2;
  const type = gl.FLOAT;
  const normalize = false;
  const stride = 0;
  const offset = 0;
  gl.bindBuffer(gl.ARRAY_BUFFER, this.positionBuffer);
  gl.vertexAttribPointer(
    this.shaderWrapper.attributes.aVertexPosition,
    numComponents,
    type,
    normalize,
    stride,
    offset);
  gl.enableVertexAttribArray(
    this.shaderWrapper.attributes.aVertexPosition);

  // Set uniforms
  gl.uniform2fv(this.shaderWrapper.uniforms.uResolution, [gl.canvas.width, gl.canvas.height]);
  gl.uniform1f(this.shaderWrapper.uniforms.uTime, context.now / 1000);

  gl.drawArrays(gl.TRIANGLE_FAN, 0, 4);
  gl.flush();
}

// ----------------------------------------------------------------------------

// Main draw function
function draw(gl, programs, context) {
  if (resizeCanvasToDisplaySize(gl.canvas)) {
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
  }

  const coreProgram = programs.coreProgram;
  coreProgram.update();
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

