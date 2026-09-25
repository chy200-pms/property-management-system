# -*- coding: utf-8 -*-
"""
端到端联调检查(需要后端已启动 + 数据库已导入)
================================================================================
非破坏性: 不会删除或修改演示数据。新增/修改/删除只作用于本次自己创建的测试记录。

检查内容:
  1. 登录、错误密码、无 token / 伪造 token 是否被拦截
  2. 列表接口返回条数、分页结构 是否与数据库实际数据一致
  3. 遍历全部接口, 区分  成功 / 业务校验拦截 / 系统异常(SQL问题) / 404
  4. 受控 CRUD 全流程: 新增 -> 查询 -> 修改 -> 删除
  5. 各筛选条件是否可用(参数绑定是否正确)
  6. 登出后 token 失效、重新登录可用

用法:
    python check-e2e.py                      # 默认 http://localhost:8080/api
    python check-e2e.py http://host:port/api
"""
import json
import os
import re
import sys
import urllib.error
import urllib.parse
import urllib.request

BASE = sys.argv[1] if len(sys.argv) > 1 else 'http://localhost:8080/api'
HERE = os.path.dirname(os.path.abspath(__file__))
CTRL = os.path.join(HERE, 'backend', 'src', 'main', 'java', 'com', 'property', 'controller')

USERNAME, PASSWORD = 'admin', '123456'
TOKEN = None

# 各表在数据库中的实际行数(与 generate_sql.py 生成的一致)
DB_ROWS = [
    ('/building/page', 6, '楼栋'), ('/house/page', 138, '房屋'), ('/owner/page', 217, '人员'),
    ('/parking/page', 180, '车位'), ('/feeStandard/page', 8, '收费标准'),
    ('/feeBill/page', 820, '物业费账单'), ('/feePayment/page', 618, '缴费记录'),
    ('/tempParking/page', 96, '临时停车'), ('/repair/page', 40, '报修工单'),
    ('/complaint/page', 20, '投诉建议'), ('/notice/page', 10, '通知公告'),
    ('/visitor/page', 45, '访客登记'), ('/equipment/page', 25, '设备设施'),
]

# 会注销 token, 必须放最后单独测
SKIP_IN_SWEEP = {'/auth/login', '/auth/logout'}
# 会写数据, 不在遍历里盲调(用受控 CRUD 流程单独测)
WRITE_VERBS = {'POST', 'PUT', 'DELETE'}


def call(method, path, token=None, body=None):
    url = BASE + path
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Content-Type', 'application/json;charset=UTF-8')
    if token:
        req.add_header('Authorization', token)
    try:
        with urllib.request.urlopen(req, timeout=20) as r:
            txt = r.read().decode('utf-8', 'replace')
            try:
                return r.status, json.loads(txt), txt
            except Exception:
                return r.status, None, txt
    except urllib.error.HTTPError as e:
        txt = e.read().decode('utf-8', 'replace')
        try:
            return e.code, json.loads(txt), txt
        except Exception:
            return e.code, None, txt
    except Exception as e:
        return 0, None, str(e)


def code_of(resp):
    return (resp or {}).get('code')


def msg_of(resp):
    return str((resp or {}).get('msg') or '')


def collect_endpoints():
    eps = []
    for f in sorted(os.listdir(CTRL)):
        if not f.endswith('.java'):
            continue
        src = open(os.path.join(CTRL, f), encoding='utf-8').read()
        m = re.search(r'@RequestMapping\("([^"]+)"\)', src)
        prefix = m.group(1) if m else ''
        for mm in re.finditer(r'@(Get|Post|Put|Delete)Mapping(?:\("([^"]*)"\))?', src):
            eps.append((mm.group(1).upper(), (prefix + (mm.group(2) or '')) or '/'))
    return eps


def banner(t):
    print('\n' + '=' * 78 + '\n  ' + t + '\n' + '=' * 78)


FAILS = []


def expect(name, ok, extra=''):
    print('  %s %s%s' % ('[PASS]' if ok else '[FAIL]', name, ('  → ' + str(extra)) if extra else ''))
    if not ok:
        FAILS.append(name)


# ============================================================ 1. 登录
banner('一、登录与鉴权')
st, body, raw = call('POST', '/auth/login', body={'username': USERNAME, 'password': PASSWORD})
if code_of(body) != 200:
    print('\n[致命] 登录失败, 无法继续: HTTP %s  %s' % (st, raw[:300]))
    sys.exit(1)
TOKEN = body['data']['token']
u = body['data']['user']
print('  账号 %s / 角色 %s / token %s...' % (u['username'], u['role'], TOKEN[:12]))
expect('登录成功', True, u.get('realName'))
expect('返回体不含密码字段', 'password' not in u)
_, b, _ = call('POST', '/auth/login', body={'username': USERNAME, 'password': 'wrong'})
expect('错误密码被拒绝', code_of(b) != 200, msg_of(b))
_, b, _ = call('POST', '/auth/login', body={'username': 'no-such', 'password': 'x'})
expect('不存在账号被拒绝', code_of(b) != 200, msg_of(b))
_, b, _ = call('GET', '/dashboard/overview')
expect('无 token 被拦截', code_of(b) in (401, 403), msg_of(b))
_, b, _ = call('GET', '/dashboard/overview', token='bad-token')
expect('伪造 token 被拦截', code_of(b) in (401, 403), msg_of(b))
_, b, _ = call('GET', '/dashboard/overview', token=TOKEN)
expect('有效 token 可用', code_of(b) == 200)

# ============================================================ 2. 列表条数与分页结构
banner('二、列表接口条数 / 分页结构 (对照数据库真实行数)')
bad = 0
for path, exp, name in DB_ROWS:
    _, b, _ = call('GET', path + '?pageNum=1&pageSize=5', token=TOKEN)
    d = (b or {}).get('data') or {}
    total, rows = d.get('total'), d.get('rows')
    ok = total == exp and isinstance(rows, list) and len(rows) == min(5, exp)
    if not ok:
        bad += 1
    print('  %s%-10s total=%-5s rows=%-3s  (数据库 %d 行)' % (
        'OK ' if ok else '!! ', name, total,
        len(rows) if isinstance(rows, list) else '非数组', exp))
expect('13 张表的列表条数均与数据库一致', bad == 0, '%d 处不符' % bad if bad else '全部一致')

_, b, _ = call('GET', '/owner/page?pageNum=2&pageSize=10', token=TOKEN)
d = (b or {}).get('data') or {}
need = {'total', 'rows', 'pageNum', 'pageSize'}
expect('分页字段为前端所需的 total/rows/pageNum/pageSize',
       need <= set(d.keys()), sorted(d.keys()))
expect('分页第 2 页返回正确条数', len(d.get('rows') or []) == 10, '%d 条' % len(d.get('rows') or []))
_, b, _ = call('GET', '/owner/page?pageNum=1&pageSize=9999', token=TOKEN)
expect('pageSize 超限被收敛(<=500)', len(((b or {}).get('data') or {}).get('rows') or []) <= 500,
       '%d 条' % len(((b or {}).get('data') or {}).get('rows') or []))

# ============================================================ 3. 遍历接口
banner('三、遍历全部接口 (只对查询类发真实请求, 写操作走受控流程)')
eps = collect_endpoints()
ok_l, biz_l, err_l, nf_l, skip_l = [], [], [], [], []
for verb, path in eps:
    if path in SKIP_IN_SWEEP or verb in WRITE_VERBS:
        skip_l.append((verb, path))
        continue
    probe = re.sub(r'\{[^}]+\}', '1', path)
    st, b, raw = call(verb, probe, token=TOKEN)
    if st == 404:
        nf_l.append((verb, probe))
        print('  [404 ] %-6s %-42s' % (verb, probe))
        continue
    c, m = code_of(b), msg_of(b)
    if c == 200:
        ok_l.append((verb, probe))
    elif m.startswith('系统异常'):
        err_l.append((verb, probe, m))
        print('  [ERR ] %-6s %-42s %s' % (verb, probe, m[:60]))
    else:
        biz_l.append((verb, probe, m))
print('-' * 78)
print('  成功 %d   业务拦截 %d   系统异常 %d   404 %d   (写操作 %d 个走受控流程)'
      % (len(ok_l), len(biz_l), len(err_l), len(nf_l), len(skip_l)))
if err_l:
    print('\n  系统异常明细:')
    for v, p, m in err_l:
        print('    %-6s %-42s %s' % (v, p, m[:70]))
expect('查询类接口无系统异常(无 SQL 问题)', len(err_l) == 0, '%d 处' % len(err_l))
expect('无未注册路由(404)', len(nf_l) == 0, '%d 处' % len(nf_l))

# ============================================================ 4. 受控 CRUD
banner('四、受控 CRUD 全流程 (新增 → 查询 → 修改 → 删除, 只动自建数据)')
new_id = None
_, b, _ = call('POST', '/building', token=TOKEN,
               body={'buildingNo': 'E2E-T1', 'name': '端到端测试楼', 'unitCount': 1,
                     'floorCount': 2, 'houseCount': 4, 'buildingType': '住宅',
                     'buildYear': 2026, 'totalArea': 100, 'manager': '测试管家',
                     'managerPhone': '13900000000'})
expect('新增楼栋', code_of(b) == 200, msg_of(b))
_, b, _ = call('GET', '/building/page?pageNum=1&pageSize=5&keyword=E2E-T1', token=TOKEN)
rows = ((b or {}).get('data') or {}).get('rows') or []
if rows:
    new_id = rows[0]['id']
expect('新增后可按关键字查到', new_id is not None, 'id=%s' % new_id)
if new_id:
    _, b, _ = call('PUT', '/building', token=TOKEN,
                   body={'id': new_id, 'name': '端到端测试楼(已改名)', 'manager': '新管家'})
    expect('修改楼栋', code_of(b) == 200, msg_of(b))
    _, b, _ = call('GET', '/building/%s' % new_id, token=TOKEN)
    expect('修改已生效', ((b or {}).get('data') or {}).get('name') == '端到端测试楼(已改名)',
           ((b or {}).get('data') or {}).get('name'))
    _, b, _ = call('DELETE', '/building/%s' % new_id, token=TOKEN)
    expect('删除楼栋', code_of(b) == 200, msg_of(b))
    _, b, _ = call('GET', '/building/%s' % new_id, token=TOKEN)
    expect('删除后查不到', code_of(b) != 200, msg_of(b))
    _, b, _ = call('GET', '/building/page?pageNum=1&pageSize=5', token=TOKEN)
    expect('删除后总数回到 6', ((b or {}).get('data') or {}).get('total') == 6,
           ((b or {}).get('data') or {}).get('total'))

# 业务规则拦截
_, b, _ = call('POST', '/building', token=TOKEN, body={'buildingNo': '1号楼', 'name': '重复编号'})
expect('重复楼栋编号被拦截', code_of(b) != 200, msg_of(b))
_, b, _ = call('POST', '/parking/release', token=TOKEN)
expect('未指定车位释放被拦截(参数校验)', code_of(b) == 400 or '参数' in msg_of(b), msg_of(b))

# ============================================================ 5. 筛选条件
banner('五、各模块筛选条件 (验证 Mapper 参数绑定)')
FILTERS = [
    ('楼栋', '/building/page?buildingType=住宅', 5),
    ('楼栋关键字', '/building/page?keyword=1号楼', None),
    ('房屋', '/house/page?status=OCCUPIED', None),
    ('房屋户型', '/house/page?houseType=三室两厅', None),
    ('人员', '/owner/page?personType=OWNER', None),
    ('车位', '/parking/page?status=RENTED', None),
    ('车位类型', '/parking/page?spaceType=UNDERGROUND', None),
    ('收费标准', '/feeStandard/page?feeType=PROPERTY', None),
    ('账单状态', '/feeBill/page?payStatus=UNPAID', None),
    ('账单类型', '/feeBill/page?feeType=PARKING', None),
    ('账单月份', '/feeBill/page?period=2026-09', None),
    ('缴费方式', '/feePayment/page?payMethod=WECHAT', None),
    ('临停区域', '/tempParking/page?parkType=OUTSIDE', None),
    ('临停状态', '/tempParking/page?payStatus=PAID', None),
    ('报修状态', '/repair/page?status=PENDING', None),
    ('报修紧急度', '/repair/page?urgency=URGENT', None),
    ('报修类型', '/repair/page?repairType=WATER_ELEC', None),
    ('投诉类型', '/complaint/page?complaintType=NOISE', None),
    ('投诉状态', '/complaint/page?status=PENDING', None),
    ('公告类型', '/notice/page?noticeType=URGENT', None),
    ('访客状态', '/visitor/page?status=IN', None),
    ('访客事由', '/visitor/page?visitReason=拜访亲友', None),
    ('设备类型', '/equipment/page?equipmentType=ELEVATOR', None),
    ('设备状态', '/equipment/page?status=NORMAL', None),
    ('设备位置', '/equipment/page?location=1号楼', None),
]
f_bad = 0
for name, url, exp in FILTERS:
    # 中文查询参数需 URL 编码, 否则 urllib 直接抛 UnicodeEncodeError
    url = urllib.parse.quote(url, safe=':/?&=%')
    _, b, _ = call('GET', url + '&pageNum=1&pageSize=5' if '?' in url else url, token=TOKEN)
    c, m = code_of(b), msg_of(b)
    total = ((b or {}).get('data') or {}).get('total')
    ok = c == 200 and (exp is None or total == exp)
    if not ok:
        f_bad += 1
    print('  %s%-12s %-46s total=%s' % ('OK ' if ok else '!! ', name, url.split('?')[1][:44], total))
expect('全部筛选条件可用(参数绑定正确)', f_bad == 0, '%d 处异常' % f_bad if f_bad else '%d 个筛选' % len(FILTERS))

# ============================================================ 6. 统计接口
banner('六、统计与看板接口')
STATS = ['/dashboard/overview', '/dashboard/charts', '/dashboard/todos',
         '/building/statistics', '/house/statistics/status', '/house/statistics/type',
         '/owner/statistics', '/parking/statistics', '/tempParking/statistics',
         '/feeBill/statistics/status', '/feeBill/statistics/type', '/feeBill/statistics/period',
         '/feeBill/statistics/unpaid', '/feePayment/statistics/month',
         '/feePayment/statistics/method', '/feePayment/statistics/today',
         '/repair/statistics/status', '/repair/statistics/type', '/repair/statistics/rating',
         '/complaint/statistics/status', '/complaint/statistics/type']
s_bad = 0
for p in STATS:
    _, b, _ = call('GET', p, token=TOKEN)
    c = code_of(b)
    d = (b or {}).get('data')
    n = len(d) if isinstance(d, (list, dict)) else '-'
    ok = c == 200 and d is not None
    if not ok:
        s_bad += 1
    print('  %s%-34s code=%-4s 数据项=%s' % ('OK ' if ok else '!! ', p, c, n))
expect('全部统计接口正常', s_bad == 0, '%d 处异常' % s_bad if s_bad else '%d 个统计接口' % len(STATS))

# 看板数值抽样核对
_, b, _ = call('GET', '/dashboard/overview', token=TOKEN)
d = (b or {}).get('data') or {}
expect('看板 overview 返回关键指标', all(k in d for k in ('houseCount', 'ownerTotal', 'parkingTotal')),
       '房屋%s 人员%s 车位%s' % (d.get('houseCount'), d.get('ownerTotal'), d.get('parkingTotal')))
expect('看板房屋总数与数据库一致', d.get('houseCount') == 138, d.get('houseCount'))

# ============================================================ 7. 登出/重登
banner('七、登出与重新登录')
_, b, _ = call('GET', '/auth/current', token=TOKEN)
expect('注销前 /auth/current 可用', code_of(b) == 200, ((b or {}).get('data') or {}).get('username'))
_, b, _ = call('POST', '/auth/logout', token=TOKEN)
expect('登出成功', code_of(b) == 200, msg_of(b))
_, b, _ = call('GET', '/auth/current', token=TOKEN)
expect('登出后旧 token 失效', code_of(b) == 401, msg_of(b))
_, b, _ = call('POST', '/auth/login', body={'username': USERNAME, 'password': PASSWORD})
expect('重新登录成功', code_of(b) == 200)
if code_of(b) == 200:
    t2 = b['data']['token']
    _, b, _ = call('GET', '/dashboard/overview', token=t2)
    expect('新 token 可用', code_of(b) == 200)

# ============================================================ 汇总
print('\n' + '=' * 78)
print('  接口总数 %d    失败项 %d' % (len(eps), len(FAILS)))
if FAILS:
    print('\n  失败明细:')
    for f in FAILS:
        print('    - ' + f)
print('\n  >>> ' + ('端到端联调全部通过。' if not FAILS else '存在 %d 项失败, 见上。' % len(FAILS)))
print('=' * 78)
sys.exit(0 if not FAILS else 1)
