/**
 * 缴费记录
 */
Vue.component('page-fee-payment', {
    template: `
    <div>
        <div class="page-head">
            <h3>缴费记录</h3>
            <div class="desc">查询历次收费流水，支持按时间与缴费方式筛选</div>
            <div class="head-actions">
                <el-button size="small" icon="el-icon-s-data" @click="showStat">收款统计</el-button>
            </div>
        </div>

        <div class="search-bar">
            <el-input v-model="query.keyword" placeholder="流水号 / 账单号 / 业主 / 费用" prefix-icon="el-icon-search"
                size="small" clearable @keyup.enter.native="reload" style="width:230px"></el-input>
            <el-select v-model="query.payMethod" placeholder="缴费方式" size="small" clearable>
                <el-option v-for="o in payMethodOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-date-picker v-model="dateRange" type="daterange" value-format="yyyy-MM-dd" size="small"
                range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期" style="width:250px">
            </el-date-picker>
            <el-button size="small" type="primary" icon="el-icon-search" @click="reload">查询</el-button>
            <el-button size="small" icon="el-icon-refresh" @click="reset">重置</el-button>
        </div>

        <el-table :data="rows" v-loading="loading" border stripe size="small" style="width:100%"
            show-summary :summary-method="summary">
            <el-table-column prop="paymentNo" label="缴费流水号" width="190" show-overflow-tooltip></el-table-column>
            <el-table-column prop="billNo" label="关联账单号" width="160" show-overflow-tooltip></el-table-column>
            <el-table-column prop="ownerName" label="业主" width="90"></el-table-column>
            <el-table-column prop="feeName" label="费用名称" min-width="140" show-overflow-tooltip></el-table-column>
            <el-table-column label="缴费金额" width="110" align="right">
                <template slot-scope="s"><span class="money">{{ PmsUtils.money(s.row.amount) }}</span></template>
            </el-table-column>
            <el-table-column label="缴费方式" width="100" align="center">
                <template slot-scope="s">
                    <el-tag type="success" size="mini">{{ PmsUtils.label('payMethod', s.row.payMethod) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="缴费时间" width="150" align="center">
                <template slot-scope="s">{{ PmsUtils.minute(s.row.payTime) }}</template>
            </el-table-column>
            <el-table-column prop="operator" label="收银人" width="100" align="center"></el-table-column>
            <el-table-column v-if="canManage" label="操作" width="80" align="center" fixed="right">
                <template slot-scope="s">
                    <el-button type="text" size="mini" style="color:#f56c6c" @click="remove(s.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-pagination class="pagination" background layout="total, sizes, prev, pager, next, jumper"
            :current-page.sync="pageNum" :page-size.sync="pageSize" :page-sizes="[10,20,50,100]"
            :total="total" @current-change="load" @size-change="load"></el-pagination>

        <!-- 统计 -->
        <el-dialog title="收款统计分析" :visible.sync="statVisible" width="760px">
            <el-tabs v-model="statTab">
                <el-tab-pane label="按月实收趋势" name="month">
                    <div ref="chartMonth" style="height:320px"></div>
                </el-tab-pane>
                <el-tab-pane label="按缴费方式" name="method">
                    <div ref="chartMethod" style="height:320px"></div>
                </el-tab-pane>
            </el-tabs>
        </el-dialog>
    </div>
    `,
    data() {
        return {
            loading: false,
            rows: [], total: 0, pageNum: 1, pageSize: 10,
            query: { keyword: '', payMethod: '' },
            dateRange: [],
            statVisible: false, statTab: 'month',
            monthData: [], methodData: []
        };
    },
    computed: {
        payMethodOptions() { return PmsUtils.options('payMethod'); }
    },
    created() {
        this.load();
    },
    beforeDestroy() {
        Object.values(this._charts || {}).forEach(c => c && c.dispose());
    },
    methods: {
        load() {
            this.loading = true;
            const params = Object.assign({}, this.query);
            if (this.dateRange && this.dateRange.length === 2) {
                params.beginDate = this.dateRange[0];
                params.endDate = this.dateRange[1];
            }
            Api.feePayment.page(Object.assign({}, params, { pageNum: this.pageNum, pageSize: this.pageSize }))
                .then(res => {
                    this.rows = res.data.rows || [];
                    this.total = res.data.total || 0;
                })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.loading = false; });
        },
        reload() { this.pageNum = 1; this.load(); },
        reset() {
            this.query = { keyword: '', payMethod: '' };
            this.dateRange = [];
            this.reload();
        },
        summary({ columns, data }) {
            const sums = [];
            columns.forEach((col, i) => {
                if (i === 0) { sums[i] = '本页合计'; return; }
                if (col.property === 'amount' || col.label === '缴费金额') {
                    const t = data.reduce((s, r) => s + Number(r.amount || 0), 0);
                    sums[i] = PmsUtils.money(t);
                } else {
                    sums[i] = '';
                }
            });
            return sums;
        },
        remove(row) {
            this.$confirm('确定删除流水「' + row.paymentNo + '」吗？删除后账单的缴费状态不会自动恢复。',
                '删除确认', { type: 'warning' })
                .then(() => Api.feePayment.remove(row.id))
                .then(res => { this.$message.success(res.msg); this.load(); })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        },
        showStat() {
            this.statVisible = true;
            Promise.all([Api.feePayment.monthStatistics(), Api.feePayment.methodStatistics()])
                .then(([a, b]) => {
                    this.monthData = a.data || [];
                    this.methodData = b.data || [];
                    this.$nextTick(() => {
                        this.renderMonth();
                        this.renderMethod();
                    });
                })
                .catch(err => this.$message.error(err.message));
        },
        renderMonth() {
            this._charts = this._charts || {};
            if (!this.$refs.chartMonth) return;
            this._charts.month = echarts.init(this.$refs.chartMonth);
            this._charts.month.setOption({
                tooltip: { trigger: 'axis', valueFormatter: v => '¥' + Number(v).toFixed(2) },
                grid: { left: 70, right: 30, top: 30, bottom: 40 },
                xAxis: {
                    type: 'category', data: this.monthData.map(x => x.name),
                    axisLine: { lineStyle: { color: '#e4e7ed' } },
                    axisLabel: { color: '#606266', fontSize: 11 }
                },
                yAxis: {
                    type: 'value', name: '实收(元)',
                    axisLine: { lineStyle: { color: '#e4e7ed' } },
                    axisLabel: { color: '#606266', fontSize: 11 },
                    splitLine: { lineStyle: { color: '#f0f2f5' } }
                },
                series: [{
                    type: 'bar', barWidth: 32,
                    data: this.monthData.map(x => x.amount),
                    itemStyle: {
                        borderRadius: [5, 5, 0, 0],
                        color: {
                            type: 'linear', x: 0, y: 0, x2: 0, y2: 1,
                            colorStops: [{ offset: 0, color: '#4a9ad4' }, { offset: 1, color: '#2d6cb5' }]
                        }
                    },
                    label: { show: true, position: 'top', fontSize: 11, color: '#606266' }
                }]
            });
        },
        renderMethod() {
            this._charts = this._charts || {};
            if (!this.$refs.chartMethod) return;
            this._charts.method = echarts.init(this.$refs.chartMethod);
            const colorMap = { WECHAT: '#67c23a', ALIPAY: '#2d6cb5', CASH: '#e6a23c', BANK: '#8e71d4' };
            this._charts.method.setOption({
                tooltip: { trigger: 'item', formatter: p => p.name + ': ¥' + p.value + '（' + p.percent + '%）' },
                legend: { bottom: 0, itemWidth: 10, itemHeight: 10, textStyle: { fontSize: 11, color: '#606266' } },
                series: [{
                    type: 'pie',
                    radius: ['42%', '66%'],
                    center: ['50%', '46%'],
                    itemStyle: { borderColor: '#fff', borderWidth: 2 },
                    label: { formatter: '{b}\n{d}%', fontSize: 11, color: '#606266' },
                    data: this.methodData.map(x => ({
                        name: PmsUtils.label('payMethod', x.name),
                        value: x.amount,
                        itemStyle: { color: colorMap[x.name] || '#a7b0bd' }
                    }))
                }]
            });
        }
    },
    watch: {
        statTab() {
            this.$nextTick(() => {
                if (this.statTab === 'month') this.renderMonth();
                else this.renderMethod();
            });
        }
    }
});
