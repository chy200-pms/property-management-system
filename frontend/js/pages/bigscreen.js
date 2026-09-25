/**
 * 数据大屏 (物业运营可视化)
 * ---------------------------------------------------------------
 * 定位: 面向管理侧的"一屏总览", 深色科技风 + 玻璃拟态 + 数字动效。
 *       配色刻意避开单一蓝: 深空底 + 琥珀/珊瑚 + 青绿 + 紫罗兰。
 *
 * 数据来源: GET /api/dashboard/screen  (单个聚合接口, 避免大屏发十几个请求)
 *
 * 数据权限:
 *   - 后端按角色分层: 管理员/物业 -> 全量维度; 业主 -> 只返回自己房间相关数据
 *     (报修状态/账单状态/投诉类型/人员构成/设备状态等明细维度不下发给业主)
 *   - 前端据 scope 决定显示哪些面板, 但**不把前端隐藏当安全边界**, 数据由后端兜底。
 *
 * 依赖: libs/echarts.min.js (本地文件)
 */
(function () {
    'use strict';

Vue.component('page-bigscreen', {
    template: `
    <div class="bs-page" :class="isOwner ? 'bs-self' : 'bs-all'">
        <!-- 装饰层 -->
        <div class="bs-bg-grid"></div>
        <div class="bs-glow bs-glow-a"></div>
        <div class="bs-glow bs-glow-b"></div>
        <div class="bs-scan"></div>

        <!-- ============ 顶栏 ============ -->
        <header class="bs-header">
            <div class="bs-head-side bs-head-left">
                <span class="bs-scope" :class="isOwner ? 'self' : 'all'">
                    <i :class="isOwner ? 'el-icon-house' : 'el-icon-s-data'"></i>
                    {{ isOwner ? '数据范围 · 仅我的房屋' : '数据范围 · 全小区' }}
                </span>
            </div>

            <div class="bs-head-title">
                <span class="bs-deco-line"></span>
                <div class="bs-title-wrap">
                    <h1>{{ ov.community || '阳光家园' }} · 物业运营数据大屏</h1>
                    <div class="bs-title-sub">PROPERTY OPERATION DASHBOARD</div>
                </div>
                <span class="bs-deco-line r"></span>
            </div>

            <div class="bs-head-side bs-head-right">
                <span class="bs-clock"><i class="el-icon-time"></i>{{ clock }}</span>
                <button class="bs-icon-btn" :class="{ spinning: loading }" title="刷新数据" @click="loadAll">
                    <i class="el-icon-refresh"></i>
                </button>
                <button class="bs-icon-btn" title="全屏显示" @click="toggleFullscreen">
                    <i class="el-icon-full-screen"></i>
                </button>
            </div>
        </header>

        <!-- ============ 主体三列 ============ -->
        <div class="bs-body" v-loading="loading" element-loading-background="rgba(6,12,26,0.6)">

            <!-- ---------- 左列 ---------- -->
            <div class="bs-col bs-col-left">
                <section class="bs-card">
                    <div class="bs-card-hd"><i class="el-icon-s-grid"></i> 核心指标</div>
                    <div class="bs-kpi-grid">
                        <div class="bs-kpi" v-for="k in kpiCards" :key="k.label" :class="k.tone">
                            <div class="bs-kpi-ico"><i :class="k.icon"></i></div>
                            <div class="bs-kpi-num">{{ k.value }}<small v-if="k.unit">{{ k.unit }}</small></div>
                            <div class="bs-kpi-label">{{ k.label }}</div>
                            <div class="bs-kpi-sub">{{ k.sub }}</div>
                        </div>
                    </div>
                </section>

                <section class="bs-card">
                    <div class="bs-card-hd"><i class="el-icon-pie-chart"></i> 房屋入住状态</div>
                    <div class="bs-chart bs-chart-sm" ref="cHouse"></div>
                </section>

                <section class="bs-card" v-if="!isOwner">
                    <div class="bs-card-hd"><i class="el-icon-user"></i> 人员构成</div>
                    <div class="bs-chart bs-chart-sm" ref="cPerson"></div>
                </section>

                <section class="bs-card" v-else>
                    <div class="bs-card-hd"><i class="el-icon-house"></i> 我的房屋</div>
                    <div class="bs-self-house" v-if="myHouse">
                        <div class="sh-no">{{ myHouse.houseNo }}</div>
                        <div class="sh-meta">{{ myHouse.houseType }} · {{ myHouse.area }}㎡ · {{ myHouse.orientation }}</div>
                        <div class="sh-row"><span>登记人数</span><b>{{ ov.ownerTotal || 0 }} 人</b></div>
                        <div class="sh-row"><span>名下车辆</span><b>{{ ov.parkingTotal || 0 }} 个车位</b></div>
                    </div>
                    <div class="bs-empty" v-else>账号暂未关联房屋档案</div>
                </section>

                <section class="bs-card" v-if="!isOwner">
                    <div class="bs-card-hd"><i class="el-icon-setting"></i> 公共设备状态</div>
                    <div class="bs-eq-bar">
                        <i v-for="e in equipmentBars" :key="e.key" :style="{ width: e.pct, background: e.color }"
                            :title="e.label + ' ' + e.value + ' 台'"></i>
                    </div>
                    <div class="bs-eq-legend">
                        <span v-for="e in equipmentBars" :key="e.key">
                            <i class="dot" :style="{ background: e.color }"></i>{{ e.label }}
                            <b>{{ e.value }}</b>
                        </span>
                    </div>
                </section>
            </div>

            <!-- ---------- 中列 ---------- -->
            <div class="bs-col bs-col-center">
                <!-- 财务四指标 -->
                <section class="bs-fin">
                    <div class="bs-fin-item" v-for="f in finCards" :key="f.label" :class="f.tone">
                        <div class="bs-fin-label">{{ f.label }}</div>
                        <div class="bs-fin-value">{{ f.value }}<small v-if="f.unit">{{ f.unit }}</small></div>
                        <div class="bs-fin-sub">{{ f.sub }}</div>
                    </div>
                </section>

                <!-- 收缴率进度 -->
                <section class="bs-card bs-card-slim">
                    <div class="bs-progress-hd">
                        <span><i class="el-icon-money"></i> 本月收缴进度（{{ ov.currentPeriod || '—' }}）</span>
                        <b>{{ ov.monthCollectRate || '0%' }}</b>
                    </div>
                    <div class="bs-progress">
                        <div class="bs-progress-fill" :style="{ width: collectPercent + '%' }"></div>
                        <span class="bs-progress-glow" :style="{ left: collectPercent + '%' }"></span>
                    </div>
                </section>

                <section class="bs-card bs-grow">
                    <div class="bs-card-hd">
                        <i class="el-icon-data-line"></i> 物业收费趋势
                        <em class="bs-hd-tip">{{ isOwner ? '（我的缴费记录）' : '（全小区实收）' }}</em>
                    </div>
                    <div class="bs-chart bs-chart-lg" ref="cTrend"></div>
                </section>

                <div class="bs-row2">
                    <section class="bs-card">
                        <div class="bs-card-hd"><i class="el-icon-wallet"></i> 缴费方式分布</div>
                        <div class="bs-chart bs-chart-md" ref="cPay"></div>
                    </section>
                    <section class="bs-card">
                        <div class="bs-card-hd">
                            <i class="el-icon-office-building"></i>
                            {{ isOwner ? '我的账单账期' : '楼栋入住排行' }}
                        </div>
                        <div class="bs-chart bs-chart-md" ref="cRank"></div>
                    </section>
                </div>
            </div>

            <!-- ---------- 右列 ---------- -->
            <div class="bs-col bs-col-right">
                <section class="bs-card">
                    <div class="bs-card-hd">
                        <i class="el-icon-tools"></i> 报修工单状态
                        <em class="bs-hd-tip">{{ isOwner ? '（我的报修）' : '（全小区）' }}</em>
                    </div>
                    <div class="bs-chart bs-chart-sm" ref="cRepair"></div>
                </section>

                <section class="bs-card">
                    <div class="bs-card-hd"><i class="el-icon-s-operation"></i> 报修类型 TOP</div>
                    <div class="bs-chart bs-chart-sm" ref="cRepairType"></div>
                </section>

                <section class="bs-card" v-if="!isOwner">
                    <div class="bs-card-hd"><i class="el-icon-chat-dot-square"></i> 投诉类型分布</div>
                    <div class="bs-chart bs-chart-sm" ref="cComplaint"></div>
                </section>

                <section class="bs-card" v-else>
                    <div class="bs-card-hd"><i class="el-icon-warning-outline"></i> 我的待缴与车位</div>
                    <div class="bs-mini-stat">
                        <div class="ms-item">
                            <div class="ms-num warn">{{ money(ov.unpaidAmount) }}</div>
                            <div class="ms-label">待缴金额（元）</div>
                        </div>
                        <div class="ms-item">
                            <div class="ms-num ok">{{ num(ov.parkingTotal) }}</div>
                            <div class="ms-label">名下停车位（个）</div>
                        </div>
                    </div>
                </section>

                <section class="bs-card bs-grow">
                    <div class="bs-card-hd">
                        <i class="el-icon-bell"></i> 实时待办
                        <em class="bs-hd-tip">{{ todos.length }} 项</em>
                    </div>
                    <ul class="bs-todos" v-if="todos.length">
                        <li v-for="t in todos" :key="t.title" :class="t.level" @click="go(t.path)">
                            <i class="dot"></i>
                            <div class="td-main">
                                <div class="td-title">{{ t.title }}</div>
                                <div class="td-desc">{{ t.desc }}</div>
                            </div>
                            <i class="el-icon-arrow-right"></i>
                        </li>
                    </ul>
                    <div class="bs-empty" v-else>暂无待办事项，一切正常</div>
                </section>
            </div>
        </div>

        <div class="bs-footer">
            <span>数据更新于 {{ serverTime || '—' }}</span>
            <span class="bs-dot-sep"></span>
            <span>{{ isOwner ? '业主账号仅统计本人房屋数据' : '统计范围：全小区' }}</span>
            <span class="bs-dot-sep"></span>
            <span class="bs-live"><i class="pulse"></i> 每 60 秒自动刷新</span>
        </div>
    </div>
    `,
    data() {
        return {
            loading: true,
            scope: 'ALL',
            clock: '',
            serverTime: '',
            overview: {},
            charts: {},
            todos: [],
            extra: {},
            anim: {}
            // 注意: 图表实例/定时器/RAF 句柄**不能**放进 data(), 原因有二:
            //   1) Vue 不代理 `_` 开头的 data 字段, `this.chartInsts` 取到的是 undefined;
            //   2) 放进 data 会被深度响应式化, 把 ECharts 实例整个观测一遍, 既慢又危险。
            // 因此统一在 created() 里挂成普通实例属性(见下)。
        };
    },
    computed: {
        ov() { return this.overview || {}; },
        isOwner() { return this.scope === 'SELF'; },
        myHouse() { return this.ov.myHouse || null; },
        collectPercent() {
            const v = parseFloat(String(this.ov.monthCollectRate || '0').replace('%', ''));
            return Math.max(0, Math.min(100, isNaN(v) ? 0 : v));
        },
        kpiCards() {
            const self = this.isOwner;
            return [
                {
                    label: self ? '我的房屋' : '楼栋总数', icon: 'el-icon-office-building', tone: 'tone-amber',
                    value: this.a(self ? 'houseCount' : 'buildingCount'),
                    unit: self ? '套' : '栋',
                    sub: self ? ('小区共 ' + bsNum(this.ov.buildingCount) + ' 栋') : ('共 ' + bsNum(this.ov.houseCount) + ' 套房屋')
                },
                {
                    label: self ? '入住状态' : '房屋入住率', icon: 'el-icon-house', tone: 'tone-teal',
                    value: this.ov.occupancyRate || '0%',
                    unit: '',
                    sub: self ? (this.ov.occupiedCount ? '已入住' : '未入住')
                        : ('入住 ' + bsNum(this.ov.occupiedCount) + ' · 空置 ' + bsNum(this.ov.emptyCount))
                },
                {
                    label: self ? '我家成员' : '在册人员', icon: 'el-icon-user', tone: 'tone-violet',
                    value: this.a('ownerTotal'),
                    unit: '人',
                    sub: self ? '同一房屋登记人员' : ('业主 ' + bsNum(this.ov.ownerCount) + ' · 租户 ' + bsNum(this.ov.tenantCount))
                },
                {
                    label: self ? '我的车位' : '车位使用率', icon: 'el-icon-truck', tone: 'tone-coral',
                    value: self ? this.a('parkingTotal') : (this.ov.parkingUsedRate || '0%'),
                    unit: self ? '个' : '',
                    sub: self ? '已登记停车位' : ('已用 ' + bsNum(this.ov.parkingUsed) + ' / 空闲 ' + bsNum(this.ov.parkingFree))
                }
            ];
        },
        finCards() {
            const self = this.isOwner;
            return [
                {
                    label: '本月应收', tone: 'tone-amber',
                    value: bsMoney(this.ov.monthReceivable), unit: '元',
                    sub: (this.ov.currentPeriod || '—') + ' 账期'
                },
                {
                    label: '本月实收', tone: 'tone-teal',
                    value: bsMoney(this.ov.monthReceived), unit: '元',
                    sub: '收缴率 ' + (this.ov.monthCollectRate || '0%')
                },
                {
                    label: self ? '我的欠费' : '累计欠费', tone: 'tone-coral',
                    value: bsMoney(this.ov.unpaidAmount), unit: '元',
                    sub: self ? '请及时缴纳' : '待催缴金额'
                },
                {
                    label: self ? '今日缴费' : '今日收费', tone: 'tone-violet',
                    value: bsMoney(this.ov.todayIncome), unit: '元',
                    sub: self ? '我今日缴纳合计' : ('临停 ' + bsMoney(this.ov.tempParkingIncome) + ' 元')
                }
            ];
        },
        equipmentBars() {
            const list = this.extra.equipmentStatus || [];
            const map = { NORMAL: ['#2ed3b7', '正常运行'], REPAIR: ['#ef6f6c', '维修中'], SCRAPPED: ['#5a6b8c', '已报废'] };
            const total = list.reduce((s, x) => s + bsNum(x.value), 0) || 1;
            return list.map(x => {
                const v = bsNum(x.value);
                const cfg = map[x.name] || ['#5b9cf8', PmsUtils.label('equipmentStatus', x.name)];
                return {
                    key: x.name, value: v, label: cfg[1], color: cfg[0],
                    pct: Math.max(v > 0 ? 6 : 0, Math.round(v * 100 / total)) + '%'
                };
            });
        }
    },
    created() {
        // 普通实例属性(非响应式): 图表实例不进 data, 避免被 Vue 深度观测
        this.chartInsts = {};
        this.rafIds = [];
        this.clockTimer = null;
        this.refreshTimer = null;
        this.rszTimer = null;

        this.loadAll();
        this.tickClock();
        this.clockTimer = setInterval(this.tickClock, 1000);
        // 大屏数据每 60 秒自动刷新一次
        this.refreshTimer = setInterval(() => this.loadAll(true), 60000);
    },
    mounted() {
        window.addEventListener('resize', this.onResize);
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.onResize);
        clearInterval(this.clockTimer);
        clearInterval(this.refreshTimer);
        this.rafIds.forEach(id => cancelAnimationFrame(id));
        this.rafIds = [];
        this.disposeCharts();
    },
    methods: {
        num(v) { return bsNum(v); },
        money(v) { return bsMoney(v); },

        /** 数字动效: 返回指定 overview 字段的"当前动画值" */
        a(field) {
            const v = this.anim[field];
            return v === undefined ? bsNum(this.ov[field]) : bsNum(v);
        },

        tickClock() {
            const d = new Date();
            const p = n => (n < 10 ? '0' + n : '' + n);
            this.clock = p(d.getHours()) + ':' + p(d.getMinutes()) + ':' + p(d.getSeconds());
        },

        /** 数字滚动动效(带清理, 避免组件销毁后仍在跑) */
        tween(field, to) {
            const from = Number(this.anim[field] === undefined ? 0 : this.anim[field]);
            const target = Number(to) || 0;
            if (!isFinite(target) || from === target) { this.anim[field] = target; return; }
            const dur = 850;
            const t0 = (typeof performance !== 'undefined' && performance.now) ? performance.now() : Date.now();
            const step = now => {
                const cur = (typeof now === 'number') ? now : Date.now();
                const p = Math.min(1, (cur - t0) / dur);
                const e = 1 - Math.pow(1 - p, 3);
                this.anim[field] = from + (target - from) * e;
                if (p < 1) this.rafIds.push(requestAnimationFrame(step));
                else this.anim[field] = target;
            };
            this.anim[field] = from;
            this.rafIds.push(requestAnimationFrame(step));
        },

        loadAll(silent) {
            if (!silent) this.loading = true;
            return Api.dashboard.screen()
                .then(res => {
                    const d = res.data || {};
                    this.scope = d.scope || 'ALL';
                    this.serverTime = d.serverTime || '';
                    this.charts = d.charts || {};
                    this.todos = d.todos || [];
                    this.extra = d;
                    // overview 里的数值字段做滚动动效
                    const ov = d.overview || {};
                    ['buildingCount', 'houseCount', 'occupiedCount', 'ownerTotal',
                        'parkingTotal', 'parkingUsed', 'parkingFree'].forEach(k => this.tween(k, ov[k]));
                    this.overview = ov;
                    this.$nextTick(() => this.renderCharts());
                    if (silent) this.$message({ type: 'success', message: '数据已刷新', grouping: true, duration: 1200 });
                })
                .catch(err => {
                    this.$message({ type: 'error', message: err.message || '大屏数据加载失败', grouping: true });
                })
                .finally(() => { this.loading = false; });
        },

        onResize() {
            clearTimeout(this.rszTimer);
            this.rszTimer = setTimeout(() => {
                Object.values(this.chartInsts || {}).forEach(c => c && c.resize && c.resize());
            }, 120);
        },

        toggleFullscreen() {
            const el = document.documentElement || {};
            const fn = el.requestFullscreen || el.webkitRequestFullscreen || el.msRequestFullscreen;
            const exit = document.exitFullscreen || document.webkitExitFullscreen || document.msExitFullscreen;
            if (!fn && !exit) return;   // 环境不支持(如无头测试)时静默忽略
            try {
                const isFull = document.fullscreenElement || document.webkitFullscreenElement;
                if (isFull && exit) exit.call(document);
                else if (fn) fn.call(el);
            } catch (e) { /* 用户手势限制等, 忽略 */ }
        },

        go(path) {
            if (path) this.$router.push(path);
        },

        disposeCharts() {
            Object.values(this.chartInsts || {}).forEach(c => c && c.dispose && c.dispose());
            this.chartInsts = {};
        },

        // ==================== 图表 ====================

        renderCharts() {
            this.chartInsts = this.chartInsts || {};
            const self = this.isOwner;

            if (this.$refs.cHouse) this.ctx('cHouse', this.$refs.cHouse, this.houseOption());
            if (this.$refs.cPerson) this.ctx('cPerson', this.$refs.cPerson, this.personOption());
            if (this.$refs.cTrend) this.ctx('cTrend', this.$refs.cTrend, this.trendOption());
            if (this.$refs.cPay) this.ctx('cPay', this.$refs.cPay, this.payOption());
            if (this.$refs.cRank) this.ctx('cRank', this.$refs.cRank, self ? this.billOption() : this.rankOption());
            if (this.$refs.cRepair) this.ctx('cRepair', this.$refs.cRepair, this.repairOption());
            if (this.$refs.cRepairType) this.ctx('cRepairType', this.$refs.cRepairType, this.repairTypeOption());
            if (this.$refs.cComplaint) this.ctx('cComplaint', this.$refs.cComplaint, this.complaintOption());
        },

        /** 复用已初始化的实例, 避免重复 init 造成内存泄漏 */
        ctx(key, el, option) {
            if (!el) return;
            try {
                let c = this.chartInsts[key];
                if (!c) { c = echarts.init(el); this.chartInsts[key] = c; }
                c.setOption(option, true);
            } catch (e) {
                // 图表渲染失败不应影响整屏其它模块
                if (window.console && console.warn) console.warn('[bigscreen] chart ' + key + ' 渲染失败', e);
            }
        },

        // ---------- 通用样式 ----------
        axis(extra) {
            return Object.assign({
                axisLine: { lineStyle: { color: 'rgba(120,165,230,0.28)' } },
                axisTick: { show: false },
                axisLabel: { color: 'rgba(196,216,246,0.72)', fontSize: 11 },
                splitLine: { lineStyle: { color: 'rgba(120,165,230,0.10)' } }
            }, extra || {});
        },
        tooltipBase(extra) {
            return Object.assign({
                backgroundColor: 'rgba(10,20,40,0.92)',
                borderColor: 'rgba(120,165,230,0.35)',
                borderWidth: 1,
                textStyle: { color: '#dbe7fb', fontSize: 12 },
                padding: [8, 12]
            }, extra || {});
        },

        // ---------- 1. 房屋入住状态(环形) ----------
        houseOption() {
            const map = {
                OCCUPIED: PAL.amber, RENTED: PAL.teal, EMPTY: PAL.grey, DECORATING: PAL.violet
            };
            const data = (this.charts.houseStatus || []).map(x => ({
                name: PmsUtils.label('houseStatus', x.name),
                value: bsNum(x.value),
                itemStyle: { color: map[x.name] || PAL.grey }
            }));
            return {
                tooltip: this.tooltipBase({ trigger: 'item', formatter: '{b}: {c} 套 ({d}%)' }),
                legend: {
                    bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8,
                    textStyle: { color: 'rgba(196,216,246,0.75)', fontSize: 11 }
                },
                series: [{
                    type: 'pie',
                    radius: ['52%', '72%'],
                    center: ['50%', '42%'],
                    avoidLabelOverlap: true,
                    itemStyle: { borderColor: 'rgba(8,16,34,0.9)', borderWidth: 3 },
                    label: { show: false },
                    emphasis: {
                        scale: true, scaleSize: 6,
                        label: { show: true, fontSize: 13, fontWeight: 'bold', color: '#fff', formatter: '{b}\n{c} 套' }
                    },
                    data: data
                }]
            };
        },

        // ---------- 2. 人员构成(横向条) ----------
        personOption() {
            const map = { OWNER: PAL.amber, TENANT: PAL.teal, FAMILY: PAL.violet };
            const list = this.extra.personTypes || [];
            const names = list.map(x => PmsUtils.label('personType', x.name));
            const vals = list.map(x => bsNum(x.value));
            return {
                tooltip: this.tooltipBase({ trigger: 'axis', axisPointer: { type: 'shadow' } }),
                grid: { left: 62, right: 42, top: 12, bottom: 8 },
                xAxis: this.axis({ type: 'value', splitLine: { show: false }, axisLabel: { show: false } }),
                yAxis: this.axis({ type: 'category', data: names, splitLine: { show: false } }),
                series: [{
                    type: 'bar',
                    barWidth: 14,
                    data: list.map(x => ({
                        value: bsNum(x.value),
                        itemStyle: {
                            borderRadius: [0, 7, 7, 0],
                            color: newGradV(map[x.name] || PAL.blue)
                        }
                    })),
                    label: {
                        show: true, position: 'right', fontSize: 12, fontWeight: 'bold',
                        color: 'rgba(220,235,255,0.9)', formatter: '{c} 人'
                    }
                }]
            };
        },

        // ---------- 3. 收费趋势(面积折线) ----------
        trendOption() {
            const list = (this.charts.feeTrend || []).slice(-12);
            const names = list.map(x => x.name);
            const vals = list.map(x => bsNum(x.value) || bsNum(x.amount));
            return {
                tooltip: this.tooltipBase({
                    trigger: 'axis',
                    valueFormatter: v => '¥' + Number(v).toLocaleString('zh-CN', { minimumFractionDigits: 2 })
                }),
                grid: { left: 62, right: 26, top: 26, bottom: 26 },
                xAxis: this.axis({ type: 'category', boundaryGap: false, data: names }),
                yAxis: this.axis({
                    type: 'value', name: '实收(元)',
                    nameTextStyle: { color: 'rgba(196,216,246,0.55)', fontSize: 11, padding: [0, 0, 6, 0] },
                    axisLabel: {
                        color: 'rgba(196,216,246,0.72)', fontSize: 11,
                        formatter: v => (v >= 10000 ? (v / 10000) + '万' : v)
                    }
                }),
                series: [{
                    type: 'line',
                    smooth: true,
                    symbol: 'circle',
                    symbolSize: 7,
                    data: vals,
                    lineStyle: { width: 3, color: PAL.amber, shadowColor: 'rgba(246,185,59,0.55)', shadowBlur: 12 },
                    itemStyle: { color: PAL.amber, borderColor: '#0a1428', borderWidth: 2 },
                    areaStyle: {
                        color: {
                            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [
                                { offset: 0, color: 'rgba(246,185,59,0.42)' },
                                { offset: 0.55, color: 'rgba(240,128,60,0.16)' },
                                { offset: 1, color: 'rgba(240,128,60,0.01)' }
                            ]
                        }
                    }
                }]
            };
        },

        // ---------- 4. 缴费方式分布(玫瑰环) ----------
        payOption() {
            const list = this.charts.payMethods || [];
            const colors = [PAL.amber, PAL.teal, PAL.violet, PAL.coral, PAL.cyan, PAL.pink];
            const total = list.reduce((s, x) => s + bsNum(x.value), 0);
            return {
                tooltip: this.tooltipBase({
                    trigger: 'item',
                    formatter: p => p.name + '<br/>¥' + Number(p.value).toLocaleString('zh-CN', { minimumFractionDigits: 2 }) + '（' + p.percent + '%）'
                }),
                legend: {
                    bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8,
                    textStyle: { color: 'rgba(196,216,246,0.75)', fontSize: 11 }
                },
                series: [{
                    type: 'pie',
                    radius: ['42%', '70%'],
                    center: ['50%', '42%'],
                    roseType: 'radius',
                    itemStyle: { borderColor: 'rgba(8,16,34,0.9)', borderWidth: 3, borderRadius: 4 },
                    label: { show: false },
                    data: list.map((x, i) => ({
                        name: PmsUtils.label('payMethod', x.name),
                        value: bsNum(x.value),
                        itemStyle: { color: colors[i % colors.length] }
                    }))
                }],
                graphic: total > 0 ? [{
                    type: 'text', left: 'center', top: '36%',
                    style: {
                        text: '¥' + (total >= 10000 ? (total / 10000).toFixed(1) + '万' : total.toFixed(0)),
                        fill: 'rgba(224,238,255,0.92)', fontSize: 16, fontWeight: 'bold', textAlign: 'center'
                    }
                }] : []
            };
        },

        // ---------- 5. 楼栋入住排行(横向条) ----------
        rankOption() {
            const list = (this.extra.buildingHouse || this.charts.buildingHouse || []).slice(0, 6);
            const rows = list.map(x => ({
                name: x.buildingNo || x.name,
                total: bsNum(pick(x, 'totalHouse', 'houseCount', 'total')),
                used: bsNum(pick(x, 'occupiedHouse', 'occupiedCount', 'used'))
            })).reverse();
            return {
                tooltip: this.tooltipBase({
                    trigger: 'axis', axisPointer: { type: 'shadow' },
                    formatter: ps => {
                        const r = rows[ps[0].dataIndex];
                        const rate = r.total ? Math.round(r.used * 100 / r.total) : 0;
                        return r.name + '<br/>已入住 ' + r.used + ' / ' + r.total + ' 套<br/>入住率 ' + rate + '%';
                    }
                }),
                grid: { left: 66, right: 56, top: 12, bottom: 8 },
                xAxis: this.axis({ type: 'value', splitLine: { show: false }, axisLabel: { show: false } }),
                yAxis: this.axis({ type: 'category', data: rows.map(r => r.name), splitLine: { show: false } }),
                series: [
                    {
                        name: '总户数', type: 'bar', barWidth: 12, barGap: '-100%',
                        silent: true, z: 1,
                        itemStyle: { color: 'rgba(120,165,230,0.16)', borderRadius: [0, 6, 6, 0] },
                        data: rows.map(r => r.total)
                    },
                    {
                        name: '已入住', type: 'bar', barWidth: 12, z: 2,
                        itemStyle: { borderRadius: [0, 6, 6, 0], color: newGradV(PAL.teal) },
                        label: {
                            show: true, position: 'right', fontSize: 11, fontWeight: 'bold',
                            color: 'rgba(220,235,255,0.9)',
                            formatter: p => rows[p.dataIndex].used + '/' + rows[p.dataIndex].total
                        },
                        data: rows.map(r => r.used)
                    }
                ]
            };
        },

        // ---------- 5'(业主) 我的账单账期 ----------
        billOption() {
            const list = (this.charts.billPeriods || []).slice(-6);
            return {
                tooltip: this.tooltipBase({
                    trigger: 'axis', axisPointer: { type: 'shadow' },
                    valueFormatter: v => '¥' + Number(v).toFixed(2)
                }),
                grid: { left: 56, right: 20, top: 18, bottom: 26 },
                xAxis: this.axis({ type: 'category', data: list.map(x => x.name) }),
                yAxis: this.axis({ type: 'value', splitLine: { show: false }, axisLabel: { show: false } }),
                series: [{
                    type: 'bar', barWidth: 20,
                    itemStyle: { borderRadius: [6, 6, 0, 0], color: newGradV(PAL.amber) },
                    label: { show: true, position: 'top', fontSize: 11, color: 'rgba(220,235,255,0.85)' },
                    data: list.map(x => bsNum(x.value))
                }]
            };
        },

        // ---------- 6. 报修工单状态(环形) ----------
        repairOption() {
            const ov = this.ov;
            const data = [
                { name: '待受理', value: bsNum(ov.repairPending), color: PAL.coral },
                { name: '已派单', value: bsNum(ov.repairAssigned), color: PAL.violet },
                { name: '处理中', value: bsNum(ov.repairProcessing), color: PAL.amber },
                { name: '已完成', value: bsNum(ov.repairFinished), color: PAL.teal }
            ].filter(x => x.value > 0);
            const total = bsNum(ov.repairTotal);
            return {
                tooltip: this.tooltipBase({ trigger: 'item', formatter: '{b}: {c} 单 ({d}%)' }),
                legend: {
                    bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8,
                    textStyle: { color: 'rgba(196,216,246,0.75)', fontSize: 11 }
                },
                title: {
                    text: String(total),
                    subtext: '累计工单',
                    left: 'center', top: '33%',
                    textStyle: { color: '#eaf3ff', fontSize: 22, fontWeight: 'bold' },
                    subtextStyle: { color: 'rgba(196,216,246,0.55)', fontSize: 11 }
                },
                series: [{
                    type: 'pie',
                    radius: ['54%', '74%'],
                    center: ['50%', '42%'],
                    itemStyle: { borderColor: 'rgba(8,16,34,0.9)', borderWidth: 3 },
                    label: { show: false },
                    emphasis: { scale: true, scaleSize: 6 },
                    data: data.map(x => ({ name: x.name, value: x.value, itemStyle: { color: x.color } }))
                }]
            };
        },

        // ---------- 7. 报修类型 TOP(横向条) ----------
        repairTypeOption() {
            const list = (this.charts.repairTypes || []).slice(0, 6);
            const rows = list.map(x => ({ name: PmsUtils.label('repairType', x.name), value: bsNum(x.value) })).reverse();
            return {
                tooltip: this.tooltipBase({ trigger: 'axis', axisPointer: { type: 'shadow' } }),
                grid: { left: 74, right: 40, top: 10, bottom: 6 },
                xAxis: this.axis({ type: 'value', splitLine: { show: false }, axisLabel: { show: false } }),
                yAxis: this.axis({ type: 'category', data: rows.map(r => r.name), splitLine: { show: false } }),
                series: [{
                    type: 'bar', barWidth: 12,
                    itemStyle: { borderRadius: [0, 6, 6, 0], color: newGradV(PAL.cyan) },
                    label: {
                        show: true, position: 'right', fontSize: 11, fontWeight: 'bold',
                        color: 'rgba(220,235,255,0.9)', formatter: '{c} 单'
                    },
                    data: rows.map(r => r.value)
                }]
            };
        },

        // ---------- 8. 投诉类型分布 ----------
        complaintOption() {
            const colors = [PAL.coral, PAL.amber, PAL.violet, PAL.teal, PAL.cyan, PAL.pink];
            const data = (this.extra.complaintTypes || []).map((x, i) => ({
                name: PmsUtils.label('complaintType', x.name),
                value: bsNum(x.value),
                itemStyle: { color: colors[i % colors.length] }
            }));
            return {
                tooltip: this.tooltipBase({ trigger: 'item', formatter: '{b}: {c} 条 ({d}%)' }),
                legend: {
                    bottom: 0, icon: 'circle', itemWidth: 8, itemHeight: 8,
                    textStyle: { color: 'rgba(196,216,246,0.75)', fontSize: 11 }
                },
                series: [{
                    type: 'pie',
                    radius: ['46%', '68%'],
                    center: ['50%', '42%'],
                    itemStyle: { borderColor: 'rgba(8,16,34,0.9)', borderWidth: 3 },
                    label: { show: false },
                    data: data
                }]
            };
        }
    }
});

/* ==================== 模块内部工具 ==================== */

/** 大屏统一配色(避开单调蓝: 琥珀/珊瑚 + 青绿 + 紫罗兰) */
var PAL = {
    amber: '#f6b93b', orange: '#f0803c', coral: '#ef6f6c',
    teal: '#2ed3b7', cyan: '#3fc1d4', pink: '#f0699a',
    violet: '#9d7cf4', blue: '#5b9cf8', grey: '#5a6b8c'
};

/** 依次取对象上第一个存在(非 null/undefined)的字段(兼容后端与演示数据的不同字段别名) */
function pick(obj, ...keys) {
    for (const k of keys) {
        if (obj && obj[k] !== undefined && obj[k] !== null) return obj[k];
    }
    return 0;
}

/** 数值安全转换 */
function bsNum(v) {
    const n = Number(v);
    return isFinite(n) ? n : 0;
}

/** 千分位整数 */
function fmtInt(v) {
    return bsNum(v).toLocaleString('zh-CN', { maximumFractionDigits: 0 });
}

/** 金额(默认带 ¥ 与两位小数) */
function bsMoney(v, symbol) {
    const n = bsNum(v);
    const s = n.toLocaleString('zh-CN', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    return (symbol === false ? '' : '¥') + s;
}

/**
 * 纵向线性渐变(用普通对象写法, 不依赖 echarts.graphic,
 * 这样在 jsdom 里 ECharts 被打桩时也不会抛错)
 */
function newGradV(color) {
    return {
        type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
        colorStops: [
            { offset: 0, color: hexA(color, 0.25) },
            { offset: 1, color: color }
        ]
    };
}

/** #rrggbb -> rgba(r,g,b,a) */
function hexA(hex, a) {
    const h = String(hex).replace('#', '');
    const r = parseInt(h.substring(0, 2), 16);
    const g = parseInt(h.substring(2, 4), 16);
    const b = parseInt(h.substring(4, 6), 16);
    return 'rgba(' + r + ',' + g + ',' + b + ',' + a + ')';
}

})();
