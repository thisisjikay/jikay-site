const sharp = require('/Users/hotdamnstudio/.cache/codex-runtimes/codex-primary-runtime/dependencies/node/node_modules/sharp');
const fs = require('node:fs');
const path = require('node:path');
const out = __dirname;
const root = path.resolve(out, '../..');
async function main() {
  const width=1080, height=810;
  const phonePath=path.join(root,'assets/images/studio-remote/studio-remote-phone-transparent.gif');
  const meta=await sharp(phonePath,{animated:true}).metadata();
  const bg=await sharp(path.join(out,'background.png')).resize(width,height).png().toBuffer();
  // Extract the approved rounded panel, then mask just its silhouette.
  const pw=351, ph=300;
  const mask=Buffer.from(`<svg width="${pw}" height="${ph}"><rect width="${pw}" height="${ph}" rx="10" fill="white"/></svg>`);
  const plugin=await sharp(path.join(root,'output/gumroad/studio-remote-header-v2.png')).extract({left:332,top:212,width:468,height:400}).resize(pw,ph).composite([{input:mask,blend:'dest-in'}]).png().toBuffer();
  const px=207, py=261, fx=643, fy=171, fh=468;
  const curve='M 643 590 H 405 Q 382 590 382 567 V 559';
  const shadow=Buffer.from(`<svg width="1080" height="810" xmlns="http://www.w3.org/2000/svg"><defs><filter id="s" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="12"/></filter></defs><g fill="#000" opacity=".65" filter="url(#s)"><rect x="207" y="271" width="351" height="300" rx="10"/><rect x="651" y="185" width="228" height="459" rx="30"/></g></svg>`);
  const base=await sharp(bg).composite([{input:shadow}]).png().toBuffer();
  const frames=[], delays=[];
  for(let i=0;i<meta.pages;i++) {
    const phone=await sharp(phonePath,{page:i}).resize({height:fh}).png().toBuffer();
    for(let sub=0;sub<2;sub++) {
      const frameIndex=i*2+sub, progress=(frameIndex%64)/63;
      const opacity=Math.min(1,progress*8,(1-progress)*8);
      const pulse=Buffer.from(`<svg width="1080" height="810" xmlns="http://www.w3.org/2000/svg"><defs><filter id="g" x="-50%" y="-50%" width="200%" height="200%"><feGaussianBlur stdDeviation="3"/></filter></defs><path d="${curve}" fill="none" stroke="#439b72" stroke-width="5" opacity=".45" filter="url(#g)"/><path d="${curve}" fill="none" stroke="#439b72" stroke-width="2"/><path d="${curve}" fill="none" stroke="#a8f3ce" stroke-width="3" stroke-linecap="round" stroke-dasharray="28 600" stroke-dashoffset="${-progress*285}" opacity="${opacity}"/></svg>`);
      const raw=await sharp(base).composite([{input:pulse},{input:plugin,left:px,top:py},{input:phone,left:fx,top:fy}]).ensureAlpha().raw().toBuffer();
      frames.push(raw);
      const half=Math.floor(meta.delay[i]/20)*10;
      delays.push(sub===0?half:meta.delay[i]-half);
      if(frameIndex===24) await sharp(raw,{raw:{width,height,channels:4}}).png().toFile(path.join(out,'poster.png'));
    }
  }
  const file=path.join(out,'studio-remote-maxforlive.gif');
  await sharp(Buffer.concat(frames),{raw:{width,height:height*frames.length,channels:4,pageHeight:height},limitInputPixels:false}).gif({loop:0,delay:delays,colours:256,effort:7,dither:0,interFrameMaxError:0,interPaletteMaxError:0}).toFile(file);
  const info=await sharp(file,{animated:true}).metadata();
  const result={width:info.width,height:info.pageHeight,frames:info.pages,durationMs:info.delay.reduce((a,b)=>a+b,0),loop:info.loop,bytes:fs.statSync(file).size};
  fs.writeFileSync(path.join(out,'verification.json'),JSON.stringify(result,null,2));
  console.log(result);
  const cases=[['Desktop',369,300],['Narrow desktop',310,300],['Mobile',361,300],['Wide mobile',642,300],['Square',300,300]];
  const cards=[];
  let y=42;
  for(const [label,w,h] of cases){
    const crop=await sharp(path.join(out,'poster.png')).resize(w,h,{fit:'cover',position:'centre'}).png().toBuffer();
    cards.push({input:crop,left:20,top:y});
    const caption=Buffer.from(`<svg width="720" height="30"><text x="0" y="20" font-family="Arial" font-size="17" fill="white">${label} · ${w} × ${h} · centred cover</text></svg>`);
    cards.push({input:caption,left:20,top:y-30});y+=350;
  }
  await sharp({create:{width:760,height:y,channels:3,background:'#202426'}}).composite(cards).png().toFile(path.join(out,'crop-previews.png'));
}
main().catch(e=>{console.error(e);process.exit(1)});
