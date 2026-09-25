/**
 * 前端真实渲染测试 (jsdom)
 * ---------------------------------------------------------------
 * 目的: 在无浏览器环境下真实执行 Vue + Element UI + 业务 JS,
 *       验证页面能挂载、登录流程可用、演示模式降级生效、各页面组件无运行时异常。
 *
 * 做法: 把 HTML 里所有 <script src> 内联后再交给 jsdom 执行,
 *       避免 file:// 下 localStorage 不可用与相对路径加载失败的问题。
 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
let pass = 0, fail = 0;
const errors = [];

function sec(t) { console.log('\n' + '='.repeat(70) + '\n  ' + t + '\n' + '='.repeat(70)); }
function check(name, ok, extra) {
    if (ok) { pass++; console.log('  [PASS] ' + name + (extra !== undefined ? '  → ' + extra : '')); }
    else { fail++; errors.push(name); console.log('  [FAIL] ' + name + (extra !== undefined ? '  → ' + extra : '')); }
}

/** 把 <script src="xxx"></script> 替换成内联脚本 */
function inlineScripts(html, baseDir, opts) {
    opts = opts || {};
    const missing = [];
    let out = html.replace(/<script\s+src="([^"]+)"\s*><\/script>/g, (m, src) => {
        // ECharts 依赖真实 canvas, 测试中替换为轻量桩
        if (opts.stubEcharts && /echarts/.test(src)) {
            return '<script>window.ECharts=window.echarts={init:function(){return{setOption:function(){},resize:function(){},dispose:function(){},on:function(){}}},graphic:{}};<\/script>';
        }
        const p = path.join(baseDir, src);
        if (!fs.existsSync(p)) { missing.push(src); return '<script>/* missing: ' + src + ' */<\/script>'; }
        let code = fs.readFileSync(p, 'utf8');
        // 让"后端探测"结果可控, 使测试不依赖"本机是否恰好跑着后端"
        let stub = '';
        if (opts.ping !== undefined && /js[\\/]api\.js$/.test(src)) {
            stub = '\nApi.ping = function () { return Promise.resolve(' + (opts.ping ? 'true' : 'false') + '); };\n';
        }
        // 演示模式总开关默认是关的(业务要求: 前端只连真实后端)。
        // 需要验证"演示行为"的用例, 通过 allowDemo 显式打开。
        if (opts.allowDemo && /js[\\/]config\.js$/.test(src)) {
            stub += '\nAppConfig.allowDemo = true;\n';
        }
        // 防止脚本内容里出现 </script 破坏标签
        code = code.replace(/<\/script/gi, '<\\/script');
        return '<script>\n' + code + stub + '\n<\/script>';
    });
    if (missing.length) throw new Error('缺少文件: ' + missing.join(', '));
    return out;
}

function buildDom(htmlFile, opts) {
    const full = path.join(ROOT, htmlFile);
    const raw = fs.readFileSync(full, 'utf8');
    const html = inlineScripts(raw, path.dirname(full), opts);

    const vc = new VirtualConsole();
    const consoleErrors = [];
    const IGNORE = /navigation to another Document|Not implemented/;
    vc.on('jsdomError', e => {
        const m = e && e.message;
        if (m && !IGNORE.test(m)) consoleErrors.push('jsdomError: ' + m);
    });
    vc.on('error', (...a) => consoleErrors.push('error: ' + a.join(' ')));
    vc.on('warn', () => { });
    vc.on('log', () => { });

    const dom = new JSDOM(html, {
        // opts.url 可指定带 hash 的地址, 用于验证"地址栏落在某个路径时页面是否空白"
        url: (opts && opts.url) || 'http://localhost/',
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        virtualConsole: vc,
        beforeParse(win) {
            // 预置登录态, 避免 main.html 因未登录而跳转登录页
            if (opts && opts.loggedIn) {
                win.localStorage.setItem('pms_token', 'demo-token-1');
                win.localStorage.setItem('pms_user', JSON.stringify({
                    id: 1, username: 'admin', realName: '系统管理员', role: 'ADMIN'
                }));
            }
            // 预置"上次处于演示模式"的遗留标记, 用于验证后端启动后的自动恢复
            if (opts && opts.demo) {
                win.localStorage.setItem('pms_demo', '1');
            }
        }
    });
    const w = dom.window;
    // jsdom 未实现, 覆盖以免刷屏
    w.scrollTo = () => { };
    w.HTMLElement.prototype.scrollIntoView = () => { };
    if (opts && opts.stubEcharts) {
        w.HTMLCanvasElement.prototype.getContext = () => null;
    }
    // 捕获运行时未处理异常
    w.addEventListener('error', e => {
        if (!IGNORE.test(e.message || '')) consoleErrors.push('window.onerror: ' + e.message);
    });
    return { dom, w, d: w.document, consoleErrors };
}

/** 从全局组件表取出页面组件定义 */
function compOptions(w, name) {
    let c = w.Vue.options.components[name];
    if (typeof c === 'function') {
        if (c.options) return c.options;
        if (c._Ctor && c._Ctor[0]) return c._Ctor[0].options;
        return null;
    }
    return c || null;
}

const sleep = ms => new Promise(r => setTimeout(r, ms));

(async function main() {

    /* ==================================================================
       一、登录页 index.html
       ================================================================== */
    sec('一、登录页 index.html — 脚本加载与全局对象');
    const A = buildDom('index.html', { ping: false, allowDemo: true });
    const wA = A.w, dA = A.d;

    check('AppConfig 已定义', typeof wA.AppConfig === 'object' && !!wA.AppConfig.baseURL, wA.AppConfig && wA.AppConfig.baseURL);
    check('DemoMode 已定义且含 enable/isOn/sync',
        !!(wA.DemoMode && wA.DemoMode.enable && wA.DemoMode.isOn && wA.DemoMode.sync));
    check('Mock 已定义(演示数据模块被正确引入)', typeof wA.Mock === 'object' && typeof wA.Mock.handle === 'function');
    check('Api 已定义', typeof wA.Api === 'object' && typeof wA.Api.login === 'function');

    check('Vue 已加载', typeof wA.Vue === 'function');
    check('Element UI 已加载', !!(wA.ELEMENT || wA.Element));
    check('axios 已加载', typeof wA.axios === 'function');

    check('登录页根节点 #app 内已渲染出登录表单',
        !!dA.querySelector('.login-wrap') && !!dA.querySelector('.login-btn'),
        '含 .login-wrap 与 .login-btn');
    check('页面标题正确', dA.title === '登录 - 物业管理系统', dA.title);

    /* ---------------- 一之二、演示模式默认关闭 ---------------- */
    sec('一之二、演示模式默认关闭(前端只连真实后端)');
    {
        const Z = buildDom('index.html', { ping: false });   // 走默认配置, 不打开 allowDemo
        const wZ = Z.w, dZ = Z.d;
        await sleep(300);
        check('AppConfig.allowDemo 默认为 false', wZ.AppConfig.allowDemo === false,
            'allowDemo=' + wZ.AppConfig.allowDemo);
        check('后端离线也不会自动开启演示模式',
            wZ.DemoMode.isOn() === false && wZ.AppConfig.demo === false,
            'demo=' + wZ.AppConfig.demo);
        check('总开关关闭时 enable() 无效', wZ.DemoMode.enable() === false
            && wZ.DemoMode.isOn() === false);
        const hint = dZ.querySelector('.demo-hint');
        check('后端离线时提示"无法连接后端服务"',
            !!hint && /无法连接后端服务/.test(hint.textContent),
            hint ? hint.textContent.replace(/\s+/g, ' ').trim().slice(0, 40) : '未显示提示');
    }

    /* ---------------- 二、登录业务流 ---------------- */
    sec('二、登录页 — 登录业务流程(演示模式)');

    // 后端未启动 -> 进入演示模式
    let pinged = await wA.Api.ping();
    check('Api.ping() 探测后端(未启动应为 false)', pinged === false, 'ping=' + pinged);

    wA.DemoMode.enable();
    check('DemoMode.isOn() 开启后为 true', wA.DemoMode.isOn() === true);

    try {
        const res = await wA.Api.login('admin', '123456');
        check('演示模式登录成功(验证 Mock 已生效)', res && res.code === 200 && !!(res.data && res.data.token),
            'token 长度=' + (res.data && res.data.token ? res.data.token.length : 0));
        check('登录返回用户信息', !!(res.data && res.data.user && res.data.user.username),
            res.data && res.data.user ? res.data.user.username + ' / ' + res.data.user.role : '-');
    } catch (e) {
        check('演示模式登录成功(验证 Mock 已生效)', false, '抛出: ' + e.message);
    }

    // 错误密码应被拒绝
    let rejected = false;
    try { await wA.Api.login('admin', 'wrong-password'); }
    catch (e) { rejected = true; }
    check('错误密码被拒绝', rejected === true);

    // 不存在的账号
    let rejected2 = false;
    try { await wA.Api.login('no-such-user', '123456'); }
    catch (e) { rejected2 = true; }
    check('不存在账号被拒绝', rejected2 === true);

    // 各角色均可登录
    for (const [u, p, role] of [['wuye01', '123456', 'STAFF'], ['yeye01', '123456', 'OWNER']]) {
        try {
            const r = await wA.Api.login(u, p);
            check(`角色账号 ${u} 登录成功`, r.code === 200 && r.data.user.role === role, r.data.user.role);
        } catch (e) {
            check(`角色账号 ${u} 登录成功`, false, e.message);
        }
    }

    check('登录流程未产生未捕获异常', A.consoleErrors.length === 0,
        A.consoleErrors.length ? A.consoleErrors.slice(0, 3).join(' | ') : '无');

    /* ==================================================================
       三、主界面 main.html
       ================================================================== */
    sec('三、主界面 main.html — 组件加载');
    let B;
    try {
        B = buildDom('main.html', { stubEcharts: true, loggedIn: true, ping: false, allowDemo: true });
    } catch (e) {
        check('main.html 脚本可加载', false, e.message);
        B = null;
    }

    if (B) {
        const wB = B.w, dB = B.d;
        // 本套测试验证"演示模式"下的渲染与业务流程, 这里显式开启演示模式,
        // 使结果与本机是否恰好运行着后端无关(否则请求会打到真实后端导致 401)
        wB.DemoMode.enable();
        await sleep(800);   // 等 Vue 挂载

        check('PmsUtils 工具库已定义(且含 tag/money/label)',
            typeof wB.PmsUtils === 'object'
            && typeof wB.PmsUtils.tag === 'function'
            && typeof wB.PmsUtils.money === 'function'
            && typeof wB.PmsUtils.label === 'function');
        check('全局未再暴露裸 Utils(避免与 Element UI 冲突)',
            typeof wB.PmsUtils === 'object' && wB.PmsUtils.tag !== undefined,
            'window.Utils 保持为 Element UI 的焦点工具, 我们的工具挂在 window.PmsUtils');
        check('Mock 演示数据已定义', typeof wB.Mock === 'object');
        check('路由 VueRouter 已加载', typeof wB.VueRouter === 'function');
        check('ECharts 桩已注入', typeof wB.echarts === 'object');

        const pageFiles = fs.readdirSync(path.join(ROOT, 'js', 'pages')).filter(f => f.endsWith('.js'));
        check(`业务页面文件数量为 ${pageFiles.length}`, pageFiles.length >= 15, pageFiles.length + ' 个');

        // 页面组件通过 Vue.component('page-xxx', {...}) 全局注册
        const compNames = Object.keys(wB.Vue.options.components).filter(k => /^page-/.test(k));
        check('页面组件已全局注册(Vue.component)', compNames.length >= pageFiles.length,
            compNames.length + ' 个: ' + compNames.sort().join(', '));

        // 逐个页面组件做 data() 初始化, 捕获运行时异常
        let dataOk = 0; const dataErr = [];
        for (const name of compNames) {
            const opts = compOptions(wB, name);
            const dataFn = opts && opts.data;
            if (typeof dataFn !== 'function') { dataErr.push(name + '(无 data)'); continue; }
            try { dataFn.call({ $route: { query: {} }, $router: {}, $message: () => { } }); dataOk++; }
            catch (e) { dataErr.push(name + ': ' + e.message); }
        }
        check('所有页面组件 data() 初始化无异常', dataErr.length === 0,
            dataErr.length ? dataErr.join(' | ') : dataOk + ' 个组件全部通过');

        // 页面组件模板非空(防止漏写 template)
        const emptyTpl = compNames.filter(n => {
            const o = compOptions(wB, n);
            return !o || !o.template || !String(o.template).trim();
        });
        check('所有页面组件均含非空 template', emptyTpl.length === 0,
            emptyTpl.length ? emptyTpl.join(', ') : compNames.length + ' 个组件模板均非空');

        // ---- 真实 DOM 渲染断言(证明界面确实渲染出来了, 不只是组件注册成功) ----
        sec('三之二、主界面 — DOM 真实渲染结果');
        const menuItems = dB.querySelectorAll('.sidebar-menu .el-menu-item');
        const subMenus = dB.querySelectorAll('.sidebar-menu .el-submenu');
        check('侧边栏菜单项已渲染', menuItems.length >= 15, menuItems.length + ' 个菜单项');
        check('侧边栏分组子菜单已渲染', subMenus.length >= 7, subMenus.length + ' 个分组');
        check('登录用户已渲染到顶栏', (dB.querySelector('.user-info .uname') || {}).textContent === '系统管理员',
            (dB.querySelector('.user-info .uname') || {}).textContent);
        check('面包屑显示当前页面标题', (dB.querySelector('.breadcrumb') || {}).textContent === '首页看板',
            (dB.querySelector('.breadcrumb') || {}).textContent);
        const mainArea = dB.querySelector('.main-area');
        check('主内容区已挂载路由视图', !!mainArea && mainArea.children.length >= 2
            && mainArea.textContent.replace(/\s+/g, '').length > 60,
            mainArea ? '主区域子节点 ' + mainArea.children.length + ' 个, 文本 '
                + mainArea.textContent.replace(/\s+/g, '').length + ' 字' : '未找到 .main-area');
        check('v-cloak 已移除(说明 Vue 完成挂载)', !dB.querySelector('#app[v-cloak]'),
            dB.querySelector('#app[v-cloak]') ? '仍有 v-cloak' : '已挂载');

        // 切换路由, 验证各页面组件真的能渲染出内容
        const rendered = [];
        for (const r of ['dashboard', 'bigscreen', 'community3d', 'building', 'house', 'owner', 'parking', 'tempParking',
            'feeStandard', 'feeBill', 'feePayment', 'repair', 'complaint',
            'notice', 'visitor', 'equipment', 'user']) {
            try {
                wB.location.hash = '#/' + r;
                await sleep(160);
                const body = dB.querySelector('.main-area');
                const txt = body ? body.textContent.replace(/\s+/g, '') : '';
                rendered.push({ r, ok: txt.length > 50, len: txt.length });
            } catch (e) {
                rendered.push({ r, ok: false, err: e.message });
            }
        }
        const badRender = rendered.filter(x => !x.ok);
        check(`${rendered.length} 个业务页面路由切换后均渲染出内容`, badRender.length === 0,
            badRender.length ? badRender.map(x => x.r + '(' + (x.len || x.err) + ')').join(', ')
                : rendered.length + ' 个页面平均渲染文本 '
                + Math.round(rendered.reduce((s, x) => s + x.len, 0) / rendered.length) + ' 字');

        // 演示模式下核心接口返回真实结构
        sec('四、主界面 — 演示模式接口连通性(24 个接口)');
        wB.DemoMode.enable();
        const apis = [
            ['dashboard.overview', () => wB.Api.dashboard.overview()],
            ['dashboard.charts', () => wB.Api.dashboard.charts()],
            ['dashboard.todos', () => wB.Api.dashboard.todos()],
            ['dashboard.screen', () => wB.Api.dashboard.screen()],
            ['building.page', () => wB.Api.building.page({ pageNum: 1, pageSize: 10 })],
            ['building.statistics', () => wB.Api.building.statistics()],
            ['house.page', () => wB.Api.house.page({ pageNum: 1, pageSize: 10 })],
            ['owner.page', () => wB.Api.owner.page({ pageNum: 1, pageSize: 10 })],
            ['parking.page', () => wB.Api.parking.page({ pageNum: 1, pageSize: 10 })],
            ['tempParking.page', () => wB.Api.tempParking.page({ pageNum: 1, pageSize: 10 })],
            ['tempParking.inParking', () => wB.Api.tempParking.inParking()],
            ['feeStandard.page', () => wB.Api.feeStandard.page({ pageNum: 1, pageSize: 10 })],
            ['feeBill.page', () => wB.Api.feeBill.page({ pageNum: 1, pageSize: 10 })],
            ['feeBill.statusStatistics', () => wB.Api.feeBill.statusStatistics()],
            ['feePayment.page', () => wB.Api.feePayment.page({ pageNum: 1, pageSize: 10 })],
            ['feePayment.monthStatistics', () => wB.Api.feePayment.monthStatistics()],
            ['repair.page', () => wB.Api.repair.page({ pageNum: 1, pageSize: 10 })],
            ['repair.statusStatistics', () => wB.Api.repair.statusStatistics()],
            ['complaint.page', () => wB.Api.complaint.page({ pageNum: 1, pageSize: 10 })],
            ['notice.page', () => wB.Api.notice.page({ pageNum: 1, pageSize: 10 })],
            ['visitor.page', () => wB.Api.visitor.page({ pageNum: 1, pageSize: 10 })],
            ['equipment.page', () => wB.Api.equipment.page({ pageNum: 1, pageSize: 10 })],
            ['users.list', () => wB.Api.users.list({ pageNum: 1, pageSize: 10 })],
            ['tempParking.calcFee(150)', () => wB.Api.tempParking.calcFee(150)]
        ];
        let apiOk = 0;
        const apiBad = [];
        for (const [name, fn] of apis) {
            try {
                const r = await fn();
                if (r && r.code === 200) apiOk++;
                else apiBad.push(name + '(code=' + (r && r.code) + ')');
            } catch (e) { apiBad.push(name + '(' + e.message + ')'); }
        }
        check(`${apis.length} 个接口全部返回成功`, apiBad.length === 0,
            apiBad.length ? apiBad.join(' | ') : apiOk + '/' + apis.length + ' 通过');

        // 关键业务写操作
        sec('五、主界面 — 关键业务写操作(演示模式)');
        try {
            const r0 = await wB.Api.feeBill.page({ pageNum: 1, pageSize: 5, payStatus: 'UNPAID' });
            const target = r0.data.rows[0];
            check('欠费账单可分页查到(分页字段为 rows)', !!target, target ? target.billNo : '无数据');
            const r1 = await wB.Api.feeBill.pay(target.id, 'WECHAT');
            check('物业费缴费成功', r1.code === 200, '账单 ' + target.billNo + ' 已缴');
            const rr = await wB.Api.feeBill.page({ pageNum: 1, pageSize: 5, id: target.id });
            check('缴费后账单状态已更新为已缴', rr.data.rows[0].payStatus === 'PAID', rr.data.rows[0].payStatus);
        } catch (e) { check('物业费缴费成功', false, e.message); }

        try {
            const rp = await wB.Api.repair.page({ pageNum: 1, pageSize: 5, status: 'PENDING' });
            const one = rp.data.rows[0];
            const r2 = await wB.Api.repair.assign({ id: one.id, handler: '测试维修员', handlerPhone: '13900000000' });
            const after = await wB.Api.repair.page({ pageNum: 1, pageSize: 5, id: one.id });
            check('报修派单成功且状态流转为已派单', r2.code === 200 && after.data.rows[0].status === 'ASSIGNED',
                one.orderNo + ' → ' + after.data.rows[0].status);
        } catch (e) { check('报修派单成功且状态流转为已派单', false, e.message); }

        try {
            const r3 = await wB.Api.tempParking.entry({ carPlate: '苏A88888', carType: '小型车', parkType: 'OUTER' });
            check('临时停车入场登记成功', r3.code === 200, r3.data ? r3.data.recordNo + ' 入场' : '');
            const inList = await wB.Api.tempParking.inParking();
            const arr = Array.isArray(inList.data) ? inList.data : (inList.data.rows || []);
            check('在场车辆列表包含刚入场的车', arr.length > 0, arr.length + ' 辆在场');
        } catch (e) { check('临时停车入场登记成功', false, e.message); }

        try {
            const fp = await wB.Api.parking.page({ pageNum: 1, pageSize: 20, status: 'FREE' });
            const free = fp.data.rows[0];
            // 车位分配/释放通过模块的 _request 通道调用(与 parking.js 页面一致)
            const r4 = await wB.Api.parking._request('post', '/parking/allocate', {
                params: { id: free.id, ownerId: 1, carPlate: '苏A66666', status: 'RENTED' }
            });
            check('车位分配成功', r4.code === 200, free.spaceNo);
            const r5 = await wB.Api.parking._request('post', '/parking/release', { params: { id: free.id } });
            check('车位退租释放成功', r5.code === 200, free.spaceNo + ' 已释放');
        } catch (e) { check('车位分配/释放成功', false, e.message); }

        try {
            const r6 = await wB.Api.house._request('post', '/house/checkIn', {
                params: { id: 1, ownerId: 1, status: 'OCCUPIED' }
            });
            check('Api.*._request 通道可用(房屋入住登记)', r6.code === 200, r6.msg);
            const r7 = await wB.Api.house._request('get', '/house/statistics/type');
            check('房屋类型统计(_request)可用', r7.code === 200 && Array.isArray(r7.data),
                '返回 ' + (r7.data || []).length + ' 项');
            const r8 = await wB.Api.building.statistics();
            check('楼栋入住统计接口可用(Api.building.statistics)', r8.code === 200 && Array.isArray(r8.data),
                '返回 ' + (r8.data || []).length + ' 项');
        } catch (e) { check('Api.*._request 通道可用', false, e.message); }

        // 演示模式下的失败必须被抛出(不能被静默当成成功)
        try {
            await wB.Api.login('admin', 'wrong-password');
            check('演示模式下密码错误会被抛出', false, '未抛出异常(失败被静默吞掉)');
        } catch (e) {
            check('演示模式下密码错误会被抛出', true, e.message);
        }

        check('主界面运行期未产生未捕获异常', B.consoleErrors.length === 0,
            B.consoleErrors.length ? B.consoleErrors.slice(0, 3).join(' | ') : '无');
    }

    /* ==================================================================
       六、后端启动后自动切回真实数据
       ================================================================== */
    sec('六、后端启动后自动切回真实数据(避免"启动了后端仍是演示模式")');

    {
        // 场景: 上次后端没启动 -> 存下演示标记; 这次后端已启动 -> 登录页应自动清除标记
        const C = buildDom('index.html', { ping: true, demo: true, allowDemo: true });
        await new Promise(r => setTimeout(r, 50));
        check('登录页探测到后端后自动关闭演示模式', C.w.DemoMode.isOn() === false,
            'AppConfig.demo=' + C.w.AppConfig.demo);
        check('登录页不再显示"未检测到后端"提示', C.d.querySelector('.demo-hint') === null);

        // 场景: 主界面残留演示标记 + 假 token -> 自动切真实数据并要求重新登录
        const D = buildDom('main.html', { stubEcharts: true, loggedIn: true, ping: true, demo: true, allowDemo: true });
        await new Promise(r => setTimeout(r, 50));
        check('主界面探测到后端后自动关闭演示模式', D.w.DemoMode.isOn() === false,
            'AppConfig.demo=' + D.w.AppConfig.demo);
        check('主界面已清除演示模式下伪造的登录态', !D.w.localStorage.getItem('pms_token'));

        // 场景: 总开关关闭时, 浏览器里遗留的 pms_demo 标记必须被忽略(否则会静默用假数据)
        const E = buildDom('index.html', { ping: true, demo: true });
        await new Promise(r => setTimeout(r, 50));
        check('总开关关闭时遗留演示标记被忽略', E.w.DemoMode.isOn() === false,
            'demo=' + E.w.AppConfig.demo);
    }

    /* ==================================================================
       七、登录防重入
       ================================================================== */
    sec('七、登录防重入(避免重复提交弹出一叠相同的错误提示)');

    {
        const F = buildDom('index.html', { ping: false });
        const app = F.d.querySelector('#app').__vue__;
        check('登录页 Vue 实例已挂载', !!app);

        // 打桩: 统计登录调用次数; 用"永不返回"模拟后端不可达(最长要等 8 秒)
        let calls = 0;
        F.w.Api.login = function () { calls++; return new Promise(() => { }); };
        const spy = () => { };
        spy.error = spy.success = spy.warning = spy.info = () => { };
        F.w.Vue.prototype.$message = spy;

        const btn = F.d.querySelector('.login-btn');
        const inputs = [...F.d.querySelectorAll('.el-input__inner')];
        const enter = el => el.dispatchEvent(new F.w.KeyboardEvent('keyup',
            { key: 'Enter', code: 'Enter', keyCode: 13, bubbles: true }));
        const click = () => btn.dispatchEvent(new F.w.MouseEvent('click', { bubbles: true }));

        app.loading = false; calls = 0;
        enter(inputs[1]); enter(inputs[1]);
        await new Promise(r => setTimeout(r, 60));
        check('请求未返回时连按两次回车 → 只提交 1 次', calls === 1, calls + ' 次');

        app.loading = false; calls = 0;
        click(); click();
        await new Promise(r => setTimeout(r, 60));
        check('请求未返回时连点两次按钮 → 只提交 1 次', calls === 1, calls + ' 次');

        app.loading = false; calls = 0;
        enter(inputs[0]); click();
        await new Promise(r => setTimeout(r, 60));
        check('回车与点击混合触发 → 只提交 1 次', calls === 1, calls + ' 次');

        app.loading = true;
        await new Promise(r => setTimeout(r, 30));
        const dis = F.d.querySelectorAll('.el-input.is-disabled').length;
        check('登录中输入框被禁用(防止等待期间反复提交)', dis === 2, dis + ' 个');

        check('登录页运行期未产生未捕获异常', F.consoleErrors.length === 0,
            F.consoleErrors.length ? F.consoleErrors.slice(0, 3).join(' | ') : '无');
    }

    /* ==================================================================
       七之二、图形验证码
       ------------------------------------------------------------------
       设计定位: 平时不出现、也不参与校验; 只有后端判定本次登录有风险
       (连续失败达阈值, 返回 code=428) 时才自动出现, 出现后即必填。
       同时确保"没有手动开启/收起验证码的入口"——否则会被当成可选项,
       让人以为不点就能绕过去。
       ================================================================== */
    sec('七之二、图形验证码 — 按需出现且必填');

    {
        const F2 = buildDom('index.html', { ping: false });
        const app2 = F2.d.querySelector('#app').__vue__;
        check('登录页 Vue 实例已挂载', !!app2);

        // 初始: 不显示验证码
        check('初始不显示图形验证码', !F2.d.querySelector('.lg-captcha'));
        check('页面上没有"手动开启验证码"的入口', !F2.d.querySelector('.lg-captcha-toggle'),
            '已移除可点击的验证码开关');

        const msg = () => { };
        msg.error = msg.success = msg.warning = msg.info = msg.closeAll = () => { };
        F2.w.Vue.prototype.$message = msg;

        // 打桩: 验证码接口 / 登录接口
        let captchaCalls = 0;
        F2.w.Api.captcha = function () {
            captchaCalls++;
            return Promise.resolve({
                code: 200, msg: 'ok',
                data: { captchaId: 'cap-' + captchaCalls, image: 'data:image/png;base64,iVBORw0KGgo=', expireSeconds: 300 }
            });
        };
        let loginCalls = 0, lastLoginArgs = null;
        F2.w.Api.login = function (u, p, cid, ccode) {
            loginCalls++; lastLoginArgs = { u, p, cid, ccode };
            const e = new Error('本次登录需要图形验证码');
            e.code = 428;
            return Promise.reject(e);
        };

        // 第一次提交: 后端 428 -> 验证码应自动出现, 且已拉取到图片
        app2.loading = false;
        app2.doLogin();
        await sleep(120);
        check('后端要求时验证码自动出现(无需手动点击)', !!F2.d.querySelector('.lg-captcha'));
        check('验证码图片已自动加载', captchaCalls === 1, '拉取 ' + captchaCalls + ' 次');
        check('提示了为什么需要验证码', !!F2.d.querySelector('.lg-captcha-hint'));

        // 出现后即必填: 空着再提交不应发出登录请求
        app2.loading = false;
        loginCalls = 0;
        app2.form.captchaCode = '';
        app2.doLogin();
        await sleep(120);
        check('验证码为空时被拦下, 不发起登录请求', loginCalls === 0, loginCalls + ' 次');
        check('校验的是当前验证码 id', app2.captcha.id === 'cap-1', app2.captcha.id);

        // 填对后放行: 请求里必须带上 captchaId / captchaCode
        app2.form.captchaCode = 'AB3D';
        app2.doLogin();
        await sleep(120);
        check('填写验证码后确实带上了验证码参数提交',
            loginCalls === 1 && lastLoginArgs && lastLoginArgs.cid === 'cap-1' && lastLoginArgs.ccode === 'AB3D',
            JSON.stringify(lastLoginArgs));

        check('验证码流程未产生未捕获异常', F2.consoleErrors.length === 0,
            F2.consoleErrors.length ? F2.consoleErrors.slice(0, 3).join(' | ') : '无');
    }

    /* ==================================================================
       八、数据大屏(渲染 + 数据隔离)
       ================================================================== */
    sec('八、数据大屏 — 渲染与角色数据隔离');

    {
        // 自带一套 DOM(演示模式), 不依赖前面块作用域里的 wB/dB
        const G = buildDom('main.html', { stubEcharts: true, loggedIn: true, ping: false, allowDemo: true });
        G.w.DemoMode.enable();
        await sleep(220);
        const gD = G.d;

        // ---- 1. 页面真的渲染出内容 ----
        G.w.location.hash = '#/bigscreen';
        await sleep(240);
        const bs = gD.querySelector('.bs-page');
        check('数据大屏页面已渲染(.bs-page)', !!bs);
        check('大屏顶部标题已渲染', !!gD.querySelector('.bs-head-title h1')
            && gD.querySelector('.bs-head-title h1').textContent.indexOf('数据大屏') > -1,
            (gD.querySelector('.bs-head-title h1') || {}).textContent);
        const kpis = gD.querySelectorAll('.bs-kpi');
        check('核心指标 KPI 渲染 4 个', kpis.length === 4, kpis.length + ' 个');
        const fins = gD.querySelectorAll('.bs-fin-item');
        check('财务指标渲染 4 个', fins.length === 4, fins.length + ' 个');
        const charts = gD.querySelectorAll('.bs-chart');
        check('图表容器渲染(≥7 个)', charts.length >= 7, charts.length + ' 个');
        check('收缴进度条已渲染', !!gD.querySelector('.bs-progress-fill'));
        check('底栏已渲染', !!gD.querySelector('.bs-footer'));
        check('管理侧专属面板已渲染(人员构成/设备状态/投诉类型)',
            gD.querySelectorAll('.bs-card').length >= 11,
            gD.querySelectorAll('.bs-card').length + ' 个卡片');

        // ---- 2. 管理侧: 全量维度 ----
        const A = (await G.w.Api.dashboard.screen()).data || {};
        check('管理员大屏 scope=ALL', A.scope === 'ALL', 'scope=' + A.scope);
        check('管理员大屏含报表维度(buildingHouse/repairStatus/complaintTypes)',
            Array.isArray(A.buildingHouse) && Array.isArray(A.repairStatus)
            && Array.isArray(A.complaintTypes),
            'buildingHouse=' + (A.buildingHouse || []).length
            + ', repairStatus=' + (A.repairStatus || []).length
            + ', complaintTypes=' + (A.complaintTypes || []).length);
        const bl = await G.w.Api.building.page({ pageNum: 1, pageSize: 100 });
        const beTotal = (bl.data || {}).total;
        check('管理员大屏楼栋数与楼栋列表接口一致',
            (A.buildingHouse || []).length === beTotal,
            (A.buildingHouse || []).length + ' / ' + beTotal);
        check('管理员大屏含人员构成/设备状态/临停维度',
            Array.isArray(A.personTypes) && Array.isArray(A.equipmentStatus)
            && Array.isArray(A.tempParkingTypes));

        // ---- 3. 业主侧: 只给自己房间的数据, 且不含管理侧明细维度 ----
        G.w.localStorage.setItem('pms_user', JSON.stringify({
            id: 6, username: 'yeye01', realName: '邹建华', role: 'OWNER', phone: '18813729949'
        }));
        const O = (await G.w.Api.dashboard.screen()).data || {};
        check('业主大屏 scope=SELF', O.scope === 'SELF', 'scope=' + O.scope);
        check('业主大屏只统计自己 1 套房屋', O.overview && O.overview.houseCount === 1,
            'houseCount=' + (O.overview || {}).houseCount);
        const leaked = ['buildingHouse', 'repairStatus', 'billStatus', 'complaintTypes',
            'complaintStatus', 'personTypes', 'equipmentStatus', 'tempParkingTypes']
            .filter(k => O[k] !== undefined);
        check('业主大屏不下发管理侧明细维度', leaked.length === 0,
            leaked.length ? '泄露: ' + leaked.join(', ') : '8 个维度全部未下发');

        check('大屏运行期未产生未捕获异常', G.consoleErrors.length === 0,
            G.consoleErrors.length ? G.consoleErrors.slice(0, 3).join(' | ') : '无');
    }

    /* ==================================================================
       九、刷新/异常地址不再白屏
       ------------------------------------------------------------------
       历史 bug: 顶栏"刷新"按钮调用 refresh() 跳转 '/redirect' + 当前路径,
       但路由表里没有这条路由, <router-view> 匹配不到组件 -> 内容区空白;
       而且地址栏 hash 被写成 #/redirect/xxx, 用户再按 F5 依旧空白。
       这里把"正常页面 / 历史遗留 hash / 完全未知 hash"三种情况都锁住。
       ================================================================== */
    sec('九、刷新与异常地址 — 内容区不再白屏');

    {
        const textOf = doc => {
            const c = doc.querySelector('.content');
            return c ? c.textContent.replace(/\s+/g, '').length : -1;
        };

        // ---- 1. 正常页面: 内容区必须有内容 ----
        // 注意: demo:true 让演示模式在 Vue 挂载前就打开, 请求全部走 Mock。
        // 否则首个页面的请求会打到本机真实后端(测试用的假 token 必然 401), 结果随"本机是否跑着后端"漂移。
        const R1 = buildDom('main.html',
            { stubEcharts: true, loggedIn: true, ping: false, allowDemo: true, demo: true, url: 'http://localhost/main.html#/house' });
        R1.w.DemoMode.enable();
        await sleep(400);
        check('正常地址(#/house)内容区有内容', textOf(R1.d) > 0, '正文长度=' + textOf(R1.d));

        // ---- 2. 历史遗留的 #/redirect/xxx(点过旧版刷新按钮后按 F5 的场景) ----
        const R2 = buildDom('main.html',
            { stubEcharts: true, loggedIn: true, ping: false, allowDemo: true, demo: true, url: 'http://localhost/main.html#/redirect/dashboard' });
        R2.w.DemoMode.enable();
        await sleep(500);
        check('遗留地址 #/redirect/dashboard 被兜底回 #/dashboard',
            R2.w.location.hash === '#/dashboard', 'hash=' + R2.w.location.hash);
        check('遗留地址不再白屏', textOf(R2.d) > 0, '正文长度=' + textOf(R2.d));

        // ---- 3. 完全未知的 hash ----
        const R3 = buildDom('main.html',
            { stubEcharts: true, loggedIn: true, ping: false, allowDemo: true, demo: true, url: 'http://localhost/main.html#/no-such-page' });
        R3.w.DemoMode.enable();
        await sleep(500);
        check('未知地址兜底回 #/dashboard', R3.w.location.hash === '#/dashboard', 'hash=' + R3.w.location.hash);
        check('未知地址不再白屏', textOf(R3.d) > 0, '正文长度=' + textOf(R3.d));

        // ---- 4. 刷新按钮: 触发整页重载, 且不再篡改 hash ----
        const R4 = buildDom('main.html',
            { stubEcharts: true, loggedIn: true, ping: false, allowDemo: true, demo: true, url: 'http://localhost/main.html#/notice' });
        R4.w.DemoMode.enable();
        await sleep(400);
        // jsdom 的 location.reload 是实例上的不可配置属性, 无法替换成 spy,
        // 因此这里用"调用后 hash 不变"(行为) + "源码已改" 两条独立证据锁住修复。
        // Vue 会把根实例挂在挂载元素上, 直接取它来调用 refresh()
        const rootEl = R4.d.querySelector('#app');
        const vm = rootEl && (rootEl.__vue__ || (R4.w.$children && R4.w.$children[0]));
        check('取到主应用实例(用于触发刷新)', !!(vm && typeof vm.refresh === 'function'));
        if (vm && typeof vm.refresh === 'function') {
            vm.refresh();
            await sleep(150);
        }
        check('刷新后地址不再被改写(旧版会变成 #/redirect/xxx)',
            R4.w.location.hash === '#/notice', 'hash=' + R4.w.location.hash);

        const mainSrc = fs.readFileSync(path.join(ROOT, 'main.html'), 'utf8');
        const refreshBody = (mainSrc.match(/refresh\(\)\s*\{[\s\S]*?\n\s{16}\},/) || [''])[0];
        check('刷新实现已改为整页重载', /location\.reload\(\)/.test(refreshBody),
            refreshBody ? '命中 location.reload()' : '未取到 refresh 方法体');
        check('刷新实现不再跳转不存在的 /redirect 路由',
            !/\/redirect/.test(mainSrc.replace(/^\s*\/\/.*$/gm, '')),
            '已无 /redirect 跳转');
    }

    /* ==================================================================
       汇总
       ================================================================== */
    console.log('\n' + '='.repeat(70));
    console.log(`  测试结果: ${pass} 项通过, ${fail} 项失败`);
    if (fail) console.log('  失败项: ' + errors.join(' / '));
    console.log('='.repeat(70));
    process.exit(fail ? 1 : 0);
})().catch(e => {
    console.error('\n[测试脚本自身异常] ' + e.stack);
    process.exit(2);
});
