/**
 * 收费标准管理
 */
Vue.component('page-fee-standard', {
    template: `
    <div>
        <div class="page-head">
            <h3>收费标准管理</h3>
            <div class="desc">配置物业费、车位管理费、水电费等各项收费标准</div>
            <div class="head-actions">
                <el-tag v-if="!canManage" type="info" size="small">只读</el-tag>
                <el-button v-if="canManage" size="small" type="primary" icon="el-icon-plus" @click="openForm()">新增标准</el-button>
            </div>
        </div>

        <div class="search-bar">
            <el-input v-model="query.keyword" placeholder="费用编码 / 名称" prefix-icon="el-icon-search"
                size="small" clearable @keyup.enter.native="reload"></el-input>
            <el-select v-model="query.feeType" placeholder="费用类型" size="small" clearable>
                <el-option v-for="o in feeTypeOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-select v-model="query.status" placeholder="启用状态" size="small" clearable>
                <el-option label="启用" :value="1"></el-option>
                <el-option label="停用" :value="0"></el-option>
            </el-select>
            <el-button size="small" type="primary" icon="el-icon-search" @click="reload">查询</el-button>
            <el-button size="small" icon="el-icon-refresh" @click="reset">重置</el-button>
        </div>

        <el-table :data="rows" v-loading="loading" border stripe size="small" style="width:100%">
            <el-table-column prop="feeCode" label="费用编码" width="140"></el-table-column>
            <el-table-column prop="feeName" label="费用名称" min-width="150"></el-table-column>
            <el-table-column label="费用类型" width="120" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('feeType', s.row.feeType)" size="mini">
                        {{ PmsUtils.label('feeType', s.row.feeType) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="单价" width="110" align="right">
                <template slot-scope="s"><span class="money">{{ PmsUtils.money(s.row.unitPrice) }}</span></template>
            </el-table-column>
            <el-table-column prop="unit" label="计价单位" width="110" align="center"></el-table-column>
            <el-table-column label="收费周期" width="95" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('chargeCycle', s.row.chargeCycle)" size="mini">
                        {{ PmsUtils.label('chargeCycle', s.row.chargeCycle) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="滞纳金(日)" width="110" align="center">
                <template slot-scope="s">{{ (s.row.lateFeeRate * 100).toFixed(2) }}%</template>
            </el-table-column>
            <el-table-column label="状态" width="80" align="center">
                <template slot-scope="s">
                    <el-tag :type="s.row.status === 1 ? 'success' : 'info'" size="mini">
                        {{ s.row.status === 1 ? '启用' : '停用' }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="remark" label="说明" min-width="180" show-overflow-tooltip></el-table-column>
            <el-table-column v-if="canManage" label="操作" width="130" align="center" fixed="right">
                <template slot-scope="s">
                    <el-button type="text" size="mini" @click="openForm(s.row)">编辑</el-button>
                    <el-button type="text" size="mini" style="color:#f56c6c" @click="remove(s.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-pagination class="pagination" background layout="total, sizes, prev, pager, next, jumper"
            :current-page.sync="pageNum" :page-size.sync="pageSize" :page-sizes="[10,20,50]"
            :total="total" @current-change="load" @size-change="load"></el-pagination>

        <el-dialog :title="form.id ? '编辑收费标准' : '新增收费标准'" :visible.sync="visible" width="600px"
            :close-on-click-modal="false">
            <el-form :model="form" :rules="rules" ref="form" label-width="110px" size="small">
                <el-row :gutter="14">
                    <el-col :span="12">
                        <el-form-item label="费用编码" prop="feeCode">
                            <el-input v-model="form.feeCode" placeholder="如 PROPERTY-001"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="费用名称" prop="feeName">
                            <el-input v-model="form.feeName" placeholder="如 住宅物业服务费"></el-input>
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
                        <el-form-item label="单价" prop="unitPrice">
                            <el-input-number v-model="form.unitPrice" :min="0" :precision="3"
                                controls-position="right" style="width:100%"></el-input-number>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="计价单位">
                            <el-select v-model="form.unit" style="width:100%" allow-create filterable>
                                <el-option label="元/㎡·月" value="元/㎡·月"></el-option>
                                <el-option label="元/月" value="元/月"></el-option>
                                <el-option label="元/吨" value="元/吨"></el-option>
                                <el-option label="元/度" value="元/度"></el-option>
                                <el-option label="元/户·月" value="元/户·月"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="收费周期">
                            <el-select v-model="form.chargeCycle" style="width:100%">
                                <el-option v-for="o in cycleOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="滞纳金日利率">
                            <el-input-number v-model="form.lateFeeRate" :min="0" :max="1" :precision="4"
                                :step="0.0001" controls-position="right" style="width:100%"></el-input-number>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="状态">
                            <el-switch v-model="form.status" :active-value="1" :inactive-value="0"
                                active-text="启用" inactive-text="停用"></el-switch>
                        </el-form-item>
                    </el-col>
                    <el-col :span="24">
                        <el-form-item label="说明">
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
    </div>
    `,
    data() {
        return {
            loading: false, saving: false,
            rows: [], total: 0, pageNum: 1, pageSize: 10,
            query: { keyword: '', feeType: '', status: null },
            visible: false,
            form: {},
            rules: {
                feeCode: [{ required: true, message: '请输入费用编码', trigger: 'blur' }],
                feeName: [{ required: true, message: '请输入费用名称', trigger: 'blur' }],
                feeType: [{ required: true, message: '请选择费用类型', trigger: 'change' }],
                unitPrice: [{ required: true, message: '请输入单价', trigger: 'blur' }]
            }
        };
    },
    computed: {
        feeTypeOptions() { return PmsUtils.options('feeType'); },
        cycleOptions() { return PmsUtils.options('chargeCycle'); }
    },
    created() {
        this.load();
    },
    methods: {
        load() {
            this.loading = true;
            const params = Object.assign({}, this.query);
            if (params.status === null) delete params.status;
            Api.feeStandard.page(Object.assign({}, params, { pageNum: this.pageNum, pageSize: this.pageSize }))
                .then(res => {
                    this.rows = res.data.rows || [];
                    this.total = res.data.total || 0;
                })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.loading = false; });
        },
        reload() { this.pageNum = 1; this.load(); },
        reset() {
            this.query = { keyword: '', feeType: '', status: null };
            this.reload();
        },
        openForm(row) {
            this.form = row ? Object.assign({}, row) : {
                feeCode: '', feeName: '', feeType: 'PROPERTY', unitPrice: 0,
                unit: '元/㎡·月', chargeCycle: 'MONTH', lateFeeRate: 0.0005, status: 1, remark: ''
            };
            this.visible = true;
            this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate());
        },
        submit() {
            this.$refs.form.validate(valid => {
                if (!valid) return;
                this.saving = true;
                const req = this.form.id ? Api.feeStandard.update(this.form) : Api.feeStandard.add(this.form);
                req.then(res => {
                    this.$message.success(res.msg);
                    this.visible = false;
                    this.load();
                }).catch(err => this.$message.error(err.message))
                    .finally(() => { this.saving = false; });
            });
        },
        remove(row) {
            this.$confirm('确定删除收费标准「' + row.feeName + '」吗？删除后不影响已生成的历史账单。',
                '删除确认', { type: 'warning' })
                .then(() => Api.feeStandard.remove(row.id))
                .then(res => { this.$message.success(res.msg); this.load(); })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        }
    }
});
