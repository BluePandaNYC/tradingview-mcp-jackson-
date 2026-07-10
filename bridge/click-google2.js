import { evaluate, getClient } from '../src/connection.js';
const wait = ms => new Promise(r => setTimeout(r, ms));
const client = await getClient();

// List all visible buttons in the sign-in dialog
const btns = await evaluate(`
  (function(){
    var all = Array.from(document.querySelectorAll('button, [role="button"], a, div[class*="social"]'));
    var vis = all.filter(e => { var r = e.getBoundingClientRect(); return r.width > 0 && r.height > 0; });
    return JSON.stringify(vis.slice(0,20).map(e => {
      var r = e.getBoundingClientRect();
      return { tag: e.tagName, text: e.textContent.trim().substring(0,50), x: Math.round(r.x+r.width/2), y: Math.round(r.y+r.height/2), w: Math.round(r.width) };
    }));
  })()
`);
console.log('Visible buttons:');
JSON.parse(btns).forEach(b => console.log(`  [${b.tag}] "${b.text}" @ (${b.x},${b.y})`));

// The "Continue as Yafa" button appears to be in an iframe (Google One Tap)
const iframes = await evaluate(`
  Array.from(document.querySelectorAll('iframe')).map(f => ({ src: f.src.substring(0,80), id: f.id }))
`);
console.log('\nIframes:', iframes);
process.exit(0);
