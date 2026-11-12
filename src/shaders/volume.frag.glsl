uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uMurkColor;
uniform float uMurk;
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
    color = mix(color, uMurkColor * (0.45 + 0.55 * h), uMurk * 0.7);

    float alpha = uOpacity * mix(1.35, 0.9, h) * (1.0 + uMurk * 1.4);

    gl_FragColor = vec4(color, min(alpha, 0.8));
    __OUTPUT__
}
