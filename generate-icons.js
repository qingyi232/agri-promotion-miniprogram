const fs = require('fs');
const path = require('path');
const zlib = require('zlib');
const https = require('https');
const http = require('http');

const dir = path.join(__dirname, 'miniprogram', 'images');

function downloadFile(url, dest) {
  return new Promise((resolve, reject) => {
    const proto = url.startsWith('https') ? https : http;
    const file = fs.createWriteStream(dest);
    proto.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        downloadFile(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => { file.close(); resolve(); });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

async function main() {
  const icons = [
    { name: 'tab-home.png', url: 'https://img.icons8.com/ios/81/999999/home--v1.png' },
    { name: 'tab-home-active.png', url: 'https://img.icons8.com/ios-filled/81/2e7d32/home--v1.png' },
    { name: 'tab-recommend.png', url: 'https://img.icons8.com/ios/81/999999/star--v1.png' },
    { name: 'tab-recommend-active.png', url: 'https://img.icons8.com/ios-filled/81/2e7d32/star--v1.png' },
    { name: 'tab-profile.png', url: 'https://img.icons8.com/ios/81/999999/user--v1.png' },
    { name: 'tab-profile-active.png', url: 'https://img.icons8.com/ios-filled/81/2e7d32/user--v1.png' }
  ];

  for (const icon of icons) {
    const dest = path.join(dir, icon.name);
    try {
      await downloadFile(icon.url, dest);
      const stat = fs.statSync(dest);
      console.log(`OK: ${icon.name} (${stat.size} bytes)`);
    } catch (e) {
      console.error(`FAIL: ${icon.name} - ${e.message}`);
      createFallbackIcon(dest, icon.name.includes('active') ? '#2e7d32' : '#999999', icon.name.includes('home') ? 'home' : icon.name.includes('recommend') ? 'star' : 'user');
      console.log(`FALLBACK: ${icon.name} generated locally`);
    }
  }
  console.log('Done!');
}

function createFallbackIcon(dest, color, shape) {
  const w = 81, h = 81;
  const pixels = [];
  const r = parseInt(color.slice(1,3),16), g = parseInt(color.slice(3,5),16), b = parseInt(color.slice(5,7),16);
  for (let y = 0; y < h; y++) {
    pixels.push(0);
    for (let x = 0; x < w; x++) {
      let draw = false;
      const cx = w/2, cy = h/2, dx = x-cx, dy = y-cy;
      const dist = Math.sqrt(dx*dx+dy*dy);
      if (shape === 'home') {
        if (y >= 38 && y <= 68 && x >= 20 && x <= 60) draw = true;
        if (y >= 12 && y <= 42 && Math.abs(dx) <= (42-y)*1.0) draw = true;
      } else if (shape === 'star') {
        const a = Math.atan2(dy,dx);
        if (dist < 28+10*Math.cos(5*a)) draw = true;
      } else {
        if (dist < 14 && dy < -2) draw = true;
        if (y > cy+6 && y < cy+32 && Math.abs(dx) < (y-cy-6)*0.7+10) draw = true;
      }
      pixels.push(draw?r:0, draw?g:0, draw?b:0, draw?230:0);
    }
  }
  const raw = Buffer.from(pixels);
  const compressed = zlib.deflateSync(raw);
  const sig = Buffer.from([137,80,78,71,13,10,26,10]);
  function crc32(buf){let c;const t=[];for(let n=0;n<256;n++){c=n;for(let k=0;k<8;k++)c=((c&1)?(0xEDB88320^(c>>>1)):(c>>>1));t[n]=c;}let r=0^(-1);for(let i=0;i<buf.length;i++)r=(r>>>8)^t[(r^buf[i])&0xFF];return(r^(-1))>>>0;}
  function chunk(type,data){const tb=Buffer.from(type);const l=Buffer.alloc(4);l.writeUInt32BE(data.length,0);const cd=Buffer.concat([tb,data]);const cv=Buffer.alloc(4);cv.writeUInt32BE(crc32(cd),0);return Buffer.concat([l,tb,data,cv]);}
  const ihdr=Buffer.alloc(13);ihdr.writeUInt32BE(w,0);ihdr.writeUInt32BE(h,4);ihdr[8]=8;ihdr[9]=6;
  fs.writeFileSync(dest, Buffer.concat([sig,chunk('IHDR',ihdr),chunk('IDAT',compressed),chunk('IEND',Buffer.alloc(0))]));
}

main();
