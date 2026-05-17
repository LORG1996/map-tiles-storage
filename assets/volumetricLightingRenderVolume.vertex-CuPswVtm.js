import{Bc as e,Dr as t,Or as n,Pl as r,Vc as i,Xa as a,Ya as o}from"./index-BWQv8qGT.js";var s,c,l;r((()=>{i(),n(),a(),t(),o(),s=`volumetricLightingRenderVolumeVertexShader`,c=`#include<__decl__sceneVertex>
#include<__decl__meshVertex>
attribute vec3 position;varying vec4 vWorldPos;void main(void) {vec4 worldPos=world*vec4(position,1.0);vWorldPos=worldPos;gl_Position=viewProjection*worldPos;}
`,e.ShadersStore[s]||(e.ShadersStore[s]=c),l={name:s,shader:c}}))();export{l as volumetricLightingRenderVolumeVertexShader};