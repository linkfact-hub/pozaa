async function test() {
  try {
    const res = await fetch('https://ibb.co/FTBCM5W');
    const html = await res.text();
    const m = html.match(/og:image" content="([^"]+)/);
    console.log('Direct image URL:', m ? m[1] : 'not found');
  } catch (err) {
    console.error(err);
  }
}

test();
