uniform vec3 uShallow;
uniform vec3 uDeep;
uniform float uWaterHeight;
uniform float uOpacity;
uniform float uTime;

varying vec3 vWorldPos;

void main()
{
    float h = clamp(vWorldPos.y / uWaterHeight, 0.0, 1.0);
    vec3 color = mix(uDeep, uShallow, pow(h, 0.8));

    float shimmer = 0.5 + 0.5 * sin(vWorldPos.x * 3.0 + vWorldPos.y * 2.0 + uTime * 0.6);
    color += uShallow * shimmer * 0.04 * h;

    float alpha = uOpacity * mix(1.35, 0.9, h);

    gl_FragColor = vec4(color, alpha);
    __OUTPUT__
}
