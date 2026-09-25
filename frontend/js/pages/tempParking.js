/**
 * 临时停车管理(小区外临街 / 小区内临停)
 */
Vue.component('page-temp-parking', {
    template: `
    <div>
        <div class="page-head">
            <h3>临时停车管理</h3>
            <div class="desc">车辆进出场登记与临时停车费结算</div>
            <div class="head-actions">
                <el-button size="small" icon="el-icon-s-claim" @click="showInParking">
                    在场车辆 <el-badge :value="inParkingCount" v-if="inParkingCount" type="warning" style="margin-left:4px"></el-badge>
                </el-button>
                <el-tag v-if="!canManage" type="info" size="small">只读</el-tag>
                <el-button v-if="canManage" size="small" type="primary" icon="el-icon-plus" @click="openEntry">车辆入场</el-button>
            </div>
        </div>

        <!-- 计费规则 -->
        <el-alert type="info" :closable="false" show-icon style="margin-bottom:14px">
            <template slot="title">
                <span style="font-size:13px">
                    <b>临停计费规则：</b>前 30 分钟免费 &nbsp;|&nbsp; 超过 30 分钟首小时 5 元 &nbsp;|&nbsp;
                    每超 1 小时加收 3 元 &nbsp;|&nbsp; 24 小时内封顶 30 元
                </span>
            </template>
        </el-alert>

        <div class="search-bar">
            <el-input v-model="query.keyword" placeholder="车牌号 / 记录编号 / 岗亭" prefix-icon="el-icon-search"
                size="small" clearable @keyup.enter.native="reload"></el-input>
            <el-select v-model="query.parkType" placeholder="停车区域" size="small" clearable>
                <el-option v-for="o in parkTypeOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-select v-model="query.payStatus" placeholder="缴费状态" size="small" clearable>
                <el-option v-for="o in payStatusOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-date-picker v-model="dateRange" type="daterange" value-format="yyyy-MM-dd" size="small"
                range-separator="至" start-placeholder="入场开始" end-placeholder="入场结束" style="width:240px">
            </el-date-picker>
            <el-button size="small" type="primary" icon="el-icon-search" @click="reload">查询</el-button>
            <el-button size="small" icon="el-icon-refresh" @click="reset">重置</el-button>
        </div>

        <!-- 统计 -->
        <div class="stat-grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
            <div class="stat-card" v-for="c in statCards" :key="c.label">
                <div class="icon-box" :class="c.color"><i :class="c.icon"></i></div>
                <div class="info">
                    <div class="label">{{ c.label }}</div>
                    <div class="value">{{ c.value }}<small v-if="c.unit">{{ c.unit }}</small></div>
                    <div class="sub">{{ c.sub }}</div>
                </div>
            </div>
        </div>

        <el-table :data="rows" v-loading="loading" border stripe size="small" style="width:100%">
            <el-table-column prop="recordNo" label="记录编号" width="160" show-overflow-tooltip></el-table-column>
            <el-table-column prop="carPlate" label="车牌号" width="110" align="center">
                <template slot-scope="s">
                    <el-tag size="mini" type="info">{{ s.row.carPlate }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="carType" label="车型" width="80" align="center"></el-table-column>
            <el-table-column label="区域" width="110" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('parkType', s.row.parkType)" size="mini">
                        {{ PmsUtils.label('parkType', s.row.parkType) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="入场时间" width="145" align="center">
                <template slot-scope="s">{{ PmsUtils.minute(s.row.entryTime) }}</template>
            </el-table-column>
            <el-table-column label="出场时间" width="145" align="center">
                <template slot-scope="s">
                    <span v-if="s.row.exitTime">{{ PmsUtils.minute(s.row.exitTime) }}</span>
                    <el-tag v-else size="mini" type="warning">在场</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="停车时长" width="110" align="center">
                <template slot-scope="s">{{ s.row.exitTime ? PmsUtils.duration(s.row.duration) : '-' }}</template>
            </el-table-column>
            <el-table-column label="应收金额" width="100" align="right">
                <template slot-scope="s">
                    <span class="money">{{ PmsUtils.money(s.row.fee) }}</span>
                </template>
            </el-table-column>
            <el-table-column label="实收金额" width="100" align="right">
                <template slot-scope="s">
                    <span :class="s.row.paidFee > 0 ? 'money' : 'money-gray'">{{ PmsUtils.money(s.row.paidFee) }}</span>
                </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('tempPayStatus', s.row.payStatus)" size="mini">
                        {{ PmsUtils.label('tempPayStatus', s.row.payStatus) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="gate" label="通道岗亭" width="120" show-overflow-tooltip></el-table-column>
            <el-table-column v-if="canManage" label="操作" width="150" align="center" fixed="right">
                <template slot-scope="s">
                    <el-button v-if="!s.row.exitTime" type="text" size="mini"
                        @click="openExit(s.row)">出场结算</el-button>
                    <el-button v-else type="text" size="mini" @click="showDetail(s.row)">详情</el-button>
                    <el-button type="text" size="mini" style="color:#f56c6c" @click="remove(s.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-pagination class="pagination" background layout="total, sizes, prev, pager, next, jumper"
            :current-page.sync="pageNum" :page-size.sync="pageSize" :page-sizes="[10,20,50,100]"
            :total="total" @current-change="load" @size-change="load"></el-pagination>

        <!-- 车辆入场 -->
        <el-dialog title="车辆入场登记" :visible.sync="entryVisible" width="500px" :close-on-click-modal="false">
            <el-form :model="entryForm" :rules="entryRules" ref="entryForm" label-width="100px" size="small">
                <el-form-item label="车牌号" prop="carPlate">
                    <el-input v-model="entryForm.carPlate" placeholder="请输入车牌号，如 京A12345"
                        @input="v => entryForm.carPlate = (v || '').toUpperCase()"></el-input>
                </el-form-item>
                <el-form-item label="车辆类型">
                    <el-select v-model="entryForm.carType" style="width:100%">
                        <el-option label="小型车" value="小型车"></el-option>
                        <el-option label="中型车" value="中型车"></el-option>
                        <el-option label="大型车" value="大型车"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="停车区域">
                    <el-radio-group v-model="entryForm.parkType">
                        <el-radio label="OUTSIDE">小区外临街</el-radio>
                        <el-radio label="INSIDE">小区内</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="通道岗亭">
                    <el-select v-model="entryForm.gate" style="width:100%">
                        <el-option label="外街西口岗亭" value="外街西口岗亭"></el-option>
                        <el-option label="外街东口岗亭" value="外街东口岗亭"></el-option>
                        <el-option label="南门岗亭" value="南门岗亭"></el-option>
                        <el-option label="北门岗亭" value="北门岗亭"></el-option>
                    </el-select>
                </el-form-item>
                <el-alert type="success" :closable="false" show-icon
                    title="登记后系统开始计时，出场时自动按规则计算停车费。"></el-alert>
            </el-form>
            <div slot="footer">
                <el-button @click="entryVisible = false" size="small">取 消</el-button>
                <el-button type="primary" size="small" @click="submitEntry">确认入场</el-button>
            </div>
        </el-dialog>

        <!-- 出场结算 -->
        <el-dialog title="车辆出场结算" :visible.sync="exitVisible" width="500px" :close-on-click-modal="false">
            <div v-if="exitData" v-loading="exitLoading">
                <el-descriptions :column="1" border size="small">
                    <el-descriptions-item label="车牌号">
                        <el-tag size="mini" type="info">{{ exitData.carPlate }}</el-tag>
                    </el-descriptions-item>
                    <el-descriptions-item label="入场时间">{{ PmsUtils.minute(exitData.entryTime) }}</el-descriptions-item>
                    <el-descriptions-item label="停车时长">{{ PmsUtils.duration(exitData.duration) }}</el-descriptions-item>
                    <el-descriptions-item label="应收停车费">
                        <span style="font-size:20px;font-weight:600;color:#f56c6c">{{ PmsUtils.money(exitData.fee) }}</span>
                    </el-descriptions-item>
                </el-descriptions>

                <div style="margin-top:18px">
                    <div style="font-size:13px;color:#606266;margin-bottom:10px">缴费方式</div>
                    <el-radio-group v-model="exitForm.payMethod">
                        <el-radio-button label="WECHAT">微信支付</el-radio-button>
                        <el-radio-button label="ALIPAY">支付宝</el-radio-button>
                        <el-radio-button label="CASH">现金</el-radio-button>
                        <el-radio-button label="FREE">免费放行</el-radio-button>
                    </el-radio-group>
                </div>
            </div>
            <div slot="footer">
                <el-button @click="exitVisible = false" size="small">取 消</el-button>
                <el-button type="primary" size="small" @click="submitExit">确认出场</el-button>
            </div>
        </el-dialog>

        <!-- 在场车辆 -->
        <el-drawer title="当前在场临停车辆" :visible.sync="inParkingVisible" size="620px">
            <div style="padding:0 20px">
                <el-table :data="inParkingList" border size="small" v-loading="inParkingLoading">
                    <el-table-column prop="carPlate" label="车牌号" width="110"></el-table-column>
                    <el-table-column label="入场时间" width="145">
                        <template slot-scope="s">{{ PmsUtils.minute(s.row.entryTime) }}</template>
                    </el-table-column>
                    <el-table-column label="已停时长" width="110">
                        <template slot-scope="s">{{ PmsUtils.duration(s.row.duration) }}</template>
                    </el-table-column>
                    <el-table-column label="预估费用" align="right">
                        <template slot-scope="s"><span class="money">{{ PmsUtils.money(s.row.fee) }}</span></template>
                    </el-table-column>
                    <el-table-column v-if="canManage" label="操作" width="100" align="center">
                        <template slot-scope="s">
                            <el-button type="text" size="mini" @click="openExit(s.row); inParkingVisible = false">
                                出场结算</el-button>
                        </template>
                    </el-table-column>
                </el-table>
                <div style="margin-top:14px;color:#909399;font-size:12px">
                    共 {{ inParkingList.length }} 辆车仍在场，费用为按当前时刻试算的预估金额。
                </div>
            </div>
        </el-drawer>

        <!-- 详情 -->
        <el-dialog title="停车记录详情" :visible.sync="detailVisible" width="560px">
            <div class="detail-box" v-if="current">
                <el-row :gutter="10" v-for="item in detailItems" :key="item.label" style="margin-bottom:12px">
                    <el-col :span="7"><span class="detail-label">{{ item.label }}</span></el-col>
                    <el-col :span="17"><span class="detail-value">{{ item.value }}</span></el-col>
                </el-row>
            </div>
        </el-dialog>
    </div>
    `,
    data() {
        return {
            loading: false,
            rows: [], total: 0, pageNum: 1, pageSize: 10,
            query: { keyword: '', parkType: '', payStatus: '' },
            dateRange: [],
            stat: {},
            entryVisible: false, exitVisible: false, detailVisible: false, inParkingVisible: false,
            inParkingList: [], inParkingLoading: false, inParkingCount: 0,
            exitLoading: false, exitData: null,
            entryForm: {}, exitForm: { payMethod: 'WECHAT' },
            current: null,
            entryRules: {
                carPlate: [
                    { required: true, message: '请输入车牌号', trigger: 'blur' },
                    { min: 6, message: '车牌号格式不正确', trigger: 'blur' }
                ]
            }
        };
    },
    computed: {
        parkTypeOptions() { return PmsUtils.options('parkType'); },
        payStatusOptions() { return PmsUtils.options('tempPayStatus'); },
        statCards() {
            const s = this.stat || {};
            return [
                { label: '今日停车记录', value: s.todayCount || 0, unit: '条', sub: '今日进出场车辆', icon: 'el-icon-truck', color: 'bg-blue' },
                { label: '今日临停收入', value: PmsUtils.money(s.todayFee, false), unit: '元', sub: '已结算金额', icon: 'el-icon-money', color: 'bg-green' },
                { label: '在场车辆', value: this.inParkingCount, unit: '辆', sub: '尚未出场', icon: 'el-icon-location-outline', color: 'bg-orange' },
                { label: '本次查询记录', value: this.total, unit: '条', sub: '符合条件的停车记录', icon: 'el-icon-tickets', color: 'bg-purple' }
            ];
        },
        detailItems() {
            const r = this.current || {};
            return [
                { label: '记录编号', value: r.recordNo },
                { label: '车牌号', value: r.carPlate },
                { label: '车辆类型', value: r.carType },
                { label: '停车区域', value: PmsUtils.label('parkType', r.parkType) },
                { label: '入场时间', value: r.entryTime },
                { label: '出场时间', value: r.exitTime || '未出场' },
                { label: '停车时长', value: PmsUtils.duration(r.duration) },
                { label: '应收金额', value: PmsUtils.money(r.fee) },
                { label: '实收金额', value: PmsUtils.money(r.paidFee) },
                { label: '缴费方式', value: r.payMethod ? PmsUtils.label('payMethod', r.payMethod) : (r.payStatus === 'FREE' ? '免费放行' : '-') },
                { label: '缴费状态', value: PmsUtils.label('tempPayStatus', r.payStatus) },
                { label: '通道岗亭', value: r.gate || '-' },
                { label: '操作人', value: r.operator || '-' }
            ];
        }
    },
    created() {
        this.load();
        this.loadStats();
        this.loadInParking();
    },
    methods: {
        load() {
            this.loading = true;
            const params = Object.assign({}, this.query);
            if (this.dateRange && this.dateRange.length === 2) {
                params.beginDate = this.dateRange[0];
                params.endDate = this.dateRange[1];
            }
            Api.tempParking.page(Object.assign({}, params, { pageNum: this.pageNum, pageSize: this.pageSize }))
                .then(res => {
                    this.rows = res.data.rows || [];
                    this.total = res.data.total || 0;
                })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.loading = false; });
        },
        loadStats() {
            Api.dashboard.overview().then(res => {
                const o = res.data || {};
                this.stat = {
                    todayFee: o.tempParkingIncome,
                    inCount: o.tempParkingInCount
                };
                this.inParkingCount = o.tempParkingInCount || 0;
            }).catch(() => { });
        },
        loadInParking() {
            Api.tempParking.inParking()
                .then(res => {
                    this.inParkingList = res.data || [];
                    this.inParkingCount = this.inParkingList.length;
                })
                .catch(() => { });
        },
        reload() { this.pageNum = 1; this.load(); },
        reset() {
            this.query = { keyword: '', parkType: '', payStatus: '' };
            this.dateRange = [];
            this.reload();
        },
        openEntry() {
            this.entryForm = {
                carPlate: '', carType: '小型车', parkType: 'OUTSIDE', gate: '外街西口岗亭'
            };
            this.entryVisible = true;
            this.$nextTick(() => this.$refs.entryForm && this.$refs.entryForm.clearValidate());
        },
        submitEntry() {
            this.$refs.entryForm.validate(valid => {
                if (!valid) return;
                Api.tempParking.entry(this.entryForm).then(res => {
                    this.$message.success(res.msg);
                    this.entryVisible = false;
                    this.reload();
                    this.loadInParking();
                }).catch(err => this.$message.error(err.message));
            });
        },
        openExit(row) {
            this.exitData = null;
            this.exitForm = { payMethod: 'WECHAT' };
            this.exitVisible = true;
            this.exitLoading = true;
            const req = row.exitTime
                ? Promise.resolve({ data: row })
                : Api.tempParking.preview(row.id);
            req.then(res => {
                this.exitData = Object.assign({}, res.data, { id: row.id });
            }).catch(err => this.$message.error(err.message))
                .finally(() => { this.exitLoading = false; });
        },
        submitExit() {
            if (!this.exitData) return;
            Api.tempParking.exit({ id: this.exitData.id, payMethod: this.exitForm.payMethod })
                .then(res => {
                    this.$message.success(res.msg);
                    this.exitVisible = false;
                    this.reload();
                    this.loadInParking();
                    this.loadStats();
                })
                .catch(err => this.$message.error(err.message));
        },
        showDetail(row) {
            this.current = row;
            this.detailVisible = true;
        },
        showInParking() {
            this.inParkingVisible = true;
            this.loadInParking();
        },
        remove(row) {
            this.$confirm('确定删除停车记录「' + row.recordNo + '」吗？', '删除确认', { type: 'warning' })
                .then(() => Api.tempParking.remove(row.id))
                .then(res => { this.$message.success(res.msg); this.load(); })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        }
    }
});
