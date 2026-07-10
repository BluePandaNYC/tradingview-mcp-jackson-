import * as capture from '../src/core/capture.js';
const s = await capture.captureScreenshot({ region: 'full' });
console.log('Screenshot:', s.file_path);
process.exit(0);
