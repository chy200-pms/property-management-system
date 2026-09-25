/**
 * 物业费账单管理(物业费 + 车位管理费)
 */
Vue.component('page-fee-bill', {
    template: `
    <div>
        <div class="page-head">
            <h3>物业费账单</h3>
            <div class="desc">账单生成、缴费、欠费催缴与收费统计</div>
            <div class="head-actions">
                <el-button size="small" icon="el-icon-s-data" @click="showStat">收费统计</el-button>
                <el-button size="small" type="warning" icon="el-icon-magic-stick" @click="generateVisible = true">
                    生成账单</el-button>
                <el-tag v-if="!canManage" type="info" size="small">只读</el-tag>
                <el-button v-if="canManage" size="small" type="primary" icon="el-icon-plus" @click="openForm()">新增账单</el-button>
            </div>
        </div>

        <!-- 收费概览 -->
        <div class="stat-grid">
            <div class="stat-card" v-for="c in statCards" :key="c.label">
                <div class="icon-box" :class="c.color"><i :class="c.icon"></i></div>
                <div class="info">
                    <div class="label">{{ c.label }}</div>
                    <div class="value">{{ c.value }}<small v-if="c.unit">{{ c.unit }}</small></div>
                    <div class="sub">{{ c.sub }}</div>
                </div>
            </div>
        </div>

        <div class="search-bar">
            <el-input v-model="query.keyword" placeholder="账单编号 / 业主 / 房屋 / 车位" prefix-icon="el-icon-search"
                size="small" clearable @keyup.enter.native="reload" style="width:220px"></el-input>
            <el-select v-model="query.feeType" placeholder="费用类型" size="small" clearable>
                <el-option label="物业费" value="PROPERTY"></el-option>
                <el-option label="车位管理费" value="PARKING"></el-option>
                <el-option label="水费" value="WATER"></el-option>
                <el-option label="电费" value="ELECTRIC"></el-option>
            </el-select>
            <el-select v-model="query.payStatus" placeholder="缴费状态" size="small" clearable>
                <el-option v-for="o in payStatusOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-select v-model="query.period" placeholder="账期" size="small" clearable>
                <el-option v-for="p in periods" :key="p" :label="p" :value="p"></el-option>
            </el-select>
            <el-button size="small" type="primary" icon="el-icon-search" @click="reload">查询</el-button>
            <el-button size="small" icon="el-icon-refresh" @click="reset">重置</el-button>
        </div>

        <div class="table-toolbar">
            <el-button size="small" type="success" icon="el-icon-money" :disabled="!selection.length"
                @click="batchPay">
                批量缴费（已选 {{ selection.length }} 条）
            </el-button>
            <el-button size="small" icon="el-icon-download" :disabled="!selection.length" @click="exportSelected">
                导出所选
            </el-button>
            <div class="right">
                <el-tag size="small" type="info">共 {{ total }} 条账单</el-tag>
            </div>
        </div>

        <el-table :data="rows" v-loading="loading" border stripe size="small" style="width:100%"
            @selection-change="v => selection = v">
            <el-table-column type="selection" width="45" align="center"
                :selectable="r => r.payStatus !== 'PAID'"></el-table-column>
            <el-table-column prop="billNo" label="账单编号" width="160" show-overflow-tooltip></el-table-column>
            <el-table-column prop="ownerName" label="业主" width="90"></el-table-column>
            <el-table-column prop="houseNo" label="房屋/车位" min-width="150" show-overflow-tooltip>
                <template slot-scope="s">
                    <span v-if="s.row.houseNo">{{ s.row.houseNo }}</span>
                    <span v-else-if="s.row.parkingNo">车位 {{ s.row.parkingNo }}</span>
                    <span v-else class="text-muted">-</span>
                </template>
            </el-table-column>
            <el-table-column label="费用类型" width="110" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('feeType', s.row.feeType)" size="mini">
                        {{ PmsUtils.label('feeType', s.row.feeType) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="feeName" label="费用名称" min-width="130" show-overflow-tooltip></el-table-column>
            <el-table-column prop="period" label="账期" width="85" align="center"></el-table-column>
            <el-table-column label="应收" width="95" align="right">
                <template slot-scope="s"><span class="money">{{ PmsUtils.money(s.row.amount) }}</span></template>
            </el-table-column>
            <el-table-column label="实收" width="95" align="right">
                <template slot-scope="s">
                    <span :class="s.row.paidAmount > 0 ? 'money' : 'money-gray'">
                        {{ PmsUtils.money(s.row.paidAmount) }}</span>
                </template>
            </el-table-column>
            <el-table-column label="状态" width="95" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('payStatus', s.row.payStatus)" size="mini">
                        {{ PmsUtils.label('payStatus', s.row.payStatus) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="应缴截止" width="100" align="center">
                <template slot-scope="s">{{ PmsUtils.day(s.row.dueDate) }}</template>
            </el-table-column>
            <el-table-column label="缴费时间" width="140" align="center">
                <template slot-scope="s">
                    <span v-if="s.row.payTime">{{ PmsUtils.minute(s.row.payTime) }}</span>
                    <span v-else class="text-muted">-</span>
                </template>
            </el-table-column>
            <el-table-column label="缴费方式" width="95" align="center">
                <template slot-scope="s">
                    <span v-if="s.row.payMethod">{{ PmsUtils.label('payMethod', s.row.payMethod) }}</span>
                    <span v-else class="text-muted">-</span>
                </template>
            </el-table-column>
            <el-table-column v-if="canManage" label="操作" width="160" align="center" fixed="right">
                <template slot-scope="s">
                    <el-button v-if="s.row.payStatus !== 'PAID'" type="text" size="mini"
                        @click="openPay(s.row)">收费</el-button>
                    <el-button v-else type="text" size="mini" style="color:#e6a23c"
                        @click="cancelPay(s.row)">撤销缴费</el-button>
                    <el-button type="text" size="mini" @click="openForm(s.row)">编辑</el-button>
                    <el-button type="text" size="mini" style="color:#f56c6c" @click="remove(s.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-pagination class="pagination" background layout="total, sizes, prev, pager, next, jumper"
            :current-page.sync="pageNum" :page-size.sync="pageSize" :page-sizes="[10,20,50,100]"
            :total="total" @current-change="load" @size-change="load"></el-pagination>

        <!-- 收费 -->
        <el-dialog title="账单收费" :visible.sync="payVisible" width="500px" :close-on-click-modal="false">
            <el-descriptions :column="1" border size="small" v-if="payBill">
                <el-descriptions-item label="账单编号">{{ payBill.billNo }}</el-descriptions-item>
                <el-descriptions-item label="业主">{{ payBill.ownerName }}</el-descriptions-item>
                <el-descriptions-item label="费用名称">{{ payBill.feeName }}（{{ payBill.period }}）</el-descriptions-item>
                <el-descriptions-item label="应收金额">
                    <span style="font-size:20px;font-weight:600;color:#f56c6c">{{ PmsUtils.money(payBill.amount) }}</span>
                </el-descriptions-item>
            </el-descriptions>
            <div style="margin-top:18px">
                <div style="font-size:13px;color:#606266;margin-bottom:10px">缴费方式</div>
                <el-radio-group v-model="payMethod">
                    <el-radio-button label="WECHAT">微信支付</el-radio-button>
                    <el-radio-button label="ALIPAY">支付宝</el-radio-button>
                    <el-radio-button label="CASH">现金</el-radio-button>
                    <el-radio-button label="BANK">银行转账</el-radio-button>
                </el-radio-group>
            </div>
            <div slot="footer">
                <el-button @click="payVisible = false" size="small">取 消</el-button>
                <el-button type="primary" size="small" @click="submitPay">确认收费</el-button>
            </div>
        </el-dialog>

        <!-- 生成账单 -->
        <el-dialog title="批量生成账单" :visible.sync="generateVisible" width="520px" :close-on-click-modal="false">
            <el-form label-width="110px" size="small">
                <el-form-item label="账期">
                    <el-date-picker v-model="genPeriod" type="month" value-format="yyyy-MM" placeholder="选择账期"
                        style="width:100%"></el-date-picker>
                </el-form-item>
                <el-form-item label="账单类型">
                    <el-checkbox-group v-model="genTypes">
                        <el-checkbox label="PROPERTY">物业费（按房屋面积计算）</el-checkbox>
                        <el-checkbox label="PARKING">车位管理费（按车位月租金计算）</el-checkbox>
                    </el-checkbox-group>
                </el-form-item>
            </el-form>
            <el-alert type="warning" :closable="false" show-icon
                title="系统将按已入住房屋与已分配车位批量生成账单，已存在的账单会自动跳过，不会重复生成。">
            </el-alert>
            <div slot="footer">
                <el-button @click="generateVisible = false" size="small">取 消</el-button>
                <el-button type="primary" size="small" :loading="generating" @click="submitGenerate">开始生成</el-button>
            </div>
        </el-dialog>

        <!-- 统计 -->
        <el-dialog title="收费统计分析" :visible.sync="statVisible" width="720px">
            <el-tabs v-model="statTab">
                <el-tab-pane label="按缴费状态" name="status">
                    <el-table :data="statStatus" border size="small" v-loading="statLoading">
                        <el-table-column label="缴费状态">
                            <template slot-scope="s">{{ PmsUtils.label('payStatus', s.row.name) }}</template>
                        </el-table-column>
                        <el-table-column prop="value" label="账单笔数" width="110" align="center"></el-table-column>
                        <el-table-column label="应收金额" width="130" align="right">
                            <template slot-scope="s">{{ PmsUtils.money(s.row.amount) }}</template>
                        </el-table-column>
                        <el-table-column label="实收金额" width="130" align="right">
                            <template slot-scope="s">{{ PmsUtils.money(s.row.paidAmount) }}</template>
                        </el-table-column>
                    </el-table>
                </el-tab-pane>
                <el-tab-pane label="按费用类型" name="type">
                    <el-table :data="statType" border size="small" v-loading="statLoading">
                        <el-table-column label="费用类型">
                            <template slot-scope="s">{{ PmsUtils.label('feeType', s.row.name) }}</template>
                        </el-table-column>
                        <el-table-column prop="value" label="账单笔数" width="110" align="center"></el-table-column>
                        <el-table-column label="应收金额" width="130" align="right">
                            <template slot-scope="s">{{ PmsUtils.money(s.row.amount) }}</template>
                        </el-table-column>
                        <el-table-column label="实收金额" width="130" align="right">
                            <template slot-scope="s">{{ PmsUtils.money(s.row.paidAmount) }}</template>
                        </el-table-column>
                    </el-table>
                </el-tab-pane>
                <el-tab-pane label="按账期" name="period">
                    <el-table :data="statPeriod" border size="small" v-loading="statLoading">
                        <el-table-column prop="name" label="账期" width="110"></el-table-column>
                        <el-table-column prop="value" label="账单笔数" width="110" align="center"></el-table-column>
                        <el-table-column label="应收金额" width="130" align="right">
                            <template slot-scope="s">{{ PmsUtils.money(s.row.amount) }}</template>
                        </el-table-column>
                        <el-table-column label="实收金额" width="130" align="right">
                            <template slot-scope="s">{{ PmsUtils.money(s.row.paidAmount) }}</template>
                        </el-table-column>
                        <el-table-column label="收缴率" align="center">
                            <template slot-scope="s">
                                <el-tag size="mini" type="success">
                                    {{ s.row.amount ? (s.row.paidAmount / s.row.amount * 100).toFixed(1) + '%' : '0%' }}</el-tag>
                            </template>
                        </el-table-column>
                    </el-table>
                </el-tab-pane>
            </el-tabs>
        </el-dialog>

        <!-- 新增/编辑账单 -->
        <el-dialog :title="form.id ? '编辑账单' : '新增账单'" :visible.sync="formVisible" width="620px"
            :close-on-click-modal="false">
            <el-form :model="form" :rules="rules" ref="form" label-width="110px" size="small">
                <el-row :gutter="14">
                    <el-col :span="12">
                        <el-form-item label="业主" prop="ownerId">
                            <el-select v-model="form.ownerId" filterable style="width:100%" @change="onOwnerChange">
                                <el-option v-for="o in owners" :key="o.id"
                                    :label="o.name + ' · ' + (o.houseNo || '')" :value="o.id"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="费用类型" prop="feeType">
                            <el-select v-model="form.feeType" style="width:100%">
                                <el-option v-for="o in feeTypeOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="费用名称" prop="feeName">
                            <el-input v-model="form.feeName" placeholder="如 住宅物业服务费"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="账期" prop="period">
                            <el-input v-model="form.period" placeholder="如 2026-09"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="应收金额" prop="amount">
                            <el-input-number v-model="form.amount" :min="0" :precision="2"
                                controls-position="right" style="width:100%"></el-input-number>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="应缴截止">
                            <el-date-picker v-model="form.dueDate" type="date" value-format="yyyy-MM-dd"
                                style="width:100%" placeholder="选择日期"></el-date-picker>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="缴费状态">
                            <el-select v-model="form.payStatus" style="width:100%">
                                <el-option v-for="o in payStatusOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="24">
                        <el-form-item label="备注">
                            <el-input v-model="form.remark" type="textarea" :rows="2"></el-input>
                        </el-form-item>
                    </el-col>
                </el-row>
            </el-form>
            <div slot="footer">
                <el-button @click="formVisible = false" size="small">取 消</el-button>
                <el-button type="primary" size="small" :loading="saving" @click="submitForm">保 存</el-button>
            </div>
        </el-dialog>
    </div>
    `,
    data() {
        return {
            loading: false, saving: false, generating: false, statLoading: false,
            rows: [], total: 0, pageNum: 1, pageSize: 10,
            query: { keyword: '', feeType: '', payStatus: '', period: '' },
            selection: [],
            owners: [], stat: {},
            payVisible: false, generateVisible: false, statVisible: false, formVisible: false,
            payBill: null, payMethod: 'WECHAT',
            genPeriod: '2026-09', genTypes: ['PROPERTY', 'PARKING'],
            statTab: 'status', statStatus: [], statType: [], statPeriod: [],
            form: {},
            rules: {
                ownerId: [{ required: true, message: '请选择业主', trigger: 'change' }],
                feeType: [{ required: true, message: '请选择费用类型', trigger: 'change' }],
                feeName: [{ required: true, message: '请输入费用名称', trigger: 'blur' }],
                period: [{ required: true, message: '请输入账期', trigger: 'blur' }],
                amount: [{ required: true, message: '请输入应收金额', trigger: 'blur' }]
            }
        };
    },
    computed: {
        payStatusOptions() { return PmsUtils.options('payStatus'); },
        feeTypeOptions() { return PmsUtils.options('feeType'); },
        periods() {
            const list = [];
            const now = new Date();
            for (let i = 0; i < 8; i++) {
                const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
                list.push(d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0'));
            }
            return list;
        },
        statCards() {
            const s = this.stat || {};
            return [
                { label: '账单总数', value: PmsUtils.num(this.total), unit: '条', sub: '符合条件的账单', icon: 'el-icon-tickets', color: 'bg-blue' },
                { label: '本月应收', value: PmsUtils.money(s.monthReceivable, false), unit: '元', sub: '账期 ' + (s.currentPeriod || ''), icon: 'el-icon-document', color: 'bg-purple' },
                { label: '本月实收', value: PmsUtils.money(s.monthReceived, false), unit: '元', sub: '收缴率 ' + (s.monthCollectRate || '0%'), icon: 'el-icon-money', color: 'bg-green' },
                { label: '累计欠费', value: PmsUtils.money(s.unpaidAmount, false), unit: '元', sub: '含逾期未缴账单', icon: 'el-icon-warning-outline', color: 'bg-red' }
            ];
        }
    },
    created() {
        Api.owner.list().then(res => {
            this.owners = (res.data || []).filter(o => PmsUtils.isMainPerson(o.personType));
        });
        Api.dashboard.overview().then(res => { this.stat = res.data || {}; });
        this.load();
    },
    methods: {
        load() {
            this.loading = true;
            Api.feeBill.page(Object.assign({}, this.query, { pageNum: this.pageNum, pageSize: this.pageSize }))
                .then(res => {
                    this.rows = res.data.rows || [];
                    this.total = res.data.total || 0;
                })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.loading = false; });
        },
        reload() { this.pageNum = 1; this.load(); },
        reset() {
            this.query = { keyword: '', feeType: '', payStatus: '', period: '' };
            this.reload();
        },
        openPay(row) {
            this.payBill = row;
            this.payMethod = 'WECHAT';
            this.payVisible = true;
        },
        submitPay() {
            Api.feeBill.pay(this.payBill.id, this.payMethod).then(res => {
                this.$message.success(res.msg);
                this.payVisible = false;
                this.load();
                this.refreshStat();
            }).catch(err => this.$message.error(err.message));
        },
        batchPay() {
            const ids = this.selection.map(r => r.id);
            const totalAmount = this.selection.reduce((s, r) => s + Number(r.amount), 0);
            this.$confirm(
                '将收取 ' + ids.length + ' 笔账单，合计 ' + PmsUtils.money(totalAmount) + '，确定继续吗？',
                '批量缴费确认', { type: 'info' }
            ).then(() => Api.feeBill.payBatch(ids, 'WECHAT'))
                .then(res => {
                    this.$message.success(res.msg);
                    this.load();
                    this.refreshStat();
                })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        },
        cancelPay(row) {
            this.$confirm('确定撤销账单「' + row.billNo + '」的缴费记录吗？撤销后账单将恢复为未缴费状态。',
                '撤销确认', { type: 'warning' })
                .then(() => Api.feeBill.cancelPay(row.id))
                .then(res => {
                    this.$message.success(res.msg);
                    this.load();
                    this.refreshStat();
                })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        },
        submitGenerate() {
            if (!this.genPeriod) return this.$message.warning('请选择账期');
            if (!this.genTypes.length) return this.$message.warning('请至少选择一种账单类型');
            this.generating = true;
            const tasks = [];
            if (this.genTypes.includes('PROPERTY')) tasks.push(Api.feeBill.generateProperty(this.genPeriod));
            if (this.genTypes.includes('PARKING')) tasks.push(Api.feeBill.generateParking(this.genPeriod));
            Promise.all(tasks).then(results => {
                results.forEach(r => this.$notify({ title: '生成结果', message: r.msg, type: 'success', duration: 5000 }));
                this.generateVisible = false;
                this.reload();
                this.refreshStat();
            }).catch(err => this.$message.error(err.message))
                .finally(() => { this.generating = false; });
        },
        showStat() {
            this.statVisible = true;
            this.statLoading = true;
            Promise.all([
                Api.feeBill.statusStatistics(),
                Api.feeBill.typeStatistics(),
                Api.feeBill.periodStatistics()
            ]).then(([a, b, c]) => {
                this.statStatus = a.data || [];
                this.statType = b.data || [];
                this.statPeriod = c.data || [];
            }).catch(err => this.$message.error(err.message))
                .finally(() => { this.statLoading = false; });
        },
        refreshStat() {
            Api.dashboard.overview().then(res => { this.stat = res.data || {}; });
        },
        onOwnerChange(id) {
            const o = this.owners.find(x => x.id === id);
            if (o) {
                this.form.houseId = o.houseId;
                this.form.houseNo = o.houseNo;
                this.form.ownerName = o.name;
            }
        },
        openForm(row) {
            this.form = row ? Object.assign({}, row) : {
                ownerId: null, ownerName: '', houseId: null, houseNo: '',
                feeType: 'PROPERTY', feeName: '住宅物业服务费',
                period: PmsUtils.currentPeriod(), amount: 0,
                paidAmount: 0, payStatus: 'UNPAID',
                dueDate: PmsUtils.currentPeriod() + '-25', remark: ''
            };
            this.formVisible = true;
            this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate());
        },
        submitForm() {
            this.$refs.form.validate(valid => {
                if (!valid) return;
                this.saving = true;
                const req = this.form.id ? Api.feeBill.update(this.form) : Api.feeBill.add(this.form);
                req.then(res => {
                    this.$message.success(res.msg);
                    this.formVisible = false;
                    this.load();
                }).catch(err => this.$message.error(err.message))
                    .finally(() => { this.saving = false; });
            });
        },
        remove(row) {
            this.$confirm('确定删除账单「' + row.billNo + '」吗？', '删除确认', { type: 'warning' })
                .then(() => Api.feeBill.remove(row.id))
                .then(res => { this.$message.success(res.msg); this.load(); })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        },
        exportSelected() {
            const rows = this.selection;
            const head = ['账单编号', '业主', '房屋/车位', '费用类型', '费用名称', '账期', '应收', '实收', '状态', '应缴截止'];
            const body = rows.map(r => [
                r.billNo, r.ownerName, r.houseNo || ('车位 ' + (r.parkingNo || '')),
                PmsUtils.label('feeType', r.feeType), r.feeName, r.period,
                r.amount, r.paidAmount, PmsUtils.label('payStatus', r.payStatus), PmsUtils.day(r.dueDate)
            ]);
            const csv = [head].concat(body).map(r => r.map(x => '"' + String(x == null ? '' : x) + '"').join(',')).join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = '账单明细_' + PmsUtils.day(new Date().toISOString()) + '.csv';
            a.click();
            URL.revokeObjectURL(a.href);
            this.$message.success('已导出 ' + rows.length + ' 条账单');
        }
    }
});
