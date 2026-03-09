"use client";
import { useEffect, useRef, useState, useCallback } from "react";

interface AsteroidData {
  spk_id: string;
  name: string;
  designation: string;
  spectral_type: string;
  diameter_km: number;
  semi_major_axis_au: number;
  eccentricity: number;
  inclination_deg: number;
  delta_v_km_s: number;
  moid_au: number;
  feasibility_score: number;
  total_value_usd: number;
  recommended_method: string;
  mission_difficulty: string;
  dc_score: number;
}

const AU  = 80;
const PLANETS: [string, number, number, number, number][] = [
  ["Mercury", 0.387, 0.25, 0xb5b5b5, 0.241],
  ["Venus",   0.723, 0.45, 0xe8cda0, 0.615],
  ["Earth",   1.000, 0.50, 0x4488ff, 1.000],
  ["Mars",    1.524, 0.35, 0xcc4422, 1.881],
  ["Jupiter", 5.203, 1.20, 0xc88b3a, 11.86],
  ["Saturn",  9.537, 1.00, 0xe4d191, 29.46],
  ["Uranus",  19.19, 0.75, 0x7de8e8, 84.01],
  ["Neptune", 30.07, 0.70, 0x3f54ba, 164.8],
];

function scoreColor(s: number): number {
  if (s >= 7.5) return 0x00ff88;
  if (s >= 5.0) return 0xffaa00;
  if (s >= 3.0) return 0xff4444;
  return 0x666688;
}

function spectralColor(t: string): number {
  return ({ "M-type":0xc0c0ff,"S-type":0xffaa55,"C-type":0x888888,
             "D-type":0x554433,"V-type":0xaa44ff } as any)[t] ?? 0x999999;
}

function solveKepler(M: number, e: number): number {
  let E = M;
  for (let i = 0; i < 10; i++) E -= (E - e * Math.sin(E) - M) / (1 - e * Math.cos(E));
  return E;
}

function toCartesian(a:number,e:number,i:number,M:number,scale:number):[number,number,number]{
  const iR=i*Math.PI/180, E=solveKepler(M,e), b=a*Math.sqrt(1-e*e);
  const xo=a*(Math.cos(E)-e), yo=b*Math.sin(E);
  return [xo*scale, yo*Math.sin(iR)*scale, yo*Math.cos(iR)*scale];
}

function orbitPath(a:number,e:number,i:number,scale:number,n=256):Float32Array{
  const pts=new Float32Array(n*3), b=a*Math.sqrt(1-e*e), iR=i*Math.PI/180;
  for(let k=0;k<n;k++){
    const t=k/n*Math.PI*2, xo=a*(Math.cos(t)-e), yo=b*Math.sin(t);
    pts[k*3]=xo*scale; pts[k*3+1]=yo*Math.sin(iR)*scale; pts[k*3+2]=yo*Math.cos(iR)*scale;
  }
  return pts;
}

function createTextSprite(THREE:any,text:string,color="#bcd7ff"){
  const c=document.createElement("canvas");
  c.width=256; c.height=64;
  const ctx=c.getContext("2d");
  if(!ctx) return null;
  ctx.fillStyle="rgba(0,0,0,0.45)";
  ctx.fillRect(8,8,240,48);
  ctx.strokeStyle="rgba(0,212,255,0.55)";
  ctx.strokeRect(8,8,240,48);
  ctx.fillStyle=color;
  ctx.font="600 26px sans-serif";
  ctx.textAlign="center";
  ctx.textBaseline="middle";
  ctx.fillText(text,128,32);
  const tex=new THREE.CanvasTexture(c);
  tex.needsUpdate=true;
  const mat=new THREE.SpriteMaterial({map:tex,transparent:true,depthTest:false});
  const s=new THREE.Sprite(mat);
  s.scale.set(18,4.8,1);
  return s;
}

function synthAsteroids(n:number):AsteroidData[]{
  const types=["M-type","S-type","C-type","D-type"];
  return Array.from({length:n},(_,i)=>{
    const score=Math.random()*10;
    const synthId = `SYNTH-${1000 + i}`;
    return {
      spk_id:synthId,name:`Synthetic Asteroid ${1000+i}`,designation:synthId,
      spectral_type:types[i%4],diameter_km:Math.random()*20,
      semi_major_axis_au:0.5+Math.random()*4,eccentricity:Math.random()*0.6,
      inclination_deg:Math.random()*30,delta_v_km_s:3+Math.random()*10,
      moid_au:Math.random()*0.5,feasibility_score:Math.round(score*100)/100,
      total_value_usd:Math.random()*1e15,dc_score:Math.random()*10,
      recommended_method:"Robotic Extraction",
      mission_difficulty:score>7?"Low":score>4?"Medium":"High",
    };
  });
}

export default function SolarSystemViewer() {
  const mountRef  = useRef<HTMLDivElement>(null);
  const meshesRef = useRef<Map<string,any>>(new Map());
  const orbitLinesRef = useRef<Map<string,any>>(new Map());
  const clickableRef = useRef<any[]>([]);
  const camRef    = useRef<any>(null);
  const animRef   = useRef(0);
  const clockRef  = useRef(0);
  const selectedOrbitRef = useRef<string|null>(null);

  const [asteroids,  setAsteroids]  = useState<AsteroidData[]>([]);
  const [selected,   setSelected]   = useState<AsteroidData|null>(null);
  const [loading,    setLoading]    = useState(true);
  const [search,     setSearch]     = useState("");
  const [colorMode,  setColorMode]  = useState<"score"|"type">("score");
  const [showOrbits, setShowOrbits] = useState(true);
  const [speed,      setSpeed]      = useState(1.0);
  const [stats,      setStats]      = useState({total:0,high:0,med:0,low:0});

  const clearOrbitHighlights = useCallback(()=>{
    orbitLinesRef.current.forEach((line:any)=>{
      const mat:any=line.material;
      if(!mat) return;
      if(mat.userData?.baseColor!==undefined) mat.color.setHex(mat.userData.baseColor);
      mat.opacity = mat.userData?.baseOpacity ?? 0.2;
      mat.needsUpdate = true;
    });
    selectedOrbitRef.current=null;
  },[]);

  const highlightOrbit = useCallback((spkId?:string|null)=>{
    clearOrbitHighlights();
    if(!spkId) return;
    const line:any = orbitLinesRef.current.get(spkId);
    if(!line?.material) return;
    const mat:any=line.material;
    mat.color.setHex(0x33ffee);
    mat.opacity=0.95;
    mat.needsUpdate=true;
    selectedOrbitRef.current=spkId;
  },[clearOrbitHighlights]);

  useEffect(()=>{
    const API = process.env.NEXT_PUBLIC_API_BASE_URL || "http://localhost:8000";
    fetch(`${API}/v1/asteroids/3d-data?limit=300`)
      .then(r=>r.json()).then((d:AsteroidData[])=>{
        setAsteroids(d);
        setStats({total:d.length,
          high:d.filter(a=>a.feasibility_score>=7.5).length,
          med:d.filter(a=>a.feasibility_score>=5&&a.feasibility_score<7.5).length,
          low:d.filter(a=>a.feasibility_score<5).length});
        setLoading(false);
      }).catch(()=>{
        const d=synthAsteroids(150);
        setAsteroids(d);
        setStats({total:d.length,high:50,med:60,low:40});
        setLoading(false);
      });
  },[]);

  useEffect(()=>{
    if(!mountRef.current||loading) return;
    let destroyed=false;
    let renderer:any=null;
    let onResize:(()=>void)|null=null;
    let onMouseDown:((e:any)=>void)|null=null;
    let onMouseUp:(()=>void)|null=null;
    let onMouseMove:((e:any)=>void)|null=null;
    let onWheel:((e:any)=>void)|null=null;
    let onClick:((e:any)=>void)|null=null;

    import("three").then(THREE=>{
      if(destroyed) return;
      const W=mountRef.current!.clientWidth, H=mountRef.current!.clientHeight;
      const scene=new THREE.Scene();
      scene.background=new THREE.Color(0x000005);
      const camera=new THREE.PerspectiveCamera(50,W/H,0.1,10000);
      camera.position.set(0,350,550);
      camera.lookAt(0,0,0);
      camRef.current=camera;

      renderer=new THREE.WebGLRenderer({
        antialias:true,
        powerPreference:"high-performance",
      });
      renderer.setSize(W,H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,4));
      renderer.toneMapping=THREE.ACESFilmicToneMapping;
      renderer.toneMappingExposure=1.15;
      if("outputColorSpace" in renderer){
        (renderer as any).outputColorSpace=THREE.SRGBColorSpace;
      }
      mountRef.current!.appendChild(renderer.domElement);

      // Lights
      scene.add(new THREE.PointLight(0xfff5e0,3,5000));
      scene.add(new THREE.AmbientLight(0x111133,0.8));

      // Stars
      const sp=new Float32Array(8000*3);
      for(let i=0;i<sp.length;i++) sp[i]=(Math.random()-0.5)*8000;
      const sg=new THREE.BufferGeometry();
      sg.setAttribute("position",new THREE.BufferAttribute(sp,3));
      scene.add(new THREE.Points(sg,new THREE.PointsMaterial({color:0xffffff,size:0.7})));

      // Sun
      scene.add(new THREE.Mesh(new THREE.SphereGeometry(4,32,32),
        new THREE.MeshBasicMaterial({color:0xffdd44})));
      const glow=new THREE.Mesh(new THREE.SphereGeometry(5.5,32,32),
        new THREE.MeshBasicMaterial({color:0xff8800,transparent:true,opacity:0.1,side:2}));
      scene.add(glow);

      // Planets
      const planetMeshes:any[]=[];
      PLANETS.forEach(([name,dist,r,col,period])=>{
        const d=dist*AU;
        const pts:any[]=[];
        for(let j=0;j<=256;j++){
          const a=j/256*Math.PI*2;
          pts.push(new THREE.Vector3(Math.cos(a)*d,0,Math.sin(a)*d));
        }
        scene.add(new THREE.Line(
          new THREE.BufferGeometry().setFromPoints(pts),
          new THREE.LineBasicMaterial({color:0x334455,transparent:true,opacity:0.4})
        ));
        const pm=new THREE.Mesh(new THREE.SphereGeometry(r,16,16),
          new THREE.MeshLambertMaterial({color:col}));
        pm.position.set(d,0,0);
        pm.userData={dist,period,angle:Math.random()*Math.PI*2};
        const label=createTextSprite(THREE,name);
        if(label){
          label.position.set(0,r+2.4,0);
          pm.add(label);
        }
        if(name==="Saturn"){
          const ring=new THREE.Mesh(
            new THREE.RingGeometry(r*1.4,r*2.2,48),
            new THREE.MeshBasicMaterial({color:0xd9c28a,transparent:true,opacity:0.55,side:2})
          );
          ring.rotation.x=Math.PI/2.5;
          pm.add(ring);
        }
        scene.add(pm);
        planetMeshes.push(pm);
      });

      // Asteroid belt atmosphere
      const bPos=new Float32Array(2000*3);
      for(let i=0;i<2000;i++){
        const r2=(2.2+Math.random()*1.4)*AU, th=Math.random()*Math.PI*2;
        bPos[i*3]=Math.cos(th)*r2; bPos[i*3+1]=(Math.random()-0.5)*15; bPos[i*3+2]=Math.sin(th)*r2;
      }
      const bg=new THREE.BufferGeometry();
      bg.setAttribute("position",new THREE.BufferAttribute(bPos,3));
      scene.add(new THREE.Points(bg,
        new THREE.PointsMaterial({color:0x445566,size:0.4,transparent:true,opacity:0.4})));

      // Asteroids
      const group=new THREE.Group();
      scene.add(group);
      meshesRef.current.clear();
      orbitLinesRef.current.clear();
      clickableRef.current = [];
      asteroids.forEach(ast=>{
        const sz=Math.max(0.15,Math.min(0.6,(ast.diameter_km||0.5)*0.15));
        const geo=new THREE.IcosahedronGeometry(sz,0);
        const pos=geo.attributes.position;
        for(let vi=0;vi<pos.count;vi++){
          pos.setXYZ(vi,pos.getX(vi)*(0.8+Math.random()*0.4),
            pos.getY(vi)*(0.8+Math.random()*0.4),
            pos.getZ(vi)*(0.8+Math.random()*0.4));
        }
        pos.needsUpdate=true; geo.computeVertexNormals();
        const col=colorMode==="score"?scoreColor(ast.feasibility_score):spectralColor(ast.spectral_type);
        const mat=new THREE.MeshLambertMaterial({color:col,
          emissive:new THREE.Color(col).multiplyScalar(0.12)});
        const mesh=new THREE.Mesh(geo,mat);
        const M0=Math.random()*Math.PI*2;
        const [x,y,z]=toCartesian(ast.semi_major_axis_au,ast.eccentricity||0.1,
          ast.inclination_deg||5,M0,AU);
        mesh.position.set(x,y,z);
        mesh.userData={...ast,M0,period:Math.pow(ast.semi_major_axis_au||2,1.5)};
        group.add(mesh);
        meshesRef.current.set(ast.spk_id,mesh);
        clickableRef.current.push(mesh);

        // ID marker (clickable) — always show best available id.
        {
          const idText = String(ast.spk_id || ast.designation || ast.name || `AST-${clickableRef.current.length + 1}`);
          const labelCanvas = document.createElement("canvas");
          const logicalW = 192;
          const logicalH = 56;
          const labelScale = Math.max(2, Math.min(3, window.devicePixelRatio || 1));
          labelCanvas.width = Math.floor(logicalW * labelScale);
          labelCanvas.height = Math.floor(logicalH * labelScale);
          labelCanvas.style.width = `${logicalW}px`;
          labelCanvas.style.height = `${logicalH}px`;
          const ctx = labelCanvas.getContext("2d");
          if (ctx) {
            ctx.scale(labelScale, labelScale);
            ctx.fillStyle = "rgba(2,6,22,0.86)";
            ctx.fillRect(6, 6, 180, 44);
            ctx.strokeStyle = "rgba(120,240,255,0.95)";
            ctx.lineWidth = 2.2;
            ctx.strokeRect(6, 6, 180, 44);
            ctx.fillStyle = "#ffffff";
            ctx.font = "800 22px monospace";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(idText, 96, 28);
            const tex = new THREE.CanvasTexture(labelCanvas);
            tex.generateMipmaps = false;
            tex.minFilter = THREE.LinearFilter;
            tex.magFilter = THREE.LinearFilter;
            if ("anisotropy" in tex && renderer?.capabilities) {
              tex.anisotropy = Math.min(4, renderer.capabilities.getMaxAnisotropy?.() || 1);
            }
            tex.needsUpdate = true;
            const smat = new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false });
            const sprite = new THREE.Sprite(smat);
            sprite.scale.set(8.2, 2.4, 1);
            sprite.position.set(0, sz + 2.2, 0);
            sprite.userData = {
              ...ast,
              M0,
              period: Math.pow(ast.semi_major_axis_au || 2, 1.5),
            };
            sprite.renderOrder = 10;
            mesh.add(sprite);
            clickableRef.current.push(sprite);
          }
        }

        if(showOrbits){
          const op=orbitPath(ast.semi_major_axis_au,ast.eccentricity||0.1,
            ast.inclination_deg||5,AU);
          const og=new THREE.BufferGeometry();
          og.setAttribute("position",new THREE.BufferAttribute(op,3));
          const orbitLine=new THREE.Line(og,new THREE.LineBasicMaterial({
            color:new THREE.Color(col).multiplyScalar(0.35),
            transparent:true,opacity:0.2}));
          const m:any=orbitLine.material;
          m.userData={baseColor:m.color.getHex(),baseOpacity:m.opacity};
          orbitLinesRef.current.set(ast.spk_id,orbitLine);
          group.add(orbitLine);
        }
      });
      if(selectedOrbitRef.current) highlightOrbit(selectedOrbitRef.current);

      // Camera controls
      let down=false,lx=0,ly=0,theta=0.4,phi=0.6,radius=650;
      const updCam=()=>{
        camera.position.set(
          radius*Math.sin(phi)*Math.sin(theta),
          radius*Math.cos(phi),
          radius*Math.sin(phi)*Math.cos(theta));
        camera.lookAt(0,0,0);
      };
      updCam();
      onMouseDown=(e:any)=>{down=true;lx=e.clientX;ly=e.clientY;};
      onMouseUp=()=>{down=false;};
      onMouseMove=(e:any)=>{
        if(!down) return;
        theta-=(e.clientX-lx)*0.005;
        phi=Math.max(0.1,Math.min(Math.PI-0.1,phi+(e.clientY-ly)*0.005));
        lx=e.clientX;ly=e.clientY;updCam();
      };
      onWheel=(e:any)=>{
        e.preventDefault();
        radius=Math.max(50,Math.min(2500,radius+e.deltaY*0.28));
        updCam();
      };
      renderer.domElement.addEventListener("mousedown",onMouseDown);
      renderer.domElement.addEventListener("mouseup",onMouseUp);
      renderer.domElement.addEventListener("mousemove",onMouseMove);
      renderer.domElement.addEventListener("wheel",onWheel,{passive:false});

      // Click to select
      const ray=new THREE.Raycaster();
      const mouse=new THREE.Vector2();
      onClick=(e:any)=>{
        const rect=renderer.domElement.getBoundingClientRect();
        mouse.x=((e.clientX-rect.left)/rect.width)*2-1;
        mouse.y=-((e.clientY-rect.top)/rect.height)*2+1;
        ray.setFromCamera(mouse,camera);
        const hits=ray.intersectObjects(clickableRef.current,true);
        if(hits.length>0){
          const ud=hits[0].object.userData as AsteroidData;
          setSelected(ud);
          highlightOrbit(ud?.spk_id);
          const hitObj: any = hits[0].object as any;
          if(hitObj.material && "emissiveIntensity" in hitObj.material){
            (hitObj.material as any).emissiveIntensity=1;
            setTimeout(()=>{(hitObj.material as any).emissiveIntensity=0.12;},400);
          }
        } else {
          setSelected(null);
          clearOrbitHighlights();
        }
      };
      renderer.domElement.addEventListener("click",onClick);

      // Animate
      const step=0.00005;
      const loop=()=>{
        animRef.current=requestAnimationFrame(loop);
        clockRef.current+=step*speed;
        const t=clockRef.current;
        planetMeshes.forEach(pm=>{
          const {dist,period,angle}=pm.userData;
          const a=t/period*Math.PI*2+angle, d=dist*AU;
          pm.position.set(Math.cos(a)*d,0,Math.sin(a)*d);
          pm.rotation.y+=0.008;
        });
        group.children.forEach((obj:any)=>{
          if(!obj.userData.semi_major_axis_au) return;
          const {semi_major_axis_au:a,eccentricity:e,inclination_deg:i,M0,period}=obj.userData;
          const M=M0+t/period*Math.PI*2;
          const [x,y,z]=toCartesian(a,e||0.1,i||5,M,AU);
          obj.position.set(x,y,z);
          obj.rotation.x+=0.003;
          obj.rotation.y+=0.002;
          if(obj.children?.length){
            const dist=camera.position.distanceTo(obj.position);
            const scale=Math.max(7.8,Math.min(15.5,dist*0.0115));
            obj.children.forEach((c:any)=>{
              if(c.type!=="Sprite") return;
              c.visible=dist<1900;
              c.scale.set(scale,scale*0.33,1);
              if(c.material){
                c.material.opacity = dist<1100 ? 1.0 : 0.82;
                c.material.needsUpdate=true;
              }
            });
          }
        });
        renderer.render(scene,camera);
      };
      loop();

      onResize=()=>{
        if(!mountRef.current) return;
        const w=mountRef.current.clientWidth,h=mountRef.current.clientHeight;
        camera.aspect=w/h;
        camera.updateProjectionMatrix();
        renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,4));
        renderer.setSize(w,h);
      };
      window.addEventListener("resize",onResize);
    });

    return ()=>{
      destroyed=true;
      cancelAnimationFrame(animRef.current);
      if(onResize) window.removeEventListener("resize",onResize);
      if(renderer?.domElement){
        if(onMouseDown) renderer.domElement.removeEventListener("mousedown",onMouseDown);
        if(onMouseUp) renderer.domElement.removeEventListener("mouseup",onMouseUp);
        if(onMouseMove) renderer.domElement.removeEventListener("mousemove",onMouseMove);
        if(onWheel) renderer.domElement.removeEventListener("wheel",onWheel);
        if(onClick) renderer.domElement.removeEventListener("click",onClick);
      }
      if(renderer){
        renderer.dispose();
        if(mountRef.current?.contains(renderer.domElement)){
          mountRef.current.removeChild(renderer.domElement);
        }
      }
    };
  },[asteroids,loading,showOrbits,colorMode,speed,highlightOrbit,clearOrbitHighlights]);

  const focusOn=useCallback((spkId:string)=>{
    const mesh=meshesRef.current.get(spkId);
    if(!mesh||!camRef.current) return;
    const p=mesh.position;
    camRef.current.position.set(p.x+40,p.y+40,p.z+40);
    camRef.current.lookAt(p.x,p.y,p.z);
    setSelected(mesh.userData as AsteroidData);
    highlightOrbit(spkId);
  },[highlightOrbit]);

  const filtered=asteroids.filter(a=>
    !search||a.name?.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div style={{position:"relative",width:"100%",height:"100vh",background:"#000005"}}>

      {loading&&(
        <div style={{position:"absolute",inset:0,display:"flex",flexDirection:"column",
          alignItems:"center",justifyContent:"center",background:"#000005",zIndex:50,color:"#00d4ff"}}>
          <div style={{fontSize:52,marginBottom:12}}>☄</div>
          <div style={{fontSize:18,letterSpacing:4}}>LOADING ASTEROID FIELD</div>
          <div style={{fontSize:12,color:"#475569",marginTop:6}}>Calculating orbital positions...</div>
        </div>
      )}

      <div ref={mountRef} style={{width:"100%",height:"100%"}}/>

      {/* Top HUD */}
      <div style={{position:"absolute",top:14,left:"50%",transform:"translateX(-50%)",
        background:"rgba(0,0,0,0.75)",border:"1px solid rgba(0,212,255,0.3)",
        borderRadius:10,padding:"7px 24px",display:"flex",gap:24,backdropFilter:"blur(8px)"}}>
        <span style={{color:"#00d4ff",fontSize:12}}>☄ ASTROMINEINTELLIGENCE 3D</span>
        <span style={{color:"#94a3b8",fontSize:11}}>Planet size/orbit/period scaled for reference</span>
        <span style={{color:"#22c55e",fontSize:12}}>● {stats.high} HIGH</span>
        <span style={{color:"#f59e0b",fontSize:12}}>● {stats.med} MED</span>
        <span style={{color:"#ef4444",fontSize:12}}>● {stats.low} LOW</span>
        <span style={{color:"#64748b",fontSize:12}}>{stats.total} TOTAL</span>
      </div>

      {/* Left Panel */}
      <div style={{position:"absolute",top:60,left:14,width:300,
        background:"rgba(0,0,0,0.8)",border:"1px solid rgba(0,212,255,0.2)",
        borderRadius:10,padding:18,display:"flex",flexDirection:"column",gap:12,
        backdropFilter:"blur(8px)"}}>
        <div style={{color:"#00d4ff",fontSize:13,letterSpacing:2}}>CONTROLS</div>

        <input value={search} onChange={e=>setSearch(e.target.value)}
          placeholder="Search asteroid..."
          style={{background:"#0a0a18",border:"1px solid rgba(0,212,255,0.3)",
            borderRadius:6,padding:"5px 8px",color:"#e2e8f0",
            fontSize:13,width:"100%"}}/>

        {search&&(
          <div style={{maxHeight:100,overflowY:"auto"}}>
            {filtered.slice(0,6).map(a=>(
              <div key={a.spk_id} onClick={()=>{focusOn(a.spk_id);setSearch("");}}
                style={{padding:"3px 6px",cursor:"pointer",color:"#e2e8f0",
                  fontSize:12,background:"rgba(0,212,255,0.05)",
                  borderRadius:3,marginBottom:2}}>
                {a.name||a.designation}
              </div>
            ))}
          </div>
        )}

        <div>
          <div style={{color:"#64748b",fontSize:11,marginBottom:4}}>COLOR BY</div>
          {(["score","type"] as const).map(m=>(
            <button key={m} onClick={()=>setColorMode(m)}
              style={{marginRight:6,padding:"4px 10px",fontSize:11,
                background:colorMode===m?"#f59e0b":"rgba(245,158,11,0.1)",
                color:colorMode===m?"#000":"#f59e0b",
                border:"1px solid rgba(245,158,11,0.3)",
                borderRadius:4,cursor:"pointer"}}>
              {m.toUpperCase()}
            </button>
          ))}
        </div>

        <label style={{display:"flex",alignItems:"center",gap:6,cursor:"pointer"}}>
          <input type="checkbox" checked={showOrbits}
            onChange={e=>setShowOrbits(e.target.checked)}
            style={{accentColor:"#00d4ff"}}/>
          <span style={{color:"#e2e8f0",fontSize:12}}>Show Orbits</span>
        </label>

        <div>
          <div style={{color:"#64748b",fontSize:11,marginBottom:3}}>SPEED {speed.toFixed(1)}x</div>
          <input type="range" min="0" max="10" step="0.5" value={speed}
            onChange={e=>setSpeed(parseFloat(e.target.value))}
            style={{width:"100%",accentColor:"#00d4ff"}}/>
        </div>

        <div>
          {[{c:"#00ff88",l:"High >=7.5"},{c:"#ffaa00",l:"Medium >=5"},
            {c:"#ff4444",l:"Low <5"},{c:"#666688",l:"Unknown"}].map(x=>(
            <div key={x.l} style={{display:"flex",alignItems:"center",gap:5,marginBottom:2}}>
              <div style={{width:8,height:8,borderRadius:"50%",background:x.c}}/>
              <span style={{color:"#94a3b8",fontSize:11}}>{x.l}</span>
            </div>
          ))}
        </div>

        <div style={{color:"#334455",fontSize:10,borderTop:"1px solid #1e2a3a",paddingTop:8}}>
          Drag: rotate | Scroll: zoom | Click: inspect
        </div>
      </div>

      {/* Selected panel */}
      {selected&&(
        <div style={{position:"absolute",top:60,right:14,width:270,
          background:"rgba(0,0,0,0.88)",border:"1px solid rgba(245,158,11,0.4)",
          borderRadius:10,padding:18,backdropFilter:"blur(10px)",
          boxShadow:"0 0 30px rgba(245,158,11,0.12)"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:10}}>
            <span style={{color:"#f59e0b",fontSize:13,fontWeight:700}}>
              ☄ {selected.name||selected.designation}
            </span>
            <button onClick={()=>{setSelected(null);clearOrbitHighlights();}}
              style={{background:"none",border:"none",color:"#64748b",
                cursor:"pointer",fontSize:14}}>✕</button>
          </div>
          <span style={{background:"rgba(0,212,255,0.12)",border:"1px solid rgba(0,212,255,0.3)",
            borderRadius:999,padding:"2px 10px",color:"#00d4ff",fontSize:10}}>
            {selected.spectral_type||"Unknown"}
          </span>
          <div style={{textAlign:"center",margin:"14px 0"}}>
            <div style={{fontSize:44,fontWeight:900,
              color:selected.feasibility_score>=7.5?"#00ff88":
                    selected.feasibility_score>=5?"#ffaa00":"#ff4444"}}>
              {(selected.feasibility_score||0).toFixed(1)}
            </div>
            <div style={{color:"#64748b",fontSize:10}}>MINING SCORE / 10</div>
          </div>
          {[
            ["Diameter",    `${(selected.diameter_km||0).toFixed(1)} km`],
            ["Delta-V",     `${(selected.delta_v_km_s||0).toFixed(2)} km/s`],
            ["MOID",        `${(selected.moid_au||0).toFixed(4)} AU`],
            ["Value",       selected.total_value_usd?`$${(selected.total_value_usd/1e12).toFixed(1)}T`:"?"],
            ["DC Score",    `${(selected.dc_score||0).toFixed(1)}/10`],
            ["Difficulty",  selected.mission_difficulty||"—"],
          ].map(([l,v])=>(
            <div key={l as string} style={{display:"flex",justifyContent:"space-between",
              padding:"4px 0",borderBottom:"1px solid rgba(255,255,255,0.04)"}}>
              <span style={{color:"#64748b",fontSize:10}}>{l}</span>
              <span style={{color:"#e2e8f0",fontSize:10,maxWidth:160,textAlign:"right"}}>{v}</span>
            </div>
          ))}
          <a href={`/asteroid/${selected.spk_id}`}
            style={{display:"block",marginTop:14,padding:"7px 0",
              background:"rgba(245,158,11,0.12)",
              border:"1px solid rgba(245,158,11,0.35)",
              borderRadius:6,color:"#f59e0b",textAlign:"center",
              textDecoration:"none",fontSize:11}}>
            FULL INTELLIGENCE REPORT →
          </a>
        </div>
      )}
    </div>
  );
}
