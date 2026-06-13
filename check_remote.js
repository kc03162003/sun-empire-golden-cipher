const https = require('https');
https.get('https://kc03162003.github.io/sun-empire-golden-cipher/app.js', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log("Length:", data.length);
    console.log("Contains allCompleted:", data.includes("allCompleted"));
  });
}).on('error', (e) => {
  console.error(e);
});
