/**
 * 人员信息管理(业主 / 租户 / 家庭成员)
 */
Vue.component('page-owner', {
    template: `
    <div>
        <div class="page-head">
            <h3>人员信息管理</h3>
            <div class="desc">录入并维护业主、租户及家庭成员档案</div>
            <div class="head-actions">
                <el-button size="small" icon="el-icon-download" @click="exportCsv">导出</el-button>
                <el-tag v-if="ownerAccount" type="info" size="small">只能编辑本人的信息</el-tag>
                <el-button v-if="canManage" size="small" type="primary" icon="el-icon-plus" @click="openForm()">录入人员</el-button>
            </div>
        </div>

        <div class="search-bar">
            <el-input v-model="query.keyword" placeholder="姓名 / 电话 / 车牌 / 房号" prefix-icon="el-icon-search"
                size="small" clearable @keyup.enter.native="reload"></el-input>
            <el-select v-model="query.personType" placeholder="人员类型" size="small" clearable>
                <el-option v-for="o in typeOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-select v-model="query.status" placeholder="状态" size="small" clearable>
                <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-button size="small" type="primary" icon="el-icon-search" @click="reload">查询</el-button>
            <el-button size="small" icon="el-icon-refresh" @click="reset">重置</el-button>
        </div>

        <el-table :data="rows" v-loading="loading" border stripe size="small" style="width:100%">
            <el-table-column type="index" label="#" width="50" align="center"></el-table-column>
            <el-table-column prop="name" label="姓名" width="100"></el-table-column>
            <el-table-column prop="gender" label="性别" width="60" align="center"></el-table-column>
            <el-table-column label="类型" width="95" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('personType', s.row.personType)" size="mini">
                        {{ PmsUtils.label('personType', s.row.personType) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="phone" label="联系电话" width="120"></el-table-column>
            <el-table-column prop="idCard" label="身份证号" width="175" show-overflow-tooltip></el-table-column>
            <el-table-column prop="houseNo" label="所属房屋" min-width="150" show-overflow-tooltip></el-table-column>
            <el-table-column prop="familyCount" label="家庭人口" width="80" align="center"></el-table-column>
            <el-table-column label="入住日期" width="100" align="center">
                <template slot-scope="s">{{ PmsUtils.day(s.row.moveInDate) }}</template>
            </el-table-column>
            <el-table-column prop="carPlate" label="登记车牌" width="110" align="center">
                <template slot-scope="s">
                    <el-tag v-if="s.row.carPlate" size="mini" type="info">{{ s.row.carPlate }}</el-tag>
                    <span v-else class="text-muted">-</span>
                </template>
            </el-table-column>
            <el-table-column label="状态" width="80" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('personStatus', s.row.status)" size="mini">
                        {{ PmsUtils.label('personStatus', s.row.status) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="操作" width="170" align="center" fixed="right">
                <template slot-scope="s">
                    <el-button type="text" size="mini" @click="detail(s.row)">详情</el-button>
                    <el-button v-if="canManage || s.row.phone === $root.user.phone" type="text" size="mini"
                        @click="openForm(s.row)">{{ canManage ? '编辑' : '编辑我的信息' }}</el-button>
                    <el-button v-if="canManage" type="text" size="mini" style="color:#f56c6c" @click="remove(s.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-pagination class="pagination" background layout="total, sizes, prev, pager, next, jumper"
            :current-page.sync="pageNum" :page-size.sync="pageSize" :page-sizes="[10,20,50,100]"
            :total="total" @current-change="load" @size-change="load"></el-pagination>

        <!-- 录入 / 编辑 -->
        <el-dialog :title="form.id ? '编辑人员信息' : '录入人员信息'" :visible.sync="visible" width="660px"
            :close-on-click-modal="false">
            <el-form :model="form" :rules="rules" ref="form" label-width="100px" size="small">
                <el-row :gutter="14">
                    <el-col :span="12">
                        <el-form-item label="姓名" prop="name">
                            <el-input v-model="form.name" placeholder="请输入姓名"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="性别">
                            <el-radio-group v-model="form.gender">
                                <el-radio label="男">男</el-radio>
                                <el-radio label="女">女</el-radio>
                            </el-radio-group>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="人员类型" prop="personType">
                            <el-select v-model="form.personType" style="width:100%">
                                <el-option v-for="o in typeOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="联系电话" prop="phone">
                            <el-input v-model="form.phone" placeholder="请输入手机号"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="身份证号">
                            <el-input v-model="form.idCard" placeholder="请输入身份证号"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="所属房屋" prop="houseId">
                            <el-select v-model="form.houseId" filterable clearable style="width:100%"
                                placeholder="请选择房屋">
                                <el-option v-for="h in houses" :key="h.id"
                                    :label="h.houseNo + '（' + h.area + '㎡）'" :value="h.id"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="家庭人口">
                            <el-input-number v-model="form.familyCount" :min="1" :max="20"
                                controls-position="right" style="width:100%"></el-input-number>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="入住日期">
                            <el-date-picker v-model="form.moveInDate" type="date" value-format="yyyy-MM-dd"
                                placeholder="选择日期" style="width:100%"></el-date-picker>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="登记车牌">
                            <el-input v-model="form.carPlate" placeholder="如 京A12345"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="人员状态">
                            <el-select v-model="form.status" style="width:100%">
                                <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="紧急联系人">
                            <el-input v-model="form.emergencyName" placeholder="姓名"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="紧急电话">
                            <el-input v-model="form.emergencyPhone" placeholder="手机号"></el-input>
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
                <el-button @click="visible = false" size="small">取 消</el-button>
                <el-button type="primary" size="small" :loading="saving" @click="submit">保 存</el-button>
            </div>
        </el-dialog>

        <!-- 详情 -->
        <el-dialog title="人员详细信息" :visible.sync="detailVisible" width="620px">
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
            loading: false, saving: false,
            rows: [], total: 0, pageNum: 1, pageSize: 10,
            query: { keyword: '', personType: '', status: '' },
            houses: [],
            visible: false, detailVisible: false,
            form: {}, current: null,
            rules: {
                name: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
                phone: [
                    { required: true, message: '请输入联系电话', trigger: 'blur' },
                    { pattern: /^1[3-9]\d{9}$/, message: '手机号格式不正确', trigger: 'blur' }
                ],
                personType: [{ required: true, message: '请选择人员类型', trigger: 'change' }],
                houseId: [{ required: true, message: '请选择所属房屋', trigger: 'change' }]
            }
        };
    },
    computed: {
        typeOptions() { return PmsUtils.options('personType'); },
        statusOptions() { return PmsUtils.options('personStatus'); },
        detailItems() {
            const r = this.current || {};
            return [
                { label: '姓名', value: r.name },
                { label: '性别', value: r.gender },
                { label: '人员类型', value: PmsUtils.label('personType', r.personType) },
                { label: '联系电话', value: r.phone },
                { label: '身份证号', value: r.idCard || '-' },
                { label: '所属房屋', value: r.houseNo || '-' },
                { label: '家庭人口', value: (r.familyCount || 0) + ' 人' },
                { label: '入住日期', value: PmsUtils.day(r.moveInDate) },
                { label: '登记车牌', value: r.carPlate || '-' },
                { label: '紧急联系人', value: (r.emergencyName || '-') + ' / ' + (r.emergencyPhone || '-') },
                { label: '人员状态', value: PmsUtils.label('personStatus', r.status) },
                { label: '登记时间', value: r.createTime || '-' },
                { label: '备注', value: r.remark || '-' }
            ];
        }
    },
    created() {
        Api.house.list().then(res => { this.houses = res.data || []; });
        this.load();
    },
    methods: {
        load() {
            this.loading = true;
            Api.owner.page(Object.assign({}, this.query, { pageNum: this.pageNum, pageSize: this.pageSize }))
                .then(res => {
                    this.rows = res.data.rows || [];
                    this.total = res.data.total || 0;
                })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.loading = false; });
        },
        reload() { this.pageNum = 1; this.load(); },
        reset() {
            this.query = { keyword: '', personType: '', status: '' };
            this.reload();
        },
        openForm(row) {
            this.form = row ? Object.assign({}, row) : {
                name: '', gender: '男', personType: 'OWNER', phone: '', idCard: '',
                houseId: null, familyCount: 1, moveInDate: PmsUtils.day(new Date().toISOString()),
                carPlate: '', status: 'ACTIVE', emergencyName: '', emergencyPhone: '', remark: ''
            };
            this.visible = true;
            this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate());
        },
        submit() {
            this.$refs.form.validate(valid => {
                if (!valid) return;
                this.saving = true;
                const req = this.form.id ? Api.owner.update(this.form) : Api.owner.add(this.form);
                req.then(res => {
                    this.$message.success(res.msg);
                    this.visible = false;
                    this.load();
                }).catch(err => this.$message.error(err.message))
                    .finally(() => { this.saving = false; });
            });
        },
        remove(row) {
            this.$confirm('确定删除「' + row.name + '」的人员信息吗？', '删除确认', { type: 'warning' })
                .then(() => Api.owner.remove(row.id))
                .then(res => { this.$message.success(res.msg); this.load(); })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        },
        detail(row) {
            this.current = row;
            this.detailVisible = true;
        },
        exportCsv() {
            const rows = this.rows;
            if (!rows.length) return this.$message.warning('当前页没有数据');
            const head = ['姓名', '性别', '人员类型', '联系电话', '身份证号', '所属房屋', '家庭人口', '入住日期', '车牌', '状态'];
            const body = rows.map(r => [
                r.name, r.gender, PmsUtils.label('personType', r.personType), r.phone, r.idCard || '',
                r.houseNo || '', r.familyCount, PmsUtils.day(r.moveInDate), r.carPlate || '',
                PmsUtils.label('personStatus', r.status)
            ]);
            const csv = [head].concat(body).map(r => r.map(x => '"' + String(x == null ? '' : x) + '"').join(',')).join('\n');
            const blob = new Blob(['\ufeff' + csv], { type: 'text/csv;charset=utf-8;' });
            const a = document.createElement('a');
            a.href = URL.createObjectURL(blob);
            a.download = '人员信息_' + PmsUtils.day(new Date().toISOString()) + '.csv';
            a.click();
            URL.revokeObjectURL(a.href);
            this.$message.success('已导出 ' + rows.length + ' 条记录');
        }
    }
});
