const fs = require('fs');
const pkg = require('./package.json');
const app = require('./app.json');

app.expo.version = pkg.version;

fs.writeFileSync('./app.json', JSON.stringify(app, null, 2));
console.log(`✅ Versão sincronizada para: ${pkg.version}`);