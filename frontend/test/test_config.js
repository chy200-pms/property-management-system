/**
 * 接口地址推导测试（config.js）
 *
 * 背景：同一份前端代码要同时支持两种部署形态——
 *   形态 A 本机/局域网：前端 9000 + 后端 8080 分开，接口要打到 <当前host>:8080
 *   形态 B 服务器部署：前端与后端同域，由 Nginx 反代 /api，走标准端口 80/443
 * 这里穷举各种访问方式，断言 baseURL 推导结果，避免以后改配置时悄悄回归。
 *
 * 运行: node test_config.js
 */
'use strict';

const fs = require('fs');
const vm = require('vm');
const path = require('path');

const code = fs.readFileSync(path.join(__dirname, '..', 'js', 'config.js'), 'utf8');

let pass = 0, fail = 0;
function check(name, actual, expect) {
    const ok = actual === expect;
    ok ? pass++ : fail++;
    console.log('  ' + (ok ? '✓' : '✗') + ' ' + name.padEnd(26) + ' -> ' + actual +
        (ok ? '' : '   (期望 ' + expect + ')'));
}

function makeSandbox(loc, extra) {
    const sandbox = {
        console: console,
        location: loc,
        localStorage: { getItem: () => null, setItem: () => {}, removeItem: () => {} }
    };
    // window 指向沙箱自身：这样 config.js 里的 `window.AppConfig = ...` 等同于全局 `AppConfig`，
    // 与浏览器行为一致（否则 DemoMode 内部裸用 AppConfig 会报未定义）。
    sandbox.window = sandbox;
    sandbox.global = sandbox;
    Object.keys(extra || {}).forEach(k => { sandbox[k] = extra[k]; });
    vm.createContext(sandbox);
    vm.runInContext(code, sandbox);
    return sandbox;
}

function baseURLOf(loc, extra) {
    return makeSandbox(loc, extra).AppConfig.baseURL;
}

console.log('');
console.log('='.repeat(66));
console.log('  接口地址推导测试 (frontend/js/config.js)');
console.log('='.repeat(66));

console.log('');
console.log('一、自动推导');
check('file:// 直接双击打开',
    baseURLOf({ protocol: 'file:', hostname: '', host: '', port: '' }),
    'http://localhost:8080/api');
check('本机 localhost:9000',
    baseURLOf({ protocol: 'http:', hostname: 'localhost', host: 'localhost:9000', port: '9000' }),
    'http://localhost:8080/api');
check('局域网 192.168.x.x:9000',
    baseURLOf({ protocol: 'http:', hostname: '192.168.2.103', host: '192.168.2.103:9000', port: '9000' }),
    'http://192.168.2.103:8080/api');
// 本机即使走 80/443，也不假定前面有反向代理（本项目开发时前端就是独立起的静态服务）
check('本机 localhost:80 (无代理)',
    baseURLOf({ protocol: 'http:', hostname: 'localhost', host: 'localhost', port: '' }),
    'http://localhost:8080/api');
check('本机 127.0.0.1:443',
    baseURLOf({ protocol: 'https:', hostname: '127.0.0.1', host: '127.0.0.1', port: '443' }),
    'http://127.0.0.1:8080/api');
check('生产 http 80 端口',
    baseURLOf({ protocol: 'http:', hostname: 'pms.example.com', host: 'pms.example.com', port: '' }),
    'http://pms.example.com/api');
check('生产 https 443',
    baseURLOf({ protocol: 'https:', hostname: 'pms.example.com', host: 'pms.example.com', port: '443' }),
    'https://pms.example.com/api');
check('生产 https 显式 :443',
    baseURLOf({ protocol: 'https:', hostname: 'pms.example.com', host: 'pms.example.com:443', port: '443' }),
    'https://pms.example.com/api');
check('公网 IP 80 端口',
    baseURLOf({ protocol: 'http:', hostname: '123.45.67.89', host: '123.45.67.89', port: '' }),
    'http://123.45.67.89/api');
check('非标准端口 8081 直连',
    baseURLOf({ protocol: 'http:', hostname: 'pms.example.com', host: 'pms.example.com:8081', port: '8081' }),
    'http://pms.example.com:8080/api');
check('Node 环境无 location',
    baseURLOf(undefined),
    'http://localhost:8080/api');

console.log('');
console.log('二、手动覆盖优先级');
check('PMS_API_BASE 覆盖',
    baseURLOf({ protocol: 'http:', hostname: 'localhost', host: 'localhost:9000', port: '9000' },
        { PMS_API_BASE: 'http://10.0.0.8:9999/api' }),
    'http://10.0.0.8:9999/api');
check('PMS_API_PORT 覆盖',
    baseURLOf({ protocol: 'http:', hostname: 'localhost', host: 'localhost:9000', port: '9000' },
        { PMS_API_PORT: 9090 }),
    'http://localhost:9090/api');

console.log('');
console.log('三、其他配置项');
const sb = makeSandbox({ protocol: 'http:', hostname: 'localhost', host: 'localhost:9000', port: '9000' });
check('allowDemo 默认关闭', String(sb.AppConfig.allowDemo), 'false');
check('timeout 为 8000', String(sb.AppConfig.timeout), '8000');
check('DemoMode 在 allowDemo=false 时不可开', String(sb.DemoMode.enable()), 'false');
check('DemoMode.isOn() 恒为 false', String(sb.DemoMode.isOn()), 'false');

console.log('');
console.log('四、部署钩子 js/env.js（前后端不同域名时靠它指定后端地址）');
const webDir = path.join(__dirname, '..');
const envPath = path.join(webDir, 'js', 'env.js');
check('env.js 文件存在', fs.existsSync(envPath) ? '存在' : '缺失', '存在');
['index.html', 'main.html'].forEach(function (f) {
    const html = fs.readFileSync(path.join(webDir, f), 'utf8');
    const iEnv = html.indexOf('js/env.js');
    const iCfg = html.indexOf('js/config.js');
    check(f + ' 已引入 env.js', iEnv > -1 ? '已引入' : '缺失', '已引入');
    // 顺序很关键：env.js 必须在 config.js 之前，否则覆盖不生效
    check(f + ' env.js 先于 config.js', String(iEnv > -1 && iEnv < iCfg), 'true');
});
// 默认必须是"没启用覆盖"的状态，否则本机 / 局域网 / Nginx 同域的自动推导会被改坏
check('env.js 默认未启用覆盖',
    String(/^\s*window\.PMS_API_BASE\s*=/m.test(fs.readFileSync(envPath, 'utf8'))), 'false');

console.log('');
console.log('='.repeat(66));
console.log('  结果: %d 项通过, %d 项失败', pass, fail);
console.log('='.repeat(66));
process.exit(fail ? 1 : 0);
