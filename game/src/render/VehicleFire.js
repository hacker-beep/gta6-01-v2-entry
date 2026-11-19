import * as THREE from 'three';

// Procedural particles only: no downloaded textures or postprocessing pass.
export class VehicleFire {
  constructor(scene, x, z) {
    this.root = new THREE.Group(); this.root.name = 'Burning getaway car / flame and smoke';
    this.root.position.set(x, 0, z); scene.add(this.root);
    this.time = 1.7; this.particles = [];
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 64;
    const c = canvas.getContext('2d'), gradient = c.createRadialGradient(32,32,0,32,32,32);
    gradient.addColorStop(0,'#ffffffff'); gradient.addColorStop(.25,'#ffffffee');
    gradient.addColorStop(.6,'#ffffff66'); gradient.addColorStop(1,'#ffffff00');
    c.fillStyle=gradient; c.fillRect(0,0,64,64); this.texture=new THREE.CanvasTexture(canvas);
    for(let i=0;i<10;i++) {
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.texture,color:i%3===0?'#fff3a5':'#ff680b',blending:THREE.AdditiveBlending,transparent:true,depthWrite:false,toneMapped:false}));
      this.root.add(sprite);this.particles.push({sprite,smoke:false,index:i});
    }
    for(let i=0;i<7;i++) {
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.texture,color:i%2?'#322d32':'#51404a',transparent:true,opacity:.72,depthWrite:false}));
      this.root.add(sprite);this.particles.push({sprite,smoke:true,index:i});
    }
    this.light=new THREE.PointLight('#ff7924',95,24,1.5);this.light.position.set(0,2.3,0);this.root.add(this.light);
    this.update(0);
  }
  update(dt) {
    this.time+=dt;
    for(const {sprite,smoke,index:i} of this.particles) {
      const wave=Math.sin(this.time*7+i*2.3);
      if(smoke) {
        const rise=(this.time*.2+i/7)%1;
        sprite.position.set(.4+rise*1.7+Math.sin(i*2)*.5,3+rise*7,Math.cos(i*2)*.7);
        sprite.scale.set(2.4+rise*3.2,2.8+rise*3.5,1);sprite.material.opacity=.65*(1-rise*.8);
      } else {
        const h=1.3+(i%4)*.65+wave*.2;
        sprite.position.set(Math.sin(i*2.4)*1.15,h,Math.cos(i*2.4)*1.2);
        sprite.scale.set(1.15+(i%3)*.35,2.8+wave*.6+(i%3)*.7,1);
      }
    }
    this.light.intensity=95+Math.sin(this.time*11)*15;
  }
  dispose(scene) {
    scene.remove(this.root);this.texture.dispose();
    this.particles.forEach(({sprite})=>sprite.material.dispose());this.light.dispose();
  }
}
