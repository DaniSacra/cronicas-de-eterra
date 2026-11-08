const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const { titleOptions, installSteps } = require('../src/uirules.js');
const { shellFiles, fontCss } = require('../sw.js');
const ROOT = `${__dirname}/..`, html = fs.readFileSync(`${ROOT}/index.html`, 'utf8');

test('the title offers "Instalar no celular" only when the game can be installed', () => {
  assert.deepEqual(titleOptions(true, false, true).map(o => o.value), ['new', 'load', 'install']);
  assert.ok(!titleOptions(true, false, false).some(o => o.value === 'install'));
  assert.match(installSteps(true), /Safari.*Adicionar à Tela de Início/);
  assert.match(installSteps(false), /Chrome.*Instalar app/);
  for (const t of [installSteps(true), installSteps(false)]) assert.ok(!t.includes('—') && /sem internet/.test(t), t);
});

test('the offline copy holds every local file the page loads, and the manifest icons exist', () => {
  const files = shellFiles(html);
  const scripts = [...html.matchAll(/<script src="([^"]+)"/g)].map(m => m[1]);
  assert.ok(scripts.length > 30 && scripts.every(s => files.includes(s)), 'every script');
  assert.ok(files.some(f => f.startsWith('style.css?v=')) && files.includes('manifest.webmanifest') && files.includes('index.html'));
  assert.ok(files.every(f => !/^https?:/.test(f)), 'the fonts go apart');
  for (const f of files.filter(f => f !== './')) assert.ok(fs.existsSync(`${ROOT}/${f.split('?')[0]}`), f);
  assert.equal(fontCss(html).length, 1);
  assert.ok(!fontCss(html)[0].includes('&amp;'));
  const man = JSON.parse(fs.readFileSync(`${ROOT}/manifest.webmanifest`, 'utf8'));
  assert.equal(man.display, 'fullscreen');
  for (const i of man.icons) assert.ok(fs.existsSync(`${ROOT}/${i.src}`), i.src);
  assert.match(html, /<link rel="manifest" href="manifest.webmanifest">/);
});
