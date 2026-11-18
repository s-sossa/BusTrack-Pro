const fs = require('fs');
const html = fs.readFileSync('index.html', 'utf8');
const js = fs.readFileSync('app.js', 'utf8');

const buttonRegex = /<button[^>]*id=["']([^"']+)["'][^>]*>/g;
let match;
const buttons = [];
while ((match = buttonRegex.exec(html)) !== null) {
  buttons.push(match[1]);
}

console.log('Total buttons with ID in index.html:', buttons.length);
const unreferenced = [];
const referenced = [];

buttons.forEach(id => {
  if (js.includes(id)) {
    referenced.push(id);
  } else {
    unreferenced.push(id);
  }
});

console.log('Referenced in app.js (' + referenced.length + '):', referenced);
console.log('NOT directly referenced in app.js (' + unreferenced.length + '):', unreferenced);
