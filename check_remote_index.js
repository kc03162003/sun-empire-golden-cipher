const https = require('https');
https.get('https://kc03162003.github.io/sun-empire-golden-cipher/index.html', (res) => {
  let data = '';
  res.on('data', (chunk) => data += chunk);
  res.on('end', () => {
    console.log("Contains v=31:", data.includes("app.js?v=31"));
  });
}).on('error', (e) => {
  console.error(e);
});
