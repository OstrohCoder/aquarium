uniform float uWaterHeight;
uniform vec3 uSunDir;
uniform vec3 uSunColor;
uniform vec3 uShallow;
uniform float uGodrays;
uniform float uMurk;

varying vec3 vWorldPos;

float shafts(float s)
{
    float a = sin(s * 6.0 + sin(s * 2.3) * 1.5);
    float b = sin(s * 11.0 + sin(s * 4.1) * 1.2);
    float c = sin(s * 2.7);
    return pow(clamp(0.5 + 0.35 * a + 0.2 * b + 0.25 * c, 0.0, 1.0), 3.0);
}

void main()
{
    float slopeX = uSunDir.x / max(uSunDir.y, 0.25);
    float slopeZ = uSunDir.z / max(uSunDir.y, 0.25);
    float drop = vWorldPos.y - uWaterHeight;

    float s = (vWorldPos.x - drop * slopeX) + (vWorldPos.z - drop * slopeZ) * 0.6;
    float depth = clamp(-drop / uWaterHeight, 0.0, 1.0);

    float fade = pow(1.0 - depth, 1.4) * smoothstep(0.0, 0.04, depth);
    float intensity = uGodrays * (1.0 + uMurk * 1.2) * 0.2;
    vec3 color = mix(uSunColor, uShallow, 0.35) * shafts(s) * fade * intensity;

    gl_FragColor = vec4(color, 1.0);
    __OUTPUT__
}
