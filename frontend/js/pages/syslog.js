/**
 * 操作日志（仅管理员可见）
 * ---------------------------------------------------------------
 * 对应后端 /log/page、/log/statistics、/log/detail/{id}。
 * 数据由 OperationLogInterceptor 自动写入：所有写操作（POST/PUT/DELETE）
 * 与登录/注销都会留痕，密码类字段在入库前已由后端脱敏为 ***。
 */
Vue.component('page-syslog', {
    template: `
    <div>
        <div class="page-head">
            <h3>操作日志</h3>
            <div class="desc">谁、在什么时候、对哪个模块做了什么、结果如何 —— 全部自动留痕</div>
            <div class="head-actions">
                <el-button size="small" icon="el-icon-refresh" @click="load()">刷新</el-button>
            </div>
        </div>

        <div class="stat-grid" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr))">
            <div class="stat-card">
                <div class="icon-box bg-blue"><i class="el-icon-document"></i></div>
                <div class="info">
                    <div class="label">日志总量</div>
                    <div class="value">{{ stats.total || 0 }}<small>条</small></div>
                    <div class="sub">保留 {{ keepDaysLabel }}</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="icon-box bg-green"><i class="el-icon-date"></i></div>
                <div class="info">
                    <div class="label">今日操作</div>
                    <div class="value">{{ stats.today || 0 }}<small>次</small></div>
                    <div class="sub">含登录与写操作</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="icon-box bg-red"><i class="el-icon-warning-outline"></i></div>
                <div class="info">
                    <div class="label">失败操作</div>
                    <div class="value">{{ stats.failCount || 0 }}<small>次</small></div>
                    <div class="sub">越权 / 校验不通过</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="icon-box bg-orange"><i class="el-icon-s-data"></i></div>
                <div class="info">
                    <div class="label">涉及模块</div>
                    <div class="value">{{ (stats.byModule || []).length }}<small>个</small></div>
                    <div class="sub">按业务域分布</div>
                </div>
            </div>
        </div>

        <el-row :gutter="14" style="margin-bottom:14px">
            <el-col :span="12">
                <el-card shadow="never">
                    <div slot="header">模块分布</div>
                    <div ref="moduleChart" style="height:220px"></div>
                </el-card>
            </el-col>
            <el-col :span="12">
                <el-card shadow="never">
                    <div slot="header">近 7 天操作趋势</div>
                    <div ref="dayChart" style="height:220px"></div>
                </el-card>
            </el-col>
        </el-row>

        <div class="search-bar">
            <el-input v-model="query.keyword" placeholder="账号 / 姓名 / 动作 / 路径" prefix-icon="el-icon-search"
                size="small" clearable @keyup.enter.native="reload" style="width:230px"></el-input>
            <el-select v-model="query.module" placeholder="业务模块" size="small" clearable style="width:150px">
                <el-option v-for="m in moduleOptions" :key="m" :label="m" :value="m"></el-option>
            </el-select>
            <el-select v-model="query.role" placeholder="操作人角色" size="small" clearable style="width:140px">
                <el-option label="超级管理员" value="ADMIN"></el-option>
                <el-option label="物业员工" value="STAFF"></el-option>
                <el-option label="业主" value="OWNER"></el-option>
            </el-select>
            <el-select v-model="query.status" placeholder="操作结果" size="small" clearable style="width:120px">
                <el-option label="成功" :value="1"></el-option>
                <el-option label="失败" :value="0"></el-option>
            </el-select>
            <el-date-picker v-model="dateRange" type="datetimerange" size="small"
                range-separator="至" start-placeholder="开始时间" end-placeholder="结束时间"
                value-format="yyyy-MM-dd HH:mm:ss" style="width:340px"></el-date-picker>
            <el-button size="small" type="primary" icon="el-icon-search" @click="reload">查询</el-button>
            <el-button size="small" icon="el-icon-refresh-left" @click="reset">重置</el-button>
        </div>

        <el-table :data="rows" v-loading="loading" border stripe size="small" style="width:100%">
            <el-table-column prop="id" label="ID" width="70"></el-table-column>
            <el-table-column label="操作人" width="150">
                <template slot-scope="s">
                    <div>{{ s.row.realName || s.row.username || '-' }}</div>
                    <div class="sub-text">{{ s.row.username || '-' }}</div>
                </template>
            </el-table-column>
            <el-table-column label="角色" width="100">
                <template slot-scope="s">
                    <el-tag size="mini" :type="roleTag(s.row.role)">{{ roleLabel(s.row.role) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="module" label="模块" width="110"></el-table-column>
            <el-table-column prop="action" label="动作" width="130"></el-table-column>
            <el-table-column label="请求" width="90">
                <template slot-scope="s">
                    <el-tag size="mini" :type="methodTag(s.row.method)">{{ s.row.method }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="uri" label="路径" min-width="170" show-overflow-tooltip></el-table-column>
            <el-table-column prop="params" label="参数" min-width="220" show-overflow-tooltip>
                <template slot-scope="s"><span class="mono">{{ s.row.params || '-' }}</span></template>
            </el-table-column>
            <el-table-column prop="ip" label="IP" width="120"></el-table-column>
            <el-table-column label="结果" width="90">
                <template slot-scope="s">
                    <el-tag size="mini" :type="s.row.status === 1 ? 'success' : 'danger'">
                        {{ s.row.status === 1 ? '成功' : '失败' }}
                    </el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="costMs" label="耗时" width="80">
                <template slot-scope="s">{{ s.row.costMs }} ms</template>
            </el-table-column>
            <el-table-column prop="createTime" label="时间" width="160"></el-table-column>
            <el-table-column label="操作" width="80" fixed="right">
                <template slot-scope="s">
                    <el-button type="text" size="mini" @click="openDetail(s.row)">详情</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-pagination class="pagination" background layout="total, sizes, prev, pager, next, jumper"
            :total="total" :current-page.sync="query.pageNum" :page-size="query.pageSize"
            :page-sizes="[10, 20, 50, 100]"
            @current-change="load" @size-change="onSizeChange"></el-pagination>

        <el-drawer title="操作日志详情" :visible.sync="detailVisible" size="480px">
            <div v-if="detail" class="log-detail">
                <div class="ld-row"><span>操作时间</span><b>{{ detail.createTime }}</b></div>
                <div class="ld-row"><span>操作人</span><b>{{ detail.realName || '-' }}（{{ detail.username || '-' }}）</b></div>
                <div class="ld-row"><span>角色</span><b>{{ roleLabel(detail.role) }}</b></div>
                <div class="ld-row"><span>模块 / 动作</span><b>{{ detail.module }} / {{ detail.action }}</b></div>
                <div class="ld-row"><span>请求</span><b>{{ detail.method }} {{ detail.uri }}</b></div>
                <div class="ld-row"><span>来源 IP</span><b>{{ detail.ip }}</b></div>
                <div class="ld-row"><span>耗时</span><b>{{ detail.costMs }} ms</b></div>
                <div class="ld-row">
                    <span>结果</span>
                    <b :class="detail.status === 1 ? 'ok' : 'bad'">
                        {{ detail.status === 1 ? '成功' : '失败' }}<template v-if="detail.errorMsg">：{{ detail.errorMsg }}</template>
                    </b>
                </div>
                <div class="ld-block">
                    <div class="ld-label">请求参数（敏感字段已脱敏）</div>
                    <pre class="ld-pre">{{ prettyParams(detail.params) }}</pre>
                </div>
                <div class="ld-block">
                    <div class="ld-label">客户端 UA</div>
                    <pre class="ld-pre">{{ detail.userAgent || '-' }}</pre>
                </div>
            </div>
        </el-drawer>
    </div>
    `,
    data() {
        return {
            loading: false,
            rows: [],
            total: 0,
            stats: {},
            moduleOptions: [],
            dateRange: [],
            query: { keyword: '', module: '', role: '', status: '', pageNum: 1, pageSize: 20 },
            detailVisible: false,
            detail: null,
            keepDaysLabel: '30 天',
            charts: {}
        };
    },
    created() {
        this.load();
        this.loadStats();
    },
    beforeDestroy() {
        Object.keys(this.charts).forEach(k => {
            if (this.charts[k]) { this.charts[k].dispose(); }
        });
        this.charts = {};
    },
    methods: {
        load() {
            this.loading = true;
            const q = Object.assign({}, this.query);
            q.startTime = this.dateRange && this.dateRange[0] ? this.dateRange[0] : '';
            q.endTime = this.dateRange && this.dateRange[1] ? this.dateRange[1] : '';
            return Api.log.page(q).then(res => {
                this.rows = res.data.rows || [];
                this.total = res.data.total || 0;
            }).catch(err => {
                this.$message.error(err.message || '加载失败');
            }).finally(() => {
                this.loading = false;
            });
        },
        loadStats() {
            return Api.log.statistics().then(res => {
                this.stats = res.data || {};
                const names = (this.stats.byModule || []).map(m => m.name).filter(Boolean);
                this.moduleOptions = names;
                this.$nextTick(() => this.renderCharts());
            }).catch(() => { /* 统计失败不影响列表 */ });
        },
        reload() {
            this.query.pageNum = 1;
            this.load();
        },
        onSizeChange(size) {
            this.query.pageSize = size;
            this.query.pageNum = 1;
            this.load();
        },
        reset() {
            this.query = { keyword: '', module: '', role: '', status: '', pageNum: 1, pageSize: 20 };
            this.dateRange = [];
            this.load();
        },
        openDetail(row) {
            this.detail = row;
            this.detailVisible = true;
            // 顺手取一次详情接口, 确保展示的是库里的最新内容
            Api.log.detail(row.id).then(res => { this.detail = res.data; }).catch(() => { });
        },
        prettyParams(raw) {
            if (!raw) return '-';
            try {
                return JSON.stringify(JSON.parse(raw), null, 2);
            } catch (e) {
                return raw;
            }
        },
        roleLabel(role) {
            return { ADMIN: '管理员', STAFF: '物业', OWNER: '业主' }[role] || (role || '-');
        },
        roleTag(role) {
            return { ADMIN: 'danger', STAFF: 'warning', OWNER: 'success' }[role] || 'info';
        },
        methodTag(method) {
            return { POST: 'success', PUT: 'warning', DELETE: 'danger' }[method] || 'info';
        },
        /** 图表: 模块分布(横向条) + 近 7 天趋势(折线面积) */
        renderCharts() {
            if (typeof echarts === 'undefined') return;
            const dark = document.body.classList.contains('dark-theme');
            const text = dark ? '#cfd8e3' : '#4a5568';
            const moduleEl = this.$refs.moduleChart;
            const dayEl = this.$refs.dayChart;
            if (moduleEl) {
                const mods = (this.stats.byModule || []).slice(0, 8).reverse();
                this.charts.module = this.charts.module || echarts.init(moduleEl);
                this.charts.module.setOption({
                    grid: { left: 84, right: 24, top: 12, bottom: 20 },
                    tooltip: { trigger: 'axis', axisPointer: { type: 'shadow' } },
                    xAxis: { type: 'value', axisLabel: { color: text }, splitLine: { lineStyle: { color: 'rgba(140,150,165,.18)' } } },
                    yAxis: {
                        type: 'category', data: mods.map(m => m.name),
                        axisLabel: { color: text }, axisLine: { lineStyle: { color: 'rgba(140,150,165,.3)' } }
                    },
                    series: [{
                        type: 'bar', barWidth: 12,
                        data: mods.map(m => m.value),
                        itemStyle: {
                            borderRadius: [0, 6, 6, 0],
                            color: new echarts.graphic.LinearGradient(0, 0, 1, 0, [
                                { offset: 0, color: '#f0a63c' }, { offset: 1, color: '#e2703a' }
                            ])
                        }
                    }]
                });
            }
            if (dayEl) {
                const days = this.stats.byDay || [];
                this.charts.day = this.charts.day || echarts.init(dayEl);
                this.charts.day.setOption({
                    grid: { left: 44, right: 20, top: 18, bottom: 28 },
                    tooltip: { trigger: 'axis' },
                    xAxis: {
                        type: 'category', boundaryGap: false,
                        data: days.map(d => String(d.name).slice(5)),
                        axisLabel: { color: text }, axisLine: { lineStyle: { color: 'rgba(140,150,165,.3)' } }
                    },
                    yAxis: {
                        type: 'value', minInterval: 1,
                        axisLabel: { color: text }, splitLine: { lineStyle: { color: 'rgba(140,150,165,.18)' } }
                    },
                    series: [{
                        type: 'line', smooth: true, data: days.map(d => d.value),
                        symbolSize: 6, itemStyle: { color: '#12a594' },
                        areaStyle: {
                            color: new echarts.graphic.LinearGradient(0, 0, 0, 1, [
                                { offset: 0, color: 'rgba(18,165,148,.36)' },
                                { offset: 1, color: 'rgba(18,165,148,.02)' }
                            ])
                        }
                    }]
                });
            }
        }
    }
});
