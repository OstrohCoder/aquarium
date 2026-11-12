uniform float uTime;
uniform float uSwayAmp;
uniform vec2 uCurrent;

vec3 swayDisplace(vec3 p)
{
    float bend = pow(clamp(p.y, 0.0, 1.5), 2.0);
    vec2 root = vec2(0.0);
    #ifdef USE_INSTANCING
    root = instanceMatrix[3].xz;
    #endif
    float phase = root.x * 1.7 + root.y * 2.3;
    float waveA = sin(uTime * 1.1 + phase + p.y * 2.2);
    float waveB = sin(uTime * 1.9 + phase * 1.7 + p.y * 3.1);

    p.x += (waveA * 0.7 + waveB * 0.3 + uCurrent.x) * uSwayAmp * bend;
    p.z += (cos(uTime * 0.8 + phase * 1.3 + p.y * 1.8) * 0.5 + uCurrent.y) * uSwayAmp * bend;

    return p;
}
