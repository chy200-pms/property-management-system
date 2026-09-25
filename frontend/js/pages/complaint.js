/**
 * 投诉建议管理
 */
Vue.component('page-complaint', {
    template: `
    <div>
        <div class="page-head">
            <h3>投诉建议管理</h3>
            <div class="desc">受理业主投诉与建议，记录处理过程与回复</div>
            <div class="head-actions">
                <el-button size="small" icon="el-icon-data-analysis" @click="showStat">统计分析</el-button>
                <el-button size="small" type="primary" icon="el-icon-plus" @click="openForm()">代录入</el-button>
            </div>
        </div>

        <div class="search-bar">
            <el-input v-model="query.keyword" placeholder="单号 / 标题 / 投诉人" prefix-icon="el-icon-search"
                size="small" clearable @keyup.enter.native="reload" style="width:220px"></el-input>
            <el-select v-model="query.complaintType" placeholder="投诉类型" size="small" clearable>
                <el-option v-for="o in typeOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-select v-model="query.status" placeholder="处理状态" size="small" clearable>
                <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-button size="small" type="primary" icon="el-icon-search" @click="reload">查询</el-button>
            <el-button size="small" icon="el-icon-refresh" @click="reset">重置</el-button>
        </div>

        <el-table :data="rows" v-loading="loading" border stripe size="small" style="width:100%">
            <el-table-column prop="complaintNo" label="投诉单号" width="160" show-overflow-tooltip></el-table-column>
            <el-table-column prop="title" label="标题" min-width="170" show-overflow-tooltip></el-table-column>
            <el-table-column prop="ownerName" label="投诉人" width="90"></el-table-column>
            <el-table-column prop="houseNo" label="房屋" width="150" show-overflow-tooltip></el-table-column>
            <el-table-column label="类型" width="105" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('complaintType', s.row.complaintType)" size="mini">
                        {{ PmsUtils.label('complaintType', s.row.complaintType) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('complaintStatus', s.row.status)" size="mini">
                        {{ PmsUtils.label('complaintStatus', s.row.status) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="handler" label="处理人" width="110">
                <template slot-scope="s">
                    <span v-if="s.row.handler">{{ s.row.handler }}</span>
                    <span v-else class="text-muted">未分配</span>
                </template>
            </el-table-column>
            <el-table-column label="提交时间" width="145" align="center">
                <template slot-scope="s">{{ PmsUtils.minute(s.row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="处理时间" width="145" align="center">
                <template slot-scope="s">
                    <span v-if="s.row.handleTime">{{ PmsUtils.minute(s.row.handleTime) }}</span>
                    <span v-else class="text-muted">-</span>
                </template>
            </el-table-column>
            <el-table-column label="操作" width="150" align="center" fixed="right">
                <template slot-scope="s">
                    <el-button type="text" size="mini" @click="showDetail(s.row)">详情</el-button>
                    <el-button v-if="canManage && s.row.status !== 'RESOLVED' && s.row.status !== 'CLOSED'"
                        type="text" size="mini" @click="openReply(s.row)">处理回复</el-button>
                    <el-button type="text" size="mini" v-if="canManage" style="color:#f56c6c" @click="remove(s.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-pagination class="pagination" background layout="total, sizes, prev, pager, next, jumper"
            :current-page.sync="pageNum" :page-size.sync="pageSize" :page-sizes="[10,20,50]"
            :total="total" @current-change="load" @size-change="load"></el-pagination>

        <!-- 代录入 -->
        <el-dialog title="代录入投诉 / 建议" :visible.sync="visible" width="600px" :close-on-click-modal="false">
            <el-form :model="form" :rules="rules" ref="form" label-width="100px" size="small">
                <el-row :gutter="14">
                    <el-col :span="12">
                        <el-form-item label="投诉人" prop="ownerId">
                            <el-select v-model="form.ownerId" filterable style="width:100%">
                                <el-option v-for="o in owners" :key="o.id"
                                    :label="o.name + ' · ' + (o.houseNo || '')" :value="o.id"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="投诉类型" prop="complaintType">
                            <el-select v-model="form.complaintType" style="width:100%">
                                <el-option v-for="o in typeOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="24">
                        <el-form-item label="标题" prop="title">
                            <el-input v-model="form.title" placeholder="请简要描述问题"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="24">
                        <el-form-item label="详细内容">
                            <el-input v-model="form.content" type="textarea" :rows="4"
                                placeholder="请详细描述问题发生的时间、地点与经过"></el-input>
                        </el-form-item>
                    </el-col>
                </el-row>
            </el-form>
            <div slot="footer">
                <el-button @click="visible = false" size="small">取 消</el-button>
                <el-button type="primary" size="small" :loading="saving" @click="submit">提 交</el-button>
            </div>
        </el-dialog>

        <!-- 处理回复 -->
        <el-dialog title="投诉处理回复" :visible.sync="replyVisible" width="560px" :close-on-click-modal="false">
            <div v-if="current" style="margin-bottom:16px">
                <el-descriptions :column="1" border size="small">
                    <el-descriptions-item label="投诉单号">{{ current.complaintNo }}</el-descriptions-item>
                    <el-descriptions-item label="投诉人">
                        {{ current.ownerName }}（{{ current.houseNo || '-' }}）
                    </el-descriptions-item>
                    <el-descriptions-item label="投诉标题">{{ current.title }}</el-descriptions-item>
                    <el-descriptions-item label="投诉内容">{{ current.content }}</el-descriptions-item>
                </el-descriptions>
            </div>
            <el-form label-width="90px" size="small">
                <el-form-item label="处理回复">
                    <el-input v-model="replyForm.reply" type="textarea" :rows="4"
                        placeholder="请填写处理措施与结果，该内容将反馈给业主"></el-input>
                </el-form-item>
                <el-form-item label="处理结果">
                    <el-radio-group v-model="replyForm.resolved">
                        <el-radio :label="false">标记为处理中</el-radio>
                        <el-radio :label="true">标记为已解决</el-radio>
                    </el-radio-group>
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="replyVisible = false" size="small">取 消</el-button>
                <el-button type="primary" size="small" @click="submitReply">提交回复</el-button>
            </div>
        </el-dialog>

        <!-- 详情 -->
        <el-dialog title="投诉详情" :visible.sync="detailVisible" width="600px">
            <div class="detail-box" v-if="current">
                <el-row :gutter="10" v-for="item in detailItems" :key="item.label" style="margin-bottom:12px">
                    <el-col :span="6"><span class="detail-label">{{ item.label }}</span></el-col>
                    <el-col :span="18"><span class="detail-value">{{ item.value }}</span></el-col>
                </el-row>
            </div>
        </el-dialog>

        <!-- 统计 -->
        <el-dialog title="投诉统计分析" :visible.sync="statVisible" width="720px">
            <el-row :gutter="14">
                <el-col :span="12">
                    <div style="font-size:13px;font-weight:600;margin-bottom:10px">按处理状态</div>
                    <el-table :data="statStatus" border size="small" v-loading="statLoading">
                        <el-table-column label="状态">
                            <template slot-scope="s">{{ PmsUtils.label('complaintStatus', s.row.name) }}</template>
                        </el-table-column>
                        <el-table-column prop="value" label="数量" width="100" align="center"></el-table-column>
                    </el-table>
                </el-col>
                <el-col :span="12">
                    <div style="font-size:13px;font-weight:600;margin-bottom:10px">按投诉类型</div>
                    <el-table :data="statType" border size="small" v-loading="statLoading">
                        <el-table-column label="类型">
                            <template slot-scope="s">{{ PmsUtils.label('complaintType', s.row.name) }}</template>
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
            query: { keyword: '', complaintType: '', status: '' },
            owners: [],
            visible: false, replyVisible: false, detailVisible: false, statVisible: false,
            current: null,
            form: {}, replyForm: { reply: '', resolved: true },
            statStatus: [], statType: [],
            rules: {
                ownerId: [{ required: true, message: '请选择投诉人', trigger: 'change' }],
                complaintType: [{ required: true, message: '请选择投诉类型', trigger: 'change' }],
                title: [{ required: true, message: '请输入标题', trigger: 'blur' }]
            }
        };
    },
    computed: {
        typeOptions() { return PmsUtils.options('complaintType'); },
        statusOptions() { return PmsUtils.options('complaintStatus'); },
        detailItems() {
            const r = this.current || {};
            return [
                { label: '投诉单号', value: r.complaintNo },
                { label: '投诉人', value: (r.ownerName || '-') + '（' + (r.phone || '-') + '）' },
                { label: '房屋', value: r.houseNo || '-' },
                { label: '投诉类型', value: PmsUtils.label('complaintType', r.complaintType) },
                { label: '标题', value: r.title },
                { label: '内容', value: r.content || '-' },
                { label: '处理状态', value: PmsUtils.label('complaintStatus', r.status) },
                { label: '处理人', value: r.handler || '-' },
                { label: '处理回复', value: r.reply || '-' },
                { label: '提交时间', value: r.createTime },
                { label: '处理时间', value: r.handleTime || '-' }
            ];
        }
    },
    created() {
        Api.owner.list().then(res => {
            this.owners = (res.data || []).filter(o => PmsUtils.isMainPerson(o.personType));
        });
        this.load();
    },
    methods: {
        load() {
            this.loading = true;
            Api.complaint.page(Object.assign({}, this.query, { pageNum: this.pageNum, pageSize: this.pageSize }))
                .then(res => {
                    this.rows = res.data.rows || [];
                    this.total = res.data.total || 0;
                })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.loading = false; });
        },
        reload() { this.pageNum = 1; this.load(); },
        reset() {
            this.query = { keyword: '', complaintType: '', status: '' };
            this.reload();
        },
        openForm() {
            this.form = { ownerId: null, complaintType: 'SERVICE', title: '', content: '' };
            this.visible = true;
            this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate());
        },
        submit() {
            this.$refs.form.validate(valid => {
                if (!valid) return;
                this.saving = true;
                Api.complaint.add(this.form).then(res => {
                    this.$message.success(res.msg);
                    this.visible = false;
                    this.reload();
                }).catch(err => this.$message.error(err.message))
                    .finally(() => { this.saving = false; });
            });
        },
        openReply(row) {
            this.current = row;
            this.replyForm = { id: row.id, reply: row.reply || '', resolved: true };
            this.replyVisible = true;
        },
        submitReply() {
            if (!this.replyForm.reply) return this.$message.warning('请填写处理回复');
            Api.complaint.reply({
                id: this.replyForm.id,
                reply: this.replyForm.reply,
                resolved: this.replyForm.resolved
            }).then(res => {
                this.$message.success(res.msg);
                this.replyVisible = false;
                this.load();
            }).catch(err => this.$message.error(err.message));
        },
        showDetail(row) {
            this.current = row;
            this.detailVisible = true;
        },
        showStat() {
            this.statVisible = true;
            this.statLoading = true;
            Promise.all([Api.complaint.statusStatistics(), Api.complaint.typeStatistics()])
                .then(([a, b]) => {
                    this.statStatus = a.data || [];
                    this.statType = b.data || [];
                })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.statLoading = false; });
        },
        remove(row) {
            this.$confirm('确定删除投诉记录「' + row.complaintNo + '」吗？', '删除确认', { type: 'warning' })
                .then(() => Api.complaint.remove(row.id))
                .then(res => { this.$message.success(res.msg); this.load(); })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        }
    }
});
