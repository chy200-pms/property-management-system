/**
 * 接口一致性检查(运行时反射版)
 * =====================================================================
 * 利用 Node 真实加载 config.js / mock.js / api.js, 通过拦截 Mock.handle
 * 捕获每个 Api.* 方法实际请求的 (HTTP方法, URL), 再与后端 SpringBoot
 * 控制器的接口做比对。比静态正则可靠得多。
 *
 * 检查三件事:
 *   1. 前端页面调用的每个 Api.模块.方法 是否真实存在(防 undefined is not a function)
 *   2. 前端请求的每个 URL 后端是否提供
 *   3. 后端提供的接口哪些前端未接入
 */
const fs = require('fs');
const path = require('path');

const ROOT = path.join(__dirname, '..', '..');      // 项目根 property-management-system
const FE = path.join(__dirname, '..');              // 前端根 frontend
const CTRL = path.join(ROOT, 'backend', 'src', 'main', 'java', 'com', 'property', 'controller');

let pass = 0, fail = 0;
const problems = [];
const check = (name, ok, extra) => {
    if (ok) { pass++; console.log('  [PASS] ' + name + (extra ? '  → ' + extra : '')); }
    else { fail++; problems.push(name); console.log('  [FAIL] ' + name + (extra ? '  → ' + extra : '')); }
};

/* ------------------------------------------------------------------
 * 一、在 Node 里搭出一个最小浏览器环境, 真实加载前端脚本
 * ------------------------------------------------------------------ */
const store = new Map();
global.window = global;
global.localStorage = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
};
global.location = { pathname: '/index.html', href: '' };
global.alert = () => { };
global.navigator = { userAgent: 'node' };
global.axios = {
    create: () => {
        const fn = () => Promise.reject(Object.assign(new Error('Network Error'), { code: 'ERR_NETWORK' }));
        fn.interceptors = { request: { use() { } }, response: { use() { } } };
        return fn;
    },
    get: () => Promise.reject(new Error('Network Error'))
};

const load = f => {
    const code = fs.readFileSync(path.join(FE, f), 'utf8');
    // 用 indirect eval 在全局作用域执行, 效果等同 <script>
    (0, eval)(code);
};
load('js/config.js');
load('js/mock.js');
load('js/api.js');

console.log('='.repeat(78));
console.log('一、前端 Api 对象自检(运行时反射)');
console.log('='.repeat(78));
check('window.Api 已导出', typeof global.Api === 'object');
check('window.Mock 已导出', typeof global.Mock === 'object');
check('window.DemoMode 已导出', typeof global.DemoMode === 'object');

/* ------------------------------------------------------------------
 * 二、遍历 Api 上所有叶子方法, 捕获其真实请求 URL
 * ------------------------------------------------------------------ */
const captured = [];
global.Mock.handle = (method, url, options) => {
    captured.push({ method: method.toUpperCase(), url: String(url).split('?')[0], options });
    return {
        code: 200, msg: 'ok',
        data: { rows: [], list: [], total: 0, token: 't', user: { username: 'u', role: 'ADMIN' } }
    };
};
global.DemoMode.enable();
// 注意: AppConfig.allowDemo 默认为 false(业务要求前端只连真实后端), 此时
// DemoMode.enable() 是空操作、isOn() 恒为 false, 于是 request() 不会走 Mock.handle,
// 拦截不到任何真实请求 URL —— 交叉校验会"空跑通过"(只剩静态扫描到的少量 URL)。
// 本脚本的目的是反射出每个 Api 方法请求的 URL, 因此必须显式打开总开关。
global.AppConfig.allowDemo = true;
global.DemoMode.enable();
if (!global.DemoMode.isOn()) {
    console.error('[致命] 演示模式未能开启, URL 拦截会失效, 交叉校验不可信');
    process.exit(3);
}

// 按方法名推断入参
function argsFor(name) {
    switch (name) {
        case 'detail': case 'remove': case 'preview': case 'cancelPay': case 'start':
            return [1];
        case 'pay': return [1, 'CASH'];
        case 'payBatch': return [[1, 2], 'CASH'];
        case 'calcFee': return [90];
        case 'entry': case 'exit': case 'assign': case 'finish': case 'rate':
        case 'reply': case 'maintain': case 'add': case 'update':
            return [{ id: 1 }, 'CASH'];
        case 'leave': return [1];
        case 'login': return ['admin', '123456'];
        default: return [{}];
    }
}

const surface = {};          // { module: Set(methods) }
const apiPaths = [];         // 每个方法对应的 (method, url)
const invokeErrors = [];

for (const mod of Object.keys(global.Api)) {
    if (mod === '_request') continue;
    const obj = global.Api[mod];
    if (typeof obj === 'function') {
        // 顶层方法(login / logout / currentUser / changePassword / ping)
        surface[mod] = new Set(['_call']);
        const before = captured.length;
        try {
            const ret = obj.apply(global.Api, argsFor(mod));
            if (ret && typeof ret.then === 'function') ret.catch(() => { });
        } catch (e) {
            invokeErrors.push(`Api.${mod}() ${e.message}`);
            continue;
        }
        if (captured.length > before) {
            captured[captured.length - 1].mod = mod;
            captured[captured.length - 1].meth = '_call';
        }
        continue;
    }
    if (typeof obj !== 'object') continue;
    surface[mod] = new Set();
    for (const meth of Object.keys(obj)) {
        if (typeof obj[meth] !== 'function') continue;
        surface[mod].add(meth);
        if (meth === '_request') continue;   // _request 需要 (method,url,options) 三参, 不参与自动调用
        const before = captured.length;
        try {
            const ret = obj[meth].apply(obj, argsFor(meth));
            // 触发 Mock.handle 需要等 promise 链
            if (ret && typeof ret.then === 'function') ret.catch(() => { });
        } catch (e) {
            invokeErrors.push(`Api.${mod}.${meth}() ${e.message}`);
            continue;
        }
        // request() 是 async, Mock.handle 在第一个 await 之前被调用, 通常同步已捕获;
        // 若未捕获则记录待定
        if (captured.length === before) {
            captured.push({ method: '?', url: '(async-deferred)', pending: true, mod, meth });
        } else {
            captured[captured.length - 1].mod = mod;
            captured[captured.length - 1].meth = meth;
        }
    }
}

const totalMethods = Object.values(surface).reduce((n, s) => n + s.size, 0);
console.log(`\n  共发现 Api 模块 ${Object.keys(surface).length} 个, 方法 ${totalMethods} 个`);
for (const m of Object.keys(surface).sort()) {
    console.log(`    Api.${m.padEnd(12)} (${surface[m].size}) ${[...surface[m]].sort().join(', ')}`);
}
check('遍历 Api 方法无调用异常', invokeErrors.length === 0,
    invokeErrors.length ? invokeErrors.join(' | ') : '全部可调用');

/* ------------------------------------------------------------------
 * 三、页面调用的 Api.* 是否都存在
 * ------------------------------------------------------------------ */
console.log('\n' + '='.repeat(78));
console.log('三、页面调用 ↔ Api 对象 实际提供的方法');
console.log('='.repeat(78));

const PAGES = path.join(FE, 'js', 'pages');
const called = new Set();
for (const f of fs.readdirSync(PAGES)) {
    if (!f.endsWith('.js')) continue;
    const s = fs.readFileSync(path.join(PAGES, f), 'utf8');
    for (const m of s.matchAll(/Api\.(\w+)\.(\w+)\(/g)) called.add(m[1] + '.' + m[2]);
}
const mainHtml = fs.readFileSync(path.join(FE, 'main.html'), 'utf8');
for (const m of mainHtml.matchAll(/Api\.(\w+)\.(\w+)\(/g)) called.add(m[1] + '.' + m[2]);

// 通过 _request 直接书写的 URL(页面里静态可见, 一并纳入接口比对)
const staticUrls = [];
const scanFiles = fs.readdirSync(PAGES).filter(x => x.endsWith('.js')).map(x => path.join(PAGES, x));
scanFiles.push(path.join(FE, 'main.html'));
for (const f of scanFiles) {
    const s = fs.readFileSync(f, 'utf8');
    for (const m of s.matchAll(/_request\(\s*'(\w+)'\s*,\s*'([^']+)'/g)) {
        staticUrls.push({ method: m[1].toUpperCase(), url: m[2], mod: '(page)', meth: '_request' });
    }
}

const missingInApi = [];
for (const key of [...called].sort()) {
    const [mod, meth] = key.split('.');
    if (!surface[mod] || !surface[mod].has(meth)) missingInApi.push('Api.' + key + '()');
}
check(`页面共调用 ${called.size} 个 Api 方法, 全部存在`, missingInApi.length === 0,
    missingInApi.length ? '缺失: ' + missingInApi.join(', ') : '无缺失');

/* ------------------------------------------------------------------
 * 四、后端接口 ↔ 前端请求 URL
 * ------------------------------------------------------------------ */
console.log('\n' + '='.repeat(78));
console.log('四、后端 SpringBoot 接口 ↔ 前端请求 URL');
console.log('='.repeat(78));

const backend = new Set();
for (const f of fs.readdirSync(CTRL)) {
    if (!f.endsWith('.java')) continue;
    const src = fs.readFileSync(path.join(CTRL, f), 'utf8');
    const pm = src.match(/@RequestMapping\("([^"]+)"\)/);
    const prefix = pm ? pm[1] : '';
    for (const mm of src.matchAll(/@(Get|Post|Put|Delete)Mapping(?:\("([^"]*)"\))?/g)) {
        backend.add(mm[1].toUpperCase() + ' ' + (prefix + (mm[2] || '') || '/'));
    }
}

const norm = s => s.replace(/\/\d+/g, '/{id}').replace(/\/+$/, '') || '/';
const beNorm = new Set([...backend].map(s => {
    const i = s.indexOf(' ');
    return s.slice(0, i) + ' ' + norm(s.slice(i + 1));
}));
const feNorm = new Set(captured.filter(c => c.method !== '?' && !c.pending)
    .map(c => c.method + ' ' + norm(c.url))
    .concat(staticUrls.map(c => c.method + ' ' + norm(c.url))));

const onlyFe = [...feNorm].filter(x => !beNorm.has(x)).sort();
const onlyBe = [...beNorm].filter(x => !feNorm.has(x)).sort();

console.log(`\n  后端接口 ${backend.size} 个`);
for (const x of [...beNorm].sort()) console.log('    ' + x);

console.log(`\n  前端请求 ${feNorm.size} 个 URL`)
check('前端请求的 URL 后端均提供', onlyFe.length === 0,
    onlyFe.length ? '后端缺失: ' + onlyFe.join(' | ') : '全部匹配');

console.log(`\n  [后端有但前端未接入] ${onlyBe.length} 个:`);
for (const x of onlyBe) console.log('      ' + x);

/* ------------------------------------------------------------------
 * 五、演示模式覆盖
 * ------------------------------------------------------------------ */
console.log('\n' + '='.repeat(78));
console.log('五、演示模式(mock.js) 覆盖');
console.log('='.repeat(78));
const mockSrc = fs.readFileSync(path.join(FE, 'js', 'mock.js'), 'utf8');
const explicit = new Set([...mockSrc.matchAll(/path === '([^']+)'/g)].map(m => m[1]));
// mock 里还有一类"按二级路径分支"的写法(如 seg[0]==='log' && seg[1]==='detail' 处理 /log/detail/{id}),
// 这类没有 path === '...' 字面量, 静态扫描必须一并认出来, 否则会把已实现的接口误报成"未覆盖"。
const segBranches = new Set([...mockSrc.matchAll(/seg\[1\]\s*===\s*'([^']+)'/g)].map(m => m[1]));
const collsM = mockSrc.match(/COLLECTIONS\s*=\s*\[([^\]]*)\]/);
const colls = collsM ? new Set([...collsM[1].matchAll(/'(\w+)'/g)].map(m => m[1])) : new Set();
console.log('  COLLECTIONS(通用 CRUD 资源): ' + [...colls].sort().join(', '));
console.log('  显式处理的业务接口: ' + [...explicit].sort().join(', '));
console.log('  按二级路径分支处理: ' + [...segBranches].sort().join(', '));

const uncovered = [];
for (const c of [...captured, ...staticUrls]) {
    if (c.pending || c.method === '?') continue;
    const seg = c.url.split('/').filter(Boolean);
    if (c.url === '/auth/captcha') continue;
    if (seg[0] === 'auth') continue;
    if (seg[0] === 'dashboard') continue;
    if (colls.has(seg[0])) continue;
    if (explicit.has(c.url)) continue;
    if (segBranches.has(seg[1])) continue;
    if (['statistics', 'generate', 'preview', 'inParking', 'calcFee', 'entry', 'exit',
        'allocate', 'release', 'assign', 'start', 'finish', 'rate', 'reply', 'leave',
        'maintain', 'pay', 'payBatch', 'cancelPay', 'checkIn'].includes(seg[1])) continue;
    uncovered.push(c.method + ' ' + c.url);
}
check('演示模式覆盖全部前端请求', uncovered.length === 0,
    uncovered.length ? uncovered.join(' | ') : '全覆盖');

console.log('\n' + '='.repeat(78));
console.log(`  检查结果: ${pass} 项通过, ${fail} 项失败`);
if (fail) console.log('  问题: ' + problems.join(' / '));
console.log('='.repeat(78));
process.exit(fail ? 1 : 0);
