/**
 * 生成 frontend/js/env.js —— 告诉前端「后端在哪」
 *
 * ────────────────────────────────────────────────────────────
 * 什么时候需要它？
 *   前端与后端【不在同一个域名下】时。
 *   典型：前端放 Render 静态站点 / Netlify / Cloudflare Pages，
 *        后端放 Render Web Service —— 两个域名。
 *   这时必须显式写死后端地址，否则前端会把接口请求打到
 *   静态托管自己的域名上，结果全是 404。
 *
 * 什么时候【不需要】它？
 *   前后端同域（例如都在一台服务器上由 Nginx 把 /api 反代给后端）。
 *   那种情况下 config.js 会自动推导出同域 /api，别用本脚本。
 * ────────────────────────────────────────────────────────────
 *
 * 用法一：本地跑一次，再去拖拽/上传前端目录（Netlify Drop 等）
 *     node scripts/gen-env.js https://pms-backend-xxxx.onrender.com
 *   然后上传 frontend 目录即可（env.js 已经在里面了）。
 *
 * 用法二：平台构建时自动生成（Render Static Site / Cloudflare Pages）
 *     build command: node scripts/gen-env.js
 *   环境变量:      API_BASE = https://pms-backend-xxxx.onrender.com
 *
 * 细节：
 *   · 地址结尾的 /api 会自动补齐，写不写都行；没写协议时默认按 https 补。
 *   · 不带参数时从环境变量 API_BASE / PMS_API_BASE 读。
 *   · 改完想还原（回到"自动推导"状态）：git checkout frontend/js/env.js
 */
'use strict';

var fs = require('fs');
var path = require('path');

var OUT = path.join(__dirname, '..', 'frontend', 'js', 'env.js');

var raw = (process.argv[2] || process.env.API_BASE || process.env.PMS_API_BASE || '').trim();

if (!raw) {
    console.log('');
    console.log('  用法: node scripts/gen-env.js https://你的后端域名');
    console.log('    或: 先设环境变量 API_BASE，再运行 node scripts/gen-env.js');
    console.log('');
    process.exit(1);
}

if (!/^https?:\/\//i.test(raw)) raw = 'https://' + raw;
raw = raw.replace(/\/+$/, '');
var apiBase = /\/api$/i.test(raw) ? raw : raw + '/api';

var content = [
    '/**',
    ' * 部署环境配置 —— 由 scripts/gen-env.js 自动生成，请勿手工修改',
    ' *',
    ' * 本文件在 js/config.js 之前加载，用于覆盖「接口地址自动推导」的结果。',
    ' * 因为它，前端才能找到另一个域名下的后端。',
    ' *',
    ' * 想改回自动推导？执行: git checkout frontend/js/env.js',
    ' */',
    '',
    "window.PMS_API_BASE = '" + apiBase + "';",
    ''
].join('\n');

fs.writeFileSync(OUT, content, 'utf8');

console.log('');
console.log('  [完成] 后端地址已写入: ' + path.relative(path.join(__dirname, '..'), OUT));
console.log('         后端接口前缀: ' + apiBase);
console.log('');
console.log('  提醒: 现在这个文件已指向线上后端。若你还要在本机跑开发或测试,');
console.log('        请执行  git checkout frontend/js/env.js  还原为自动推导。');
console.log('');
