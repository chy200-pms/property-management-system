/**
 * 报修管理(工单流转)
 */
Vue.component('page-repair', {
    template: `
    <div>
        <div class="page-head">
            <h3>报修管理</h3>
            <div class="desc">报修受理 → 派单 → 处理 → 完工 → 评价 全流程管理</div>
            <div class="head-actions">
                <el-button size="small" icon="el-icon-data-analysis" @click="showStat">统计分析</el-button>
                <el-button size="small" type="primary" icon="el-icon-plus" @click="openForm()">代报修</el-button>
            </div>
        </div>

        <!-- 状态快捷筛选 -->
        <div class="stat-grid" style="grid-template-columns:repeat(auto-fill,minmax(190px,1fr))">
            <div class="stat-card" v-for="c in statusCards" :key="c.value" style="cursor:pointer"
                @click="quickFilter(c.value)" :style="query.status === c.value ? 'border-color:#2d6cb5' : ''">
                <div class="icon-box" :class="c.color"><i :class="c.icon"></i></div>
                <div class="info">
                    <div class="label">{{ c.label }}</div>
                    <div class="value">{{ c.count }}<small>单</small></div>
                    <div class="sub">{{ c.sub }}</div>
                </div>
            </div>
        </div>

        <div class="search-bar">
            <el-input v-model="query.keyword" placeholder="工单号 / 标题 / 报修人 / 维修人" prefix-icon="el-icon-search"
                size="small" clearable @keyup.enter.native="reload" style="width:230px"></el-input>
            <el-select v-model="query.status" placeholder="工单状态" size="small" clearable>
                <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-select v-model="query.repairType" placeholder="报修类型" size="small" clearable>
                <el-option v-for="o in typeOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-select v-model="query.urgency" placeholder="紧急程度" size="small" clearable>
                <el-option v-for="o in urgencyOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-button size="small" type="primary" icon="el-icon-search" @click="reload">查询</el-button>
            <el-button size="small" icon="el-icon-refresh" @click="reset">重置</el-button>
        </div>

        <el-table :data="rows" v-loading="loading" border stripe size="small" style="width:100%">
            <el-table-column prop="orderNo" label="工单号" width="155" show-overflow-tooltip></el-table-column>
            <el-table-column prop="title" label="报修标题" min-width="160" show-overflow-tooltip></el-table-column>
            <el-table-column prop="houseNo" label="报修房屋" width="150" show-overflow-tooltip></el-table-column>
            <el-table-column prop="ownerName" label="报修人" width="90"></el-table-column>
            <el-table-column label="类型" width="100" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('repairType', s.row.repairType)" size="mini">
                        {{ PmsUtils.label('repairType', s.row.repairType) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="紧急度" width="80" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('urgency', s.row.urgency)" size="mini" effect="dark">
                        {{ PmsUtils.label('urgency', s.row.urgency) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('repairStatus', s.row.status)" size="mini">
                        {{ PmsUtils.label('repairStatus', s.row.status) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="handler" label="维修人员" width="95">
                <template slot-scope="s">
                    <span v-if="s.row.handler">{{ s.row.handler }}</span>
                    <span v-else class="text-muted">未派单</span>
                </template>
            </el-table-column>
            <el-table-column label="报修时间" width="145" align="center">
                <template slot-scope="s">{{ PmsUtils.minute(s.row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="评分" width="130" align="center">
                <template slot-scope="s">
                    <el-rate v-if="s.row.rating" v-model="s.row.rating" disabled :max="5" score-template="{value}"
                        style="display:inline-block"></el-rate>
                    <span v-else class="text-muted">-</span>
                </template>
            </el-table-column>
            <el-table-column label="操作" width="210" align="center" fixed="right">
                <template slot-scope="s">
                    <el-button type="text" size="mini" @click="showDetail(s.row)">详情</el-button>
                    <el-button v-if="canManage && s.row.status === 'PENDING'" type="text" size="mini"
                        @click="openAssign(s.row)">派单</el-button>
                    <el-button v-if="canManage && s.row.status === 'ASSIGNED'" type="text" size="mini"
                        @click="start(s.row)">开始处理</el-button>
                    <el-button v-if="canManage && (s.row.status === 'ASSIGNED' || s.row.status === 'PROCESSING')"
                        type="text" size="mini" @click="openFinish(s.row)">完工</el-button>
                    <el-button v-if="s.row.status === 'FINISHED'" type="text" size="mini"
                        @click="openRate(s.row)">评价</el-button>
                    <el-button type="text" size="mini" v-if="canManage" style="color:#f56c6c" @click="remove(s.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-pagination class="pagination" background layout="total, sizes, prev, pager, next, jumper"
            :current-page.sync="pageNum" :page-size.sync="pageSize" :page-sizes="[10,20,50,100]"
            :total="total" @current-change="load" @size-change="load"></el-pagination>

        <!-- 代报修 -->
        <el-dialog title="代录入报修工单" :visible.sync="visible" width="640px" :close-on-click-modal="false">
            <el-form :model="form" :rules="rules" ref="form" label-width="100px" size="small">
                <el-row :gutter="14">
                    <el-col :span="12">
                        <el-form-item label="报修人" prop="ownerId">
                            <el-select v-model="form.ownerId" filterable style="width:100%" @change="onOwnerChange">
                                <el-option v-for="o in owners" :key="o.id"
                                    :label="o.name + ' · ' + (o.houseNo || '')" :value="o.id"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="联系电话">
                            <el-input v-model="form.phone" placeholder="默认取住户电话"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="24">
                        <el-form-item label="报修标题" prop="title">
                            <el-input v-model="form.title" placeholder="如 厨房水管漏水"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="报修类型" prop="repairType">
                            <el-select v-model="form.repairType" style="width:100%">
                                <el-option v-for="o in typeOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="紧急程度">
                            <el-select v-model="form.urgency" style="width:100%">
                                <el-option v-for="o in urgencyOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="24">
                        <el-form-item label="故障描述">
                            <el-input v-model="form.content" type="textarea" :rows="3"
                                placeholder="请描述故障现象、位置等"></el-input>
                        </el-form-item>
                    </el-col>
                </el-row>
            </el-form>
            <div slot="footer">
                <el-button @click="visible = false" size="small">取 消</el-button>
                <el-button type="primary" size="small" :loading="saving" @click="submit">提交工单</el-button>
            </div>
        </el-dialog>

        <!-- 派单 -->
        <el-dialog title="工单派单" :visible.sync="assignVisible" width="480px" :close-on-click-modal="false">
            <el-form label-width="100px" size="small">
                <el-form-item label="工单号">
                    <el-input :value="current && current.orderNo" disabled></el-input>
                </el-form-item>
                <el-form-item label="报修内容">
                    <el-input :value="current && current.title" disabled></el-input>
                </el-form-item>
                <el-form-item label="维修人员" required>
                    <el-select v-model="assignForm.handler" style="width:100%" placeholder="请选择维修人员"
                        @change="onHandlerChange">
                        <el-option v-for="h in handlers" :key="h.name" :label="h.name + ' · ' + h.phone"
                            :value="h.name"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="联系电话">
                    <el-input v-model="assignForm.handlerPhone"></el-input>
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="assignVisible = false" size="small">取 消</el-button>
                <el-button type="primary" size="small" @click="submitAssign">确认派单</el-button>
            </div>
        </el-dialog>

        <!-- 完工 -->
        <el-dialog title="工单完工登记" :visible.sync="finishVisible" width="480px" :close-on-click-modal="false">
            <el-form label-width="100px" size="small">
                <el-form-item label="工单号">
                    <el-input :value="current && current.orderNo" disabled></el-input>
                </el-form-item>
                <el-form-item label="维修费用">
                    <el-input-number v-model="finishForm.cost" :min="0" :precision="2" controls-position="right"
                        style="width:100%"></el-input-number>
                </el-form-item>
                <el-form-item label="处理说明">
                    <el-input v-model="finishForm.remark" type="textarea" :rows="3"
                        placeholder="如：已更换水龙头密封圈"></el-input>
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="finishVisible = false" size="small">取 消</el-button>
                <el-button type="primary" size="small" @click="submitFinish">确认完工</el-button>
            </div>
        </el-dialog>

        <!-- 评价 -->
        <el-dialog title="业主满意度评价" :visible.sync="rateVisible" width="440px">
            <div style="text-align:center;padding:14px 0">
                <div style="font-size:13px;color:#606266;margin-bottom:14px">请对本次维修服务进行评价</div>
                <el-rate v-model="rateForm.rating" :max="5" show-score score-template="{value} 分"
                    style="display:inline-block"></el-rate>
                <el-input v-model="rateForm.feedback" type="textarea" :rows="3" placeholder="服务评价（选填）"
                    style="margin-top:20px"></el-input>
            </div>
            <div slot="footer">
                <el-button @click="rateVisible = false" size="small">取 消</el-button>
                <el-button type="primary" size="small" @click="submitRate">提交评价</el-button>
            </div>
        </el-dialog>

        <!-- 详情 -->
        <el-dialog title="报修工单详情" :visible.sync="detailVisible" width="640px">
            <div class="detail-box" v-if="current">
                <el-row :gutter="10" v-for="item in detailItems" :key="item.label" style="margin-bottom:12px">
                    <el-col :span="6"><span class="detail-label">{{ item.label }}</span></el-col>
                    <el-col :span="18"><span class="detail-value">{{ item.value }}</span></el-col>
                </el-row>

                <el-divider content-position="left">处理进度</el-divider>
                <el-timeline>
                    <el-timeline-item :timestamp="PmsUtils.minute(current.createTime)" type="primary" size="normal">
                        业主提交报修工单
                    </el-timeline-item>
                    <el-timeline-item v-if="current.assignTime" :timestamp="PmsUtils.minute(current.assignTime)"
                        type="warning" size="normal">
                        已派单给 {{ current.handler }}（{{ current.handlerPhone }}）
                    </el-timeline-item>
                    <el-timeline-item v-if="current.finishTime" :timestamp="PmsUtils.minute(current.finishTime)"
                        type="success" size="normal">
                        维修完工，费用 {{ PmsUtils.money(current.cost) }}
                    </el-timeline-item>
                    <el-timeline-item v-if="current.rating" :timestamp="'业主评价 ' + current.rating + ' 分'"
                        type="success" size="normal">
                        {{ current.feedback || '业主已确认完成' }}
                    </el-timeline-item>
                </el-timeline>
            </div>
        </el-dialog>

        <!-- 统计 -->
        <el-dialog title="报修统计分析" :visible.sync="statVisible" width="720px">
            <el-row :gutter="14">
                <el-col :span="12">
                    <div style="font-size:13px;font-weight:600;margin-bottom:10px">按工单状态</div>
                    <el-table :data="statStatus" border size="small" v-loading="statLoading">
                        <el-table-column label="状态">
                            <template slot-scope="s">{{ PmsUtils.label('repairStatus', s.row.name) }}</template>
                        </el-table-column>
                        <el-table-column prop="value" label="数量" width="100" align="center"></el-table-column>
                    </el-table>
                </el-col>
                <el-col :span="12">
                    <div style="font-size:13px;font-weight:600;margin-bottom:10px">按报修类型</div>
                    <el-table :data="statType" border size="small" v-loading="statLoading">
                        <el-table-column label="类型">
                            <template slot-scope="s">{{ PmsUtils.label('repairType', s.row.name) }}</template>
                        </el-table-column>
                        <el-table-column prop="value" label="数量" width="100" align="center"></el-table-column>
                    </el-table>
                </el-col>
            </el-row>
        </el-dialog>
    </div>
    `,
    data() {
        return {
            loading: false, saving: false, statLoading: false,
            rows: [], total: 0, pageNum: 1, pageSize: 10,
            query: { keyword: '', status: '', repairType: '', urgency: '' },
            stat: {},
            owners: [],
            handlers: [
                { name: '刘海涛', phone: '13900001001' },
                { name: '陈国强', phone: '13900001002' },
                { name: '赵建军', phone: '13900001003' },
                { name: '孙志远', phone: '13900001004' },
                { name: '周明华', phone: '13900001005' }
            ],
            visible: false, assignVisible: false, finishVisible: false, rateVisible: false,
            detailVisible: false, statVisible: false,
            current: null,
            form: {}, assignForm: {}, finishForm: {}, rateForm: {},
            statStatus: [], statType: [],
            rules: {
                ownerId: [{ required: true, message: '请选择报修人', trigger: 'change' }],
                title: [{ required: true, message: '请输入报修标题', trigger: 'blur' }],
                repairType: [{ required: true, message: '请选择报修类型', trigger: 'change' }]
            }
        };
    },
    computed: {
        statusOptions() { return PmsUtils.options('repairStatus'); },
        typeOptions() { return PmsUtils.options('repairType'); },
        urgencyOptions() { return PmsUtils.options('urgency'); },
        statusCards() {
            const o = this.stat || {};
            return [
                { label: '待受理', value: 'PENDING', count: o.repairPending || 0, sub: '尚未派单', icon: 'el-icon-warning-outline', color: 'bg-orange' },
                { label: '已派单', value: 'ASSIGNED', count: o.repairAssigned || 0, sub: '等待上门', icon: 'el-icon-s-promotion', color: 'bg-blue' },
                { label: '处理中', value: 'PROCESSING', count: o.repairProcessing || 0, sub: '维修进行中', icon: 'el-icon-tools', color: 'bg-purple' },
                { label: '已完成', value: 'FINISHED', count: o.repairFinished || 0, sub: '平均满意度 ' + (o.repairAvgRating || 0) + ' 分', icon: 'el-icon-circle-check', color: 'bg-green' }
            ];
        },
        detailItems() {
            const r = this.current || {};
            return [
                { label: '工单号', value: r.orderNo },
                { label: '报修人', value: (r.ownerName || '-') + '（' + (r.phone || '-') + '）' },
                { label: '报修房屋', value: r.houseNo || '-' },
                { label: '报修标题', value: r.title },
                { label: '报修类型', value: PmsUtils.label('repairType', r.repairType) },
                { label: '紧急程度', value: PmsUtils.label('urgency', r.urgency) },
                { label: '工单状态', value: PmsUtils.label('repairStatus', r.status) },
                { label: '故障描述', value: r.content || '-' },
                { label: '维修费用', value: PmsUtils.money(r.cost) },
                { label: '处理说明', value: r.remark || '-' }
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
            Api.repair.page(Object.assign({}, this.query, { pageNum: this.pageNum, pageSize: this.pageSize }))
                .then(res => {
                    this.rows = res.data.rows || [];
                    this.total = res.data.total || 0;
                })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.loading = false; });
        },
        reload() { this.pageNum = 1; this.load(); },
        reset() {
            this.query = { keyword: '', status: '', repairType: '', urgency: '' };
            this.reload();
        },
        quickFilter(status) {
            this.query.status = this.query.status === status ? '' : status;
            this.reload();
        },
        refreshStat() {
            Api.dashboard.overview().then(res => { this.stat = res.data || {}; });
        },
        onOwnerChange(id) {
            const o = this.owners.find(x => x.id === id);
            if (o) this.form.phone = o.phone;
        },
        openForm() {
            this.form = {
                ownerId: null, phone: '', title: '', content: '',
                repairType: 'WATER_ELEC', urgency: 'NORMAL'
            };
            this.visible = true;
            this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate());
        },
        submit() {
            this.$refs.form.validate(valid => {
                if (!valid) return;
                this.saving = true;
                Api.repair.add(this.form).then(res => {
                    this.$message.success(res.msg);
                    this.visible = false;
                    this.reload();
                    this.refreshStat();
                }).catch(err => this.$message.error(err.message))
                    .finally(() => { this.saving = false; });
            });
        },
        openAssign(row) {
            this.current = row;
            this.assignForm = { id: row.id, handler: '', handlerPhone: '' };
            this.assignVisible = true;
        },
        onHandlerChange(name) {
            const h = this.handlers.find(x => x.name === name);
            if (h) this.assignForm.handlerPhone = h.phone;
        },
        submitAssign() {
            if (!this.assignForm.handler) return this.$message.warning('请选择维修人员');
            Api.repair.assign(this.assignForm).then(res => {
                this.$message.success(res.msg);
                this.assignVisible = false;
                this.load();
                this.refreshStat();
            }).catch(err => this.$message.error(err.message));
        },
        start(row) {
            this.$confirm('确认开始处理工单「' + row.orderNo + '」吗？', '提示', { type: 'info' })
                .then(() => Api.repair.start(row.id))
                .then(res => { this.$message.success(res.msg); this.load(); this.refreshStat(); })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        },
        openFinish(row) {
            this.current = row;
            this.finishForm = { id: row.id, cost: 0, remark: '' };
            this.finishVisible = true;
        },
        submitFinish() {
            Api.repair.finish(this.finishForm).then(res => {
                this.$message.success(res.msg);
                this.finishVisible = false;
                this.load();
                this.refreshStat();
            }).catch(err => this.$message.error(err.message));
        },
        openRate(row) {
            this.current = row;
            this.rateForm = { id: row.id, rating: 5, feedback: '' };
            this.rateVisible = true;
        },
        submitRate() {
            Api.repair.rate(this.rateForm).then(res => {
                this.$message.success(res.msg);
                this.rateVisible = false;
                this.load();
                this.refreshStat();
            }).catch(err => this.$message.error(err.message));
        },
        showDetail(row) {
            this.current = row;
            this.detailVisible = true;
        },
        showStat() {
            this.statVisible = true;
            this.statLoading = true;
            Promise.all([Api.repair.statusStatistics(), Api.repair.typeStatistics()])
                .then(([a, b]) => {
                    this.statStatus = a.data || [];
                    this.statType = b.data || [];
                })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.statLoading = false; });
        },
        remove(row) {
            this.$confirm('确定删除工单「' + row.orderNo + '」吗？', '删除确认', { type: 'warning' })
                .then(() => Api.repair.remove(row.id))
                .then(res => { this.$message.success(res.msg); this.load(); this.refreshStat(); })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        }
    }
});
