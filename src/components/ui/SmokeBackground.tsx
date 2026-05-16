'use client'

import React, { useEffect, useRef, useState } from 'react'

const fragmentShaderSource = `#version 300 es
precision highp float;
out vec4 O;
uniform float time;
uniform vec2 resolution;
uniform vec3 u_color;

#define FC gl_FragCoord.xy
#define R resolution
#define T (time+660.)

float rnd(vec2 p){p=fract(p*vec2(12.9898,78.233));p+=dot(p,p+34.56);return fract(p.x*p.y);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p),u=f*f*(3.-2.*f);return mix(mix(rnd(i),rnd(i+vec2(1,0)),u.x),mix(rnd(i+vec2(0,1)),rnd(i+1.),u.x),u.y);}
float fbm(vec2 p){float t=.0,a=1.;for(int i=0;i<5;i++){t+=a*noise(p);p*=mat2(1,-1.2,.2,1.2)*2.;a*=.5;}return t;}

void main(){
  vec2 uv=(FC-.5*R)/R.y;
  uv.x+=.25;
  uv*=vec2(2,1);

  float n=fbm(uv*.28-vec2(T*.01,0));
  n=noise(uv*3.+n*2.);

  float smoke=fbm(uv+vec2(0,T*.015)+n);

  // near-black evergreen base, subtle green smoke wisps
  vec3 base=vec3(0.03,0.06,0.04);
  vec3 col=mix(base, u_color*0.6, smoke*0.55);

  col=mix(vec3(.02,.04,.03),col,min(time*.1,1.));
  col=clamp(col,0.,1.);
  O=vec4(col,1);
}`

class Renderer {
  private readonly vertexSrc = `#version 300 es
precision highp float;
in vec4 position;
void main(){gl_Position=position;}`

  private readonly vertices = [-1, 1, -1, -1, 1, 1, 1, -1]
  private gl: WebGL2RenderingContext
  private canvas: HTMLCanvasElement
  private program: WebGLProgram | null = null
  private vs: WebGLShader | null = null
  private fs: WebGLShader | null = null
  private buffer: WebGLBuffer | null = null
  private color: [number, number, number] = [0.945, 0.961, 0.949]

  constructor(canvas: HTMLCanvasElement, fragmentSource: string) {
    this.canvas = canvas
    this.gl = canvas.getContext('webgl2') as WebGL2RenderingContext
    this.setup(fragmentSource)
    this.init()
  }

  updateColor(newColor: [number, number, number]) {
    this.color = newColor
  }

  updateScale() {
    const dpr = Math.max(1, window.devicePixelRatio)
    const { innerWidth: width, innerHeight: height } = window
    this.canvas.width = width * dpr
    this.canvas.height = height * dpr
    this.gl.viewport(0, 0, this.canvas.width, this.canvas.height)
  }

  private compile(shader: WebGLShader, source: string) {
    const gl = this.gl
    gl.shaderSource(shader, source)
    gl.compileShader(shader)
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(`Shader compilation error: ${gl.getShaderInfoLog(shader)}`)
    }
  }

  reset() {
    const { gl, program, vs, fs } = this
    if (!program) return
    if (vs) {
      gl.detachShader(program, vs)
      gl.deleteShader(vs)
    }
    if (fs) {
      gl.detachShader(program, fs)
      gl.deleteShader(fs)
    }
    gl.deleteProgram(program)
    this.program = null
  }

  private setup(fragmentSource: string) {
    const gl = this.gl
    this.vs = gl.createShader(gl.VERTEX_SHADER)
    this.fs = gl.createShader(gl.FRAGMENT_SHADER)
    const program = gl.createProgram()
    if (!this.vs || !this.fs || !program) return
    this.compile(this.vs, this.vertexSrc)
    this.compile(this.fs, fragmentSource)
    this.program = program
    gl.attachShader(this.program, this.vs)
    gl.attachShader(this.program, this.fs)
    gl.linkProgram(this.program)
    if (!gl.getProgramParameter(this.program, gl.LINK_STATUS)) {
      console.error(`Program linking error: ${gl.getProgramInfoLog(this.program)}`)
    }
  }

  private init() {
    const { gl, program } = this
    if (!program) return
    this.buffer = gl.createBuffer()
    gl.bindBuffer(gl.ARRAY_BUFFER, this.buffer)
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(this.vertices), gl.STATIC_DRAW)
    const position = gl.getAttribLocation(program, 'position')
    gl.enableVertexAttribArray(position)
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0)
    Object.assign(program, {
      resolution: gl.getUniformLocation(program, 'resolution'),
      time: gl.getUniformLocation(program, 'time'),
      u_color: gl.getUniformLocation(program, 'u_color'),
    })
  }

  render(now = 0) {
    const { gl, program, buffer, canvas } = this
    if (!program || !gl.isProgram(program)) return
    gl.clearColor(0, 0, 0, 1)
    gl.clear(gl.COLOR_BUFFER_BIT)
    gl.useProgram(program)
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer)
    const uniformProgram = program as WebGLProgram & {
      resolution: WebGLUniformLocation
      time: WebGLUniformLocation
      u_color: WebGLUniformLocation
    }
    gl.uniform2f(uniformProgram.resolution, canvas.width, canvas.height)
    gl.uniform1f(uniformProgram.time, now * 1e-3)
    gl.uniform3fv(uniformProgram.u_color, this.color)
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4)
  }
}

const hexToRgb = (hex: string): [number, number, number] | null => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result
    ? [parseInt(result[1], 16) / 255, parseInt(result[2], 16) / 255, parseInt(result[3], 16) / 255]
    : null
}

interface SmokeBackgroundProps {
  smokeColor?: string
}

export const SmokeBackground: React.FC<SmokeBackgroundProps> = ({ smokeColor = '#F1F5F2' }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const rendererRef = useRef<Renderer | null>(null)
  const [reducedMotion, setReducedMotion] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(prefers-reduced-motion: reduce)').matches
  })

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    const handler = (e: MediaQueryListEvent) => setReducedMotion(e.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (reducedMotion || !canvasRef.current) return

    const canvas = canvasRef.current
    const renderer = new Renderer(canvas, fragmentShaderSource)
    rendererRef.current = renderer

    const handleResize = () => renderer.updateScale()
    handleResize()
    window.addEventListener('resize', handleResize)

    let animationFrameId: number
    const loop = (now: number) => {
      renderer.render(now)
      animationFrameId = requestAnimationFrame(loop)
    }
    loop(0)

    return () => {
      window.removeEventListener('resize', handleResize)
      cancelAnimationFrame(animationFrameId)
      renderer.reset()
    }
  }, [reducedMotion])

  useEffect(() => {
    const renderer = rendererRef.current
    if (renderer) {
      const rgbColor = hexToRgb(smokeColor)
      if (rgbColor) {
        renderer.updateColor(rgbColor)
      }
    }
  }, [smokeColor])

  if (reducedMotion) {
    return <div className="absolute inset-0 -z-10 bg-evergreen" />
  }

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 -z-10 w-full h-full pointer-events-none block"
    />
  )
}
