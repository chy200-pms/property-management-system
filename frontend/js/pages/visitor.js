/**
 * 访客登记管理
 */
Vue.component('page-visitor', {
    template: `
    <div>
        <div class="page-head">
            <h3>访客登记</h3>
            <div class="desc">外来人员进出小区登记与离开核销</div>
            <div class="head-actions">
                <el-button size="small" type="primary" icon="el-icon-plus" @click="openForm()">登记访客</el-button>
            </div>
        </div>

        <div class="search-bar">
            <el-input v-model="query.keyword" placeholder="访客姓名 / 电话 / 被访人 / 车牌" prefix-icon="el-icon-search"
                size="small" clearable @keyup.enter.native="reload" style="width:240px"></el-input>
            <el-select v-model="query.status" placeholder="在访状态" size="small" clearable>
                <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-button size="small" type="primary" icon="el-icon-search" @click="reload">查询</el-button>
            <el-button size="small" icon="el-icon-refresh" @click="reset">重置</el-button>
        </div>

        <el-table :data="rows" v-loading="loading" border stripe size="small" style="width:100%">
            <el-table-column prop="visitorName" label="访客姓名" width="100"></el-table-column>
            <el-table-column prop="phone" label="联系电话" width="120"></el-table-column>
            <el-table-column prop="visitOwner" label="被访业主" width="100"></el-table-column>
            <el-table-column prop="houseNo" label="到访房屋" min-width="150" show-overflow-tooltip></el-table-column>
            <el-table-column prop="visitReason" label="来访事由" width="110" align="center"></el-table-column>
            <el-table-column label="车牌号" width="110" align="center">
                <template slot-scope="s">
                    <el-tag v-if="s.row.carPlate" size="mini" type="info">{{ s.row.carPlate }}</el-tag>
                    <span v-else class="text-muted">-</span>
                </template>
            </el-table-column>
            <el-table-column label="进入时间" width="145" align="center">
                <template slot-scope="s">{{ PmsUtils.minute(s.row.visitTime) }}</template>
            </el-table-column>
            <el-table-column label="离开时间" width="145" align="center">
                <template slot-scope="s">
                    <span v-if="s.row.leaveTime">{{ PmsUtils.minute(s.row.leaveTime) }}</span>
                    <el-tag v-else size="mini" type="warning">在访中</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="状态" width="100" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('visitorStatus', s.row.status)" size="mini">
                        {{ PmsUtils.label('visitorStatus', s.row.status) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="register" label="登记人" width="110"></el-table-column>
            <el-table-column label="操作" width="150" align="center" fixed="right">
                <template slot-scope="s">
                    <el-button v-if="canManage && s.row.status === 'IN'" type="text" size="mini"
                        @click="leave(s.row)">登记离开</el-button>
                    <el-button v-if="canManage" type="text" size="mini" @click="openForm(s.row)">编辑</el-button>
                    <el-button type="text" size="mini" v-if="canManage" style="color:#f56c6c" @click="remove(s.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-pagination class="pagination" background layout="total, sizes, prev, pager, next, jumper"
            :current-page.sync="pageNum" :page-size.sync="pageSize" :page-sizes="[10,20,50]"
            :total="total" @current-change="load" @size-change="load"></el-pagination>

        <el-dialog :title="form.id ? '编辑访客记录' : '访客登记'" :visible.sync="visible" width="600px"
            :close-on-click-modal="false">
            <el-form :model="form" :rules="rules" ref="form" label-width="100px" size="small">
                <el-row :gutter="14">
                    <el-col :span="12">
                        <el-form-item label="访客姓名" prop="visitorName">
                            <el-input v-model="form.visitorName" placeholder="请输入访客姓名"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="联系电话" prop="phone">
                            <el-input v-model="form.phone" placeholder="请输入手机号"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="被访业主" prop="visitOwnerId">
                            <el-select v-model="form.visitOwnerId" filterable style="width:100%"
                                @change="onOwnerChange">
                                <el-option v-for="o in owners" :key="o.id"
                                    :label="o.name + ' · ' + (o.houseNo || '')" :value="o.id"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="到访房屋">
                            <el-input v-model="form.houseNo" disabled placeholder="选择业主后自动带出"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="来访事由">
                            <el-select v-model="form.visitReason" style="width:100%" allow-create filterable>
                                <el-option label="亲友探访" value="亲友探访"></el-option>
                                <el-option label="快递送货" value="快递送货"></el-option>
                                <el-option label="家政保洁" value="家政保洁"></el-option>
                                <el-option label="装修施工" value="装修施工"></el-option>
                                <el-option label="外卖配送" value="外卖配送"></el-option>
                                <el-option label="看房" value="看房"></el-option>
                                <el-option label="维修上门" value="维修上门"></el-option>
                                <el-option label="商务洽谈" value="商务洽谈"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="车牌号">
                            <el-input v-model="form.carPlate" placeholder="如 京A12345"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="进入时间">
                            <el-date-picker v-model="form.visitTime" type="datetime"
                                value-format="yyyy-MM-dd HH:mm:ss" placeholder="默认当前时间"
                                style="width:100%"></el-date-picker>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="登记人">
                            <el-input v-model="form.register" placeholder="如 门岗-赵刚"></el-input>
                        </el-form-item>
                    </el-col>
                </el-row>
            </el-form>
            <div slot="footer">
                <el-button @click="visible = false" size="small">取 消</el-button>
                <el-button type="primary" size="small" :loading="saving" @click="submit">保 存</el-button>
            </div>
        </el-dialog>
    </div>
    `,
    data() {
        return {
            loading: false, saving: false,
            rows: [], total: 0, pageNum: 1, pageSize: 10,
            query: { keyword: '', status: '' },
            owners: [],
            visible: false,
            form: {},
            rules: {
                visitorName: [{ required: true, message: '请输入访客姓名', trigger: 'blur' }],
                phone: [{ pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }],
                visitOwnerId: [{ required: true, message: '请选择被访业主', trigger: 'change' }]
            }
        };
    },
    computed: {
        statusOptions() { return PmsUtils.options('visitorStatus'); }
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
            Api.visitor.page(Object.assign({}, this.query, { pageNum: this.pageNum, pageSize: this.pageSize }))
                .then(res => {
                    this.rows = res.data.rows || [];
                    this.total = res.data.total || 0;
                })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.loading = false; });
        },
        reload() { this.pageNum = 1; this.load(); },
        reset() {
            this.query = { keyword: '', status: '' };
            this.reload();
        },
        onOwnerChange(id) {
            const o = this.owners.find(x => x.id === id);
            if (o) this.form.houseNo = o.houseNo;
        },
        openForm(row) {
            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            const nowStr = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
                ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':00';
            this.form = row ? Object.assign({}, row) : {
                visitorName: '', phone: '', visitOwnerId: null, houseNo: '',
                visitReason: '亲友探访', carPlate: '', visitTime: nowStr,
                status: 'IN', register: PmsUtils.currentUser().realName || '门岗'
            };
            this.visible = true;
            this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate());
        },
        submit() {
            this.$refs.form.validate(valid => {
                if (!valid) return;
                this.saving = true;
                const req = this.form.id ? Api.visitor.update(this.form) : Api.visitor.add(this.form);
                req.then(res => {
                    this.$message.success(res.msg);
                    this.visible = false;
                    this.load();
                }).catch(err => this.$message.error(err.message))
                    .finally(() => { this.saving = false; });
            });
        },
        leave(row) {
            this.$confirm('确认登记访客「' + row.visitorName + '」已离开小区吗？', '离开登记', { type: 'info' })
                .then(() => Api.visitor.leave(row.id))
                .then(res => { this.$message.success(res.msg); this.load(); })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        },
        remove(row) {
            this.$confirm('确定删除该访客登记记录吗？', '删除确认', { type: 'warning' })
                .then(() => Api.visitor.remove(row.id))
                .then(res => { this.$message.success(res.msg); this.load(); })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        }
    }
});
