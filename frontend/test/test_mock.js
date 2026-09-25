/**
 * 前端演示模式(Mock)自测脚本
 * 在 Node 中模拟浏览器 window 环境，加载 mock.js 并逐项验证接口返回。
 * 运行: node test_mock.js
 */
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const frontendDir = path.join(__dirname, '..');
const mockCode = fs.readFileSync(path.join(frontendDir, 'js', 'mock.js'), 'utf8');

// ---- 构造最小浏览器环境 ----
const sandbox = {
    window: {},
    console,
    setTimeout,
    clearTimeout,
    Date,
    Math,
    JSON,
    Object,
    Array,
    String,
    Number,
    Boolean,
    parseInt,
    parseFloat,
    isNaN,
    RegExp,
    Error,
    Promise
};
sandbox.window.window = sandbox.window;
vm.createContext(sandbox);

let pass = 0, fail = 0;
function check(name, cond, extra) {
    if (cond) { pass++; console.log('  [PASS] ' + name + (extra ? '  → ' + extra : '')); }
    else { fail++; console.log('  [FAIL] ' + name + (extra ? '  → ' + extra : '')); }
}

console.log('='.repeat(70));
console.log('  加载 mock.js ...');
console.log('='.repeat(70));

try {
    vm.runInContext(mockCode, sandbox, { filename: 'mock.js' });
} catch (e) {
    console.error('mock.js 执行失败:', e.message);
    process.exit(1);
}

const Mock = sandbox.window.Mock;
check('Mock 模块挂载到 window', !!Mock && typeof Mock.handle === 'function');

const DB = Mock.db;

// ==================== 数据生成校验 ====================
console.log('\n【1】演示数据生成');
const counts = {};
['building', 'house', 'owner', 'parking', 'feeStandard', 'feeBill', 'feePayment',
    'tempParking', 'repair', 'complaint', 'notice', 'visitor', 'equipment', 'user']
    .forEach(k => counts[k] = (DB[k] || []).length);
Object.keys(counts).forEach(k => console.log('    ' + k.padEnd(14) + ' ' + counts[k]));
check('楼栋数 = 6', counts.building === 6, counts.building);
check('房屋数 > 100', counts.house > 100, counts.house);
check('人员数 > 100', counts.owner > 100, counts.owner);
check('车位数 = 180', counts.parking === 180, counts.parking);
check('账单数 > 500', counts.feeBill > 500, counts.feeBill);
check('缴费记录 > 0', counts.feePayment > 0, counts.feePayment);
check('报修工单 = 40', counts.repair === 40, counts.repair);
check('投诉记录 = 20', counts.complaint === 20, counts.complaint);
check('公告 = 10', counts.notice === 10, counts.notice);

// 数据完整性
const houseOk = DB.house.every(h => h.houseNo && h.area > 0 && h.status);
check('房屋数据字段完整', houseOk);
const ownerOk = DB.owner.every(o => o.name && o.phone && o.personType);
check('人员数据字段完整', ownerOk);
const billOk = DB.feeBill.every(b => b.billNo && b.amount >= 0 && ['PAID', 'UNPAID', 'OVERDUE'].includes(b.payStatus));
check('账单数据字段完整', billOk);
const assigned = DB.parking.filter(p => p.status !== 'FREE');
check('车位分配数 > 90', assigned.length > 90, assigned.length);
check('已分配车位均绑定使用人', assigned.every(p => p.ownerId && p.carPlate));
const linkedHouse = DB.house.filter(h => h.ownerId);
check('房屋已关联住户', linkedHouse.length > 100, linkedHouse.length);

// ==================== 接口路由校验 ====================
console.log('\n【2】接口返回校验');
const cases = [
    ['POST', '/auth/login', { data: { username: 'admin', password: '123456' } }],
    ['POST', '/auth/login', { data: { username: 'admin', password: 'wrong' } }],
    ['GET', '/dashboard/overview', {}],
    ['GET', '/dashboard/charts', {}],
    ['GET', '/dashboard/todos', {}],
    ['GET', '/building/page', { params: { pageNum: 1, pageSize: 5 } }],
    ['GET', '/building/list', {}],
    ['GET', '/house/page', { params: { pageNum: 1, pageSize: 5, status: 'EMPTY' } }],
    ['GET', '/owner/page', { params: { pageNum: 2, pageSize: 10 } }],
    ['GET', '/owner/page', { params: { keyword: '1号楼', pageNum: 1, pageSize: 5 } }],
    ['GET', '/parking/page', { params: { spaceType: 'OUTSIDE', pageNum: 1, pageSize: 10 } }],
    ['GET', '/tempParking/page', { params: { pageNum: 1, pageSize: 10 } }],
    ['GET', '/tempParking/inParking', {}],
    ['GET', '/tempParking/calcFee', { params: { minutes: 125 } }],
    ['GET', '/feeStandard/list', {}],
    ['GET', '/feeBill/page', { params: { payStatus: 'UNPAID', pageNum: 1, pageSize: 10 } }],
    ['GET', '/feeBill/statistics/status', {}],
    ['GET', '/feePayment/page', { params: { pageNum: 1, pageSize: 5 } }],
    ['GET', '/repair/page', { params: { status: 'PENDING', pageNum: 1, pageSize: 10 } }],
    ['GET', '/repair/statistics/type', {}],
    ['GET', '/complaint/page', { params: { pageNum: 1, pageSize: 5 } }],
    ['GET', '/complaint/statistics/type', {}],
    ['GET', '/notice/page', { params: { pageNum: 1, pageSize: 10 } }],
    ['GET', '/visitor/page', { params: { status: 'IN', pageNum: 1, pageSize: 5 } }],
    ['GET', '/equipment/page', { params: { pageNum: 1, pageSize: 5 } }],
    ['GET', '/auth/users', {}],
    ['GET', '/building/statistics', {}],
    ['GET', '/house/statistics/type', {}]
];

(async () => {
    for (const [method, url, opts] of cases) {
        try {
            const res = await Mock.handle(method, url, opts);
            const okCode = res.code === 200 || (url === '/auth/login' && opts.data.password === 'wrong' && res.code === 500);
            check(method + ' ' + url + (opts.params ? ' ' + JSON.stringify(opts.params) : ''), okCode,
                'code=' + res.code + (res.data && res.data.total !== undefined ? ' total=' + res.data.total : ''));
        } catch (e) {
            check(method + ' ' + url, false, '异常: ' + e.message);
        }
    }

    // 登录失败场景应当返回错误
    const badLogin = await Mock.handle('post', '/auth/login', { data: { username: 'admin', password: 'wrong' } });
    check('错误密码登录被拒绝', badLogin.code === 500 && badLogin.msg === '密码错误', badLogin.msg);

    const goodLogin = await Mock.handle('post', '/auth/login', { data: { username: 'admin', password: '123456' } });
    check('正确密码登录成功并返回 token', goodLogin.code === 200 && !!goodLogin.data.token, goodLogin.data && goodLogin.data.token);

    // 分页正确性
    const p1 = await Mock.handle('get', '/house/page', { params: { pageNum: 1, pageSize: 10 } });
    const p2 = await Mock.handle('get', '/house/page', { params: { pageNum: 2, pageSize: 10 } });
    check('分页第1页返回10条', p1.data.rows.length === 10, p1.data.rows.length);
    check('分页第2页与第1页数据不同', p1.data.rows[0].id !== p2.data.rows[0].id);
    check('分页 total 一致', p1.data.total === p2.data.total, p1.data.total);

    // ==================== 业务流程校验 ====================
    console.log('\n【3】核心业务流程');

    // 3.1 停车费计费规则  30min内免费 | 超时首小时5元 | 每超1小时+3元 | 24h封顶30元
    // 说明: 超时不足1小时按1小时计, 故 150min = 超时120min = 2小时 = 5 + 3 = 8 元
    const rules = [[0, 0], [29, 0], [30, 0], [31, 5], [90, 5], [91, 8], [150, 8], [1440, 30], [2880, 60]];
    let ruleOk = true, ruleDetail = [];
    for (const [min, expect] of rules) {
        const r = await Mock.handle('get', '/tempParking/calcFee', { params: { minutes: min } });
        ruleDetail.push(min + 'min=' + r.data);
        if (Number(r.data) !== expect) { ruleOk = false; ruleDetail.push('(期望' + expect + ')'); }
    }
    check('临停计费规则正确(30分钟内免费/首小时5元/每小时+3元/日封顶30元)', ruleOk, ruleDetail.join(' '));

    // 3.2 车辆入场 → 重复入场拦截 → 出场结算
    const plate = '京A88888';
    const entry = await Mock.handle('post', '/tempParking/entry', { data: { carPlate: plate, parkType: 'OUTSIDE' } });
    check('车辆入场登记成功', entry.code === 200 && entry.data.carPlate === plate);
    const dup = await Mock.handle('post', '/tempParking/entry', { data: { carPlate: plate } });
    check('同一车辆重复入场被拦截', dup.code === 500 && dup.msg.includes('已在场'), dup.msg);
    const exitRes = await Mock.handle('post', '/tempParking/exit', { params: { id: entry.data.id, payMethod: 'WECHAT' } });
    check('车辆出场结算成功', exitRes.code === 200, exitRes.data && trim(exitRes.data.message));
    const exitAgain = await Mock.handle('post', '/tempParking/exit', { params: { id: entry.data.id } });
    check('重复出场结算被拦截', exitAgain.code === 500, exitAgain.msg);

    // 3.3 账单缴费
    const unpaid = DB.feeBill.find(b => b.payStatus === 'UNPAID');
    if (unpaid) {
        const payRes = await Mock.handle('post', '/feeBill/pay', { params: { id: unpaid.id, payMethod: 'ALIPAY' } });
        check('账单缴费成功', payRes.code === 200 && unpaid.payStatus === 'PAID', payRes.data && trim(payRes.data.message));
        check('缴费后生成缴费流水', DB.feePayment.some(p => p.billId === unpaid.id));
        const payAgain = await Mock.handle('post', '/feeBill/pay', { params: { id: unpaid.id } });
        check('已缴账单重复缴费被拦截', payAgain.code === 500, payAgain.msg);
        const cancel = await Mock.handle('post', '/feeBill/cancelPay', { params: { id: unpaid.id } });
        check('撤销缴费成功并恢复未缴状态', cancel.code === 200 && unpaid.payStatus === 'UNPAID');
    }

    // 3.4 车位分配 → 重复分配拦截 → 退租
    const freeSpace = DB.parking.find(p => p.status === 'FREE');
    if (freeSpace) {
        const owner = DB.owner.find(o => o.personType !== 'FAMILY');
        const alloc = await Mock.handle('post', '/parking/allocate', {
            params: { id: freeSpace.id, ownerId: owner.id, carPlate: '京B00001', status: 'RENTED', startDate: '2026-09-16', endDate: '2027-09-15' }
        });
        check('车位分配成功', alloc.code === 200 && freeSpace.status === 'RENTED', freeSpace.spaceNo + '→' + freeSpace.ownerName);
        const allocAgain = await Mock.handle('post', '/parking/allocate', { params: { id: freeSpace.id, ownerId: owner.id } });
        check('已占用车位重复分配被拦截', allocAgain.code === 500, allocAgain.msg);
        const rel = await Mock.handle('post', '/parking/release', { params: { id: freeSpace.id } });
        check('车位退租成功并清空绑定', rel.code === 200 && freeSpace.status === 'FREE' && !freeSpace.ownerId);
    }

    // 3.5 报修工单流转
    const pendingRepair = DB.repair.find(r => r.status === 'PENDING');
    if (pendingRepair) {
        const before = pendingRepair.status;
        const asg = await Mock.handle('post', '/repair/assign', { params: { id: pendingRepair.id, handler: '刘海涛', handlerPhone: '13900001001' } });
        check('报修派单成功', asg.code === 200 && pendingRepair.status === 'ASSIGNED', before + '→' + pendingRepair.status);
        const st = await Mock.handle('post', '/repair/start', { params: { id: pendingRepair.id } });
        check('工单开始处理', st.code === 200 && pendingRepair.status === 'PROCESSING');
        const fin = await Mock.handle('post', '/repair/finish', { params: { id: pendingRepair.id, cost: 80, remark: '已更换配件' } });
        check('工单完工', fin.code === 200 && pendingRepair.status === 'FINISHED' && pendingRepair.cost === 80);
        const rate = await Mock.handle('post', '/repair/rate', { params: { id: pendingRepair.id, rating: 5, feedback: '很满意' } });
        check('业主评价并关闭工单', rate.code === 200 && pendingRepair.status === 'CLOSED' && pendingRepair.rating === 5);
        const badRate = await Mock.handle('post', '/repair/rate', { params: { id: pendingRepair.id, rating: 9 } });
        check('非法评分被拦截', badRate.code === 500, badRate.msg);
    }

    // 3.6 投诉处理
    const pendingComplaint = DB.complaint.find(c => c.status === 'PENDING');
    if (pendingComplaint) {
        const rep = await Mock.handle('post', '/complaint/reply', { params: { id: pendingComplaint.id, reply: '已核实处理', resolved: 'true' } });
        check('投诉处理回复成功', rep.code === 200 && pendingComplaint.status === 'RESOLVED', pendingComplaint.status);
    }

    // 3.7 账单批量生成
    const gen = await Mock.handle('post', '/feeBill/generate/property', { params: { period: '2026-10' } });
    check('批量生成物业费账单接口可用', gen.code === 200 && gen.data.message, gen.data && gen.data.message);

    // 3.8 访客离开
    const inVisitor = DB.visitor.find(v => v.status === 'IN');
    if (inVisitor) {
        const lv = await Mock.handle('post', '/visitor/leave', { params: { id: inVisitor.id } });
        check('访客离开登记成功', lv.code === 200 && inVisitor.status === 'OUT', lv.data && lv.data.message);
    }

    // 3.9 关联校验
    const delBuilding = await Mock.handle('delete', '/building/1', {});
    check('有房屋的楼栋禁止删除', delBuilding.code === 500, delBuilding.msg);
    const delAdmin = await Mock.handle('delete', '/auth/users/1', {});
    check('超级管理员账号禁止删除', delAdmin.code === 500, delAdmin.msg);

    // 3.10 新增/修改/删除
    const addB = await Mock.handle('post', '/building', { data: { buildingNo: '7号楼', name: '测试楼', unitCount: 1, floorCount: 6, buildingType: '住宅' } });
    check('新增楼栋成功', addB.code === 200 && DB.building.some(b => b.buildingNo === '7号楼'));
    const newB = DB.building.find(b => b.buildingNo === '7号楼');
    const updB = await Mock.handle('put', '/building', { data: { id: newB.id, manager: '测试管家' } });
    check('修改楼栋成功', updB.code === 200 && newB.manager === '测试管家');
    const delB = await Mock.handle('delete', '/building/' + newB.id, {});
    check('删除楼栋成功', delB.code === 200 && !DB.building.some(b => b.buildingNo === '7号楼'));

    // ==================== 概览数据一致性 ====================
    console.log('\n【4】看板数据一致性');
    const ov = (await Mock.handle('get', '/dashboard/overview', {})).data;
    const realOccupied = DB.house.filter(h => h.status === 'OCCUPIED' || h.status === 'RENTED').length;
    check('入住数与房屋数据一致', ov.occupiedCount === realOccupied, ov.occupiedCount + '/' + realOccupied);
    const realParkingUsed = DB.parking.filter(p => p.status !== 'FREE').length;
    check('车位使用数与数据一致', ov.parkingUsed === realParkingUsed, ov.parkingUsed + '/' + realParkingUsed);
    check('入住率为百分比字符串', /%$/.test(ov.occupancyRate), ov.occupancyRate);
    check('欠费金额 > 0', ov.unpaidAmount > 0, ov.unpaidAmount);
    check('报修待办数已统计', ov.repairUnfinished >= 0, ov.repairUnfinished);

    const todos = (await Mock.handle('get', '/dashboard/todos', {})).data;
    check('待办提醒返回列表', Array.isArray(todos) && todos.length > 0, todos.length + ' 项');
    const charts = (await Mock.handle('get', '/dashboard/charts', {})).data;
    check('图表数据: 收费趋势非空', (charts.feeTrend || []).length > 0);
    check('图表数据: 房屋状态非空', (charts.houseStatus || []).length > 0);
    check('图表数据: 报修类型非空', (charts.repairTypes || []).length > 0);
    check('图表数据: 车位类型非空', (charts.parkingTypes || []).length > 0);

    function trim(s) { return s ? String(s).substring(0, 60) + '...' : ''; }

    // ==================== 汇总 ====================
    console.log('\n' + '='.repeat(70));
    console.log('  测试结果: ' + pass + ' 项通过, ' + fail + ' 项失败');
    console.log('='.repeat(70));
    process.exit(fail > 0 ? 1 : 0);
})();
