/**
 * 首页数据看板
 */
Vue.component('page-dashboard', {
    template: `
    <div>
        <!-- 核心指标 -->
        <div class="stat-grid">
            <div class="stat-card" v-for="c in cards" :key="c.label">
                <div class="icon-box" :class="c.color"><i :class="c.icon"></i></div>
                <div class="info">
                    <div class="label">{{ c.label }}</div>
                    <div class="value">{{ c.value }}<small v-if="c.unit">{{ c.unit }}</small></div>
                    <div class="sub">{{ c.sub }}</div>
                </div>
            </div>
        </div>

        <!-- 待办提醒 -->
        <div class="chart-grid" style="margin-bottom:14px">
            <div class="chart-box">
                <h4>待办提醒</h4>
                <ul class="todo-list" v-if="todos.length">
                    <li v-for="t in todos" :key="t.title" :class="t.level" @click="go(t.path)">
                        <span class="t-title">{{ t.title }}</span>
                        <span class="t-desc">{{ t.desc }}</span>
                        <el-tag :type="tagOf(t.level)" size="mini" effect="plain">查看</el-tag>
                    </li>
                </ul>
                <el-empty v-else description="暂无待办事项，一切正常" :image-size="70"></el-empty>
            </div>

            <div class="chart-box">
                <h4>本月收费概况（{{ overview.currentPeriod }}）</h4>
                <div style="padding:6px 4px">
                    <el-progress :percentage="collectPercent" :stroke-width="18" :format="p => '收缴率 ' + p + '%'"
                        color="#2d6cb5"></el-progress>
                    <el-row :gutter="12" style="margin-top:22px">
                        <el-col :span="8">
                            <div style="text-align:center">
                                <div class="text-muted" style="font-size:12px">本月应收</div>
                                <div style="font-size:20px;font-weight:600;color:#303133;margin-top:6px">
                                    {{ money(overview.monthReceivable) }}</div>
                            </div>
                        </el-col>
                        <el-col :span="8">
                            <div style="text-align:center">
                                <div class="text-muted" style="font-size:12px">本月实收</div>
                                <div style="font-size:20px;font-weight:600;color:#67c23a;margin-top:6px">
                                    {{ money(overview.monthReceived) }}</div>
                            </div>
                        </el-col>
                        <el-col :span="8">
                            <div style="text-align:center">
                                <div class="text-muted" style="font-size:12px">累计欠费</div>
                                <div style="font-size:20px;font-weight:600;color:#f56c6c;margin-top:6px">
                                    {{ money(overview.unpaidAmount) }}</div>
                            </div>
                        </el-col>
                    </el-row>
                    <el-divider></el-divider>
                    <el-row :gutter="12">
                        <el-col :span="8">
                            <div style="text-align:center">
                                <div class="text-muted" style="font-size:12px">今日实收</div>
                                <div style="font-size:16px;font-weight:600;color:#303133;margin-top:5px">
                                    {{ money(overview.todayIncome) }}</div>
                            </div>
                        </el-col>
                        <el-col :span="8">
                            <div style="text-align:center">
                                <div class="text-muted" style="font-size:12px">临停收入(今日)</div>
                                <div style="font-size:16px;font-weight:600;color:#303133;margin-top:5px">
                                    {{ money(overview.tempParkingIncome) }}</div>
                            </div>
                        </el-col>
                        <el-col :span="8">
                            <div style="text-align:center">
                                <div class="text-muted" style="font-size:12px">在场临停车辆</div>
                                <div style="font-size:16px;font-weight:600;color:#e6a23c;margin-top:5px">
                                    {{ overview.tempParkingInCount || 0 }} 辆</div>
                            </div>
                        </el-col>
                    </el-row>
                </div>
            </div>
        </div>

        <!-- 图表区 -->
        <div class="chart-grid">
            <div class="chart-box">
                <h4>物业收费趋势</h4>
                <div class="chart" ref="chart1"></div>
            </div>
            <div class="chart-box">
                <h4>房屋入住状态分布</h4>
                <div class="chart" ref="chart2"></div>
            </div>
            <div class="chart-box">
                <h4>报修类型分布</h4>
                <div class="chart" ref="chart3"></div>
            </div>
            <div class="chart-box">
                <h4>车位使用情况</h4>
                <div class="chart" ref="chart4"></div>
            </div>
        </div>
    </div>
    `,
    data() {
        return {
            loading: false,
            overview: {},
            todos: [],
            charts: {},
            cards: []
        };
    },
    computed: {
        collectPercent() {
            return parseFloat(String(this.overview.monthCollectRate || '0').replace('%', '')) || 0;
        }
    },
    created() {
        this.loadAll();
    },
    mounted() {
        window.addEventListener('resize', this.onResize);
    },
    beforeDestroy() {
        window.removeEventListener('resize', this.onResize);
        this.disposeCharts();
    },
    methods: {
        money(v) { return PmsUtils.money(v); },
        tagOf(level) {
            return { urgent: 'danger', danger: 'danger', warning: 'warning', info: '' }[level] || '';
        },
        go(path) {
            this.$router.push(path);
        },
        onResize() {
            Object.values(this._charts || {}).forEach(c => c && c.resize());
        },
        disposeCharts() {
            Object.values(this._charts || {}).forEach(c => c && c.dispose());
            this._charts = {};
        },
        loadAll() {
            const tasks = [
                Api.dashboard.overview().then(res => {
                    this.overview = res.data || {};
                    this.buildCards();
                }),
                Api.dashboard.todos().then(res => { this.todos = res.data || []; }),
                Api.dashboard.charts().then(res => {
                    this.charts = res.data || {};
                    this.$nextTick(() => this.renderCharts());
                })
            ];
            Promise.all(tasks).catch(err => this.$message.error(err.message));
        },
        buildCards() {
            const o = this.overview;
            // scope=SELF 表示业主登录, 后端只统计其自己房间的数据, 文案随之为"我的"
            const self = o.scope === 'SELF';
            this.cards = [
                { label: self ? '我的楼栋' : '楼栋总数', value: PmsUtils.num(o.buildingCount), unit: '栋', sub: '共 ' + PmsUtils.num(o.houseCount) + ' 套房屋', icon: 'el-icon-office-building', color: 'bg-blue' },
                { label: self ? '我的房屋状态' : '房屋入住率', value: o.occupancyRate, unit: '', sub: self ? (o.occupiedCount ? '已入住' : '空置') + ' · 共 ' + PmsUtils.num(o.houseCount) + ' 套' : '已入住 ' + PmsUtils.num(o.occupiedCount) + ' 套 / 空置 ' + PmsUtils.num(o.emptyCount) + ' 套', icon: 'el-icon-house', color: 'bg-green' },
                { label: self ? '我家成员' : '在册人员', value: PmsUtils.num(o.ownerTotal), unit: '人', sub: '业主 ' + PmsUtils.num(o.ownerCount) + ' · 租户 ' + PmsUtils.num(o.tenantCount), icon: 'el-icon-user', color: 'bg-purple' },
                { label: self ? '我的车位' : '车位使用率', value: self ? PmsUtils.num(o.parkingTotal) : o.parkingUsedRate, unit: self ? '个' : '', sub: self ? '已登记车辆 ' + PmsUtils.num(o.parkingTotal) + ' 个车位' : '已使用 ' + PmsUtils.num(o.parkingUsed) + ' / 空闲 ' + PmsUtils.num(o.parkingFree), icon: 'el-icon-truck', color: 'bg-teal' },
                { label: self ? '我的待缴费用' : '累计欠费', value: PmsUtils.money(o.unpaidAmount, false), unit: '元', sub: '本月应收 ' + PmsUtils.money(o.monthReceivable), icon: 'el-icon-warning-outline', color: 'bg-red' },
                { label: self ? '我的报修' : '待处理报修', value: PmsUtils.num(o.repairUnfinished), unit: '单', sub: '累计 ' + PmsUtils.num(o.repairTotal) + ' 单 · 满意度 ' + (o.repairAvgRating || 0) + ' 分', icon: 'el-icon-tools', color: 'bg-orange' },
                { label: self ? '我的投诉' : '待处理投诉', value: PmsUtils.num(o.complaintPending), unit: '条', sub: '累计收到 ' + PmsUtils.num(o.complaintTotal) + ' 条', icon: 'el-icon-chat-dot-square', color: 'bg-gray' },
                { label: '设备设施', value: PmsUtils.num(o.equipmentTotal), unit: '台', sub: '维修中 ' + PmsUtils.num(o.equipmentRepair) + ' 台（小区公共设施）', icon: 'el-icon-setting', color: 'bg-blue' }
            ];
        },
        renderCharts() {
            this._charts = this._charts || {};
            const C = {
                blue: '#2d6cb5', green: '#67c23a', orange: '#e6a23c', red: '#f56c6c',
                purple: '#8e71d4', teal: '#3fc0b0', gray: '#a7b0bd'
            };
            const axisStyle = {
                axisLine: { lineStyle: { color: '#e4e7ed' } },
                axisLabel: { color: '#606266', fontSize: 11 },
                splitLine: { lineStyle: { color: '#f0f2f5' } }
            };

            // 1. 收费趋势
            const trend = this.charts.feeTrend || [];
            if (this.$refs.chart1) {
                const c1 = echarts.init(this.$refs.chart1);
                c1.setOption({
                    tooltip: { trigger: 'axis', valueFormatter: v => '¥' + Number(v).toFixed(2) },
                    grid: { left: 50, right: 20, top: 30, bottom: 30 },
                    xAxis: Object.assign({ type: 'category', data: trend.map(x => x.name) }, axisStyle),
                    yAxis: Object.assign({ type: 'value', name: '实收(元)', nameTextStyle: { color: '#909399', fontSize: 11 } }, axisStyle),
                    series: [{
                        type: 'line',
                        smooth: true,
                        symbolSize: 7,
                        data: trend.map(x => x.amount),
                        itemStyle: { color: C.blue },
                        lineStyle: { width: 3 },
                        areaStyle: {
                            color: {
                                type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                                colorStops: [{ offset: 0, color: 'rgba(45,108,181,0.28)' }, { offset: 1, color: 'rgba(45,108,181,0.02)' }]
                            }
                        },
                        label: { show: true, position: 'top', fontSize: 10, color: '#606266', formatter: p => p.value }
                    }]
                });
                this._charts.c1 = c1;
            }

            // 2. 房屋状态分布
            const hs = this.charts.houseStatus || [];
            if (this.$refs.chart2) {
                const c2 = echarts.init(this.$refs.chart2);
                const colorMap = { OCCUPIED: C.green, RENTED: C.blue, EMPTY: C.gray, DECORATING: C.orange };
                c2.setOption({
                    tooltip: { trigger: 'item', formatter: '{b}: {c} 套 ({d}%)' },
                    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11, color: '#606266' } },
                    series: [{
                        type: 'pie',
                        radius: ['46%', '68%'],
                        center: ['50%', '45%'],
                        avoidLabelOverlap: true,
                        itemStyle: { borderColor: '#fff', borderWidth: 2 },
                        label: { formatter: '{b}\n{c}套', fontSize: 11, color: '#606266' },
                        data: hs.map(x => ({
                            name: PmsUtils.label('houseStatus', x.name),
                            value: x.value,
                            itemStyle: { color: colorMap[x.name] || C.gray }
                        }))
                    }]
                });
                this._charts.c2 = c2;
            }

            // 3. 报修类型分布
            const rt = (this.charts.repairTypes || []).slice(0, 8);
            if (this.$refs.chart3) {
                const c3 = echarts.init(this.$refs.chart3);
                c3.setOption({
                    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                    grid: { left: 90, right: 30, top: 20, bottom: 24 },
                    xAxis: Object.assign({ type: 'value' }, axisStyle),
                    yAxis: Object.assign({
                        type: 'category',
                        data: rt.map(x => PmsUtils.label('repairType', x.name)).reverse()
                    }, axisStyle),
                    series: [{
                        type: 'bar',
                        barWidth: 15,
                        data: rt.map(x => x.value).reverse(),
                        itemStyle: {
                            borderRadius: [0, 4, 4, 0],
                            color: {
                                type: 'linear', x: 0, y: 0, x2: 1, y2: 0,
                                colorStops: [{ offset: 0, color: '#4a9ad4' }, { offset: 1, color: '#2d6cb5' }]
                            }
                        },
                        label: { show: true, position: 'right', fontSize: 11, color: '#606266' }
                    }]
                });
                this._charts.c3 = c3;
            }

            // 4. 车位使用情况
            const pt = this.charts.parkingTypes || [];
            if (this.$refs.chart4) {
                const c4 = echarts.init(this.$refs.chart4);
                const names = pt.map(x => PmsUtils.label('spaceType', x.name));
                c4.setOption({
                    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                    legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11, color: '#606266' } },
                    grid: { left: 50, right: 20, top: 24, bottom: 44 },
                    xAxis: Object.assign({ type: 'category', data: names }, axisStyle),
                    yAxis: Object.assign({ type: 'value', name: '车位(个)', nameTextStyle: { color: '#909399', fontSize: 11 } }, axisStyle),
                    series: [
                        {
                            name: '已使用', type: 'bar', stack: 'total', barWidth: 34,
                            itemStyle: { color: C.blue, borderRadius: [0, 0, 0, 0] },
                            data: pt.map(x => x.usedCount || 0)
                        },
                        {
                            name: '空闲', type: 'bar', stack: 'total', barWidth: 34,
                            itemStyle: { color: '#c8e0f5', borderRadius: [4, 4, 0, 0] },
                            data: pt.map(x => x.freeCount || 0),
                            label: { show: true, position: 'top', fontSize: 11, color: '#606266', formatter: p => { const d = pt[p.dataIndex]; return (d.usedCount || 0) + (d.freeCount || 0) + '个'; } }
                        }
                    ]
                });
                this._charts.c4 = c4;
            }
        }
    }
});
