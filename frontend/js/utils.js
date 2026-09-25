/**
 * 工具函数与数据字典
 */
(function () {

    /** 字典定义: value -> { label, tagType } */
    const DICT = {
        // 房屋状态
        houseStatus: {
            OCCUPIED: { label: '自住', tag: 'success' },
            RENTED: { label: '出租', tag: 'primary' },
            EMPTY: { label: '空置', tag: 'info' },
            DECORATING: { label: '装修中', tag: 'warning' }
        },
        // 人员类型
        personType: {
            OWNER: { label: '业主', tag: 'primary' },
            TENANT: { label: '租户', tag: 'warning' },
            FAMILY: { label: '家庭成员', tag: 'info' }
        },
        // 人员状态
        personStatus: {
            ACTIVE: { label: '在住', tag: 'success' },
            MOVED: { label: '已搬离', tag: 'info' }
        },
        // 楼栋类型
        buildingType: {
            '住宅': { label: '住宅', tag: 'primary' },
            '公寓': { label: '公寓', tag: 'success' },
            '别墅': { label: '别墅', tag: 'warning' },
            '商铺': { label: '商铺', tag: 'info' }
        },
        // 车位类型
        spaceType: {
            UNDERGROUND: { label: '地下车位', tag: 'primary' },
            GROUND: { label: '地面车位', tag: 'success' },
            OUTSIDE: { label: '小区外临街', tag: 'warning' }
        },
        // 车位状态
        spaceStatus: {
            FREE: { label: '空闲', tag: 'success' },
            SOLD: { label: '已售', tag: 'info' },
            RENTED: { label: '已租', tag: 'primary' }
        },
        // 停车区域
        parkType: {
            INSIDE: { label: '小区内', tag: 'primary' },
            OUTSIDE: { label: '小区外临街', tag: 'warning' }
        },
        // 停车缴费状态
        tempPayStatus: {
            PAID: { label: '已缴费', tag: 'success' },
            UNPAID: { label: '未缴费', tag: 'danger' },
            FREE: { label: '免费', tag: 'info' }
        },
        // 费用类型
        feeType: {
            PROPERTY: { label: '物业费', tag: 'primary' },
            PARKING: { label: '车位管理费', tag: 'success' },
            WATER: { label: '水费', tag: 'info' },
            ELECTRIC: { label: '电费', tag: 'warning' },
            GAS: { label: '燃气费', tag: 'danger' },
            SANITATION: { label: '垃圾处理费', tag: 'info' }
        },
        // 账单缴费状态
        payStatus: {
            UNPAID: { label: '未缴费', tag: 'warning' },
            PAID: { label: '已缴费', tag: 'success' },
            PARTIAL: { label: '部分缴纳', tag: 'primary' },
            OVERDUE: { label: '逾期欠费', tag: 'danger' }
        },
        // 缴费方式
        payMethod: {
            CASH: { label: '现金', tag: 'info' },
            WECHAT: { label: '微信支付', tag: 'success' },
            ALIPAY: { label: '支付宝', tag: 'primary' },
            BANK: { label: '银行转账', tag: 'warning' }
        },
        // 报修类型
        repairType: {
            WATER_ELEC: { label: '水电维修', tag: 'primary' },
            DOOR_WINDOW: { label: '门窗维修', tag: 'success' },
            PUBLIC: { label: '公共设施', tag: 'warning' },
            ELEVATOR: { label: '电梯故障', tag: 'danger' },
            PLUMBING: { label: '管道疏通', tag: 'info' },
            OTHER: { label: '其他', tag: 'info' }
        },
        // 紧急程度
        urgency: {
            LOW: { label: '较低', tag: 'info' },
            NORMAL: { label: '普通', tag: 'primary' },
            HIGH: { label: '较高', tag: 'warning' },
            URGENT: { label: '紧急', tag: 'danger' }
        },
        // 工单状态
        repairStatus: {
            PENDING: { label: '待受理', tag: 'warning' },
            ASSIGNED: { label: '已派单', tag: 'primary' },
            PROCESSING: { label: '处理中', tag: 'primary' },
            FINISHED: { label: '已完成', tag: 'success' },
            CLOSED: { label: '已关闭', tag: 'info' }
        },
        // 投诉类型
        complaintType: {
            SERVICE: { label: '服务态度', tag: 'warning' },
            NOISE: { label: '噪音扰民', tag: 'danger' },
            SANITARY: { label: '环境卫生', tag: 'success' },
            SAFETY: { label: '安全隐患', tag: 'danger' },
            PARKING: { label: '停车纠纷', tag: 'primary' },
            OTHER: { label: '其他', tag: 'info' }
        },
        // 投诉状态
        complaintStatus: {
            PENDING: { label: '待处理', tag: 'warning' },
            PROCESSING: { label: '处理中', tag: 'primary' },
            RESOLVED: { label: '已解决', tag: 'success' },
            CLOSED: { label: '已关闭', tag: 'info' }
        },
        // 公告类型
        noticeType: {
            NOTIFY: { label: '通知公告', tag: 'primary' },
            ACTIVITY: { label: '社区活动', tag: 'success' },
            URGENT: { label: '紧急通知', tag: 'danger' },
            MAINTAIN: { label: '停水停电', tag: 'warning' }
        },
        // 设备类型
        equipmentType: {
            ELEVATOR: { label: '电梯', tag: 'primary' },
            WATER_PUMP: { label: '水泵', tag: 'success' },
            DOOR: { label: '门禁监控', tag: 'warning' },
            FIRE: { label: '消防设施', tag: 'danger' },
            FITNESS: { label: '健身器材', tag: 'info' },
            LIGHT: { label: '照明设备', tag: 'info' },
            OTHER: { label: '其他', tag: 'info' }
        },
        // 设备状态
        equipmentStatus: {
            NORMAL: { label: '正常运行', tag: 'success' },
            REPAIR: { label: '维修中', tag: 'danger' },
            SCRAPPED: { label: '已报废', tag: 'info' }
        },
        // 访客状态
        visitorStatus: {
            IN: { label: '在小区内', tag: 'warning' },
            OUT: { label: '已离开', tag: 'info' }
        },
        // 用户角色
        userRole: {
            ADMIN: { label: '超级管理员', tag: 'danger' },
            STAFF: { label: '物业员工', tag: 'primary' },
            OWNER: { label: '业主', tag: 'success' }
        },
        // 收费周期
        chargeCycle: {
            MONTH: { label: '按月', tag: 'primary' },
            QUARTER: { label: '按季', tag: 'success' },
            HALF_YEAR: { label: '半年', tag: 'warning' },
            YEAR: { label: '按年', tag: 'info' }
        }
    };

    /** 通用工具 */
    window.PmsUtils = {
        DICT: DICT,

        /** 取字典项(不存在返回原始值) */
        dict(group, value) {
            const d = DICT[group];
            if (!d) return { label: value, tag: 'info' };
            return d[value] || { label: value == null ? '-' : value, tag: 'info' };
        },

        /** 取字典文本 */
        label(group, value) {
            return this.dict(group, value).label;
        },

        /** 生成下拉选项 */
        options(group) {
            return Object.keys(DICT[group] || {}).map(k => ({ value: k, label: DICT[group][k].label }));
        },

        /** el-tag 类型 */
        tag(group, value) {
            return this.dict(group, value).tag;
        },

        /** 金额格式化 */
        money(v, prefix) {
            if (v === null || v === undefined || v === '') return '-';
            const n = Number(v);
            if (isNaN(n)) return v;
            return (prefix === false ? '' : '¥') + n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
        },

        /** 数字格式化 */
        num(v) {
            if (v === null || v === undefined || v === '') return '0';
            const n = Number(v);
            return isNaN(n) ? v : n.toLocaleString('zh-CN');
        },

        /** 时长(分钟)可读化 */
        duration(minutes) {
            if (minutes === null || minutes === undefined) return '-';
            const m = Number(minutes);
            if (m < 60) return m + ' 分钟';
            const h = Math.floor(m / 60);
            const rest = m % 60;
            return rest === 0 ? h + ' 小时' : h + ' 小时 ' + rest + ' 分钟';
        },

        /** 日期截断(取 yyyy-MM-dd) */
        day(v) {
            return v ? String(v).substring(0, 10) : '-';
        },

        /** 时间截断(取 yyyy-MM-dd HH:mm) */
        minute(v) {
            return v ? String(v).substring(0, 16) : '-';
        },

        /** 当前账期 yyyy-MM */
        currentPeriod() {
            const d = new Date();
            return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
        },

        /** 读取登录用户 */
        currentUser() {
            try {
                return JSON.parse(localStorage.getItem('pms_user') || '{}');
            } catch (e) {
                return {};
            }
        },

        /** 租户/业主类型过滤(仅业主与租户, 排除家庭成员) */
        isMainPerson(t) {
            return t === 'OWNER' || t === 'TENANT';
        }
    };

    /**
     * 把工具库注入到每个 Vue 组件实例, 使模板中可以直接写 PmsUtils.xxx(...)
     * ---------------------------------------------------------------------
     * 这里必须用 computed(或 data) 而不是把它塞进组件的 methods。
     * Vue 初始化 methods 时执行的是:
     *     vm[key] = typeof methods[key] !== 'function' ? noop : bind(...)
     * 也就是说, 往 methods 里放一个"对象"会被静默替换成一个空函数(noop),
     * 于是模板里的 PmsUtils.tag(...) 就会报 "PmsUtils.tag is not a function"
     * —— 列表里所有状态标签都会渲染失败。
     *
     * 命名也刻意避开 Utils: Element UI 的 focus-trap 会占用全局 Utils,
     * 用不带前缀的名字迟早会撞上。
     */
    if (window.Vue && window.Vue.mixin) {
        window.Vue.mixin({
            computed: {
                PmsUtils() {
                    return window.PmsUtils;
                }
            }
        });
    }
})();
