uniform vec3 uShallow;
uniform vec3 uDeep;
uniform vec3 uSunDir;
uniform vec3 uSunColor;

varying vec3 vWorldPos;
varying vec3 vNormalW;

void main()
{
    vec3 N = normalize(vNormalW);
    vec3 V = normalize(cameraPosition - vWorldPos);
    bool below = cameraPosition.y < vWorldPos.y;

    float ndv = clamp(abs(dot(N, V)), 0.0, 1.0);
    float fresnel = below ? pow(1.0 - ndv, 2.2) : 0.02 + 0.98 * pow(1.0 - ndv, 5.0);

    vec3 body = mix(uDeep, uShallow, 0.55);
    vec3 sky = mix(uShallow, vec3(0.85, 0.96, 1.0), 0.65);
    vec3 color = mix(body, sky, clamp(fresnel * 1.4, 0.0, 1.0));

    vec3 R = reflect(-V, below ? -N : N);
    float glint = pow(max(dot(R, uSunDir), 0.0), 180.0);
    color += uSunColor * glint * 2.0;

    float alpha = below ? 0.22 + fresnel * 0.75 : 0.16 + fresnel * 0.6;
    alpha = clamp(alpha + glint, 0.0, 1.0);

    gl_FragColor = vec4(color, alpha);
    __OUTPUT__
}
