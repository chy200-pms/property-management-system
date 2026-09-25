# -*- coding: utf-8 -*-
"""
数据权限隔离 + 修改密码 专项验证（真实后端 + 真实 MySQL）
前提：后端已在 8080 端口运行，数据库 property_db 已导入演示数据
"""
import json
import subprocess
import urllib.error
import urllib.request
from urllib.parse import quote

BASE = 'http://127.0.0.1:8080/api'
PASS = [0]
FAIL = [0]
FAILED = []


def call(method, path, token=None, body=None):
    url = BASE + path
    data = json.dumps(body).encode('utf-8') if body is not None else None
    req = urllib.request.Request(url, data=data, method=method)
    req.add_header('Content-Type', 'application/json')
    if token:
        req.add_header('Authorization', token)
    try:
        with urllib.request.urlopen(req, timeout=15) as resp:
            return resp.status, json.loads(resp.read().decode('utf-8'))
    except urllib.error.HTTPError as e:
        raw = e.read().decode('utf-8')
        try:
            return e.code, json.loads(raw)
        except ValueError:
            return e.code, {'code': e.code, 'msg': raw[:200]}


def expect(name, cond, detail=''):
    if cond:
        PASS[0] += 1
        print('  [PASS] %s  → %s' % (name, detail))
    else:
        FAIL[0] += 1
        FAILED.append(name)
        print('  [FAIL] %s  → %s' % (name, detail))


def login(username, password):
    _, b = call('POST', '/auth/login', body={'username': username, 'password': password})
    if b.get('code') == 200:
        d = b['data']
        # 兼容 {token, realName...} 与 {token, user: {...}} 两种结构
        user = d.get('user') or d
        return d['token'], user
    return None, b


def db(sql):
    out = subprocess.run(
        ['mysql', '-u', 'root', '-pa123456', 'property_db', '-N', '-e', sql],
        capture_output=True)
    raw = out.stdout or b''
    try:
        return raw.decode('utf-8').strip()
    except UnicodeDecodeError:
        return raw.decode('gbk', errors='replace').strip()


print('=' * 66)
print('  一、修改密码（真实后端全链路）')
print('=' * 66)
token, info = login('admin', '123456')
expect('admin 登录', token is not None, info.get('realName') if token else info)

_, b = call('POST', '/auth/password', token=token,
            body={'oldPassword': '123456', 'newPassword': 'newpass888'})
expect('修改密码返回成功', b.get('code') == 200, b.get('msg'))

_, b = login('admin', '123456')
expect('旧密码 123456 登录被拒', b.get('code') != 200, b.get('msg'))

token2, _ = login('admin', 'newpass888')
expect('新密码 newpass888 登录成功', token2 is not None)

_, b = call('POST', '/auth/password', token=token2,
            body={'oldPassword': 'newpass888', 'newPassword': '123456'})
expect('改回 123456（还原现场）', b.get('code') == 200, b.get('msg'))
token, _ = login('admin', '123456')
expect('还原后 123456 可登录', token is not None)

print('=' * 66)
print('  二、业主数据隔离（yeye01 = 邹建华）')
print('=' * 66)
owner1_token, owner1 = login('yeye01', '123456')
expect('yeye01 登录', owner1_token is not None,
       '%s / %s' % (owner1.get('realName'), owner1.get('role')) if owner1_token else owner1)

# 找到该业主的档案与房屋
row = db("SELECT o.id, o.house_id, h.house_no FROM sys_user u "
         "JOIN owner o ON o.phone = u.phone JOIN house h ON h.id = o.house_id "
         "WHERE u.username = 'yeye01'")
oid, hid, hno = row.split('\t')
print('  [信息] yeye01 业主档案 id=%s 房屋 id=%s (%s)' % (oid, hid, hno))

# 房屋：只能看到自己那套
_, b = call('GET', '/house/page?pageNum=1&pageSize=200', token=owner1_token)
rows = b['data']['rows']
expect('房屋列表只有自己的 1 套', b['data']['total'] == 1 and rows[0]['id'] == int(hid),
       'total=%s houseNo=%s' % (b['data']['total'], rows[0]['houseNo'] if rows else '-'))

# 越权访问他人房屋详情
other_hid = db("SELECT id FROM house WHERE id != %s LIMIT 1" % hid)
_, b = call('GET', '/house/%s' % other_hid, token=owner1_token)
expect('查看他人房屋详情被拒', b.get('code') != 200, b.get('msg'))

# 人员：只能看到自己房屋的家庭成员
db_family = db("SELECT COUNT(*) FROM owner WHERE house_id = %s" % hid)
_, b = call('GET', '/owner/page?pageNum=1&pageSize=200', token=owner1_token)
expect('人员列表只有自己房屋成员', b['data']['total'] == int(db_family),
       '接口 %s 条 / 数据库 %s 条' % (b['data']['total'], db_family))

# 账单：只有自己房屋的
db_bills = db("SELECT COUNT(*) FROM fee_bill WHERE house_id = %s" % hid)
_, b = call('GET', '/feeBill/page?pageNum=1&pageSize=200', token=owner1_token)
expect('账单只有自己房屋的', b['data']['total'] == int(db_bills),
       '接口 %s 条 / 数据库 %s 条' % (b['data']['total'], db_bills))
leak = [r for r in b['data']['rows'] if r['houseId'] != int(hid)]
expect('账单无越权数据', len(leak) == 0, '越权 %d 条' % len(leak))

# 缴费记录：经账单关联
db_pays = db("SELECT COUNT(*) FROM fee_payment p JOIN fee_bill f ON f.id = p.bill_id "
             "WHERE f.house_id = %s" % hid)
_, b = call('GET', '/feePayment/page?pageNum=1&pageSize=500', token=owner1_token)
expect('缴费记录只有自己房屋的', b['data']['total'] == int(db_pays),
       '接口 %s 条 / 数据库 %s 条' % (b['data']['total'], db_pays))

# 报修：只看自己的
db_rep = db("SELECT COUNT(*) FROM repair_order WHERE owner_id = %s" % oid)
_, b = call('GET', '/repair/page?pageNum=1&pageSize=200', token=owner1_token)
expect('报修只看自己的', b['data']['total'] == int(db_rep),
       '接口 %s 条 / 数据库 %s 条' % (b['data']['total'], db_rep))

# 投诉：只看自己的
db_com = db("SELECT COUNT(*) FROM complaint WHERE owner_id = %s" % oid)
_, b = call('GET', '/complaint/page?pageNum=1&pageSize=200', token=owner1_token)
expect('投诉只看自己的', b['data']['total'] == int(db_com),
       '接口 %s 条 / 数据库 %s 条' % (b['data']['total'], db_com))

# 访客：只看拜访自己的
db_vis = db("SELECT COUNT(*) FROM visitor WHERE visit_owner_id = %s" % oid)
_, b = call('GET', '/visitor/page?pageNum=1&pageSize=200', token=owner1_token)
expect('访客只看拜访自己的', b['data']['total'] == int(db_vis),
       '接口 %s 条 / 数据库 %s 条' % (b['data']['total'], db_vis))

# 业主不能新增房屋
_, b = call('POST', '/house', token=owner1_token,
            body={'houseNo': 'X-1-101', 'buildingId': 1, 'unitNo': 1, 'floorNo': 1,
                  'area': 80, 'houseType': 'TWO_ONE', 'status': 'VACANT'})
expect('业主新增房屋被拒', b.get('code') != 200, b.get('msg'))

# 业主不能删他人报修
other_rep = db("SELECT id FROM repair_order WHERE owner_id != %s LIMIT 1" % oid)
if other_rep:
    _, b = call('DELETE', '/repair/%s' % other_rep, token=owner1_token)
    expect('业主删除他人报修被拒', b.get('code') != 200, b.get('msg'))
    still = db("SELECT COUNT(*) FROM repair_order WHERE id = %s" % other_rep)
    expect('他人报修记录未受影响', still == '1', 'count=%s' % still)

# 第二个业主互不可见
owner2_token, owner2 = login('yeye02', '123456')
row2 = db("SELECT o.id, o.house_id FROM sys_user u JOIN owner o ON o.phone = u.phone "
          "WHERE u.username = 'yeye02'")
oid2, hid2 = row2.split('\t')
_, b = call('GET', '/house/%s' % hid, token=owner2_token)
expect('yeye02 看 yeye01 的房屋被拒', b.get('code') != 200, b.get('msg'))
_, b = call('GET', '/house/page?pageNum=1&pageSize=200', token=owner2_token)
expect('yeye02 也只能看到自己 1 套房',
       b['data']['total'] == 1 and b['data']['rows'][0]['id'] == int(hid2),
       'total=%s' % b['data']['total'])

print('=' * 66)
print('  三、3D 小区地图场景接口（/community/scene）')
print('=' * 66)
_, b = call('GET', '/community/scene', token=owner1_token)
od = b.get('data') or {}
expect('业主可获取 3D 场景数据', b.get('code') == 200, '楼栋 %d 栋' % len(od.get('buildings') or []))
expect('业主场景标记 isOwner', od.get('isOwner') is True)
expect('业主场景返回自己的房屋', bool(od.get('myHouse')) and od['myHouse']['houseId'] == int(hid),
       (od.get('myHouse') or {}).get('houseNo'))
expect('业主场景不含物业负责人联系方式',
       all(('managerPhone' not in x) for x in (od.get('buildings') or [])),
       '已隐藏')
expect('业主场景不下发他人房屋明细',
       not any(k in od for k in ('houses', 'houseList', 'allHouses')))

_, b = call('GET', '/community/scene', token=token)
ad = b.get('data') or {}
expect('管理员可获取 3D 场景数据', b.get('code') == 200, '楼栋 %d 栋' % len(ad.get('buildings') or []))
expect('管理员场景 isOwner 为 false', ad.get('isOwner') is False)
expect('管理员场景返回楼栋几何信息(单元/层数)',
       all(('unitCount' in x and 'floorCount' in x) for x in (ad.get('buildings') or [])))
expect('管理员场景含物业负责人', all(('manager' in x) for x in (ad.get('buildings') or [])))
expect('场景楼栋数与数据库一致', len(ad.get('buildings') or []) == int(db("SELECT COUNT(*) FROM building")),
       '%d 栋' % len(ad.get('buildings') or []))

# 3D 场景点选楼栋后拉取的房屋列表：业主只拿到自己那一套
_, b = call('GET', '/house/page?buildingId=1&pageNum=1&pageSize=200', token=owner1_token)
rows = (b.get('data') or {}).get('rows') or []
expect('业主按楼栋查询房屋只返回自己那套',
       all(r['id'] == int(hid) for r in rows) and len(rows) <= 1,
       '%d 套' % len(rows))
_, b = call('GET', '/house/page?buildingId=1&floorNo=1&pageNum=1&pageSize=200', token=token)
expect('管理员可按楼栋+楼层筛选房屋(3D 点选楼层用)', b.get('code') == 200 and b['data']['total'] >= 1,
       '1号楼1层 %s 套' % b['data']['total'])
_, b = call('GET', '/house/page?buildingId=1&floorNo=1&pageNum=1&pageSize=200', token=owner1_token)
expect('业主越权按楼层筛选只得到自己房屋',
       all(r['id'] == int(hid) for r in ((b.get('data') or {}).get('rows') or [])),
       '%d 套' % len((b.get('data') or {}).get('rows') or []))

print('=' * 66)
print('  四、首页看板数据范围（业主只看自己）')
print('=' * 66)
_, b = call('GET', '/dashboard/overview', token=owner1_token)
od = b.get('data') or {}
expect('业主看板 scope=SELF', od.get('scope') == 'SELF', od.get('scope'))
expect('业主看板房屋数=1', od.get('houseCount') == 1, od.get('houseCount'))
expect('业主看板人员数=自己房屋成员数', od.get('ownerTotal') == int(db_family),
       '接口 %s / 数据库 %s' % (od.get('ownerTotal'), db_family))
db_unpaid = db("SELECT COALESCE(SUM(GREATEST(amount - paid_amount, 0)), 0) FROM fee_bill WHERE house_id = %s" % hid)
expect('业主看板欠费=自己房屋欠费', abs(float(od.get('unpaidAmount', -1)) - float(db_unpaid)) < 0.01,
       '接口 %s / 数据库 %s' % (od.get('unpaidAmount'), db_unpaid))

_, b = call('GET', '/dashboard/overview', token=token)
ad = b.get('data') or {}
expect('管理员看板 scope=ALL', ad.get('scope') == 'ALL', ad.get('scope'))
expect('管理员看板房屋数=全量', ad.get('houseCount') == int(db("SELECT COUNT(*) FROM house")),
       ad.get('houseCount'))

_, b = call('GET', '/dashboard/todos', token=owner1_token)
ot = b.get('data') or []
titles = [x.get('title') for x in ot]
expect('业主待办不含物业侧事项',
       all(t in ('待缴费用', '报修进行中', '投诉处理中', '访客在场') for t in titles),
       '、'.join(titles) or '（无待办）')

_, b = call('GET', '/dashboard/charts', token=owner1_token)
cs = b.get('data') or {}
hs = cs.get('houseStatus') or []
expect('业主图表房屋状态只含自己那一套',
       len(hs) <= 1 and (not hs or hs[0].get('value') == 1),
       str(hs))

print('=' * 66)
print('  五、用户管理接口权限')
print('=' * 66)
_, b = call('GET', '/auth/users', token=owner1_token)
expect('业主访问用户列表被拒', b.get('code') != 200, b.get('msg'))
_, b = call('DELETE', '/auth/users/2', token=owner1_token)
expect('业主删除用户被拒', b.get('code') != 200, b.get('msg'))
_, b = call('GET', '/auth/users', token=token)
expect('管理员访问用户列表正常', b.get('code') == 200 and len(b['data']) == 7,
       '%s 个用户' % (len(b.get('data') or [])))

# 手机号是「账号 ↔ 房屋档案」的关联键, 必须唯一, 否则业主账号会命中别人的房间
_, b = call('POST', '/auth/users', token=token,
            body={'username': 'dup_phone_probe', 'password': '123456',
                  'realName': '重复手机号探针', 'phone': '18813729949', 'role': 'OWNER'})
expect('同一手机号被第二个账号占用时新增被拒', b.get('code') != 200, b.get('msg'))
cnt = db("SELECT COUNT(*) FROM sys_user WHERE username = 'dup_phone_probe'")
expect('越权探针账号未被创建', cnt == '0', 'count=%s' % cnt)

print('=' * 66)
print('  六、管理员不受影响（数据完整性）')
print('=' * 66)
for name, path, table in [
    ('房屋', '/house/page?pageNum=1&pageSize=1', 'house'),
    ('人员', '/owner/page?pageNum=1&pageSize=1', 'owner'),
    ('账单', '/feeBill/page?pageNum=1&pageSize=1', 'fee_bill'),
    ('报修', '/repair/page?pageNum=1&pageSize=1', 'repair_order'),
    ('投诉', '/complaint/page?pageNum=1&pageSize=1', 'complaint'),
    ('访客', '/visitor/page?pageNum=1&pageSize=1', 'visitor'),
]:
    _, b = call('GET', path, token=token)
    cnt = db("SELECT COUNT(*) FROM %s" % table)
    expect('管理员%s总数与数据库一致' % name, b['data']['total'] == int(cnt),
           '接口 %s / 数据库 %s' % (b['data']['total'], cnt))

# 物业人员也不受隔离影响
staff_token, _ = login('wuye01', '123456')
_, b = call('GET', '/house/page?pageNum=1&pageSize=1', token=staff_token)
cnt = db("SELECT COUNT(*) FROM house")
expect('物业人员可见全部房屋', b['data']['total'] == int(cnt),
       '接口 %s / 数据库 %s' % (b['data']['total'], cnt))

print('=' * 66)
print('  七、管理类写操作权限（业主越权一律拦截）')
print('=' * 66)

# 以下 6 个模块此前完全没有权限校验, 业主登录后可以任意增删改, 属于越权漏洞。
# 现在统一接入 DataScope.requireStaff(): 只有 ADMIN/STAFF 可写, 拒绝理由必须明确含"无权"。
mgmt_cases = [
    ('POST',   '/building',                                 {'buildingNo': 'QA-9', 'name': 'QA楼栋'}),
    ('PUT',    '/building',                                 {'id': 1, 'name': '被篡改的楼栋'}),
    ('DELETE', '/building/1',                               None),
    ('POST',   '/equipment',                                {'equipmentName': 'QA设备', 'equipmentType': 'ELEVATOR'}),
    ('PUT',    '/equipment',                                {'id': 1, 'equipmentName': '被篡改'}),
    ('DELETE', '/equipment/1',                              None),
    ('POST',   '/equipment/maintain?id=1',                  None),
    ('POST',   '/feeStandard',                              {'feeCode': 'QA-1', 'feeName': 'QA标准', 'feeType': 'PROPERTY', 'price': 1}),
    ('PUT',    '/feeStandard',                              {'id': 1, 'price': 99}),
    ('DELETE', '/feeStandard/1',                            None),
    ('POST',   '/notice',                                   {'title': 'QA公告', 'content': 'x'}),
    ('PUT',    '/notice',                                   {'id': 1, 'title': '被篡改'}),
    ('DELETE', '/notice/1',                                 None),
    ('POST',   '/parking',                                  {'spaceNo': 'QA-9', 'spaceType': 'OUTSIDE'}),
    ('PUT',    '/parking',                                  {'id': 1, 'spaceNo': '被篡改'}),
    ('DELETE', '/parking/1',                                None),
    ('POST',   '/parking/allocate?id=1&ownerId=1',          None),
    ('POST',   '/parking/release?id=1',                     None),
    ('POST',   '/tempParking/entry',                        {'carPlate': '京A00000'}),
    ('PUT',    '/tempParking',                              {'id': 1, 'carPlate': '被篡改'}),
    ('DELETE', '/tempParking/1',                            None),
    ('POST',   '/house',                                    {'houseNo': 'QA-9', 'buildingId': 1}),
    ('DELETE', '/house/1',                                  None),
    ('POST',   '/feeBill/generate/property?period=2026-12', None),
]
for _m, _p, _body in mgmt_cases:
    _, b = call(_m, _p, token=owner1_token, body=_body)
    _msg = str(b.get('msg', ''))
    expect('业主 %s %s 被拒' % (_m, _p.split('?')[0]),
           b.get('code') != 200 and '无权' in _msg, _msg)
expect('管理类越权用例覆盖 %d 条接口' % len(mgmt_cases), len(mgmt_cases) >= 20, len(mgmt_cases))

# 未登录状态同样不得写
_, b = call('POST', '/building', body={'buildingNo': 'QA-9', 'name': 'QA楼栋'})
expect('未登录新增楼栋被拒', b.get('code') != 200, 'code=%s msg=%s' % (b.get('code'), b.get('msg')))

# 物业人员(STAFF)与管理员具备管理权限: 增一条再删掉, 验证放行且不污染数据
_, b = call('POST', '/building', token=staff_token,
            body={'buildingNo': 'QA-TMP', 'name': 'QA临时楼栋', 'buildingType': '住宅',
                  'unitCount': 1, 'floorCount': 1, 'houseCount': 0})
expect('物业人员可新增楼栋', b.get('code') == 200, b.get('msg'))
tmp_id = db("SELECT id FROM building WHERE building_no = 'QA-TMP' LIMIT 1")
if tmp_id:
    _, b = call('DELETE', '/building/%s' % tmp_id, token=token)
    expect('管理员清理临时楼栋', b.get('code') == 200, b.get('msg'))
    expect('临时楼栋已删除', db("SELECT COUNT(*) FROM building WHERE building_no = 'QA-TMP'") == '0')

print('=' * 66)
print('  八、业主自助修改个人信息（该小区用户可以改自己的）')
print('=' * 66)

_, me = call('GET', '/owner/%s' % oid, token=owner1_token)
my = me['data']
orig_car = my.get('carPlate')

# 1) 改自己: 应当允许
_, b = call('PUT', '/owner', token=owner1_token, body={
    'id': int(oid), 'name': my['name'], 'phone': my['phone'],
    'emergencyName': 'QA紧急联系人', 'emergencyPhone': '13900001111',
    'carPlate': '京A88888', 'familyCount': 3})
expect('业主可修改自己的信息', b.get('code') == 200, b.get('msg'))
saved = db("SELECT emergency_name, emergency_phone, car_plate FROM owner WHERE id = %s" % oid)
expect('修改已落库', 'QA紧急联系人' in saved and '京A88888' in saved, saved)

# 2) 关键字段不可被篡改: 请求里塞别人的 houseId, 应被静默忽略
other_hid2 = db("SELECT id FROM house WHERE id != %s LIMIT 1" % hid)
_, b = call('PUT', '/owner', token=owner1_token, body={
    'id': int(oid), 'name': my['name'], 'phone': my['phone'], 'houseId': int(other_hid2)})
expect('含越权 houseId 的自改请求被受理', b.get('code') == 200, b.get('msg'))
now_hid = db("SELECT house_id FROM owner WHERE id = %s" % oid)
expect('所属房屋未被篡改(关键字段已忽略)', now_hid == hid, '库中=%s 原值=%s' % (now_hid, hid))

# 3) 改他人档案: 应当拒绝
other_oid = db("SELECT id FROM owner WHERE id != %s LIMIT 1" % oid)
_, b = call('PUT', '/owner', token=owner1_token, body={'id': int(other_oid), 'name': 'QA越权改名'})
expect('业主修改他人档案被拒', b.get('code') != 200, b.get('msg'))
kept = db("SELECT name FROM owner WHERE id = %s" % other_oid)
expect('他人姓名未被改动', kept != 'QA越权改名', kept)

# 4) 业主新增/删除人员: 应当拒绝
_, b = call('POST', '/owner', token=owner1_token,
            body={'name': 'QA', 'phone': '13900009999', 'houseId': int(hid)})
expect('业主录入人员被拒', b.get('code') != 200, b.get('msg'))
_, b = call('DELETE', '/owner/%s' % other_oid, token=owner1_token)
expect('业主删除人员被拒', b.get('code') != 200, b.get('msg'))

# 5) 业主仍可办理自己的事务(报修/投诉/访客) —— 不能被误伤
_, b = call('GET', '/repair/page?pageNum=1&pageSize=1', token=owner1_token)
expect('业主仍可查看自己的报修', b.get('code') == 200, b.get('msg'))

# 还原现场
call('PUT', '/owner', token=owner1_token, body={
    'id': int(oid), 'name': my['name'], 'phone': my['phone'],
    'emergencyName': '', 'emergencyPhone': '', 'carPlate': orig_car or ''})
expect('还原现场', db("SELECT emergency_name FROM owner WHERE id = %s" % oid) in ('', 'None'),
       db("SELECT emergency_name, car_plate FROM owner WHERE id = %s" % oid))

print('=' * 66)
print('  九、业主换手机号后隔离关联不断（sys_user.phone 同步）')
print('=' * 66)

o2 = db("SELECT o.id, o.phone, o.name FROM sys_user u JOIN owner o ON o.phone = u.phone "
        "WHERE u.username = 'yeye02'")
o2_oid, o2_phone, o2_name = o2.split('\t')
new_phone = '13900008888'
print('  [信息] yeye02 档案 id=%s 手机号=%s' % (o2_oid, o2_phone))

_, b = call('PUT', '/owner', token=owner2_token,
            body={'id': int(o2_oid), 'name': o2_name, 'phone': new_phone})
expect('业主修改自己的手机号成功', b.get('code') == 200, b.get('msg'))
synced = db("SELECT phone FROM sys_user WHERE username = 'yeye02'")
expect('登录账号手机号已同步', synced == new_phone, 'sys_user.phone=%s' % synced)

o2_token2, _ = login('yeye02', '123456')
expect('换号后仍可用原账号登录', o2_token2 is not None)
_, b = call('GET', '/house/page?pageNum=1&pageSize=50', token=o2_token2)
expect('换号后隔离关联未断(仍看到自己的房屋)',
       b.get('code') == 200 and b['data']['total'] >= 1,
       'total=%s' % (b['data'].get('total') if b.get('code') == 200 else b.get('msg')))

_, b = call('PUT', '/owner', token=o2_token2,
            body={'id': int(o2_oid), 'name': o2_name, 'phone': o2_phone})
expect('还原 yeye02 手机号',
       db("SELECT phone FROM sys_user WHERE username = 'yeye02'") == o2_phone,
       db("SELECT phone FROM sys_user WHERE username = 'yeye02'"))

print()
print('=' * 66)
print('  结果: %d 项通过, %d 项失败' % (PASS[0], FAIL[0]))
if FAILED:
    print('  失败项: ' + '、'.join(FAILED))
print('=' * 66)
exit(1 if FAIL[0] else 0)
