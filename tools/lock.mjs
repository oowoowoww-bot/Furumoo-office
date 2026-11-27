#!/usr/bin/env node
// 푸루무 오피스맵 잠금 도구 — 우이가 6시간마다 쓰는 명령
//
//   화면 바꿀 때:   node tools/lock.mjs page <app.html>     → index.html 새로 만듦 (data.enc도 다시 잠가야 해요)
//   데이터만 갱신:  node tools/lock.mjs data <data.json>    → data.enc 새로 만듦 (index.html은 그대로)
//
// 비밀번호는 FURUMOO_PW 환경변수로 넘기거나, 없으면 입력창에서 물어봐요.
// 원본(app.html, data.json)은 절대 이 저장소에 커밋하지 마세요 — 공개 저장소예요.
// 형식: PBKDF2-SHA256(150000회) + AES-256-GCM. data.enc = {"v":1,"iv":base64,"ct":base64}, 키는 index.html의 SALT로 만들어요.
import { readFileSync, writeFileSync } from 'node:fs';
import { webcrypto as crypto } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import readline from 'node:readline';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const ITER = 150000;
const [mode, src] = process.argv.slice(2);
if (!['page', 'data'].includes(mode) || !src) {
  console.error('사용법: node tools/lock.mjs page <app.html> | data <data.json>');
  process.exit(1);
}

function ask(q) {
  return new Promise(res => {
    const rl = readline.createInterface({ input: process.stdin, output: process.stdout, terminal: true });
    rl._writeToOutput = s => { if (!s.includes(q)) return; rl.output.write(s); };
    rl.question(q, a => { rl.close(); process.stdout.write('\n'); res(a); });
  });
}
async function key(pw, salt) {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pw.normalize('NFKC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey({ name: 'PBKDF2', salt, iterations: ITER, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['encrypt', 'decrypt']);
}
const b64 = u8 => Buffer.from(u8).toString('base64');
async function seal(k, text) {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, k, new TextEncoder().encode(text)));
  return { iv, ct };
}
function wrapPage(html) {
  if (/^\s*<!doctype/i.test(html)) return html;
  return '<!DOCTYPE html>\n<html lang="ko">\n<head>\n<meta charset="utf-8">\n'
    + '<meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n'
    + '<meta name="robots" content="noindex,nofollow,noarchive">\n</head>\n<body>\n' + html + '\n</body>\n</html>\n';
}

const pw = process.env.FURUMOO_PW || await ask('비밀번호: ');
if (!pw) { console.error('비밀번호가 비어 있어요'); process.exit(1); }
const text = readFileSync(src, 'utf8');

if (mode === 'page') {
  const salt = crypto.getRandomValues(new Uint8Array(16));
  const k = await key(pw, salt);
  const { iv, ct } = await seal(k, wrapPage(text));
  const tpl = readFileSync(path.join(ROOT, 'tools/lock-template.html'), 'utf8');
  const out = tpl.replace('__PAYLOAD__', b64(ct)).replace('__SALT__', salt.join(',')).replace('__IV__', iv.join(','));
  writeFileSync(path.join(ROOT, 'index.html'), out);
  console.log('index.html 만들었어요. 새 SALT라서 data.enc도 다시 잠가 주세요: node tools/lock.mjs data <data.json>');
} else {
  JSON.parse(text); // 형식 확인
  const idx = readFileSync(path.join(ROOT, 'index.html'), 'utf8');
  const m = idx.match(/var SALT = new Uint8Array\(\[([0-9,\s]+)\]\)/);
  if (!m) { console.error('index.html에서 SALT를 못 찾았어요. 먼저 page를 잠가 주세요.'); process.exit(1); }
  const salt = new Uint8Array(m[1].split(',').map(Number));
  const k = await key(pw, salt);
  // 비밀번호 확인: 화면 payload가 이 키로 풀리는지 먼저 봐요
  const pm = idx.match(/<script id="payload"[^>]*>([^<]*)<\/script>/), im = idx.match(/var IV   = new Uint8Array\(\[([0-9,\s]+)\]\)/);
  try { await crypto.subtle.decrypt({ name: 'AES-GCM', iv: new Uint8Array(im[1].split(',').map(Number)) }, k, Buffer.from(pm[1].replace(/\s+/g, ''), 'base64')); }
  catch { console.error('비밀번호가 index.html과 맞지 않아요'); process.exit(1); }
  const { iv, ct } = await seal(k, text);
  writeFileSync(path.join(ROOT, 'data.enc'), JSON.stringify({ v: 1, iv: b64(iv), ct: b64(ct) }));
  console.log('data.enc 만들었어요.');
}
