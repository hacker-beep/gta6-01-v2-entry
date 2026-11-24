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
      const sprite=new THREE.Sprite(new THREE.SpriteMaterial({map:this.texture,color:i%2?'#322d32':'#51404a',transparent:true,opacity:.55,depthWrite:false}));
      this.root.add(sprite);this.particles.push({sprite,smoke:true,index:i});
    }
    this.light=new THREE.PointLight('#ff7924',140,18,1.5);this.light.position.set(0,2.3,0);this.root.add(this.light);
    // v4: a dark scorch decal and a warm glow pool under the car, so the
    // fire reads as burning wreckage on asphalt instead of a floating blob.
    const scorch = new THREE.Mesh(new THREE.CircleGeometry(2.6, 24), new THREE.MeshBasicMaterial({ color: '#0d0b09', transparent: true, opacity: 0.55, depthWrite: false }));
    scorch.rotation.x = -Math.PI / 2; scorch.position.y = 0.03; this.root.add(scorch);
    const pool = new THREE.Mesh(new THREE.PlaneGeometry(7, 5), new THREE.MeshBasicMaterial({ map: this.texture, color: '#ff7a2a', transparent: true, opacity: 0.35, blending: THREE.AdditiveBlending, depthWrite: false, toneMapped: false }));
    pool.rotation.x = -Math.PI / 2; pool.position.y = 0.05; this.root.add(pool);
    this.scorch = scorch; this.pool = pool;
    this.update(0);
  }
  update(dt) {
    this.time+=dt;
    for(const {sprite,smoke,index:i} of this.particles) {
      const wave=Math.sin(this.time*7+i*2.3);
      if(smoke) {
        const rise=(this.time*.2+i/7)%1;
        sprite.position.set(.4+rise*1.7+Math.sin(i*2)*.5,3+rise*7,Math.cos(i*2)*.7);
        sprite.scale.set(2.4+rise*3.2,2.8+rise*3.5,1);sprite.material.opacity=.5*(1-rise*.8);
      } else {
        const h=1.0+(i%4)*.45+wave*.15;
        sprite.position.set(Math.sin(i*2.4)*0.7,h,Math.cos(i*2.4)*0.7);
        sprite.scale.set(0.8+(i%3)*.25,2.0+wave*.4+(i%3)*.5,1);
      }
    }
    this.light.intensity=140+Math.sin(this.time*11)*20;
  }
  dispose(scene) {
    scene.remove(this.root);this.texture.dispose();
    this.particles.forEach(({sprite})=>sprite.material.dispose());this.light.dispose();
    this.scorch?.material.dispose(); this.scorch?.geometry.dispose();
    this.pool?.material.dispose(); this.pool?.geometry.dispose();
  }
}
