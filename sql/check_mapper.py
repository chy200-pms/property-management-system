# -*- coding: utf-8 -*-
"""
SQL / Mapper 一致性校验
--------------------------------------------------
1. 解析 property_db.sql 得到各表真实字段
2. 解析 entity/*.java 得到实体属性 -> 校验实体与表字段是否一一对应
3. 解析 mapper/*.xml 中引用的 `别名.字段`, 校验字段是否真实存在
4. 校验 INSERT INTO 的字段列表、UPDATE ... SET 的列名

设计说明:
  - 实体上的 keyword / beginDate / endDate / beginPeriod / endPeriod / xxxName 等
    属于"查询参数"或"联表冗余展示字段", 不是本表字段, 属正常设计, 不计为错误。
  - XML 中 <mapper namespace="..."> 等标签属性的内容会被剔除, 避免误判。
  - `q.*` 前缀代表查询条件对象, 不做表字段校验。
"""
import re, os, glob

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SQL = os.path.join(BASE, 'sql', 'property_db.sql')
XML_DIR = os.path.join(BASE, 'backend', 'src', 'main', 'resources', 'mapper')
ENT_DIR = os.path.join(BASE, 'backend', 'src', 'main', 'java', 'com', 'property', 'entity')

# 查询参数 / 展示用冗余字段(非本表列), 允许存在
QUERY_PROPS = {
    'keyword', 'begin_date', 'end_date', 'begin_period', 'end_period',
    'building_name', 'owner_name', 'owner_phone', 'house_no', 'house_name',
    'parking_no', 'paid', 'unpaid', 'total',
}

# 由 SQL 子查询 AS 出来的派生统计字段(不落库), 允许存在
AS_DERIVED = {'occupied_count', 'empty_count', 'occupancy_rate'}

sql = open(SQL, encoding='utf-8').read()
tables = {}
for m in re.finditer(r'CREATE TABLE `(\w+)`\s*\((.*?)\n\)\s*ENGINE', sql, re.S):
    name, body = m.group(1), m.group(2)
    cols = [re.match(r'`(\w+)`\s+\w', l.strip()).group(1)
            for l in body.split('\n') if re.match(r'`(\w+)`\s+\w', l.strip())]
    tables[name] = cols

all_cols = set()
for c in tables.values():
    all_cols |= set(c)

snake = lambda s: re.sub(r'([a-z0-9])([A-Z])', r'\1_\2', s).lower()

errors, warns = [], []

# ============ 1. 实体 ↔ 表 ============
print('=' * 78)
print('一、实体类属性 ↔ 数据表字段')
print('=' * 78)
for jf in sorted(glob.glob(os.path.join(ENT_DIR, '*.java'))):
    cls = os.path.basename(jf)[:-5]
    tname = snake(cls)
    if tname not in tables:
        print(f'  --  {cls:16s} 无同名表, 跳过')
        continue
    tcols = tables[tname]
    props = re.findall(r'^\s*private\s+[\w<>,\s\.\[\]]+\s+(\w+)\s*;',
                       open(jf, encoding='utf-8').read(), re.M)
    pcols = {snake(p) for p in props}
    missing = [c for c in tcols if c not in pcols]
    extra = [p for p in props if snake(p) not in tcols and snake(p) not in QUERY_PROPS
             and snake(p) not in AS_DERIVED]
    if missing:
        errors.append(f'[{cls}] 表 {tname} 的字段缺少对应属性: {missing}')
    if extra:
        errors.append(f'[{cls}] 属性无对应表字段且非查询字段: {extra}')
    status = 'OK' if not missing and not extra else '!!'
    print(f'  {status:2s}  {cls:16s} 表={tname:16s} 属性={len(props):2d} 表字段={len(tcols):2d}')

# ============ 2. Mapper XML ============
print()
print('=' * 78)
print('二、Mapper XML 字段引用')
print('=' * 78)
for xf in sorted(glob.glob(os.path.join(XML_DIR, '*.xml'))):
    fname = os.path.basename(xf)
    tname = snake(fname.replace('Mapper.xml', ''))
    tcols = set(tables.get(tname, []))
    src = open(xf, encoding='utf-8').read()
    # 剔除 XML 注释 + 所有标签属性, 只保留 SQL 内容
    body = re.sub(r'<!--.*?-->', '', src, flags=re.S)
    body = re.sub(r'<[^>]*>', ' ', body)

    n_alias = 0
    for m in re.finditer(r'\b([a-z]{1,2})\.([a-z][a-z0-9_]*)\b', body):
        alias, col = m.group(1), m.group(2)
        if alias == 'q':          # 查询条件对象
            continue
        if col not in all_cols and col not in QUERY_PROPS:
            errors.append(f'[{fname}] {alias}.{col} — 字段 {col} 在所有表中都不存在')
        n_alias += 1

    # ---- 裸字段名校验(不带别名前缀) ----
    # 先收集本 XML 通过 AS 定义的别名(派生字段/统计字段), 这些不算错
    as_aliases = {a.lower() for a in re.findall(r'\bAS\s+([a-z][a-z0-9_]*)', body, re.I)}
    as_aliases |= {a.lower() for a in re.findall(r'\)\s+([a-z][a-z0-9_]*)\s*,', body)}
    # 去掉字符串字面量、#{}/ ${} 占位符、AS 别名本身
    clean = re.sub(r"'[^']*'", ' ', body)
    clean = re.sub(r"#[{][^}]*[}]", ' ', clean)
    clean = re.sub(r"\$\{[^}]*\}", ' ', clean)
    clean = re.sub(r'\bAS\s+[a-z][a-z0-9_]*', ' ', clean, flags=re.I)

    n_bare = 0
    seen = set()
    for m in re.finditer(r'\b([a-z][a-z0-9]*_[a-z0-9_]+)\b', clean):
        col = m.group(1)
        if col in seen:
            continue
        seen.add(col)
        n_bare += 1
        if col in all_cols or col in as_aliases or col in QUERY_PROPS:
            continue
        if col in tables:          # 表名本身(如 fee_bill) 含下划线, 会被误扫
            continue
        errors.append(f'[{fname}] 裸字段 {col} 在所有表中都不存在(疑似拼写错误)')

    for m in re.finditer(r'INSERT\s+INTO\s+(\w+)\s*\(([^)]*)\)', body, re.S | re.I):
        tb, cl = m.group(1), m.group(2)
        real = set(tables.get(tb, []))
        for c in re.findall(r'\b([a-z][a-z0-9_]*)\b', cl):
            if real and c not in real:
                errors.append(f'[{fname}] INSERT INTO {tb} 的列不存在: {c}')

    for m in re.finditer(r'UPDATE\s+(\w+)(.*?)WHERE', body, re.S | re.I):
        tb, seg = m.group(1), m.group(2)
        real = set(tables.get(tb, []))
        for c in re.findall(r'\b([a-z][a-z0-9_]*)\s*=', seg):
            if real and c not in real:
                errors.append(f'[{fname}] UPDATE {tb} SET 的列不存在: {c}')

    print(f'  {fname:24s} 主表={tname:16s} 表字段={len(tcols):2d}  '
          f'别名引用 {n_alias:3d} 处 / 裸字段 {n_bare:3d} 个')

# ============ 3. whereCondition 中的参数前缀 ============
print()
print('=' * 78)
print('三、where 条件参数前缀检查')
print('=' * 78)
# BaseMapper.countByQuery/selectList 的签名是 (@Param("q") T query),
# 因此 where 片段里所有条件都必须写成 q.xxx。
# 若写成 `q.status != null and status != ''`, 第二个 status 会去参数表里找,
# 触发 BindingException: Parameter 'status' not found —— 且只有真正带上该筛选条件时才暴露。
guarded = 0
for xf in sorted(glob.glob(os.path.join(XML_DIR, '*.xml'))):
    fname = os.path.basename(xf)
    src = open(xf, encoding='utf-8').read()
    n = 0
    for m in re.finditer(r'<sql id="whereCondition">(.*?)</sql>', src, re.S):
        frag_start = src[:m.start()].count('\n') + 1
        for mm in re.finditer(r'q\.(\w+)\s*!=\s*null\s+and\s+(?!q\.)(\w+)', m.group(1)):
            ln = frag_start + m.group(1)[:mm.start()].count('\n')
            errors.append(
                f'[{fname}:~{ln}] where 条件缺少 q. 前缀: '
                f'`and {mm.group(2)}` 应为 `and q.{mm.group(2)}`'
                f' (否则带上该筛选条件时会报参数找不到)')
            n += 1
    guarded += n
    print(f'  {fname:24s} {"OK" if n == 0 else "!! %d 处" % n}')
print(f'\n  共检查 {len(glob.glob(os.path.join(XML_DIR, "*.xml")))} 个 Mapper, '
      f'发现 {guarded} 处前缀缺失')

print()
if warnings_ := warns:
    for w in warnings_:
        print('  [WARN] ' + w)
if errors:
    print(f'--- 发现 {len(errors)} 处问题 ---')
    for e in errors:
        print('  [ERR ] ' + e)
    print('\n>>> 结论: 存在需修复的问题。')
else:
    print('>>> 结论: 实体字段、Mapper 字段引用、INSERT/UPDATE 列名 全部与数据表一致, 无错误。')
