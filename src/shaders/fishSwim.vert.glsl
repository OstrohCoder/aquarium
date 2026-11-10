uniform float uCycle;
uniform float uAmp;
uniform float uBend;
uniform float uFlap;

attribute float aFlap;

vec3 swimDisplace(vec3 p)
{
    float tail = clamp(0.5 - p.x, 0.0, 1.6);
    float body = pow(tail, 1.7);
    float wave = sin(uCycle - p.x * 5.5);
    float side = p.z >= 0.0 ? 1.0 : -1.0;

    p.z += wave * uAmp * body;
    p.z += uBend * tail * tail;
    p.z += side * sin(uCycle * 2.0 + aFlap * 2.0) * aFlap * uFlap;

    return p;
}
