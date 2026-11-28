/* ---------- MP4 video: H.264 through WebCodecs, in a minimal MP4 container (MS-23) ---------- */
/* mp4Encoder(w,h,fps) gives {add(canvas), done() → Blob}. Frames are encoded with exact timestamps (frame i at i/fps s), so a
   video whose frames take seconds each to compute still plays at its true speed. The container is written here (no library):
   ftyp, moov (one video track, one chunk) and mdat with the encoder's length-prefixed samples. */
const XM_BG=()=>rgbOf("--panel");
const MP4OK=()=>typeof VideoEncoder!=='undefined'&&typeof VideoFrame!=='undefined';
function mp4Box(type,...parts){let n=8;for(const p of parts)n+=p.length;const b=new Uint8Array(n),v=new DataView(b.buffer);v.setUint32(0,n);
  for(let i=0;i<4;i++)b[4+i]=type.charCodeAt(i);let o=8;for(const p of parts){b.set(p,o);o+=p.length}return b}
const u8=(...a)=>new Uint8Array(a),u16=x=>u8(x>>8&255,x&255),u32=x=>u8(x>>>24&255,x>>>16&255,x>>>8&255,x&255),zeros=n=>new Uint8Array(n),
  str=s=>Uint8Array.from(s,c=>c.charCodeAt(0)),full=(v,f)=>u8(v,f>>16&255,f>>8&255,f&255);
const MATRIX=[u32(0x10000),u32(0),u32(0),u32(0),u32(0x10000),u32(0),u32(0),u32(0),u32(0x40000000)];
function mp4File(w,h,fps,samples,desc){const n=samples.length,TS=fps*1000,dur=n*1000,ms=Math.round(n*1000/fps);
  const stsd=mp4Box('stsd',full(0,0),u32(1),mp4Box('avc1',zeros(6),u16(1),zeros(16),u16(w),u16(h),u32(0x480000),u32(0x480000),u32(0),u16(1),zeros(32),u16(0x18),u16(0xffff),mp4Box('avcC',desc)));
  const keys=[];samples.forEach((s,i)=>{if(s.key)keys.push(u32(i+1))});
  const stbl=(off)=>mp4Box('stbl',stsd,mp4Box('stts',full(0,0),u32(1),u32(n),u32(1000)),mp4Box('stss',full(0,0),u32(keys.length),...keys),
    mp4Box('stsc',full(0,0),u32(1),u32(1),u32(n),u32(1)),mp4Box('stsz',full(0,0),u32(0),u32(n),...samples.map(s=>u32(s.data.length))),mp4Box('stco',full(0,0),u32(1),u32(off)));
  const moov=off=>mp4Box('moov',mp4Box('mvhd',full(0,0),u32(0),u32(0),u32(1000),u32(ms),u32(0x10000),u16(0x100),zeros(10),...MATRIX,zeros(24),u32(2)),
    mp4Box('trak',mp4Box('tkhd',full(0,3),u32(0),u32(0),u32(1),u32(0),u32(ms),zeros(8),u16(0),u16(0),u16(0),u16(0),...MATRIX,u32(w<<16),u32(h<<16)),
      mp4Box('mdia',mp4Box('mdhd',full(0,0),u32(0),u32(0),u32(TS),u32(dur),u16(0x55c4),u16(0)),mp4Box('hdlr',full(0,0),u32(0),str('vide'),zeros(12),str('VideoHandler\0')),
        mp4Box('minf',mp4Box('vmhd',full(0,1),zeros(8)),mp4Box('dinf',mp4Box('dref',full(0,0),u32(1),mp4Box('url ',full(0,1)))),stbl(off)))));
  const ftyp=mp4Box('ftyp',str('isom'),u32(512),str('isomiso2avc1mp41')),off=ftyp.length+moov(0).length+8;
  return new Blob([ftyp,moov(off),mp4Box('mdat',...samples.map(s=>s.data))],{type:'video/mp4'})}
async function mp4Encoder(w,h,fps){w&=~1;h&=~1;let desc=null,err=null,codec=null;const samples=[];
  for(const c of ['avc1.640033','avc1.640028','avc1.4d0028','avc1.42001f'])
    if((await VideoEncoder.isConfigSupported({codec:c,width:w,height:h,bitrate:12e6,framerate:fps})).supported){codec=c;break}
  if(!codec)throw new Error(`this browser can't encode H.264 at ${w}×${h}`);
  const enc=new VideoEncoder({output:(ch,meta)=>{if(meta&&meta.decoderConfig&&meta.decoderConfig.description&&!desc)desc=new Uint8Array(meta.decoderConfig.description);
      const d=new Uint8Array(ch.byteLength);ch.copyTo(d);samples.push({data:d,key:ch.type==='key'})},error:e=>err=e});
  enc.configure({codec,width:w,height:h,bitrate:Math.min(40e6,w*h*fps*0.2),framerate:fps,avc:{format:'avc'}});let i=0;
  const cv=document.createElement('canvas');cv.width=w;cv.height=h;const g=cv.getContext('2d');
  return{w,h,async add(src){if(err)throw err;g.fillStyle=XM_BG();g.fillRect(0,0,w,h);g.drawImage(src,0,0);const f=new VideoFrame(cv,{timestamp:Math.round(i*1e6/fps),duration:Math.round(1e6/fps)});
      enc.encode(f,{keyFrame:i%(2*fps)===0});f.close();i++;while(enc.encodeQueueSize>4)await new Promise(r=>setTimeout(r,5))},
    async done(){await enc.flush();enc.close();if(err)throw err;if(!desc)throw new Error('the encoder gave no stream description');return mp4File(w,h,fps,samples,desc)}}}
