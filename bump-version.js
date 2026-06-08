const fs = require('fs');
const path = require('path');

// Caminho para o app.json
const appJsonPath = path.join(__dirname, 'app.json');
const appJson = JSON.parse(fs.readFileSync(appJsonPath, 'utf8'));

// 1. Incrementa a versão de exibição (ex: 1.0.0 -> 1.0.1)
let versionParts = appJson.expo.version.split('.');
versionParts[2] = parseInt(versionParts[2]) + 1;
const newVersion = versionParts.join('.');

// 2. Incrementa o código da build (Android - número inteiro)
const newVersionCode = (appJson.expo.android.versionCode || 0) + 1;

// Atualiza o objeto
appJson.expo.version = newVersion;
appJson.expo.android.versionCode = newVersionCode;

// Salva de volta no app.json
fs.writeFileSync(appJsonPath, JSON.stringify(appJson, null, 2));

console.log(`✅ Versão atualizada para: ${newVersion} (Build: ${newVersionCode})`);