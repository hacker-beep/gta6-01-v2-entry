import * as THREE from 'three';

// Broken, stretched light decals approximate reflections without a render target.
let texture;
export function reflectedLight(color, width = 0.8, length = 5, opacity = 0.5) {
  if (!texture) {
    const canvas=document.createElement('canvas');canvas.width=64;canvas.height=256;
    const c=canvas.getContext('2d');
    for(let y=0;y<256;y++) {
      const fade=Math.pow(Math.sin(y/256*Math.PI),1.4);
      const ripple=.55+.45*Math.sin(y*1.73)*Math.sin(y*.39);
      const w=15+Math.sin(y*.21)*7;
      const g=c.createLinearGradient(0,0,64,0);
      g.addColorStop(0,'#fff0');g.addColorStop(.5-w/64,'#fff1');
      g.addColorStop(.5,`rgba(255,255,255,${fade*ripple})`);
      g.addColorStop(.5+w/64,'#fff1');g.addColorStop(1,'#fff0');
      c.fillStyle=g;c.fillRect(0,y,64,1);
    }
    texture=new THREE.CanvasTexture(canvas);
  }
  const mesh=new THREE.Mesh(new THREE.PlaneGeometry(width,length),new THREE.MeshBasicMaterial({map:texture,color,transparent:true,opacity,blending:THREE.AdditiveBlending,depthWrite:false,toneMapped:false}));
  mesh.rotation.x=-Math.PI/2;mesh.renderOrder=2;return mesh;
}
