uniform sampler2D tDiffuse;
uniform float uTime;
uniform float uVignette;
uniform float uGrain;
uniform float uAberration;

varying vec2 vUv;

float hash(vec2 p)
{
    return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453);
}

void main()
{
    vec2 centered = vUv - 0.5;
    float r2 = dot(centered, centered);
    vec2 offset = centered * r2 * uAberration * 4.0;

    vec3 color;
    color.r = texture2D(tDiffuse, vUv + offset).r;
    color.g = texture2D(tDiffuse, vUv).g;
    color.b = texture2D(tDiffuse, vUv - offset).b;

    color *= 1.0 - uVignette * smoothstep(0.15, 0.75, sqrt(r2) * 1.4142);
    color += (hash(vUv * 1000.0 + uTime) - 0.5) * uGrain;

    gl_FragColor = vec4(color, 1.0);
}
