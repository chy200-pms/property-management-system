/**
 * 本地演示数据 (Mock)
 * ---------------------------------------------------------------
 * 当后端服务未启动时, 前端自动切换到本模块, 使用内置示例数据,
 * 保证系统界面与业务流程可完整演示。
 * 数据字段与 database 表结构 / 后端实体保持一致。
 */
(function () {

    // ==================== 伪随机(固定种子, 保证数据稳定) ====================
    let _seed = 20260916;
    function rnd() {
        _seed = (_seed * 9301 + 49297) % 233280;
        return _seed / 233280;
    }
    function pick(arr) { return arr[Math.floor(rnd() * arr.length)]; }
    function int(min, max) { return min + Math.floor(rnd() * (max - min + 1)); }
    function pad(n, len) { return String(n).padStart(len, '0'); }

    const SURNAMES = '赵钱孙李周吴郑王冯陈褚卫蒋沈韩杨朱秦尤许何吕施张孔曹严华金魏陶姜谢邹柏窦章林刘高罗郭梁宋唐黄';
    const GIVEN1 = '建国志伟华明芳强军平磊洋勇艳杰娟涛超秀霞燕敏静丽娜鹏宇浩鑫天云海峰文博子墨思雨欣怡';
    const GIVEN2 = '华明强军平磊洋勇杰涛峰宇浩鑫婷静怡雨轩然琪琳';

    function cnName() {
        return SURNAMES[Math.floor(rnd() * SURNAMES.length)] +
            GIVEN1[Math.floor(rnd() * GIVEN1.length)] +
            (rnd() < 0.6 ? GIVEN2[Math.floor(rnd() * GIVEN2.length)] : '');
    }
    function phone() {
        return pick(['138', '139', '150', '151', '158', '186', '187', '188', '133', '159', '177', '199']) +
            pad(int(0, 99999999), 8);
    }
    function plate() {
        const prov = pick(['京A', '沪B', '粤B', '苏A', '浙A', '川A', '鄂A', '陕A']);
        const letter = 'ABCDEFGHJKLMNPQRSTUVWXYZ'[Math.floor(rnd() * 24)];
        return prov + letter + pad(int(0, 99999), 5);
    }
    function dateStr(y, m, d) {
        return y + '-' + pad(m, 2) + '-' + pad(d, 2);
    }
    function dateTimeStr(y, m, d, h, mi) {
        return dateStr(y, m, d) + ' ' + pad(h, 2) + ':' + pad(mi, 2) + ':00';
    }
    function idCard() {
        return pick(['110101', '310104', '440305', '320102', '330106', '510107']) +
            int(1960, 1995) + pad(int(1, 12), 2) + pad(int(1, 28), 2) + pad(int(0, 999), 3) + 'X';
    }

    // ==================== 常量字典 ====================
    const TODAY = { y: 2026, m: 9, d: 16 };
    const PERIODS = ['2026-06', '2026-07', '2026-08', '2026-09'];

    // ==================== 数据生成 ====================
    const DB = {};

    // ---------- 楼栋 ----------
    DB.building = [
        { id: 1, buildingNo: '1号楼', name: '阳光家园1号楼', unitCount: 2, floorCount: 6, houseCount: 24, buildingType: '住宅', buildYear: 2015, totalArea: 2880.00, manager: '王丽', managerPhone: '13800000002', createTime: '2015-06-30 09:00:00' },
        { id: 2, buildingNo: '2号楼', name: '阳光家园2号楼', unitCount: 2, floorCount: 6, houseCount: 24, buildingType: '住宅', buildYear: 2015, totalArea: 2880.00, manager: '王丽', managerPhone: '13800000002', createTime: '2015-06-30 09:00:00' },
        { id: 3, buildingNo: '3号楼', name: '阳光家园3号楼', unitCount: 2, floorCount: 6, houseCount: 24, buildingType: '住宅', buildYear: 2016, totalArea: 3120.00, manager: '李强', managerPhone: '13800000003', createTime: '2016-08-15 09:00:00' },
        { id: 4, buildingNo: '4号楼', name: '阳光家园4号楼', unitCount: 2, floorCount: 6, houseCount: 24, buildingType: '住宅', buildYear: 2017, totalArea: 3120.00, manager: '李强', managerPhone: '13800000003', createTime: '2017-05-20 09:00:00' },
        { id: 5, buildingNo: '5号楼', name: '阳光家园5号楼', unitCount: 2, floorCount: 8, houseCount: 32, buildingType: '住宅', buildYear: 2018, totalArea: 4160.00, manager: '张秀兰', managerPhone: '13800000004', createTime: '2018-10-01 09:00:00' },
        { id: 6, buildingNo: '6号楼', name: '阳光家园6号楼(公寓)', unitCount: 1, floorCount: 10, houseCount: 10, buildingType: '公寓', buildYear: 2020, totalArea: 430.00, manager: '刘海涛', managerPhone: '13800000005', createTime: '2020-03-28 09:00:00' }
    ];

    // ---------- 房屋 ----------
    DB.house = [];
    let hid = 1;
    DB.building.forEach(b => {
        const num = b.buildingNo.replace('号楼', '');
        for (let u = 1; u <= b.unitCount; u++) {
            for (let f = 1; f <= b.floorCount; f++) {
                const rooms = b.buildingType === '住宅' ? [1, 2] : [1];
                rooms.forEach(r => {
                    const roomNo = f + pad(r, 2);
                    let status = 'EMPTY';
                    const rr = rnd();
                    if (rr < 0.72) status = 'OCCUPIED';
                    else if (rr < 0.88) status = 'RENTED';
                    else if (rr < 0.94) status = 'DECORATING';
                    const area = b.buildingType === '公寓'
                        ? pick([38.5, 42.0, 45.5, 50.0])
                        : (f === 1 ? pick([88.5, 92.0, 96.5, 105.0]) : pick([105.5, 118.0, 126.5, 138.0, 145.5]));
                    DB.house.push({
                        id: hid,
                        buildingId: b.id,
                        buildingName: b.name,
                        houseNo: num + '号楼' + u + '单元' + roomNo,
                        unitNo: u,
                        floorNo: f,
                        roomNo: roomNo,
                        area: area,
                        houseType: b.buildingType === '公寓' ? '一室一厅' : (f === 1 ? '两室一厅' : pick(['两室两厅', '三室两厅', '三室一厅'])),
                        orientation: pick(['南', '南北通透', '东南', '东', '西南']),
                        status: status,
                        ownerId: null,
                        decoration: pick(['精装', '精装', '简装', '毛坯']),
                        createTime: dateTimeStr(b.buildYear, int(1, 12), int(1, 28), 9, 0)
                    });
                    hid++;
                });
            }
        }
    });

    // ---------- 人员 ----------
    DB.owner = [];
    let oid = 1;
    DB.house.filter(h => h.status === 'OCCUPIED' || h.status === 'RENTED').forEach(h => {
        const isOwner = h.status === 'OCCUPIED';
        DB.owner.push({
            id: oid,
            name: cnName(),
            gender: pick(['男', '女']),
            idCard: idCard(),
            phone: phone(),
            personType: isOwner ? 'OWNER' : 'TENANT',
            houseId: h.id,
            houseNo: h.houseNo,
            familyCount: int(1, 5),
            moveInDate: dateStr(int(2015, 2024), int(1, 12), int(1, 28)),
            carPlate: rnd() < 0.8 ? plate() : null,
            emergencyName: cnName(),
            emergencyPhone: phone(),
            status: 'ACTIVE',
            createTime: dateTimeStr(2016, int(1, 12), int(1, 28), 10, 0)
        });
        h.ownerId = oid;
        const mainId = oid;
        oid++;
        // 家庭成员
        int(0, 2) && [0, 1].forEach(() => {
            if (rnd() < 0.55) {
                DB.owner.push({
                    id: oid,
                    name: cnName(),
                    gender: pick(['男', '女']),
                    idCard: idCard(),
                    phone: phone(),
                    personType: 'FAMILY',
                    houseId: h.id,
                    houseNo: h.houseNo,
                    familyCount: 1,
                    moveInDate: dateStr(int(2016, 2024), int(1, 12), int(1, 28)),
                    carPlate: null,
                    status: 'ACTIVE',
                    createTime: dateTimeStr(2016, int(1, 12), int(1, 28), 10, 0)
                });
                oid++;
            }
        });
    });

    /**
     * 与后端演示数据保持一致:
     *   yeye01 -> 1号楼1单元101(邹建华)  yeye02 -> 1号楼1单元201(刘华琪)
     * 这样演示模式下登录业主账号, 3D 小区地图同样能定位到"自己家"。
     */
    (function alignOwnerAccounts() {
        const links = [[1, '邹建华', '18813729949'], [3, '刘华琪', '18600184971']];
        links.forEach(([houseId, name, ph]) => {
            const h = DB.house.find(x => x.id === houseId);
            if (!h) return;
            h.status = 'OCCUPIED';
            let o = DB.owner.find(x => x.id === h.ownerId)
                || DB.owner.find(x => x.houseId === houseId && x.personType === 'OWNER');
            if (!o) {
                o = {
                    id: DB.owner.reduce((m, x) => Math.max(m, x.id), 0) + 1,
                    gender: '男', idCard: idCard(), personType: 'OWNER',
                    houseId: houseId, houseNo: h.houseNo, familyCount: 2,
                    moveInDate: '2016-03-01', carPlate: null,
                    emergencyName: name, emergencyPhone: ph, status: 'ACTIVE',
                    createTime: '2016-03-01 10:00:00'
                };
                DB.owner.push(o);
            }
            o.name = name;
            o.phone = ph;
            h.ownerId = o.id;
        });
    })();

    // ---------- 车位 ----------
    DB.parking = [];
    let sid = 1;
    [['地下一层A区', 'B1', 60, 300], ['地下二层B区', 'B2', 40, 260]].forEach(([area, prefix, cnt, fee]) => {
        for (let i = 1; i <= cnt; i++) {
            DB.parking.push({
                id: sid, spaceNo: prefix + '-' + pad(i, 3), areaName: area, spaceType: 'UNDERGROUND',
                spaceSize: pick(['标准', '标准', '标准', '子母', '充电桩']), monthFee: fee, status: 'FREE',
                ownerId: null, ownerName: null, carPlate: null, startDate: null, endDate: null,
                location: area + ' ' + pad(i, 3) + '号位', createTime: '2015-06-01 09:00:00'
            });
            sid++;
        }
    });
    for (let i = 1; i <= 40; i++) {
        DB.parking.push({
            id: sid, spaceNo: 'DM-' + pad(i, 3), areaName: '小区地面停车区', spaceType: 'GROUND',
            spaceSize: '标准', monthFee: 180, status: 'FREE', ownerId: null, ownerName: null,
            carPlate: null, startDate: null, endDate: null, location: '地面停车区 ' + pad(i, 3) + '号位',
            createTime: '2015-06-01 09:00:00'
        });
        sid++;
    }
    for (let i = 1; i <= 40; i++) {
        DB.parking.push({
            id: sid, spaceNo: 'WJ-' + pad(i, 3), areaName: '小区外临街商铺停车区', spaceType: 'OUTSIDE',
            spaceSize: '标准', monthFee: 150, status: 'FREE', ownerId: null, ownerName: null,
            carPlate: null, startDate: null, endDate: null, location: '临街停车区 ' + pad(i, 3) + '号位',
            createTime: '2019-04-01 09:00:00'
        });
        sid++;
    }
    // 分配车位给有车住户
    const withCar = DB.owner.filter(o => o.carPlate && o.personType !== 'FAMILY');
    const freeIdx = DB.parking.map((_, i) => i);
    for (let i = freeIdx.length - 1; i > 0; i--) {
        const j = Math.floor(rnd() * (i + 1));
        [freeIdx[i], freeIdx[j]] = [freeIdx[j], freeIdx[i]];
    }
    withCar.slice(0, Math.min(112, freeIdx.length)).forEach(o => {
        const idx = freeIdx.pop();
        const sp = DB.parking[idx];
        sp.status = rnd() < 0.35 ? 'SOLD' : 'RENTED';
        sp.ownerId = o.id;
        sp.ownerName = o.name;
        sp.carPlate = o.carPlate;
        sp.startDate = dateStr(2026, int(1, 8), 1);
        sp.endDate = dateStr(2027, int(1, 8), 1);
    });

    // ---------- 收费标准 ----------
    DB.feeStandard = [
        { id: 1, feeCode: 'PROPERTY-001', feeName: '住宅物业服务费', feeType: 'PROPERTY', unitPrice: 2.50, unit: '元/㎡·月', chargeCycle: 'MONTH', lateFeeRate: 0.0005, status: 1, remark: '按建筑面积计收, 每月1日出账' },
        { id: 2, feeCode: 'PROPERTY-002', feeName: '公寓物业服务费', feeType: 'PROPERTY', unitPrice: 3.20, unit: '元/㎡·月', chargeCycle: 'MONTH', lateFeeRate: 0.0005, status: 1, remark: '公寓楼按此标准执行' },
        { id: 3, feeCode: 'PARKING-001', feeName: '地下车位管理费', feeType: 'PARKING', unitPrice: 300.00, unit: '元/月', chargeCycle: 'MONTH', lateFeeRate: 0.0005, status: 1, remark: '地下车库车位月度管理费' },
        { id: 4, feeCode: 'PARKING-002', feeName: '地面车位管理费', feeType: 'PARKING', unitPrice: 180.00, unit: '元/月', chargeCycle: 'MONTH', lateFeeRate: 0.0005, status: 1, remark: '地面车位月度管理费' },
        { id: 5, feeCode: 'PARKING-003', feeName: '小区外车位管理费', feeType: 'PARKING', unitPrice: 150.00, unit: '元/月', chargeCycle: 'MONTH', lateFeeRate: 0.0005, status: 1, remark: '小区外临街车位管理费' },
        { id: 6, feeCode: 'WATER-001', feeName: '居民用水费', feeType: 'WATER', unitPrice: 4.20, unit: '元/吨', chargeCycle: 'MONTH', lateFeeRate: 0.0005, status: 1, remark: '按抄表用量计收' },
        { id: 7, feeCode: 'ELECTRIC-001', feeName: '居民用电费', feeType: 'ELECTRIC', unitPrice: 0.568, unit: '元/度', chargeCycle: 'MONTH', lateFeeRate: 0.0005, status: 1, remark: '阶梯电价第一档' },
        { id: 8, feeCode: 'SANITATION-001', feeName: '生活垃圾处理费', feeType: 'SANITATION', unitPrice: 8.00, unit: '元/户·月', chargeCycle: 'MONTH', lateFeeRate: 0.0005, status: 1, remark: '环卫部门代收' }
    ];

    // ---------- 费用账单 ----------
    DB.feeBill = [];
    let bidSeq = 1;
    const typeToCode = { UNDERGROUND: 3, GROUND: 4, OUTSIDE: 5 };

    function makeBillStatus(period) {
        if (period === '2026-09') {
            return rnd() < 0.42
                ? { payStatus: 'PAID', paid: true }
                : { payStatus: 'UNPAID', paid: false };
        }
        if (period === '2026-08') {
            return rnd() < 0.80 ? { payStatus: 'PAID', paid: true } : { payStatus: 'OVERDUE', paid: false };
        }
        return rnd() < 0.93 ? { payStatus: 'PAID', paid: true } : { payStatus: 'OVERDUE', paid: false };
    }

    DB.house.filter(h => h.ownerId).forEach(h => {
        const o = DB.owner.find(x => x.id === h.ownerId);
        const isApt = h.buildingId === 6;
        const price = isApt ? 3.20 : 2.50;
        const amount = Math.round(h.area * price * 100) / 100;
        PERIODS.forEach(p => {
            const st = makeBillStatus(p);
            const mm = parseInt(p.split('-')[1], 10);
            DB.feeBill.push({
                id: bidSeq,
                billNo: 'WY' + p.replace('-', '') + pad(bidSeq, 6),
                ownerId: o.id, ownerName: o.name,
                houseId: h.id, houseNo: h.houseNo,
                parkingId: null, parkingNo: null,
                standardId: isApt ? 2 : 1,
                feeType: 'PROPERTY',
                feeName: isApt ? '公寓物业服务费' : '住宅物业服务费',
                period: p, amount: amount,
                paidAmount: st.paid ? amount : 0,
                payStatus: st.payStatus,
                dueDate: p + '-25',
                payTime: st.paid ? dateTimeStr(2026, mm, int(1, 28), int(9, 20), int(0, 59)) : null,
                payMethod: st.paid ? pick(['WECHAT', 'ALIPAY', 'BANK', 'CASH']) : null,
                generateTime: p + '-01 00:05:00'
            });
            bidSeq++;
        });
    });

    DB.parking.filter(s => s.status !== 'FREE' && s.ownerId).forEach(sp => {
        const o = DB.owner.find(x => x.id === sp.ownerId);
        if (!o) return;
        const feeName = { UNDERGROUND: '地下车位管理费', GROUND: '地面车位管理费', OUTSIDE: '小区外车位管理费' }[sp.spaceType];
        PERIODS.forEach(p => {
            const st = makeBillStatus(p);
            const mm = parseInt(p.split('-')[1], 10);
            DB.feeBill.push({
                id: bidSeq,
                billNo: 'CW' + p.replace('-', '') + pad(bidSeq, 6),
                ownerId: o.id, ownerName: o.name,
                houseId: o.houseId, houseNo: o.houseNo,
                parkingId: sp.id, parkingNo: sp.spaceNo,
                standardId: typeToCode[sp.spaceType],
                feeType: 'PARKING',
                feeName: feeName,
                period: p, amount: sp.monthFee,
                paidAmount: st.paid ? sp.monthFee : 0,
                payStatus: st.payStatus,
                dueDate: p + '-25',
                payTime: st.paid ? dateTimeStr(2026, mm, int(1, 28), int(9, 20), int(0, 59)) : null,
                payMethod: st.paid ? pick(['WECHAT', 'ALIPAY', 'BANK', 'CASH']) : null,
                generateTime: p + '-01 00:05:00'
            });
            bidSeq++;
        });
    });

    // ---------- 缴费记录 ----------
    DB.feePayment = [];
    let pid = 1;
    DB.feeBill.filter(b => b.payStatus === 'PAID').forEach(b => {
        DB.feePayment.push({
            id: pid,
            paymentNo: 'PAY' + b.payTime.replace(/[-: ]/g, '') + pad(pid, 5),
            billId: b.id, billNo: b.billNo,
            ownerId: b.ownerId, ownerName: b.ownerName,
            feeName: b.feeName, amount: b.amount,
            payMethod: b.payMethod, payTime: b.payTime,
            operator: pick(['王丽', '李强', '系统自动'])
        });
        pid++;
    });

    // ---------- 临时停车 ----------
    DB.tempParking = [];
    const GATES = ['南门岗亭', '北门岗亭', '外街西口岗亭', '外街东口岗亭'];
    function calcParkFee(minutes) {
        if (minutes <= 30) return 0;
        const hours = Math.ceil((minutes - 30) / 60);
        const days = Math.max(1, Math.ceil(minutes / 1440));
        return Math.min(5 + Math.max(0, hours - 1) * 3, 30 * days);
    }
    for (let i = 1; i <= 96; i++) {
        const dayOffset = int(0, 29);
        const d = new Date(2026, 8, 16);
        d.setDate(d.getDate() - dayOffset);
        const h = int(6, 22), mi = int(0, 59);
        const entry = new Date(d.getFullYear(), d.getMonth(), d.getDate(), h, mi);
        const dur = pick([15, 25, 40, 55, 75, 95, 120, 150, 185, 240, 320, 480, 610, 900, 1250]);
        const exit = new Date(entry.getTime() + dur * 60000);
        const fee = calcParkFee(dur);
        const paid = rnd() < 0.9;
        DB.tempParking.push({
            id: i,
            recordNo: 'LS' + entry.getFullYear() + pad(entry.getMonth() + 1, 2) + pad(entry.getDate(), 2) + pad(i, 4),
            carPlate: plate(),
            carType: pick(['小型车', '小型车', '小型车', '中型车', '大型车']),
            spaceNo: null,
            parkType: rnd() < 0.66 ? 'OUTSIDE' : 'INSIDE',
            entryTime: dateTimeStr(entry.getFullYear(), entry.getMonth() + 1, entry.getDate(), entry.getHours(), entry.getMinutes()),
            exitTime: rnd() < 0.92 ? dateTimeStr(exit.getFullYear(), exit.getMonth() + 1, exit.getDate(), exit.getHours(), exit.getMinutes()) : null,
            duration: dur,
            fee: fee,
            paidFee: paid ? fee : 0,
            payStatus: paid ? 'PAID' : 'UNPAID',
            payMethod: paid ? pick(['WECHAT', 'ALIPAY', 'CASH']) : null,
            gate: pick(GATES),
            operator: pick(['王丽', '李强'])
        });
    }
    // 在场车辆
    for (let i = 0; i < 6; i++) {
        const entry = new Date(2026, 8, 16, int(7, 14), int(0, 59));
        const dur = Math.round((new Date(2026, 8, 16, 15, 0) - entry) / 60000);
        DB.tempParking.push({
            id: 1000 + i,
            recordNo: 'LS20260916' + pad(1000 + i, 4),
            carPlate: plate(), carType: '小型车',
            spaceNo: pick(['WJ-001', 'WJ-002', 'WJ-003', 'WJ-004']),
            parkType: 'OUTSIDE',
            entryTime: dateTimeStr(2026, 9, 16, entry.getHours(), entry.getMinutes()),
            exitTime: null, duration: dur,
            fee: calcParkFee(dur), paidFee: 0, payStatus: 'UNPAID',
            payMethod: null, gate: pick(GATES), operator: '王丽', remark: '车辆在场'
        });
    }

    // ---------- 报修工单 ----------
    const REPAIR_TITLES = [
        ['厨房水管漏水', 'WATER_ELEC', '厨房水槽下方管道接口处渗水, 地面已有积水'],
        ['客厅灯不亮', 'WATER_ELEC', '客厅主灯开关无反应, 灯泡已更换仍不亮'],
        ['卫生间马桶堵塞', 'PLUMBING', '马桶冲水后水位上升缓慢, 有返味'],
        ['卧室窗户关不严', 'DOOR_WINDOW', '次卧窗户密封条老化, 关不上有缝隙漏风'],
        ['单元门门禁损坏', 'PUBLIC', '2单元门禁刷卡无反应, 门无法自动闭合'],
        ['电梯运行有异响', 'ELEVATOR', '电梯上行至5楼时有明显金属摩擦声'],
        ['阳台下水道堵塞', 'PLUMBING', '阳台地漏排水缓慢, 下雨天积水'],
        ['插座跳闸', 'WATER_ELEC', '书房插座一插电器就跳闸'],
        ['楼道声控灯不亮', 'PUBLIC', '3楼楼道声控灯整晚不亮'],
        ['热水器不出热水', 'WATER_ELEC', '燃气热水器打不着火, 已确认燃气正常'],
        ['入户门锁芯卡顿', 'DOOR_WINDOW', '入户门钥匙插拔困难, 需要用力拧'],
        ['空调外机噪音大', 'OTHER', '空调外机运行时噪音明显, 影响邻居'],
        ['墙面渗水发霉', 'PUBLIC', '主卧外墙渗水, 内墙出现霉斑'],
        ['水表读数异常', 'WATER_ELEC', '本月水费异常偏高, 怀疑水表故障'],
        ['地库照明灯损坏', 'PUBLIC', '地下一层A区有3盏灯不亮'],
        ['阳台护栏松动', 'PUBLIC', '阳台护栏有晃动, 存在安全隐患'],
        ['洗衣机进水管爆裂', 'WATER_ELEC', '洗衣进水管接口爆裂, 已关闭总阀'],
        ['楼道感应门异响', 'PUBLIC', '单元门开合时有刺耳摩擦声'],
        ['入户门禁卡失效', 'PUBLIC', '门禁卡无法识别, 需要重新授权'],
        ['厨房排烟不畅', 'OTHER', '油烟机排烟效果差, 疑似公共烟道堵塞'],
        ['网络接口故障', 'OTHER', '网线接口松动无法上网'],
        ['水龙头滴水', 'WATER_ELEC', '厨房水龙头关不紧一直滴水'],
        ['纱窗破损', 'DOOR_WINDOW', '客厅纱窗破了个洞需要更换'],
        ['地漏返味', 'PLUMBING', '卫生间地漏反味严重'],
        ['墙面开裂', 'PUBLIC', '客厅墙面出现细微裂缝'],
        ['门禁对讲机没声音', 'PUBLIC', '对讲机有画面无声音'],
        ['车库卷帘门卡顿', 'PUBLIC', '地库入口卷帘门升降不顺畅'],
        ['消防栓箱门锁坏', 'PUBLIC', '楼道消防栓箱门锁损坏'],
        ['暖气不热', 'WATER_ELEC', '供暖季暖气片不热'],
        ['阳台推拉门卡轨', 'DOOR_WINDOW', '推拉门滑轨变形推不动'],
        ['楼道堆放杂物', 'PUBLIC', '3楼楼道长期堆放杂物影响通行'],
        ['水压过低', 'WATER_ELEC', '高层用水高峰水压不足'],
        ['马桶水箱漏水', 'PLUMBING', '马桶水箱一直有水声'],
        ['厨房下水返水', 'PLUMBING', '厨房下水道往上返水'],
        ['门铃不响', 'WATER_ELEC', '入户门铃按下无反应'],
        ['电梯按钮失灵', 'ELEVATOR', '电梯5楼按钮按下无反应'],
        ['玻璃门破碎', 'PUBLIC', '单元门玻璃被撞碎'],
        ['楼下漏水至我家', 'PLUMBING', '楼上卫生间漏水'],
        ['空调漏水', 'OTHER', '空调室内机滴水'],
        ['电视信号差', 'OTHER', '有线电视信号时断时续']
    ];
    const HANDLERS = [
        ['刘海涛', '13900001001'], ['陈国强', '13900001002'], ['赵建军', '13900001003'],
        ['孙志远', '13900001004'], ['周明华', '13900001005']
    ];
    DB.repair = [];
    const pool = DB.owner.filter(o => o.personType !== 'FAMILY');
    REPAIR_TITLES.forEach((t, i) => {
        const o = pool[Math.floor(rnd() * pool.length)];
        const dayOffset = int(0, 58);
        const d = new Date(2026, 8, 16);
        d.setDate(d.getDate() - dayOffset);
        const h = int(8, 20), mi = int(0, 59);
        let status;
        if (dayOffset > 20) status = pick(['FINISHED', 'FINISHED', 'FINISHED', 'CLOSED']);
        else if (dayOffset > 8) status = pick(['FINISHED', 'PROCESSING', 'FINISHED']);
        else if (dayOffset > 3) status = pick(['PROCESSING', 'ASSIGNED', 'PENDING']);
        else status = pick(['PENDING', 'ASSIGNED', 'PROCESSING']);

        const handler = status !== 'PENDING' ? pick(HANDLERS) : null;
        const finished = status === 'FINISHED' || status === 'CLOSED';
        const assignAt = handler ? new Date(d.getTime() + int(1, 12) * 3600000) : null;
        const finishAt = finished ? new Date(d.getTime() + int(6, 72) * 3600000) : null;

        DB.repair.push({
            id: i + 1,
            orderNo: 'BX' + d.getFullYear() + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2) + pad(i + 1, 4),
            ownerId: o.id, ownerName: o.name, phone: o.phone,
            houseId: o.houseId, houseNo: o.houseNo,
            title: t[0], content: t[2], repairType: t[1],
            urgency: pick(['NORMAL', 'NORMAL', 'HIGH', 'LOW', 'URGENT']),
            status: status,
            handler: handler ? handler[0] : null,
            handlerPhone: handler ? handler[1] : null,
            assignTime: assignAt ? dateTimeStr(assignAt.getFullYear(), assignAt.getMonth() + 1, assignAt.getDate(), assignAt.getHours(), assignAt.getMinutes()) : null,
            finishTime: finishAt ? dateTimeStr(finishAt.getFullYear(), finishAt.getMonth() + 1, finishAt.getDate(), finishAt.getHours(), finishAt.getMinutes()) : null,
            cost: finished ? pick([0, 0, 30, 50, 80, 120, 150, 200, 280]) : 0,
            rating: finished ? pick([5, 5, 5, 4, 4, 3]) : null,
            feedback: finished ? pick(['师傅很专业, 处理很快', '问题解决了, 满意', '响应及时, 服务态度好', '处理较快, 还可以']) : null,
            createTime: dateTimeStr(d.getFullYear(), d.getMonth() + 1, d.getDate(), h, mi)
        });
    });

    // ---------- 投诉建议 ----------
    const COMPLAINTS = [
        ['SERVICE', '物业前台态度问题', '8月10日前台工作人员对业主咨询答复不耐烦, 语气生硬'],
        ['NOISE', '楼上装修噪音扰民', '楼上住户周末装修, 电钻声持续一整天, 严重影响休息'],
        ['SANITARY', '垃圾清运不及时', '3号楼垃圾桶经常满溢, 夏天异味严重, 清运频率需要提高'],
        ['SAFETY', '单元门长期敞开', '2号楼单元门门禁损坏后一直敞开, 存在安全隐患'],
        ['PARKING', '访客车辆占用私家车位', '有外来车辆长期停在B1-015车位, 请物业处理'],
        ['SANITARY', '绿化带内宠物粪便', '小区绿化带内多处宠物粪便无人清理'],
        ['NOISE', '夜间施工噪音', '小区外道路夜间施工, 噪音大影响睡眠'],
        ['SERVICE', '报修响应太慢', '报修后两天才有人上门, 希望能提高响应速度'],
        ['SAFETY', '楼道消防通道被堵', '消防通道长期停放电动车, 存在安全隐患'],
        ['PARKING', '临街车位收费不透明', '小区外车位收费规则不清楚, 希望公示计费标准'],
        ['NOISE', '广场舞音乐过响', '晚间广场舞音量过大, 影响孩子写作业'],
        ['SANITARY', '楼道卫生差', '5号楼2单元楼道一周未打扫'],
        ['SERVICE', '建议增加快递柜', '小区快递量大, 建议在门口增设快递柜'],
        ['SAFETY', '地库照明太暗', '地下一层通道照明不足, 晚上停车看不清'],
        ['PARKING', '建议增设新能源充电桩', '小区新能源车增多, 建议增加充电桩'],
        ['SANITARY', '景观水池水质差', '中心景观水池发绿发臭, 建议定期换水'],
        ['SERVICE', '建议延长门岗服务时间', '希望北门岗亭开放时间延长到 24 点'],
        ['NOISE', '宠物犬吠叫扰民', '1号楼有住户养狗, 夜间频繁吠叫'],
        ['SAFETY', '监控盲区较多', '小区西南角无监控覆盖, 建议加装'],
        ['SERVICE', '建议开展社区活动', '希望物业多组织亲子类社区活动']
    ];
    const REPLIES = [
        '已安排相关负责人核实处理, 并对相关人员进行了沟通提醒, 感谢您的反馈。',
        '已联系当事住户协调, 现已停止扰民行为, 后续将持续跟进。',
        '已调整清运频次为每日两次, 并加强现场巡查, 感谢您的监督。',
        '已完成现场整改并张贴提示, 后续会加强巡查管理。',
        '已核实并处理完毕, 相关费用标准已在小区公示栏公示。'
    ];
    DB.complaint = COMPLAINTS.map((c, i) => {
        const o = pool[Math.floor(rnd() * pool.length)];
        const dayOffset = int(0, 70);
        const d = new Date(2026, 8, 16);
        d.setDate(d.getDate() - dayOffset);
        let status;
        if (dayOffset > 15) status = pick(['RESOLVED', 'RESOLVED', 'CLOSED']);
        else if (dayOffset > 5) status = pick(['RESOLVED', 'PROCESSING']);
        else status = pick(['PENDING', 'PROCESSING']);
        const handled = status !== 'PENDING';
        const hd = new Date(d.getTime() + int(1, 5) * 86400000);
        return {
            id: i + 1,
            complaintNo: 'TS' + d.getFullYear() + pad(d.getMonth() + 1, 2) + pad(d.getDate(), 2) + pad(i + 1, 4),
            ownerId: o.id, ownerName: o.name, phone: o.phone, houseNo: o.houseNo,
            complaintType: c[0], title: c[1], content: c[2],
            status: status,
            handler: handled ? pick(['王丽', '李强', '客服主管-张敏']) : null,
            reply: (status === 'RESOLVED' || status === 'CLOSED') ? pick(REPLIES) : null,
            handleTime: handled ? dateTimeStr(hd.getFullYear(), hd.getMonth() + 1, hd.getDate(), int(9, 18), int(0, 59)) : null,
            createTime: dateTimeStr(d.getFullYear(), d.getMonth() + 1, d.getDate(), int(8, 21), int(0, 59))
        };
    });

    // ---------- 通知公告 ----------
    DB.notice = [
        { id: 1, title: '关于2026年9月物业服务费缴纳的通知', content: '各位业主:\n\n2026年9月物业服务费账单已生成, 请于9月25日前完成缴纳。可通过物业服务中心现场缴纳, 或使用小区APP在线缴纳。\n\n感谢您的支持与配合!', noticeType: 'NOTIFY', publisher: '物业服务中心', publishTime: '2026-09-01 09:00:00', topFlag: 1, status: 1, viewCount: 328 },
        { id: 2, title: '小区外临街停车区收费标准公示', content: '为进一步规范小区外临街停车区管理, 现将收费标准公示如下:\n\n1. 临时停车: 前30分钟免费, 超时首小时5元, 每超1小时加收3元, 24小时内封顶30元\n2. 月租车位: 150元/月\n\n公示期7天, 如有疑问请联系物业服务中心。', noticeType: 'URGENT', publisher: '物业服务中心', publishTime: '2026-09-05 10:30:00', topFlag: 1, status: 1, viewCount: 512 },
        { id: 3, title: '关于小区消防设施集中检查的通知', content: '为保障小区消防安全, 物业将于9月20日-9月22日对全小区消防设施进行集中检查, 期间可能需要进入部分楼层公共区域, 感谢配合。', noticeType: 'NOTIFY', publisher: '安全管理部', publishTime: '2026-09-08 14:00:00', topFlag: 0, status: 1, viewCount: 246 },
        { id: 4, title: '中秋社区活动报名开始啦', content: '值此中秋佳节, 物业将于9月28日18:00在小区中心广场举办"月圆人团圆"中秋游园会, 现场有猜灯谜、做月饼、露天电影等活动, 欢迎各位业主携家人参加! 报名请联系楼栋管家。', noticeType: 'ACTIVITY', publisher: '物业服务中心', publishTime: '2026-09-10 09:30:00', topFlag: 1, status: 1, viewCount: 689 },
        { id: 5, title: '3号楼2单元电梯维保停运通知', content: '3号楼2单元电梯将于9月18日9:00-12:00进行季度维保, 期间电梯暂停使用, 请业主提前安排出行, 给您带来不便敬请谅解。', noticeType: 'MAINTAIN', publisher: '工程维修部', publishTime: '2026-09-12 16:00:00', topFlag: 0, status: 1, viewCount: 178 },
        { id: 6, title: '关于开展秋季绿化养护的通知', content: '物业将于9月中下旬开展秋季绿化养护工作, 包括修剪树枝、补种草皮、施秋肥等, 施工期间请勿在绿化带附近停车。', noticeType: 'NOTIFY', publisher: '环境管理部', publishTime: '2026-09-13 11:00:00', topFlag: 0, status: 1, viewCount: 134 },
        { id: 7, title: '小区智能门禁系统升级完成', content: '小区智能门禁系统已完成升级, 现支持人脸识别、手机NFC刷卡、二维码开门三种方式。业主可前往物业服务中心或使用小区APP进行人脸录入。', noticeType: 'NOTIFY', publisher: '物业服务中心', publishTime: '2026-09-14 15:20:00', topFlag: 1, status: 1, viewCount: 421 },
        { id: 8, title: '关于加强小区电动车停放管理的通知', content: '近期发现部分电动车停放在楼道、消防通道内, 存在严重安全隐患。请各位业主将电动车停放至指定区域, 物业将于9月20日起对违规停放车辆进行清理。', noticeType: 'URGENT', publisher: '安全管理部', publishTime: '2026-09-15 09:00:00', topFlag: 1, status: 1, viewCount: 367 },
        { id: 9, title: '小区外临街停车区优惠月租活动', content: '即日起至10月31日, 办理小区外临街停车区月租车位可享首月立减50元优惠, 数量有限先到先得。办理地点: 物业服务中心。', noticeType: 'ACTIVITY', publisher: '物业服务中心', publishTime: '2026-09-15 14:40:00', topFlag: 0, status: 1, viewCount: 203 },
        { id: 10, title: '关于小区供水管道检修的通知', content: '接自来水公司通知, 9月22日8:00-17:00将对小区供水主管道进行检修, 期间全小区可能间歇性停水, 请各位业主提前储水。', noticeType: 'MAINTAIN', publisher: '工程维修部', publishTime: '2026-09-16 08:30:00', topFlag: 1, status: 1, viewCount: 156 }
    ];

    // ---------- 访客登记 ----------
    DB.visitor = [];
    const REASONS = ['亲友探访', '快递送货', '家政保洁', '装修施工', '外卖配送', '看房', '维修上门', '商务洽谈'];
    for (let i = 1; i <= 45; i++) {
        const o = pool[Math.floor(rnd() * pool.length)];
        const dayOffset = int(0, 20);
        const d = new Date(2026, 8, 16);
        d.setDate(d.getDate() - dayOffset);
        const h = int(7, 21), mi = int(0, 59);
        const isIn = dayOffset === 0 && rnd() < 0.45;
        const lv = new Date(d.getTime() + int(1, 6) * 3600000);
        DB.visitor.push({
            id: i,
            visitorName: cnName(),
            phone: phone(),
            visitOwnerId: o.id,
            visitOwner: o.name,
            houseNo: o.houseNo,
            visitReason: pick(REASONS),
            carPlate: rnd() < 0.45 ? plate() : null,
            visitTime: dateTimeStr(d.getFullYear(), d.getMonth() + 1, d.getDate(), h, mi),
            leaveTime: isIn ? null : dateTimeStr(lv.getFullYear(), lv.getMonth() + 1, lv.getDate(), lv.getHours(), lv.getMinutes()),
            status: isIn ? 'IN' : 'OUT',
            register: pick(['王丽', '李强', '门岗-赵刚'])
        });
    }

    // ---------- 设备设施 ----------
    DB.equipment = [];
    let eid = 1;
    const EQ_DEFS = [];
    DB.building.slice(0, 5).forEach(b => {
        const n = b.buildingNo;
        EQ_DEFS.push([n + '1单元客梯', 'ELEVATOR', n + '1单元', '通力 KONE-1000', rnd() < 0.85]);
        EQ_DEFS.push([n + '2单元客梯', 'ELEVATOR', n + '2单元', '通力 KONE-1000', rnd() < 0.85]);
    });
    EQ_DEFS.push(
        ['生活水泵1号', 'WATER_PUMP', '地下一层水泵房', '南方泵业 CDL32-40', true],
        ['生活水泵2号', 'WATER_PUMP', '地下一层水泵房', '南方泵业 CDL32-40', true],
        ['消防水泵', 'FIRE', '地下一层消防泵房', '上海连成 XBD', true],
        ['消防控制主机', 'FIRE', '消防控制室', '海湾 JB-QB-GST5000', true],
        ['小区周界监控主机', 'DOOR', '监控中心', '海康威视 DS-9600', true],
        ['南门门禁系统', 'DOOR', '小区南门', '中控智慧 ZKTeco', true],
        ['北门门禁系统', 'DOOR', '小区北门', '中控智慧 ZKTeco', true],
        ['地下车库道闸', 'DOOR', '地库出入口', '捷顺 JS-9000', true],
        ['临街停车区道闸', 'DOOR', '外街西口', '捷顺 JS-8000', false],
        ['小区路灯配电箱', 'LIGHT', '小区北侧配电房', '正泰 NXBLE', true],
        ['地库照明回路A', 'LIGHT', '地下一层A区', '雷士照明', true],
        ['健身区漫步机', 'FITNESS', '中心广场健身区', '舒华 SH-5001', true],
        ['健身区太极推手', 'FITNESS', '中心广场健身区', '舒华 SH-5002', false],
        ['儿童滑梯组合', 'FITNESS', '儿童游乐区', '凯奇 KQ-8801', true],
        ['景观喷泉泵', 'WATER_PUMP', '中心景观池', '格兰富 CR10', false]
    );
    EQ_DEFS.forEach(d => {
        const last = new Date(2026, 8, 16);
        last.setDate(last.getDate() - int(5, 90));
        const cycle = pick([15, 30, 30, 60, 90]);
        const next = new Date(last.getTime() + cycle * 86400000);
        const fmt = x => dateStr(x.getFullYear(), x.getMonth() + 1, x.getDate());
        DB.equipment.push({
            id: eid,
            equipmentNo: 'SB' + pad(eid, 4),
            name: d[0], equipmentType: d[1], location: d[2], brand: d[3],
            status: d[4] ? 'NORMAL' : pick(['REPAIR', 'NORMAL']),
            buyDate: dateStr(int(2015, 2022), int(1, 12), int(1, 28)),
            maintainCycle: cycle,
            lastMaintain: fmt(last),
            nextMaintain: fmt(next),
            keeper: pick(['刘海涛', '陈国强', '赵建军'])
        });
        eid++;
    });

    // ---------- 系统用户 ----------
    DB.user = [
        { id: 1, username: 'admin', password: '123456', realName: '系统管理员', phone: '13800000001', role: 'ADMIN', status: 1, lastLogin: '2026-09-15 08:30:00', createTime: '2026-01-01 09:00:00' },
        { id: 2, username: 'wuye01', password: '123456', realName: '王丽', phone: '13800000002', role: 'STAFF', status: 1, lastLogin: '2026-09-15 09:10:00', createTime: '2026-01-01 09:00:00' },
        { id: 3, username: 'wuye02', password: '123456', realName: '李强', phone: '13800000003', role: 'STAFF', status: 1, lastLogin: '2026-09-14 10:20:00', createTime: '2026-01-01 09:00:00' },
        { id: 4, username: 'baojie', password: '123456', realName: '张秀兰', phone: '13800000004', role: 'STAFF', status: 1, lastLogin: '2026-09-12 08:00:00', createTime: '2026-01-01 09:00:00' },
        { id: 5, username: 'weixiu', password: '123456', realName: '刘海涛', phone: '13800000005', role: 'STAFF', status: 1, lastLogin: '2026-09-13 14:45:00', createTime: '2026-01-01 09:00:00' },
        { id: 6, username: 'yeye01', password: '123456', realName: '邹建华', phone: '18813729949', role: 'OWNER', status: 1, lastLogin: null, createTime: '2026-01-01 09:00:00' },
        { id: 7, username: 'yeye02', password: '123456', realName: '刘华琪', phone: '18600184971', role: 'OWNER', status: 1, lastLogin: null, createTime: '2026-01-01 09:00:00' }
    ];

    // ==================== 统计派生 ====================
    function countBy(arr, key) {
        const map = {};
        arr.forEach(x => {
            const k = x[key];
            if (k === null || k === undefined) return;
            map[k] = (map[k] || 0) + 1;
        });
        return map;
    }
    function uniquePairs(arr, key) {
        return Object.keys(countBy(arr, key)).map(k => ({ name: k, value: countBy(arr, key)[k] }));
    }

    // ==================== 请求路由 ====================
    const KEYWORD_FIELDS = {
        building: ['buildingNo', 'name', 'manager'],
        house: ['houseNo', 'ownerName', 'ownerPhone'],
        owner: ['name', 'phone', 'carPlate', 'houseNo'],
        parking: ['spaceNo', 'carPlate', 'ownerName', 'areaName'],
        tempParking: ['carPlate', 'recordNo', 'gate'],
        feeStandard: ['feeCode', 'feeName'],
        feeBill: ['billNo', 'ownerName', 'houseNo', 'parkingNo'],
        feePayment: ['paymentNo', 'billNo', 'ownerName', 'feeName'],
        repair: ['orderNo', 'title', 'ownerName', 'houseNo', 'handler'],
        complaint: ['complaintNo', 'title', 'ownerName', 'houseNo'],
        notice: ['title', 'content', 'publisher'],
        visitor: ['visitorName', 'phone', 'visitOwner', 'carPlate', 'houseNo'],
        equipment: ['equipmentNo', 'name', 'location', 'brand', 'keeper'],
        user: ['username', 'realName', 'phone']
    };

    const DATE_FIELDS = {
        tempParking: 'entryTime',
        feePayment: 'payTime',
        repair: 'createTime'
    };

    function match(record, params, resource) {
        const kwFields = KEYWORD_FIELDS[resource] || [];
        for (const key in params) {
            const v = params[key];
            if (v === null || v === undefined || v === '') continue;
            if (key === 'keyword') {
                if (!kwFields.some(f => String(record[f] || '').indexOf(v) >= 0)) return false;
                continue;
            }
            if (key === 'beginDate' || key === 'endDate') {
                const field = DATE_FIELDS[resource];
                if (!field || !record[field]) continue;
                const val = String(record[field]).substring(0, 10);
                if (key === 'beginDate' && val < String(v).substring(0, 10)) return false;
                if (key === 'endDate' && val > String(v).substring(0, 10)) return false;
                continue;
            }
            if (!(key in record)) continue;
            if (key === 'beginPeriod') {
                if (String(record.period || '') < String(v)) return false;
                continue;
            }
            if (key === 'endPeriod') {
                if (String(record.period || '') > String(v)) return false;
                continue;
            }
            if (String(record[key]) !== String(v)) return false;
        }
        return true;
    }

    function clone(obj) {
        return JSON.parse(JSON.stringify(obj));
    }

    function ok(data, msg) {
        return { code: 200, msg: msg || '操作成功', data: data === undefined ? null : data };
    }
    function fail(msg, code) {
        return { code: code || 500, msg: msg, data: null };
    }

    function nextId(arr) {
        return arr.reduce((m, x) => Math.max(m, x.id || 0), 0) + 1;
    }

    /** 统一分页 */
    function pageOf(arr, params) {
        const pageNum = parseInt(params.pageNum || 1, 10);
        const pageSize = parseInt(params.pageSize || 10, 10);
        const start = (pageNum - 1) * pageSize;
        return { total: arr.length, rows: arr.slice(start, start + pageSize), pageNum, pageSize };
    }

    // ==================== 业务特殊处理 ====================
    /**
     * 数据范围: 业主登录只统计自己房间的数据(与后端 DataScope / DashboardService 保持一致)
     * 由 handle() 在每次请求前根据当前登录用户设置。
     */
    let SCOPE_OWNER = null;

    // ---------- 演示模式下的安全态(与后端行为对齐) ----------
    /** 最近一次签发的验证码 */
    let demoCaptcha = null;
    /** 连续登录失败次数, 达 3 次后要求验证码 */
    let demoLoginFails = 0;

    // ---------- 操作日志(演示数据, 与后端 sys_log 同构) ----------
    DB.sysLog = [
        { id: 1, userId: 1, username: 'admin', realName: '系统管理员', role: 'ADMIN', module: '登录认证', action: '登录', method: 'POST', uri: '/auth/login', params: '{"username":"admin","password":"***"}', ip: '127.0.0.1', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', status: 1, errorMsg: null, costMs: 42, createTime: '2026-09-16 08:31:02' },
        { id: 2, userId: 1, username: 'admin', realName: '系统管理员', role: 'ADMIN', module: '楼栋管理', action: '新增', method: 'POST', uri: '/building', params: '{"buildingNo":"7号楼","unitCount":2,"floorCount":11}', ip: '127.0.0.1', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', status: 1, errorMsg: null, costMs: 63, createTime: '2026-09-16 09:12:40' },
        { id: 3, userId: 2, username: 'wuye01', realName: '王丽', role: 'STAFF', module: '费用账单', action: '生成物业费账单', method: 'POST', uri: '/feeBill/generate/property', params: '{"period":"2026-09"}', ip: '127.0.0.1', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', status: 1, errorMsg: null, costMs: 780, createTime: '2026-09-16 10:05:11' },
        { id: 4, userId: 2, username: 'wuye01', realName: '王丽', role: 'STAFF', module: '费用账单', action: '账单缴费', method: 'POST', uri: '/feeBill/pay', params: '{"id":301,"payMethod":"WECHAT"}', ip: '127.0.0.1', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', status: 1, errorMsg: null, costMs: 96, createTime: '2026-09-16 10:22:57' },
        { id: 5, userId: 3, username: 'wuye02', realName: '李强', role: 'STAFF', module: '报修工单', action: '报修派单', method: 'PUT', uri: '/repair/assign', params: '{"id":12,"handler":"李师傅"}', ip: '127.0.0.1', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', status: 1, errorMsg: null, costMs: 71, createTime: '2026-09-16 11:03:26' },
        { id: 6, userId: 2, username: 'wuye01', realName: '王丽', role: 'STAFF', module: '车位管理', action: '车位分配', method: 'POST', uri: '/parking/allocate', params: '{"spaceId":44,"ownerId":57}', ip: '127.0.0.1', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', status: 0, errorMsg: '车位已被占用', costMs: 33, createTime: '2026-09-16 11:41:08' },
        { id: 7, userId: 6, username: 'yeye01', realName: '邹建华', role: 'OWNER', module: '报修工单', action: '新增', method: 'POST', uri: '/repair', params: '{"houseId":1,"content":"厨房水管渗水"}', ip: '127.0.0.1', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', status: 1, errorMsg: null, costMs: 84, createTime: '2026-09-16 13:19:45' },
        { id: 8, userId: 1, username: 'admin', realName: '系统管理员', role: 'ADMIN', module: '登录认证', action: '修改密码', method: 'POST', uri: '/auth/password', params: '{"oldPassword":"***","newPassword":"***"}', ip: '127.0.0.1', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', status: 1, errorMsg: null, costMs: 121, createTime: '2026-09-16 14:02:33' },
        { id: 9, userId: 1, username: 'admin', realName: '系统管理员', role: 'ADMIN', module: '登录认证', action: '注销', method: 'POST', uri: '/auth/logout', params: null, ip: '127.0.0.1', userAgent: 'Mozilla/5.0 (Windows NT 10.0; Win64; x64)', status: 1, errorMsg: null, costMs: 12, createTime: '2026-09-16 14:03:10' }
    ];

    /** 演示模式: 把写操作也记进日志, 保持与后端 OperationLogInterceptor 一致的体验 */
    const SKIP_LOG = ['/auth/captcha', '/auth/refresh'];

    /**
     * 读取当前登录用户(演示模式用)。
     * 注意: 必须容忍"没有 localStorage 的运行环境" —— Node 单测(test_mock.js)用 vm 构造的
     * 最小沙箱里就没有 localStorage, 直接访问会抛 ReferenceError, 让所有写操作一起挂掉。
     */
    function readLocalUser() {
        try {
            if (typeof localStorage === 'undefined') return null;
            return JSON.parse(localStorage.getItem('pms_user') || 'null');
        } catch (e) {
            return null;
        }
    }

    function recordDemoLog(method, path, options, res) {
        if (!['post', 'put', 'delete'].includes(method) || SKIP_LOG.includes(path)) return;
        const seg = path.split('/').filter(Boolean);
        const moduleName = {
            auth: '登录认证', building: '楼栋管理', house: '房屋管理', owner: '人员档案',
            parking: '车位管理', feeStandard: '收费标准', feeBill: '费用账单', feePayment: '缴费记录',
            tempParking: '临时停车', repair: '报修工单', complaint: '投诉建议', notice: '通知公告',
            visitor: '访客管理', equipment: '设备设施', log: '操作日志'
        }[seg[0]] || seg[0];
        const action = {
            'post /auth/login': '登录', 'post /auth/logout': '注销', 'post /auth/password': '修改密码',
            'post /house/checkIn': '房屋入住登记', 'post /parking/allocate': '车位分配',
            'post /parking/release': '车位退租', 'post /feeBill/generate/property': '生成物业费账单',
            'post /feeBill/generate/parking': '生成车位费账单', 'post /feeBill/pay': '账单缴费',
            'post /feeBill/payBatch': '批量缴费', 'post /feeBill/cancelPay': '撤销缴费',
            'post /tempParking/entry': '临时车入场登记', 'post /tempParking/exit': '临时车出场结算',
            'post /repair/assign': '报修派单', 'post /repair/start': '报修开工',
            'post /repair/finish': '报修完工', 'post /repair/rate': '报修评价',
            'post /complaint/reply': '投诉回复', 'post /equipment/maintain': '设备维保登记',
            'post /visitor/leave': '访客离场核销'
        }[method + ' ' + path] || { post: '新增', put: '修改', delete: '删除' }[method];
        const me = readLocalUser() || DB.user[0];
        const body = Object.assign({}, options.data || {});
        ['password', 'oldPassword', 'newPassword', 'captchaCode', 'token'].forEach(k => {
            if (body[k] !== undefined) body[k] = '***';
        });
        DB.sysLog.push({
            id: nextId(DB.sysLog),
            userId: me ? me.id : null,
            username: me ? me.username : null,
            realName: me ? me.realName : null,
            role: me ? me.role : null,
            module: moduleName,
            action: action,
            method: method.toUpperCase(),
            uri: path,
            params: Object.keys(body).length ? JSON.stringify(body) : null,
            ip: '127.0.0.1',
            userAgent: 'Mozilla/5.0 (Demo Mode)',
            status: res && res.code === 200 ? 1 : 0,
            errorMsg: res && res.code === 200 ? null : (res ? res.msg : null),
            costMs: 20 + Math.floor(Math.random() * 90),
            createTime: new Date().toISOString().replace('T', ' ').substring(0, 19)
        });
    }

    function buildLogStatistics() {
        const byModule = {};
        const byDay = {};
        DB.sysLog.forEach(r => {
            byModule[r.module] = (byModule[r.module] || 0) + 1;
            const day = String(r.createTime).substring(0, 10);
            byDay[day] = (byDay[day] || 0) + 1;
        });
        const today = new Date().toISOString().substring(0, 10);
        return {
            total: DB.sysLog.length,
            today: DB.sysLog.filter(r => String(r.createTime).substring(0, 10) === today).length,
            failCount: DB.sysLog.filter(r => r.status === 0).length,
            byModule: Object.keys(byModule).map(k => ({ name: k, value: byModule[k] }))
                .sort((a, b) => b.value - a.value),
            byDay: Object.keys(byDay).sort().map(k => ({ name: k, value: byDay[k] }))
        };
    }
    const scHouse = () => SCOPE_OWNER ? DB.house.filter(h => h.id === SCOPE_OWNER.houseId) : DB.house;
    const scOwner = () => SCOPE_OWNER ? DB.owner.filter(o => o.houseId === SCOPE_OWNER.houseId) : DB.owner;
    const scParking = () => SCOPE_OWNER ? DB.parking.filter(p => p.ownerId === SCOPE_OWNER.id) : DB.parking;
    const scBill = () => SCOPE_OWNER
        ? DB.feeBill.filter(b => b.houseId === SCOPE_OWNER.houseId || b.ownerId === SCOPE_OWNER.id) : DB.feeBill;
    const scPayment = () => SCOPE_OWNER ? DB.feePayment.filter(p => p.ownerId === SCOPE_OWNER.id) : DB.feePayment;
    const scRepair = () => SCOPE_OWNER ? DB.repair.filter(r => r.ownerId === SCOPE_OWNER.id) : DB.repair;
    const scComplaint = () => SCOPE_OWNER ? DB.complaint.filter(c => c.ownerId === SCOPE_OWNER.id) : DB.complaint;
    const scVisitor = () => SCOPE_OWNER
        ? DB.visitor.filter(v => v.visitOwnerId === SCOPE_OWNER.id || v.visitOwner === SCOPE_OWNER.name) : DB.visitor;
    const scBuilding = () => {
        if (!SCOPE_OWNER) return DB.building;
        const h = DB.house.find(x => x.id === SCOPE_OWNER.houseId);
        return h ? DB.building.filter(b => b.id === h.buildingId) : [];
    };

    function buildOverview() {
        const houseTotal = scHouse().length;
        const occupied = scHouse().filter(h => h.status === 'OCCUPIED' || h.status === 'RENTED').length;
        const empty = scHouse().filter(h => h.status === 'EMPTY').length;
        const parkingTotal = scParking().length;
        const parkingUsed = scParking().filter(p => p.status !== 'FREE').length;
        const ownerCount = scOwner().filter(o => o.personType === 'OWNER').length;
        const tenantCount = scOwner().filter(o => o.personType === 'TENANT').length;

        const curBills = scBill().filter(b => b.period === '2026-09');
        const receivable = curBills.reduce((s, b) => s + b.amount, 0);
        const received = curBills.reduce((s, b) => s + b.paidAmount, 0);
        const unpaid = scBill().reduce((s, b) => s + Math.max(0, b.amount - b.paidAmount), 0);
        const todayPay = scPayment().filter(p => p.payTime && p.payTime.substring(0, 10) === '2026-09-16');
        const tempIncome = SCOPE_OWNER ? 0 : DB.tempParking
            .filter(t => t.entryTime.substring(0, 10) === '2026-09-16')
            .reduce((s, t) => s + (t.paidFee || 0), 0);

        const rate = (a, b) => b > 0 ? (Math.round(a / b * 1000) / 10) + '%' : '0%';

        return {
            scope: SCOPE_OWNER ? 'SELF' : 'ALL',
            buildingCount: scBuilding().length,
            houseCount: houseTotal,
            occupiedCount: occupied,
            emptyCount: empty,
            occupancyRate: rate(occupied, houseTotal),
            ownerTotal: scOwner().length,
            ownerCount: ownerCount,
            tenantCount: tenantCount,
            parkingTotal: parkingTotal,
            parkingUsed: parkingUsed,
            parkingFree: parkingTotal - parkingUsed,
            parkingUsedRate: rate(parkingUsed, parkingTotal),
            currentPeriod: '2026-09',
            monthReceivable: Math.round(receivable * 100) / 100,
            monthReceived: Math.round(received * 100) / 100,
            monthCollectRate: rate(received, receivable),
            unpaidAmount: Math.round(unpaid * 100) / 100,
            todayIncome: Math.round(todayPay.reduce((s, p) => s + p.amount, 0) * 100) / 100,
            tempParkingIncome: Math.round(tempIncome * 100) / 100,
            tempParkingInCount: SCOPE_OWNER
                ? scVisitor().filter(v => v.status === 'IN').length
                : DB.tempParking.filter(t => !t.exitTime).length,
            repairTotal: scRepair().length,
            repairPending: scRepair().filter(r => r.status === 'PENDING').length,
            repairAssigned: scRepair().filter(r => r.status === 'ASSIGNED').length,
            repairProcessing: scRepair().filter(r => r.status === 'PROCESSING').length,
            repairFinished: scRepair().filter(r => r.status === 'FINISHED').length,
            repairUnfinished: scRepair().filter(r => ['PENDING', 'ASSIGNED', 'PROCESSING'].includes(r.status)).length,
            repairAvgRating: (() => {
                const rs = scRepair().filter(r => r.rating);
                return rs.length ? Math.round(rs.reduce((s, r) => s + r.rating, 0) / rs.length * 100) / 100 : 0;
            })(),
            complaintTotal: scComplaint().length,
            complaintPending: scComplaint().filter(c => c.status === 'PENDING').length,
            equipmentTotal: DB.equipment.length,
            equipmentRepair: DB.equipment.filter(e => e.status === 'REPAIR').length
        };
    }

    function buildCharts() {
        const feeTrend = {};
        scPayment().forEach(p => {
            const m = p.payTime.substring(0, 7);
            if (!feeTrend[m]) feeTrend[m] = { name: m, amount: 0, value: 0 };
            feeTrend[m].amount += p.amount;
            feeTrend[m].value += 1;
        });
        const periodMap = {};
        scBill().forEach(b => {
            if (!periodMap[b.period]) periodMap[b.period] = { name: b.period, amount: 0, paidAmount: 0, value: 0 };
            periodMap[b.period].amount += b.amount;
            periodMap[b.period].paidAmount += b.paidAmount;
            periodMap[b.period].value += 1;
        });
        const methodMap = {};
        scPayment().forEach(p => {
            if (!methodMap[p.payMethod]) methodMap[p.payMethod] = { name: p.payMethod, amount: 0, value: 0 };
            methodMap[p.payMethod].amount += p.amount;
            methodMap[p.payMethod].value += 1;
        });
        const parkingMap = {};
        scParking().forEach(p => {
            if (!parkingMap[p.spaceType]) parkingMap[p.spaceType] = { name: p.spaceType, value: 0, freeCount: 0, usedCount: 0, totalFee: 0 };
            const m = parkingMap[p.spaceType];
            m.value += 1;
            if (p.status === 'FREE') m.freeCount += 1; else m.usedCount += 1;
            m.totalFee += p.monthFee;
        });
        const buildingHouse = scBuilding().map(b => {
            const hs = scHouse().filter(h => h.buildingId === b.id);
            return {
                buildingNo: b.buildingNo,
                totalHouse: hs.length,
                occupiedHouse: hs.filter(h => h.status === 'OCCUPIED' || h.status === 'RENTED').length,
                emptyHouse: hs.filter(h => h.status === 'EMPTY').length
            };
        });
        return {
            feeTrend: Object.values(feeTrend).sort((a, b) => a.name < b.name ? -1 : 1).map(x => ({ ...x, amount: Math.round(x.amount * 100) / 100 })),
            houseStatus: uniquePairs(scHouse(), 'status'),
            repairTypes: uniquePairs(scRepair(), 'repairType'),
            parkingTypes: Object.values(parkingMap),
            payMethods: Object.values(methodMap).map(x => ({ ...x, amount: Math.round(x.amount * 100) / 100 })),
            billPeriods: Object.values(periodMap).sort((a, b) => a.name < b.name ? -1 : 1),
            buildingHouse: buildingHouse
        };
    }

    function buildTodos() {
        const list = [];
        // 业主视角: 只提醒与自己相关的事项
        if (SCOPE_OWNER) {
            const unpaidSelf = scBill().reduce((s, b) => s + Math.max(0, b.amount - b.paidAmount), 0);
            if (unpaidSelf > 0) {
                list.push({ level: 'danger', title: '待缴费用', desc: '我有 ' + Math.round(unpaidSelf * 100) / 100 + ' 元费用待缴纳', path: '/feeBill' });
            }
            const doing = scRepair().filter(r => ['PENDING', 'ASSIGNED', 'PROCESSING'].includes(r.status)).length;
            if (doing) list.push({ level: 'warning', title: '报修进行中', desc: doing + ' 条报修工单正在处理', path: '/repair' });
            if (scComplaint().filter(c => c.status === 'PENDING').length) {
                list.push({ level: 'info', title: '投诉处理中', desc: '我的投诉建议正在处理', path: '/complaint' });
            }
            const vIn = scVisitor().filter(v => v.status === 'IN').length;
            if (vIn) list.push({ level: 'info', title: '访客在场', desc: vIn + ' 位访客登记为在场', path: '/visitor' });
            return list;
        }

        const urgent = DB.repair.filter(r => r.urgency === 'URGENT' && r.status !== 'FINISHED' && r.status !== 'CLOSED').length;
        if (urgent) list.push({ level: 'urgent', title: '紧急报修工单', desc: urgent + ' 条紧急工单待处理', path: '/repair' });
        const pending = DB.repair.filter(r => r.status === 'PENDING').length;
        if (pending) list.push({ level: 'warning', title: '待受理工单', desc: pending + ' 条报修工单待派单', path: '/repair' });
        const cp = DB.complaint.filter(c => c.status === 'PENDING').length;
        if (cp) list.push({ level: 'warning', title: '待处理投诉', desc: cp + ' 条投诉建议待处理', path: '/complaint' });
        const eq = DB.equipment.filter(e => e.status === 'REPAIR').length;
        if (eq) list.push({ level: 'info', title: '设备维修中', desc: eq + ' 台设备处于维修状态', path: '/equipment' });
        const inPark = DB.tempParking.filter(t => !t.exitTime).length;
        if (inPark) list.push({ level: 'info', title: '在场临停车辆', desc: inPark + ' 辆临时车辆仍在场', path: '/tempParking' });
        const unpaid = DB.feeBill.reduce((s, b) => s + (b.amount - b.paidAmount), 0);
        if (unpaid > 0) list.push({ level: 'danger', title: '欠费待催缴', desc: '累计欠费 ' + Math.round(unpaid * 100) / 100 + ' 元', path: '/feeBill' });
        return list;
    }

    /**
     * 数据大屏 聚合数据(与后端 DashboardService.screen() 返回结构保持一致)
     * 业主只拿到 overview/charts/todos; 明细维度(报修状态/账单状态/投诉类型/
     * 人员构成/设备状态/临停)仅管理侧返回 —— 与后端权限口径一致。
     */
    function buildScreen() {
        const isOwner = !!SCOPE_OWNER;
        const now = new Date();
        const p2 = n => (n < 10 ? '0' + n : '' + n);
        const out = {
            scope: isOwner ? 'SELF' : 'ALL',
            community: '阳光家园',
            serverTime: now.getFullYear() + '-' + p2(now.getMonth() + 1) + '-' + p2(now.getDate())
                + ' ' + p2(now.getHours()) + ':' + p2(now.getMinutes()) + ':' + p2(now.getSeconds()),
            overview: buildOverview(),
            charts: buildCharts(),
            todos: buildTodos()
        };
        if (isOwner) return out;

        // ---- 管理侧专属维度 ----
        out.buildingHouse = out.charts.buildingHouse;
        out.billPeriods = out.charts.billPeriods;
        out.repairStatus = uniquePairs(DB.repair, 'status');
        out.billStatus = uniquePairs(DB.feeBill, 'payStatus');
        out.complaintTypes = uniquePairs(DB.complaint, 'complaintType');
        out.complaintStatus = uniquePairs(DB.complaint, 'status');
        out.personTypes = uniquePairs(DB.owner, 'personType');
        out.equipmentStatus = uniquePairs(DB.equipment, 'status');
        out.tempParkingTypes = uniquePairs(DB.tempParking, 'parkType');
        return out;
    }

    // ==================== 主路由 ====================
    const COLLECTIONS = ['building', 'house', 'owner', 'parking', 'tempParking', 'feeStandard',
        'feeBill', 'feePayment', 'repair', 'complaint', 'notice', 'visitor', 'equipment'];

    function handle(method, url, options) {
        const params = Object.assign({}, options.params || {});
        const data = options.data || {};
        const path = url.split('?')[0];
        const seg = path.split('/').filter(Boolean);

        // 当前演示登录用户(用于与后端一致的角色隔离)
        const demoUser = readLocalUser();
        const demoOwner = (demoUser && demoUser.role === 'OWNER')
            ? DB.owner.find(o => o.phone === demoUser.phone) || null
            : null;
        // 后面的看板/图表/待办构建统一按此数据范围统计
        SCOPE_OWNER = demoOwner;

        // 内部人员(管理员/物业员工)才可执行管理类操作 —— 与后端 DataScope.requireStaff 对齐。
        // 未预置登录态时按默认管理员处理, 与下方 `readLocalUser() || DB.user[0]` 的既有口径一致。
        const demoRoleUser = demoUser || DB.user[0] || null;
        const demoStaff = !!demoRoleUser && (demoRoleUser.role === 'ADMIN' || demoRoleUser.role === 'STAFF');

        // 管理类「动作型」接口白名单: 非内部人员一律拒绝。
        // 注意 /feeBill/pay、/feeBill/payBatch、/repair/rate、/visitor/leave 刻意不在其中 ——
        // 业主可以缴自己的费、评价自己的工单、为自家访客登记离开(后端用 checkOwnerId 校验归属)。
        const STAFF_ONLY_PATHS = [
            '/feeBill/generate/property', '/feeBill/generate/parking', '/feeBill/cancelPay',
            '/tempParking/entry', '/tempParking/exit',
            '/parking/allocate', '/parking/release',
            '/repair/assign', '/repair/start', '/repair/finish',
            '/complaint/reply', '/equipment/maintain', '/house/checkIn'
        ];
        if (!demoStaff && STAFF_ONLY_PATHS.indexOf(path) >= 0) {
            return fail('当前账号无权执行该操作, 如需办理请联系物业');
        }

        // ---------- 认证 ----------
        if (path === '/auth/captcha') {
            // 演示模式不做真实验证: 直接给一张 SVG 图与固定答案, 保持"两步握手"的形状与真实后端一致
            const code = 'D8K2';
            const svg = '<svg xmlns="http://www.w3.org/2000/svg" width="132" height="44">'
                + '<rect width="132" height="44" fill="#fdf7ee"/>'
                + '<text x="66" y="30" font-size="24" font-family="Arial" font-weight="bold"'
                + ' text-anchor="middle" fill="#4a3423" letter-spacing="6">' + code + '</text></svg>';
            demoCaptcha = {
                id: 'demo-captcha-' + Date.now(),
                code: code,
                image: 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(svg)
            };
            return ok({
                captchaId: demoCaptcha.id,
                image: demoCaptcha.image,
                expireSeconds: 300,
                answer: code,
                echo: true
            });
        }
        if (path === '/auth/login') {
            const u = DB.user.find(x => x.username === data.username);
            if (!u) { demoLoginFails++; return fail('账号不存在'); }
            // 与后端一致: 失败达阈值后要求验证码
            if (demoLoginFails >= 3) {
                if (!data.captchaId || !data.captchaCode) {
                    return fail('本次登录需要图形验证码', 428);
                }
                if (!demoCaptcha || demoCaptcha.id !== data.captchaId
                    || String(data.captchaCode).toUpperCase() !== demoCaptcha.code) {
                    demoLoginFails++;
                    return fail('验证码不正确, 请重新输入');
                }
            }
            if (u.password !== data.password) { demoLoginFails++; return fail('密码错误'); }
            if (u.status !== 1) return fail('该账号已被禁用, 请联系管理员');
            demoLoginFails = 0;
            const user = Object.assign({}, u);
            delete user.password;
            return ok({
                token: 'demo-token-' + u.id,
                tokenType: 'Bearer',
                expiresIn: 7200,
                refreshAhead: 900,
                user: user
            }, '登录成功');
        }
        if (path === '/auth/refresh') {
            const u = DB.user[0];
            return ok({ token: 'demo-token-' + u.id + '-' + Date.now(), tokenType: 'Bearer', expiresIn: 7200 });
        }
        if (path === '/auth/logout') return ok(null, '已退出登录');
        if (path === '/auth/current') return ok(DB.user[0]);

        // ---------- 操作日志(仅管理员) ----------
        if (path === '/log/statistics') return ok(buildLogStatistics());
        if (seg[0] === 'log' && seg[1] === 'detail') {
            const row = DB.sysLog.find(x => x.id === +seg[2]);
            return row ? ok(row) : fail('日志记录不存在或已被清理');
        }
        if (path === '/log/page') {
            let rows = DB.sysLog.slice().sort((a, b) => b.id - a.id);
            if (params.keyword) {
                const kw = params.keyword;
                rows = rows.filter(r => ((r.username || '') + (r.realName || '') + (r.action || '') + (r.uri || '')).indexOf(kw) >= 0);
            }
            if (params.module) rows = rows.filter(r => r.module === params.module);
            if (params.role) rows = rows.filter(r => r.role === params.role);
            if (params.status !== undefined && params.status !== '' && params.status !== null) {
                rows = rows.filter(r => String(r.status) === String(params.status));
            }
            const total = rows.length;
            const num = +params.pageNum || 1;
            const size = +params.pageSize || 20;
            return ok({
                total: total, pageNum: num, pageSize: size,
                rows: rows.slice((num - 1) * size, num * size)
            });
        }

        // ---------- 首页看板 ----------
        if (path === '/dashboard/overview') return ok(buildOverview());
        if (path === '/dashboard/charts') return ok(buildCharts());
        if (path === '/dashboard/todos') return ok(buildTodos());
        if (path === '/dashboard/screen') return ok(buildScreen());

        // ---------- 用户管理 ----------
        if (seg[0] === 'auth' && seg[1] === 'users') {
            if (method === 'get' && seg.length === 2) {
                let rows = DB.user.map(u => { const c = Object.assign({}, u); delete c.password; return c; });
                if (params.keyword) rows = rows.filter(r =>
                    (r.username + r.realName + r.phone).indexOf(params.keyword) >= 0);
                if (params.role) rows = rows.filter(r => r.role === params.role);
                return ok(rows);
            }
            if (method === 'get') return ok(DB.user.find(u => u.id === +seg[2]));
            if (method === 'post') {
                if (DB.user.some(u => u.username === data.username)) return fail('账号 ' + data.username + ' 已存在');
                data.id = nextId(DB.user);
                data.password = data.password || '123456';
                data.status = data.status === undefined ? 1 : data.status;
                data.createTime = '2026-09-16 10:00:00';
                DB.user.push(data);
                return ok(null, '新增成功');
            }
            if (method === 'put') {
                const u = DB.user.find(x => x.id === data.id);
                if (!u) return fail('用户不存在');
                if (data.password) u.password = data.password;
                ['realName', 'phone', 'role', 'status'].forEach(k => { if (data[k] !== undefined && data[k] !== null && data[k] !== '') u[k] = data[k]; });
                return ok(null, '修改成功');
            }
            if (method === 'delete') {
                if (+seg[2] === 1) return fail('超级管理员账号不可删除');
                DB.user = DB.user.filter(u => u.id !== +seg[2]);
                return ok(null, '删除成功');
            }
        }

        // ---------- 3D 小区场景 ----------
        if (path === '/community/scene') {
            const isOwner = !!demoOwner;
            const buildings = DB.building.map(b => {
                const hs = DB.house.filter(h => h.buildingId === b.id);
                const occupied = hs.filter(h => h.status === 'OCCUPIED' || h.status === 'RENTED').length;
                const empty = hs.filter(h => h.status === 'EMPTY').length;
                const row = {
                    id: b.id, buildingNo: b.buildingNo, name: b.name, buildingType: b.buildingType,
                    unitCount: b.unitCount, floorCount: b.floorCount, buildYear: b.buildYear,
                    houseCount: hs.length || b.houseCount, occupiedCount: occupied, emptyCount: empty,
                    occupancyRate: hs.length ? Math.round(occupied * 100 / hs.length) + '%' : '0%',
                    totalArea: b.totalArea
                };
                // 物业负责人属于内部信息, 业主账号不下发(与后端一致)
                if (!isOwner) { row.manager = b.manager; row.managerPhone = b.managerPhone; }
                return row;
            });
            const scene = { isOwner: isOwner, buildings: buildings, myHouse: null };
            if (isOwner) {
                const h = DB.house.find(x => x.id === demoOwner.houseId);
                if (h) {
                    scene.myHouse = {
                        houseId: h.id, houseNo: h.houseNo, buildingId: h.buildingId, buildingName: h.buildingName,
                        unitNo: h.unitNo, floorNo: h.floorNo, roomNo: h.roomNo, area: h.area,
                        houseType: h.houseType, status: h.status, ownerName: demoOwner.name
                    };
                }
            }
            return ok(scene);
        }

        // ---------- 特殊业务接口 ----------
        // 物业费账单: 生成 / 缴费 / 撤销
        if (path === '/feeBill/generate/property') {
            const period = params.period;
            const created = DB.house.filter(h => h.ownerId && (h.status === 'OCCUPIED' || h.status === 'RENTED'))
                .filter(h => !DB.feeBill.some(b => b.ownerId === h.ownerId && b.period === period && b.feeType === 'PROPERTY')).length;
            return ok({ period, created, message: '账期 ' + period + ' 物业费账单生成完成: 新增 ' + created + ' 条' });
        }
        if (path === '/feeBill/generate/parking') {
            const period = params.period;
            const created = DB.parking.filter(s => s.status !== 'FREE' && s.ownerId)
                .filter(s => !DB.feeBill.some(b => b.parkingId === s.id && b.period === period && b.feeType === 'PARKING')).length;
            return ok({ period, created, message: '账期 ' + period + ' 车位管理费账单生成完成: 新增 ' + created + ' 条' });
        }
        if (path === '/feeBill/pay') {
            const bill = DB.feeBill.find(b => b.id === +params.id);
            if (!bill) return fail('账单不存在');
            if (bill.payStatus === 'PAID') return fail('账单 ' + bill.billNo + ' 已缴费, 无需重复缴费');
            bill.paidAmount = bill.amount;
            bill.payStatus = 'PAID';
            bill.payTime = '2026-09-16 10:30:00';
            bill.payMethod = params.payMethod || 'WECHAT';
            DB.feePayment.push({
                id: nextId(DB.feePayment), paymentNo: 'PAY' + Date.now(),
                billId: bill.id, billNo: bill.billNo, ownerId: bill.ownerId,
                ownerName: bill.ownerName, feeName: bill.feeName, amount: bill.amount,
                payMethod: bill.payMethod, payTime: bill.payTime, operator: '系统管理员'
            });
            return ok({ message: '缴费成功, 实收 ' + bill.amount + ' 元', amount: bill.amount });
        }
        if (path === '/feeBill/payBatch') {
            const ids = data || [];
            let total = 0, success = 0;
            ids.forEach(id => {
                const bill = DB.feeBill.find(b => b.id === id);
                if (bill && bill.payStatus !== 'PAID') {
                    bill.paidAmount = bill.amount;
                    bill.payStatus = 'PAID';
                    bill.payTime = '2026-09-16 10:30:00';
                    bill.payMethod = params.payMethod || 'WECHAT';
                    total += bill.amount;
                    success++;
                }
            });
            return ok({ message: '批量缴费完成: 成功 ' + success + ' 笔, 合计 ' + Math.round(total * 100) / 100 + ' 元', success, total });
        }
        if (path === '/feeBill/cancelPay') {
            const bill = DB.feeBill.find(b => b.id === +params.id);
            if (!bill) return fail('账单不存在');
            if (bill.payStatus !== 'PAID') return fail('该账单未缴费, 无法撤销');
            bill.paidAmount = 0;
            bill.payStatus = 'UNPAID';
            bill.payMethod = null;
            bill.payTime = null;
            DB.feePayment = DB.feePayment.filter(p => p.billId !== bill.id);
            return ok({ message: '已撤销账单 ' + bill.billNo + ' 的缴费记录' });
        }

        // 临时停车: 入场 / 出场
        if (path === '/tempParking/entry') {
            const p = (data.carPlate || '').toUpperCase();
            if (!p) return fail('请输入车牌号');
            if (DB.tempParking.some(t => t.carPlate === p && !t.exitTime)) {
                return fail('车辆 ' + p + ' 已在场, 请勿重复入场');
            }
            const rec = {
                id: nextId(DB.tempParking),
                recordNo: 'LS' + new Date().getTime().toString().slice(-12),
                carPlate: p,
                carType: data.carType || '小型车',
                spaceNo: data.spaceNo || null,
                parkType: data.parkType || 'OUTSIDE',
                entryTime: '2026-09-16 15:00:00',
                exitTime: null, duration: 0, fee: 0, paidFee: 0,
                payStatus: 'UNPAID', payMethod: null,
                gate: data.gate || '外街西口岗亭',
                operator: '系统管理员', remark: '车辆在场'
            };
            DB.tempParking.unshift(rec);
            return ok(rec, '车辆入场登记成功');
        }
        if (path === '/tempParking/exit') {
            const rec = DB.tempParking.find(t => t.id === +params.id);
            if (!rec) return fail('停车记录不存在');
            if (rec.exitTime) return fail('该记录已完成出场结算, 不能重复操作');
            const minutes = rec.duration || 0;
            const fee = calcParkFee(minutes);
            const free = params.payMethod === 'FREE';
            rec.exitTime = '2026-09-16 15:00:00';
            rec.fee = fee;
            rec.paidFee = free ? 0 : fee;
            rec.payStatus = free ? 'FREE' : 'PAID';
            rec.payMethod = free ? null : (params.payMethod || 'WECHAT');
            rec.remark = free ? '免费放行' : '已结算出场';
            return ok({
                message: free
                    ? '车辆 ' + rec.carPlate + ' 已免费放行, 停车 ' + minutes + ' 分钟'
                    : '车辆 ' + rec.carPlate + ' 停车 ' + minutes + ' 分钟, 应收 ' + fee + ' 元, 已结算',
                fee: fee, duration: minutes
            });
        }
        if (path === '/tempParking/inParking') {
            return ok(DB.tempParking.filter(t => !t.exitTime));
        }
        if (seg[0] === 'tempParking' && seg[1] === 'preview') {
            const rec = DB.tempParking.find(t => t.id === +seg[2]);
            if (!rec) return fail('停车记录不存在');
            return ok({
                carPlate: rec.carPlate, entryTime: rec.entryTime,
                duration: rec.duration, durationText: rec.duration + '分钟',
                fee: rec.exitTime ? rec.fee : calcParkFee(rec.duration)
            });
        }
        if (path === '/tempParking/calcFee') {
            return ok(calcParkFee(parseInt(params.minutes || 0, 10)));
        }

        // 车位分配 / 释放
        if (path === '/parking/allocate') {
            const sp = DB.parking.find(s => s.id === +params.id);
            if (!sp) return fail('车位不存在');
            if (sp.status !== 'FREE') return fail('车位 ' + sp.spaceNo + ' 已被占用, 不可重复分配');
            const o = DB.owner.find(x => x.id === +params.ownerId);
            sp.status = params.status || 'RENTED';
            sp.ownerId = o ? o.id : null;
            sp.ownerName = o ? o.name : null;
            sp.carPlate = params.carPlate || (o ? o.carPlate : null);
            sp.startDate = params.startDate || '2026-09-16';
            sp.endDate = params.endDate || '2027-09-16';
            return ok(null, '车位分配成功');
        }
        if (path === '/parking/release') {
            const sp = DB.parking.find(s => s.id === +params.id);
            if (!sp) return fail('车位不存在');
            if (sp.status === 'FREE') return fail('车位 ' + sp.spaceNo + ' 当前已是空闲状态');
            sp.status = 'FREE';
            sp.ownerId = null;
            sp.ownerName = null;
            sp.carPlate = null;
            sp.startDate = null;
            sp.endDate = null;
            return ok(null, '车位已释放');
        }

        // 报修: 派单 / 开始 / 完工 / 评价
        if (path === '/repair/assign') {
            const r = DB.repair.find(x => x.id === +params.id);
            if (!r) return fail('工单不存在');
            if (['FINISHED', 'CLOSED'].includes(r.status)) return fail('工单已结束, 无法派单');
            if (!params.handler) return fail('请选择维修人员');
            r.handler = params.handler;
            r.handlerPhone = params.handlerPhone || null;
            r.status = 'ASSIGNED';
            r.assignTime = '2026-09-16 10:00:00';
            return ok({ message: '工单 ' + r.orderNo + ' 已派单给 ' + params.handler });
        }
        if (path === '/repair/start') {
            const r = DB.repair.find(x => x.id === +params.id);
            if (!r) return fail('工单不存在');
            if (!r.handler) return fail('请先派单后再开始处理');
            r.status = 'PROCESSING';
            return ok(null, '工单已开始处理');
        }
        if (path === '/repair/finish') {
            const r = DB.repair.find(x => x.id === +params.id);
            if (!r) return fail('工单不存在');
            if (r.status === 'FINISHED') return fail('工单已完成, 请勿重复操作');
            if (!r.handler) return fail('请先派单后再完工');
            r.status = 'FINISHED';
            r.finishTime = '2026-09-16 16:00:00';
            r.cost = parseFloat(params.cost || 0);
            r.remark = params.remark || null;
            return ok({ message: '工单 ' + r.orderNo + ' 已完工, 请通知业主验收' });
        }
        if (path === '/repair/rate') {
            const r = DB.repair.find(x => x.id === +params.id);
            if (!r) return fail('工单不存在');
            if (r.status !== 'FINISHED') return fail('工单完工后才能评价');
            r.rating = parseInt(params.rating, 10);
            r.feedback = params.feedback || null;
            r.status = 'CLOSED';
            return ok(null, '感谢您的评价');
        }

        // 投诉受理回复
        if (path === '/complaint/reply') {
            const c = DB.complaint.find(x => x.id === +params.id);
            if (!c) return fail('投诉记录不存在');
            if (!params.reply) return fail('请填写处理回复内容');
            c.handler = '系统管理员';
            c.reply = params.reply;
            c.status = params.resolved === 'false' ? 'PROCESSING' : 'RESOLVED';
            c.handleTime = '2026-09-16 11:00:00';
            return ok({ message: params.resolved === 'false' ? '已受理, 状态更新为处理中' : '投诉 ' + c.complaintNo + ' 已处理完成' });
        }

        // 访客离开
        if (path === '/visitor/leave') {
            const v = DB.visitor.find(x => x.id === +params.id);
            if (!v) return fail('访客记录不存在');
            if (v.status === 'OUT') return fail('该访客已登记离开');
            v.status = 'OUT';
            v.leaveTime = '2026-09-16 15:30:00';
            return ok({ message: '访客 ' + v.visitorName + ' 已登记离开' });
        }

        // 设备维保
        if (path === '/equipment/maintain') {
            const e = DB.equipment.find(x => x.id === +params.id);
            if (!e) return fail('设备不存在');
            e.lastMaintain = params.maintainDate || '2026-09-16';
            const nd = new Date(2026, 8, 16);
            nd.setDate(nd.getDate() + (e.maintainCycle || 30));
            e.nextMaintain = dateStr(nd.getFullYear(), nd.getMonth() + 1, nd.getDate());
            e.status = 'NORMAL';
            return ok(null, '维保记录已登记, 下次维保日期已自动更新');
        }

        // 房屋入住登记
        if (path === '/house/checkIn') {
            const h = DB.house.find(x => x.id === +params.id);
            if (!h) return fail('房屋不存在');
            if (params.ownerId) h.ownerId = +params.ownerId;
            if (params.status) h.status = params.status;
            return ok(null, '入住登记已完成');
        }

        // 通知公告详情(阅读量+1)
        if (seg[0] === 'notice' && seg.length === 3 && method === 'get') {
            const n = DB.notice.find(x => x.id === +seg[2]);
            if (!n) return fail('公告不存在');
            n.viewCount = (n.viewCount || 0) + 1;
            return ok(n);
        }

        // ---------- 各模块统计接口 ----------
        if (seg.length >= 2 && (seg[1] === 'statistics' || seg[1] === 'statistics' )) {
            const res = seg[0];
            const sub = seg[2] || '';
            if (res === 'building') return ok(buildCharts().buildingHouse);
            if (res === 'house' && sub === 'status') return ok(uniquePairs(DB.house, 'status'));
            if (res === 'house' && sub === 'type') return ok(uniquePairs(DB.house, 'houseType'));
            if (res === 'owner') return ok(uniquePairs(DB.owner, 'personType'));
            if (res === 'parking') return ok(buildCharts().parkingTypes);
            if (res === 'tempParking') return ok(uniquePairs(DB.tempParking, 'parkType'));
            if (res === 'repair' && sub === 'status') return ok(uniquePairs(DB.repair, 'status'));
            if (res === 'repair' && sub === 'type') return ok(uniquePairs(DB.repair, 'repairType'));
            if (res === 'complaint' && sub === 'status') return ok(uniquePairs(DB.complaint, 'status'));
            if (res === 'complaint' && sub === 'type') return ok(uniquePairs(DB.complaint, 'complaintType'));
            if (res === 'feeBill' && sub === 'status') return ok(uniquePairs(DB.feeBill, 'payStatus'));
            if (res === 'feeBill' && sub === 'type') return ok(uniquePairs(DB.feeBill, 'feeType'));
            if (res === 'feeBill' && sub === 'period') return ok(buildCharts().billPeriods);
            if (res === 'feePayment' && sub === 'month') return ok(buildCharts().feeTrend);
            if (res === 'feePayment' && sub === 'method') return ok(buildCharts().payMethods);
            return ok([]);
        }

        // ---------- 通用 CRUD ----------
        const resource = seg[0];
        if (!COLLECTIONS.includes(resource) && resource !== 'user') {
            return fail('演示模式暂不支持该接口: ' + method.toUpperCase() + ' ' + path);
        }
        const coll = DB[resource];

        // 管理类资源的写操作: 只有内部人员可执行(与后端 DataScope.requireStaff 对齐)
        const STAFF_ONLY_RESOURCES = ['building', 'equipment', 'feeStandard', 'notice',
            'parking', 'tempParking', 'house', 'feeBill', 'feePayment'];
        if (method !== 'get' && STAFF_ONLY_RESOURCES.indexOf(resource) >= 0 && !demoStaff) {
            return fail('当前账号无权修改该模块数据, 如需办理请联系物业');
        }
        // 人员档案: 录入/删除仅物业; 修改走下面的业主自助分支
        if ((method === 'post' || method === 'delete') && resource === 'owner' && !demoStaff) {
            return fail('当前账号无权' + (method === 'post' ? '录入' : '删除') + '人员信息, 如需办理请联系物业');
        }

        // 列表 / 分页
        if (method === 'get' && (seg[1] === 'page' || seg[1] === 'list')) {
            let rows = coll.filter(r => match(r, params, resource));
            // 业主账号的数据隔离(与后端 DataScope 行为保持一致)
            if (demoOwner) {
                if (resource === 'house') rows = rows.filter(r => r.id === demoOwner.houseId);
                else if (resource === 'owner') rows = rows.filter(r => r.houseId === demoOwner.houseId);
            }
            // 排序
            if (resource === 'building') rows = rows.slice().sort((a, b) => a.id - b.id);
            else if (resource === 'house') rows = rows.slice().sort((a, b) => a.buildingId - b.buildingId || a.unitNo - b.unitNo || a.floorNo - b.floorNo);
            else if (resource === 'parking') rows = rows.slice().sort((a, b) => (a.spaceType > b.spaceType ? 1 : -1) || (a.spaceNo > b.spaceNo ? 1 : -1));
            else if (resource === 'tempParking') rows = rows.slice().sort((a, b) => b.entryTime > a.entryTime ? -1 : 1);
            else if (resource === 'feeBill') rows = rows.slice().sort((a, b) => (a.period < b.period ? 1 : -1) || b.id - a.id);
            else if (resource === 'feePayment') rows = rows.slice().sort((a, b) => b.payTime > a.payTime ? -1 : 1);
            else if (resource === 'notice') rows = rows.slice().sort((a, b) => (b.topFlag - a.topFlag) || (a.publishTime < b.publishTime ? 1 : -1));
            else if (resource === 'repair' || resource === 'complaint') rows = rows.slice().sort((a, b) => (a.createTime < b.createTime ? 1 : -1));
            else if (resource === 'visitor') rows = rows.slice().sort((a, b) => (a.visitTime < b.visitTime ? 1 : -1));

            const copy = clone(rows);
            if (seg[1] === 'page') return ok(pageOf(copy, params));
            return ok(copy);
        }

        // 详情
        if (method === 'get' && seg.length === 3) {
            const row = coll.find(r => r.id === +seg[2]);
            if (!row) return fail('记录不存在');
            // 业主账号不得查看他人房间/人员(与后端一致)
            if (demoOwner) {
                if (resource === 'house' && row.id !== demoOwner.houseId) return fail('无权查看其他房间的信息');
                if (resource === 'owner' && row.houseId !== demoOwner.houseId) return fail('无权查看他人的信息');
            }
            return ok(clone(row));
        }

        // 新增
        if (method === 'post') {
            const row = Object.assign({}, data);
            row.id = nextId(coll);

            // 关联字段自动补全
            if (resource === 'house' && row.buildingId) {
                const b = DB.building.find(x => x.id === row.buildingId);
                row.buildingName = b ? b.name : null;
            }
            if (resource === 'owner' && row.houseId) {
                const h = DB.house.find(x => x.id === row.houseId);
                row.houseNo = h ? h.houseNo : null;
                if (h && row.personType === 'OWNER') { h.ownerId = row.id; h.status = 'OCCUPIED'; }
                if (h && row.personType === 'TENANT') { h.ownerId = row.id; h.status = 'RENTED'; }
            }
            if (!row.createTime && ['building', 'house', 'owner', 'repair', 'complaint'].includes(resource)) {
                row.createTime = '2026-09-16 10:00:00';
            }
            if (resource === 'notice') {
                row.publishTime = row.publishTime || '2026-09-16 10:00:00';
                row.viewCount = 0;
                row.status = row.status === undefined ? 1 : row.status;
                row.topFlag = row.topFlag || 0;
            }
            if (resource === 'equipment' && row.lastMaintain) {
                const nd = new Date(row.lastMaintain);
                nd.setDate(nd.getDate() + (row.maintainCycle || 30));
                row.nextMaintain = dateStr(nd.getFullYear(), nd.getMonth() + 1, nd.getDate());
            }
            if (resource === 'tempParking') {
                row.entryTime = row.entryTime || '2026-09-16 10:00:00';
                row.payStatus = row.payStatus || 'UNPAID';
            }
            if (resource === 'visitor') {
                row.visitTime = row.visitTime || '2026-09-16 10:00:00';
                row.status = row.status || 'IN';
            }

            // 业主提交报修/投诉/访客登记时, 只能落到自己名下(与后端 checkOwnerId 对齐)
            if (demoOwner) {
                if (resource === 'repair' || resource === 'complaint') {
                    if (row.ownerId !== null && row.ownerId !== undefined && +row.ownerId !== demoOwner.id) {
                        return fail('无权为其他住户办理, 只能提交本人的事项');
                    }
                    row.ownerId = demoOwner.id;
                    row.houseId = row.houseId || demoOwner.houseId;
                }
                if (resource === 'visitor') {
                    if (row.visitOwnerId !== null && row.visitOwnerId !== undefined
                        && +row.visitOwnerId !== demoOwner.id) {
                        return fail('无权为其他住户登记访客');
                    }
                    row.visitOwnerId = demoOwner.id;
                }
            }

            coll.push(row);
            return ok(null, '新增成功');
        }

        // 修改
        if (method === 'put') {
            const row = coll.find(r => r.id === data.id);
            if (!row) return fail('记录不存在');

            // 业主自助修改自己的档案: 只能改自己那一条, 且仅限联系方式类字段
            // (与后端 OwnerService#updateSelf 的字段白名单保持一致;
            //  所属房屋/人员类型/身份证号等关键字段一律忽略, 防止越权到别人房间)
            if (resource === 'owner' && demoOwner && !demoStaff) {
                if (data.id !== demoOwner.id) {
                    return fail('只能修改自己的信息, 如需变更他人档案请联系物业');
                }
                const SELF_EDITABLE = ['name', 'gender', 'phone', 'carPlate',
                    'emergencyName', 'emergencyPhone', 'familyCount', 'remark'];
                SELF_EDITABLE.forEach(k => {
                    if (data[k] !== null && data[k] !== undefined) row[k] = data[k];
                });
                // 手机号是「登录账号 ↔ 人员档案」的关联键, 换号要同步登录账号(与后端一致)
                if (data.phone && demoUser && data.phone !== demoUser.phone) {
                    try {
                        const u = readLocalUser();
                        if (u) {
                            u.phone = data.phone;
                            if (typeof localStorage !== 'undefined') {
                                localStorage.setItem('pms_user', JSON.stringify(u));
                            }
                        }
                    } catch (e) { /* 无 localStorage 环境忽略 */ }
                }
                return ok(null, '个人信息已更新');
            }

            Object.keys(data).forEach(k => {
                if (k !== 'id' && data[k] !== null && data[k] !== undefined) {
                    row[k] = data[k];
                }
            });
            if (resource === 'house' && data.buildingId) {
                const b = DB.building.find(x => x.id === data.buildingId);
                if (b) row.buildingName = b.name;
            }
            if (resource === 'owner' && data.houseId) {
                const h = DB.house.find(x => x.id === data.houseId);
                if (h) row.houseNo = h.houseNo;
            }
            return ok(null, '修改成功');
        }

        // 删除
        if (method === 'delete') {
            const id = +seg[seg.length - 1];
            const idx = coll.findIndex(r => r.id === id);
            if (idx < 0) return fail('记录不存在');
            // 关联校验
            if (resource === 'building' && DB.house.some(h => h.buildingId === id)) {
                return fail('该楼栋下已存在房屋信息, 请先删除房屋后再操作');
            }
            if (resource === 'house' && DB.owner.some(o => o.houseId === id)) {
                return fail('该房屋下已登记人员信息, 请先移除人员后再删除');
            }
            coll.splice(idx, 1);
            return ok(null, '删除成功');
        }

        return fail('演示模式暂不支持该接口: ' + method.toUpperCase() + ' ' + path);
    }

    window.Mock = {
        handle(method, url, options) {
            return new Promise(resolve => {
                // 模拟轻微网络延迟
                setTimeout(() => {
                    try {
                        const path = String(url).split('?')[0];
                        const res = handle(method.toLowerCase(), url, options || {});
                        // 与后端 OperationLogInterceptor 对齐: 写操作与登录/注销自动留痕
                        recordDemoLog(method.toLowerCase(), path, options || {}, res);
                        resolve(res);
                    } catch (e) {
                        console.error('[Mock] 处理异常', e);
                        resolve({ code: 500, msg: '演示数据处理异常: ' + e.message, data: null });
                    }
                }, 40);
            });
        },
        db: DB
    };
})();
