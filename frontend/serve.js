/**
 * 物业管理系统 —— 静态文件服务器（零依赖，只需要 Node.js）
 *
 * 用法:
 *   node serve.js [端口] [绑定地址]
 *   node serve.js 9000 0.0.0.0     # 监听所有网卡, 局域网内其它人也能访问
 *   node serve.js 9000             # 默认绑定 0.0.0.0
 *   node serve.js 9000 --api 8080  # 【同源入口】把 /api/* 反代给本地 8080 的后端
 *
 * 说明:
 *   - 本文件所在目录(frontend)即为网站根目录
 *   - 默认入口 index.html
 *   - 不缓存, 改完文件刷新即可生效
 *   - 命令行的 --bind / -p 写法也兼容
 *
 * 关于 --api（什么时候需要它）:
 *   正常本机/局域网开发【不需要】它 —— 前端在 9000、后端在 8080, 浏览器直连即可。
 *   但在下面这两类场景里, 只能对外暴露"一个端口", 必须靠本参数把接口也挂到同一个端口上:
 *     · 内网穿透 / 隧道(cloudflared、ngrok 等): 一条隧道只映射一个端口
 *     · 只开放单个端口的容器或反向代理
 *   挂上之后, 前端页面与接口同源, 既没有跨域问题, 也不会出现
 *   "https 页面去请求 http 接口"被浏览器拦掉(混合内容)的情况。
 *   config.js 会自动把接口推导成同域的 /api, 无需改动前端代码。
 */
'use strict';

var http = require('http');
var https = require('https');
var fs = require('fs');
var path = require('path');
var os = require('os');
var url = require('url');

var ROOT = __dirname;

/* ---------------- 参数解析 ---------------- */
var PORT = 9000;
var BIND = '0.0.0.0';
var API_TARGET = parseTarget(process.env.PMS_API_TARGET || '');

(function parseArgs() {
    var argv = process.argv.slice(2);
    var positional = [];
    for (var i = 0; i < argv.length; i++) {
        var a = argv[i];
        if (a === '--bind' || a === '-b') {
            BIND = argv[++i] || BIND;
        } else if (a === '--port' || a === '-p') {
            PORT = parseInt(argv[++i], 10) || PORT;
        } else if (a === '--api' || a === '--proxy') {
            API_TARGET = parseTarget(argv[++i]);
        } else if (/^\d+$/.test(a)) {
            positional.push(a);
        } else if (a.indexOf('.') > -1) {
            BIND = a;
        }
    }
    if (positional[0]) PORT = parseInt(positional[0], 10) || PORT;
    if (positional[1]) BIND = positional[1];
})();

/* ---------------- MIME 类型 ---------------- */
var MIME = {
    '.html': 'text/html; charset=utf-8',
    '.htm': 'text/html; charset=utf-8',
    '.js': 'application/javascript; charset=utf-8',
    '.mjs': 'application/javascript; charset=utf-8',
    '.css': 'text/css; charset=utf-8',
    '.json': 'application/json; charset=utf-8',
    '.map': 'application/json; charset=utf-8',
    '.txt': 'text/plain; charset=utf-8',
    '.xml': 'application/xml; charset=utf-8',
    '.svg': 'image/svg+xml',
    '.png': 'image/png',
    '.jpg': 'image/jpeg',
    '.jpeg': 'image/jpeg',
    '.gif': 'image/gif',
    '.webp': 'image/webp',
    '.bmp': 'image/bmp',
    '.ico': 'image/x-icon',
    '.woff': 'font/woff',
    '.woff2': 'font/woff2',
    '.ttf': 'font/ttf',
    '.otf': 'font/otf',
    '.eot': 'application/vnd.ms-fontobject',
    '.wasm': 'application/wasm',
    '.glb': 'model/gltf-binary',
    '.gltf': 'model/gltf+json',
    '.mp4': 'video/mp4',
    '.webm': 'video/webm',
    '.mp3': 'audio/mpeg',
    '.wav': 'audio/wav',
    '.pdf': 'application/pdf',
    '.zip': 'application/zip'
};

function mimeOf(file) {
    return MIME[path.extname(file).toLowerCase()] || 'application/octet-stream';
}

/* ---------------- 后端代理目标 ---------------- */
/**
 * 把用户输入的多种写法归一化成一个可用的目标:
 *   8080                          -> http://127.0.0.1:8080
 *   localhost:8080                -> http://localhost:8080
 *   http://127.0.0.1:8080/        -> 原样
 * @returns {{protocol:string,hostname:string,port:(number|string)}|null}
 */
function parseTarget(t) {
    if (!t) return null;
    t = String(t).trim();
    if (!t) return null;
    if (/^\d+$/.test(t)) t = 'http://127.0.0.1:' + t;
    if (!/^https?:\/\//i.test(t)) t = 'http://' + t;
    var u;
    try {
        u = new URL(t);
    } catch (e) {
        console.log('  [警告] --api 参数无法识别: ' + t + ' (已忽略, 退化为纯静态服务)');
        return null;
    }
    return {
        protocol: u.protocol,
        hostname: u.hostname,
        port: u.port || (u.protocol === 'https:' ? 443 : 80)
    };
}

function targetLabel(target) {
    var isDefaultPort = (target.protocol === 'https:' && Number(target.port) === 443) ||
        (target.protocol === 'http:' && Number(target.port) === 80);
    return target.protocol + '//' + target.hostname + (isDefaultPort ? '' : ':' + target.port);
}

/* ---------------- 工具 ---------------- */
function localIPv4List() {
    var out = [];
    var ifaces = os.networkInterfaces();
    Object.keys(ifaces).forEach(function (name) {
        (ifaces[name] || []).forEach(function (info) {
            var family = info.family;
            if ((family === 'IPv4' || family === 4) && !info.internal) {
                out.push(info.address);
            }
        });
    });
    return out;
}

/**
 * 把 /api/** 原样转发给后端(含请求体, 支持 POST/PUT/DELETE)。
 * 转发失败时返回 502 + 统一返回体, 方便前端直接显示原因,
 * 而不是丢一个浏览器层面的"网络错误"让人摸不着头脑。
 */
function proxyApi(req, res) {
    var target = API_TARGET;
    var mod = target.protocol === 'https:' ? https : http;

    var headers = Object.assign({}, req.headers);
    headers.host = target.hostname +
        (Number(target.port) === 80 || Number(target.port) === 443 ? '' : ':' + target.port);
    // 不带压缩要求, 后端返回明文, 透传给浏览器时不会出现编码不一致
    delete headers['accept-encoding'];

    var proxyReq = mod.request({
        protocol: target.protocol,
        hostname: target.hostname,
        port: target.port,
        method: req.method,
        path: req.url,              // 保留 /api 前缀与查询串
        headers: headers
    }, function (proxyRes) {
        var outHeaders = Object.assign({}, proxyRes.headers);
        delete outHeaders['transfer-encoding'];
        delete outHeaders['connection'];
        res.writeHead(proxyRes.statusCode || 502, outHeaders);
        proxyRes.pipe(res);
    });

    proxyReq.on('error', function (e) {
        res.writeHead(502, { 'Content-Type': 'application/json; charset=utf-8' });
        res.end(JSON.stringify({
            code: 502,
            msg: '后端服务未连接(' + (e && e.code ? e.code : e.message) + ')。' +
                '请确认后端已启动, 且监听在 ' + targetLabel(target),
            data: null
        }));
    });

    req.pipe(proxyReq);
}

/* ---------------- 请求处理 ---------------- */
var server = http.createServer(function (req, res) {
    var pathname = '/';
    try {
        pathname = decodeURIComponent(url.parse(req.url).pathname || '/');
    } catch (e) {
        pathname = '/';
    }

    // 同源入口: 接口请求优先交给后端(必须在 405 判断之前, 否则 POST 会被挡掉)
    if (API_TARGET && (pathname === '/api' || pathname.indexOf('/api/') === 0)) {
        proxyApi(req, res);
        return;
    }

    if (req.method !== 'GET' && req.method !== 'HEAD') {
        res.writeHead(405, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('405 Method Not Allowed');
        return;
    }

    if (pathname === '/' || pathname === '') pathname = '/index.html';

    // 归一化并防目录穿越
    var filePath = path.normalize(path.join(ROOT, pathname));
    if (filePath.indexOf(ROOT) !== 0) {
        res.writeHead(403, { 'Content-Type': 'text/plain; charset=utf-8' });
        res.end('403 Forbidden');
        return;
    }

    fs.stat(filePath, function (err, stat) {
        if (!err && stat.isDirectory()) {
            filePath = path.join(filePath, 'index.html');
            stat = null;
        }
        fs.readFile(filePath, function (err2, data) {
            if (err2) {
                res.writeHead(404, { 'Content-Type': 'text/html; charset=utf-8' });
                res.end(
                    '<!doctype html><meta charset="utf-8">' +
                    '<h2>404 Not Found</h2><p>' + pathname + '</p>' +
                    '<p><a href="/index.html">返回首页</a></p>'
                );
                return;
            }
            res.writeHead(200, {
                'Content-Type': mimeOf(filePath),
                'Content-Length': data.length,
                'Cache-Control': 'no-cache, no-store, must-revalidate',
                'Access-Control-Allow-Origin': '*'
            });
            if (req.method === 'HEAD') res.end(); else res.end(data);
        });
    });
});

server.on('error', function (e) {
    if (e && e.code === 'EADDRINUSE') {
        console.log('');
        console.log('  [错误] 端口 ' + PORT + ' 已被占用。');
        console.log('         可能前端已经在运行了 —— 直接打开 http://localhost:' + PORT + '/index.html');
        console.log('         若要重启, 请先关闭正在运行的那个窗口 (或结束占用该端口的进程)。');
    } else {
        console.log('');
        console.log('  [错误] 服务启动失败: ' + (e && e.message ? e.message : e));
        if (e && e.code === 'EACCES') {
            console.log('         端口 ' + PORT + ' 需要更高权限, 换一个端口试试, 例如: node serve.js 8081');
        }
    }
    console.log('');
    process.exit(1);
});

server.listen(PORT, BIND, function () {
    var pad = '  ';
    console.log('');
    console.log('============================================================');
    console.log('  物业管理系统 - 前端界面已启动');
    console.log('============================================================');
    console.log('');
    console.log(pad + '[本机访问]   http://localhost:' + PORT + '/index.html');
    var ips = localIPv4List();
    if (ips.length) {
        ips.forEach(function (ip) {
            console.log(pad + '[局域网访问] http://' + ip + ':' + PORT + '/index.html');
        });
        console.log(pad + '             ^ 把上面这一行发给同事(需在同一 WiFi/局域网)');
    } else {
        console.log(pad + '[局域网访问] 未识别到 IPv4 地址, 请手动执行 ipconfig 查看');
    }
    console.log('');
    if (API_TARGET) {
        console.log(pad + '[同源 API]   /api/*  ==>  ' + targetLabel(API_TARGET));
        console.log(pad + '             隧穿/单端口场景下, 页面与接口同源, 无需再暴露后端端口');
    } else {
        console.log(pad + '[同源 API]   未启用(本机/局域网开发无需启用;');
        console.log(pad + '             隧道或单端口部署时加参数: node serve.js ' + PORT + ' --api 8080)');
    }
    console.log('');
    console.log(pad + '[重要] 别人要能正常用, 后端也必须开着 (双击 2-启动后端.bat)');
    console.log(pad + '[重要] 若对方打不开, 双击 5-局域网访问.bat 放行防火墙端口');
    console.log('');
    console.log(pad + '根目录: ' + ROOT);
    console.log(pad + '按 Ctrl+C 可停止服务');
    console.log('');
});
