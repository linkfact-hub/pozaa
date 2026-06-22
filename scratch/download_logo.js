import fs from 'fs';
import path from 'path';

async function downloadLogo() {
  try {
    const res = await fetch('https://i.ibb.co/7dTJg4km/Logo.png');
    const arrayBuffer = await res.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    fs.writeFileSync('scratch/logo.png', buffer);
    console.log('Download complete!');
  } catch (err) {
    console.error(err);
  }
}

downloadLogo();
