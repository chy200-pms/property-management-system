/**
 * 前端 <-> 真实后端 联调测试 (jsdom + axios XHR 真实发请求)
 * ---------------------------------------------------------------
 * 前提: 后端已启动 (http://localhost:8080), 数据库已导入演示数据。
 *
 * 与 test_render.js (演示模式) 的区别:
 *   本测试强制关闭演示模式, 让前端真实的 api.js/axios 层直接请求
 *   正在运行的 SpringBoot 后端, 验证整条链路:
 *     前端 Api 封装 -> axios -> 跨域 -> 登录拦截器 -> MyBatis -> MySQL
 *
 * 运行: NODE_PATH=<jsdom 所在目录> node test_real_backend.js
 */
const fs = require('fs');
const path = require('path');
const { JSDOM, VirtualConsole } = require('jsdom');

const ROOT = path.join(__dirname, '..');
const BACKEND = 'http://localhost:8080/api';
let pass = 0, fail = 0;
const errors = [];

function sec(t) { console.log('\n' + '='.repeat(70) + '\n  ' + t + '\n' + '='.repeat(70)); }
function check(name, ok, extra) {
    if (ok) { pass++; console.log('  [PASS] ' + name + (extra !== undefined ? '  → ' + extra : '')); }
    else { fail++; errors.push(name); console.log('  [FAIL] ' + name + (extra !== undefined ? '  → ' + extra : '')); }
}

/** 绕过前端封装、直接问后端要一份对照数据 (Node 原生 fetch) */
async function direct(path_, token) {
    const r = await fetch(BACKEND + path_, { headers: token ? { Authorization: token } : {} });
    return r.json();
}

async function main() {
    // ---------- 搭一个只含必要脚本的 jsdom ----------
    const files = ['libs/axios.min.js', 'js/config.js', 'js/mock.js', 'js/api.js'];
    const scripts = files.map(f => {
        const code = fs.readFileSync(path.join(ROOT, f), 'utf8').replace(/<\/script/gi, '<\\/script');
        return '<script>\n' + code + '\n<\/script>';
    }).join('\n');
    const html = '<!DOCTYPE html><html><head>' + scripts + '</head><body></body></html>';

    const vc = new VirtualConsole();
    const consoleErrors = [];
    vc.on('jsdomError', e => { if (!/Not implemented/.test(e.message)) consoleErrors.push(e.message); });
    vc.on('error', (...a) => consoleErrors.push(a.join(' ')));

    const dom = new JSDOM(html, {
        url: 'http://localhost/',   // 与后端不同源, 验证跨域放行是否生效
        runScripts: 'dangerously',
        pretendToBeVisual: true,
        virtualConsole: vc
    });
    const w = dom.window;
    w.alert = () => { };

    sec('一、环境与演示模式开关');
    check('演示模式默认关闭', w.DemoMode.isOn() === false);
    check('baseURL 指向真实后端', w.AppConfig.baseURL === 'http://localhost:8080/api', w.AppConfig.baseURL);
    const online = await w.Api.ping();
    check('后端在线 (Api.ping)', online === true);

    sec('二、登录 (走真实后端)');
    let loginBody;
    try {
        loginBody = await w.Api.login('admin', '123456');
        check('登录成功', loginBody.code === 200, loginBody.msg);
    } catch (e) {
        check('登录成功', false, e.message);
        throw e;
    }
    // 模拟登录页的处理: index.html 登录成功后由页面负责写入 token/user
    w.localStorage.setItem('pms_token', loginBody.data.token);
    w.localStorage.setItem('pms_user', JSON.stringify(loginBody.data.user));
    const token = w.localStorage.getItem('pms_token');
    check('token 已写入 localStorage', !!token, (token || '').slice(0, 8) + '...');
    check('登录后未悄悄降级到演示模式', w.DemoMode.isOn() === false);
    try {
        await w.Api.login('admin', 'wrong-password');
        check('错误密码被真实后端拒绝', false, '竟然登录成功了');
    } catch (e) {
        check('错误密码被真实后端拒绝', /密码错误/.test(e.message), e.message);
    }

    sec('三、前端 Api 层读真实数据 (与直连后端逐一对照)');
    const pairs = [
        ['楼栋分页', () => w.Api.building.page({ pageNum: 1, pageSize: 5 }), '/building/page?pageNum=1&pageSize=5'],
        ['房屋分页', () => w.Api.house.page({ pageNum: 1, pageSize: 5 }), '/house/page?pageNum=1&pageSize=5'],
        ['人员分页', () => w.Api.owner.page({ pageNum: 1, pageSize: 5 }), '/owner/page?pageNum=1&pageSize=5'],
        ['账单分页', () => w.Api.feeBill.page({ pageNum: 1, pageSize: 5 }), '/feeBill/page?pageNum=1&pageSize=5'],
        ['看板 overview', () => w.Api.dashboard.overview(), '/dashboard/overview'],
        ['楼栋统计', () => w.Api.building.statistics(), '/building/statistics'],
        ['通知列表', () => w.Api.notice.list(), '/notice/list']
    ];
    for (const [name, viaApi, directPath] of pairs) {
        const [a, b] = await Promise.all([viaApi(), direct(directPath, token)]);
        const same = JSON.stringify(a.data) === JSON.stringify(b.data);
        const total = a.data && a.data.total !== undefined ? 'total=' + a.data.total
            : Array.isArray(a.data) ? 'rows=' + a.data.length : 'keys=' + Object.keys(a.data || {}).length;
        check(name + ' 前端拿到与后端一致的数据', a.code === 200 && same, total);
    }
    const ov = (await w.Api.dashboard.overview()).data;
    check('看板数值真实 (房屋138/人员217/车位180)',
        ov.houseCount === 138 && ov.ownerTotal === 217 && ov.parkingTotal === 180,
        '房屋' + ov.houseCount + ' 人员' + ov.ownerTotal + ' 车位' + ov.parkingTotal);

    sec('四、通过前端 Api 层做一次受控写操作 (新增->修改->删除)');
    await w.Api.building.add({ buildingNo: 'E2E-WEB', name: '前端联调测试楼', unitCount: 1, floorCount: 1, houseCount: 1 });
    let page = (await w.Api.building.page({ pageNum: 1, pageSize: 5, keyword: 'E2E-WEB' })).data;
    check('前端新增楼栋成功且可查到', page.total === 1, 'id=' + (page.rows[0] || {}).id);
    const newId = page.rows[0].id;
    // 用直连通道再确认: 这不是 Mock 变出来的, 数据库里真的有
    const confirmB = await direct('/building/page?pageNum=1&pageSize=5&keyword=E2E-WEB', token);
    check('直连后端确认数据已落库', confirmB.data.total === 1);
    await w.Api.building.update({ id: newId, manager: '联调管家' });
    const detail = (await w.Api.building.detail(newId)).data;
    check('前端修改已生效', detail.manager === '联调管家', detail.manager);
    await w.Api.building.remove(newId);
    try {
        await w.Api.building.detail(newId);
        check('前端删除后详情返回业务异常', false, '仍能查到');
    } catch (e) {
        check('前端删除后详情返回业务异常', /不存在/.test(e.message), e.message);
    }
    const afterB = await direct('/building/page?pageNum=1&pageSize=5', token);
    check('删除后楼栋总数恢复为 6', afterB.data.total === 6, 'total=' + afterB.data.total);
    try {
        await w.Api.building.add({ buildingNo: '1号楼', name: '重复' });
        check('重复编号被真实后端拦截', false, '竟然成功了');
    } catch (e) {
        check('重复编号被真实后端拦截', /已存在/.test(e.message), e.message);
    }

    sec('五、登出');
    const logoutBody = await w.Api.logout();
    check('登出成功', logoutBody.code === 200, logoutBody.msg);
    // 页面(main.html)登出后负责清理本地登录态, 这里模拟同样的动作
    w.localStorage.removeItem('pms_token');
    w.localStorage.removeItem('pms_user');
    check('登出后 localStorage token 已清除', !w.localStorage.getItem('pms_token'));
    const gone = await direct('/auth/current', token);
    check('旧 token 在后端已失效', gone.code === 401, gone.msg);
    check('全程无未捕获 JS 异常', consoleErrors.length === 0, consoleErrors.length + ' 处');
    check('全程未触发演示模式降级', w.DemoMode.isOn() === false);

    console.log('\n' + '='.repeat(70));
    console.log('  通过 ' + pass + ' 项, 失败 ' + fail + ' 项');
    if (fail) { console.log('  失败明细: ' + errors.join(' | ')); process.exit(1); }
    console.log('  >>> 前端 <-> 真实后端联调全部通过。');
    process.exit(0);
}

main().catch(e => { console.error('\n测试中断: ' + (e && e.message)); process.exit(1); });
