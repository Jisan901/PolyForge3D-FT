import { 
  uv, float, time, mul, vec2, add, texture, color, pow, dot, normalView, screenUV, viewportDepthTexture, cameraNear, cameraFar, perspectiveDepthToViewZ, positionView, sub, clamp, smoothstep, div, vec4, normalize,pass
} from 'three/tsl';
import { 
  MeshBasicNodeMaterial 
} from 'three/webgpu';
// TSL Graph Generation
const uv_1768243525457 = uv().mul(1);
const time_1768243541078 = time;
const mul_1768243854840 = time_1768243541078.mul(float(0.3));
const vec2_1768243983243 = vec2(float(0), mul_1768243854840);
const add_1768243535520 = uv_1768243525457.add(vec2_1768243983243);

const color_1768243564108 = color('#00ff00');
const mul_1768243572523 = color_1768243564108;
const split_1768243808175 = mul_1768243572523;
const fresnel_fresnel = pow(float(1).sub(dot(normalView, normalize(positionView.negate()))), float(5));
const screenuv_scrUV = screenUV;
const viewportdepthtexture_depthTex = viewportDepthTexture(screenuv_scrUV);
const cameranear_camNear = cameraNear;
const camerafar_camFar = cameraFar;
const perspectivedepthtoviewz_sceneZ = perspectiveDepthToViewZ(viewportdepthtexture_depthTex, cameranear_camNear, camerafar_camFar);
const viewz_viewZ = positionView.z.mul(1).toVar();
const float_offset = float(0.3);
const sub_subOffset = viewz_viewZ.sub(float_offset);
const sub_diff = perspectivedepthtoviewz_sceneZ.sub(sub_subOffset);
const clamp_clamp = clamp(sub_diff, float(0), float(1));
const smoothstep_smooth = smoothstep(float(0), float(1), clamp_clamp);
const add_add = fresnel_fresnel.add(smoothstep_smooth);
const float_two = float(2);
const div_div = add_add.div(float_two);
const vec4_1768243736252 = vec4(split_1768243808175.x, split_1768243808175.y, split_1768243808175.z, div_div);
const material = new MeshBasicNodeMaterial();
material.fragmentNode = vec4_1768243736252;
material.opacityNode = float(1);
//material.positionNode = float(0);
material.transparent = true;
//sphere.material = material 

export default material;