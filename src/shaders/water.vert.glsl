uniform float uTime;

varying vec3 vWorldPos;
varying vec3 vNormalW;

float waveHeight(vec2 p, float t)
{
    float h = 0.0;
    h += sin(p.x * 2.1 + t * 1.1) * 0.012;
    h += sin(p.y * 2.7 - t * 0.9) * 0.010;
    h += sin((p.x + p.y) * 4.3 + t * 1.9) * 0.005;
    h += sin((p.x - p.y) * 6.1 - t * 2.3) * 0.0025;
    return h;
}

void main()
{
    vec4 wp = modelMatrix * vec4(position, 1.0);
    float e = 0.02;
    float h = waveHeight(wp.xz, uTime);
    float hx = waveHeight(wp.xz + vec2(e, 0.0), uTime);
    float hz = waveHeight(wp.xz + vec2(0.0, e), uTime);

    vNormalW = normalize(vec3(-(hx - h) / e, 1.0, -(hz - h) / e));
    wp.y += h;
    vWorldPos = wp.xyz;

    gl_Position = projectionMatrix * viewMatrix * wp;
}
