# two-triangles

This is a simple template inspired by [ShaderToy](https://www.shadertoy.com/) and the presentation [Rendering Worlds with Two Triangles with raytracing on the GPU](https://www.iquilezles.org/www/material/nvscene2008/rwwtt.pdf) by [Inigo Quilez](https://iquilezles.org/). I wanted a similar setup that I could use and deploy to my own website easily. My workflow is usually:

1. Copy the files
2. Run [browser-sync](https://browsersync.io/) in the directory
3. Make edits to `fragment.glsl`

This is far from a perfect solution but can be dropped into any static server and just work.

## This Branch

This branch is a combination of techniques found in [Evan Wallace's Path Tracer](https://github.com/evanw/webgl-path-tracing/blob/master/webgl-path-tracing.js) and [James H. Fisher's Game of Life](https://jameshfisher.com/2017/10/22/webgl-game-of-life/).

The goal here was to implement the texture ping-ponging method for rendering back and forth between two textures. This allows the fragment shader to access the pixel values from the last frame through the texture. This is done by having another shader program that takes one of the textures and renders it directly to the canvas. This program shares the vertex shader with the program that renders to the textures and has a fragment shader that grab the correct value for each pixel.

Due to WebGL texture constraints (power of 2 square textures), the canvas is hardcoded to 512x512 and styled with CSS to stretch to full width.

This behavior is shown by making the fragment shader blend the calculated color with the existing one. This creates a slow fade from black that slowly approach the calculated color overtime. It also slightly changes how the gradient is animated.
