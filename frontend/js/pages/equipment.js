/**
 * 设备设施管理
 */
Vue.component('page-equipment', {
    template: `
    <div>
        <div class="page-head">
            <h3>设备设施管理</h3>
            <div class="desc">小区设备台账、运行状态与维保计划管理</div>
            <div class="head-actions">
                <el-tag v-if="!canManage" type="info" size="small">只读</el-tag>
                <el-button v-if="canManage" size="small" type="primary" icon="el-icon-plus" @click="openForm()">新增设备</el-button>
            </div>
        </div>

        <div class="stat-grid" style="grid-template-columns:repeat(auto-fill,minmax(200px,1fr))">
            <div class="stat-card">
                <div class="icon-box bg-blue"><i class="el-icon-setting"></i></div>
                <div class="info">
                    <div class="label">设备总数</div>
                    <div class="value">{{ rows.length }}<small>台</small></div>
                    <div class="sub">当前查询结果</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="icon-box bg-green"><i class="el-icon-circle-check"></i></div>
                <div class="info">
                    <div class="label">正常运行</div>
                    <div class="value">{{ countByStatus.NORMAL || 0 }}<small>台</small></div>
                    <div class="sub">状态良好</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="icon-box bg-red"><i class="el-icon-warning-outline"></i></div>
                <div class="info">
                    <div class="label">维修中</div>
                    <div class="value">{{ countByStatus.REPAIR || 0 }}<small>台</small></div>
                    <div class="sub">需跟进处理</div>
                </div>
            </div>
            <div class="stat-card">
                <div class="icon-box bg-orange"><i class="el-icon-bell"></i></div>
                <div class="info">
                    <div class="label">待维保</div>
                    <div class="value">{{ pendingMaintain }}<small>台</small></div>
                    <div class="sub">30 天内到期</div>
                </div>
            </div>
        </div>

        <div class="search-bar">
            <el-input v-model="query.keyword" placeholder="设备编号 / 名称 / 位置 / 责任人" prefix-icon="el-icon-search"
                size="small" clearable @keyup.enter.native="reload" style="width:240px"></el-input>
            <el-select v-model="query.equipmentType" placeholder="设备类型" size="small" clearable>
                <el-option v-for="o in typeOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-select v-model="query.status" placeholder="运行状态" size="small" clearable>
                <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-button size="small" type="primary" icon="el-icon-search" @click="reload">查询</el-button>
            <el-button size="small" icon="el-icon-refresh" @click="reset">重置</el-button>
        </div>

        <el-table :data="rows" v-loading="loading" border stripe size="small" style="width:100%">
            <el-table-column prop="equipmentNo" label="设备编号" width="100" align="center"></el-table-column>
            <el-table-column prop="name" label="设备名称" min-width="150" show-overflow-tooltip></el-table-column>
            <el-table-column label="类型" width="110" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('equipmentType', s.row.equipmentType)" size="mini">
                        {{ PmsUtils.label('equipmentType', s.row.equipmentType) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="location" label="安装位置" min-width="140" show-overflow-tooltip></el-table-column>
            <el-table-column prop="brand" label="品牌型号" width="170" show-overflow-tooltip></el-table-column>
            <el-table-column label="状态" width="95" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('equipmentStatus', s.row.status)" size="mini">
                        {{ PmsUtils.label('equipmentStatus', s.row.status) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="上次维保" width="105" align="center">
                <template slot-scope="s">{{ PmsUtils.day(s.row.lastMaintain) }}</template>
            </el-table-column>
            <el-table-column label="下次维保" width="115" align="center">
                <template slot-scope="s">
                    <span :class="isOverdue(s.row) ? 'text-danger' : ''">{{ PmsUtils.day(s.row.nextMaintain) }}</span>
                    <el-tag v-if="isOverdue(s.row)" type="danger" size="mini" effect="plain"
                        style="margin-left:4px">到期</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="maintainCycle" label="周期(天)" width="85" align="center"></el-table-column>
            <el-table-column prop="keeper" label="责任人" width="95"></el-table-column>
            <el-table-column v-if="canManage" label="操作" width="170" align="center" fixed="right">
                <template slot-scope="s">
                    <el-button type="text" size="mini" @click="maintain(s.row)">登记维保</el-button>
                    <el-button type="text" size="mini" @click="openForm(s.row)">编辑</el-button>
                    <el-button type="text" size="mini" style="color:#f56c6c" @click="remove(s.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-pagination class="pagination" background layout="total, sizes, prev, pager, next, jumper"
            :current-page.sync="pageNum" :page-size.sync="pageSize" :page-sizes="[10,20,50]"
            :total="total" @current-change="load" @size-change="load"></el-pagination>

        <el-dialog :title="form.id ? '编辑设备信息' : '新增设备'" :visible.sync="visible" width="640px"
            :close-on-click-modal="false">
            <el-form :model="form" :rules="rules" ref="form" label-width="100px" size="small">
                <el-row :gutter="14">
                    <el-col :span="12">
                        <el-form-item label="设备名称" prop="name">
                            <el-input v-model="form.name" placeholder="如 1号楼1单元客梯"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="设备编号">
                            <el-input v-model="form.equipmentNo" placeholder="留空自动生成"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="设备类型" prop="equipmentType">
                            <el-select v-model="form.equipmentType" style="width:100%">
                                <el-option v-for="o in typeOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="运行状态">
                            <el-select v-model="form.status" style="width:100%">
                                <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="安装位置">
                            <el-input v-model="form.location" placeholder="如 3号楼2单元"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="品牌型号">
                            <el-input v-model="form.brand" placeholder="如 通力 KONE-1000"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="采购日期">
                            <el-date-picker v-model="form.buyDate" type="date" value-format="yyyy-MM-dd"
                                style="width:100%" placeholder="选择日期"></el-date-picker>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="维保周期">
                            <el-input-number v-model="form.maintainCycle" :min="1" :max="365" controls-position="right"
                                style="width:100%"></el-input-number>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="上次维保">
                            <el-date-picker v-model="form.lastMaintain" type="date" value-format="yyyy-MM-dd"
                                style="width:100%" placeholder="选择日期"></el-date-picker>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="责任人">
                            <el-input v-model="form.keeper" placeholder="如 刘海涛"></el-input>
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
    </div>
    `,
    data() {
        return {
            loading: false, saving: false,
            rows: [], total: 0, pageNum: 1, pageSize: 10,
            query: { keyword: '', equipmentType: '', status: '' },
            visible: false, form: {},
            rules: {
                name: [{ required: true, message: '请输入设备名称', trigger: 'blur' }],
                equipmentType: [{ required: true, message: '请选择设备类型', trigger: 'change' }]
            }
        };
    },
    computed: {
        typeOptions() { return PmsUtils.options('equipmentType'); },
        statusOptions() { return PmsUtils.options('equipmentStatus'); },
        countByStatus() {
            const m = {};
            this.rows.forEach(r => { m[r.status] = (m[r.status] || 0) + 1; });
            return m;
        },
        pendingMaintain() {
            return this.rows.filter(r => this.isOverdue(r)).length;
        }
    },
    created() {
        this.load();
    },
    methods: {
        isOverdue(row) {
            if (!row.nextMaintain || row.status === 'SCRAPPED') return false;
            const next = new Date(String(row.nextMaintain).substring(0, 10));
            const limit = new Date();
            limit.setDate(limit.getDate() + 30);
            return next <= limit;
        },
        load() {
            this.loading = true;
            Api.equipment.page(Object.assign({}, this.query, { pageNum: this.pageNum, pageSize: this.pageSize }))
                .then(res => {
                    this.rows = res.data.rows || [];
                    this.total = res.data.total || 0;
                })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.loading = false; });
        },
        reload() { this.pageNum = 1; this.load(); },
        reset() {
            this.query = { keyword: '', equipmentType: '', status: '' };
            this.reload();
        },
        openForm(row) {
            this.form = row ? Object.assign({}, row) : {
                name: '', equipmentNo: '', equipmentType: 'ELEVATOR', location: '', brand: '',
                status: 'NORMAL', buyDate: '', maintainCycle: 30, lastMaintain: '', keeper: '', remark: ''
            };
            this.visible = true;
            this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate());
        },
        submit() {
            this.$refs.form.validate(valid => {
                if (!valid) return;
                this.saving = true;
                const req = this.form.id ? Api.equipment.update(this.form) : Api.equipment.add(this.form);
                req.then(res => {
                    this.$message.success(res.msg);
                    this.visible = false;
                    this.load();
                }).catch(err => this.$message.error(err.message))
                    .finally(() => { this.saving = false; });
            });
        },
        maintain(row) {
            const today = PmsUtils.day(new Date().toISOString());
            this.$confirm(
                '确认为设备「' + row.name + '」登记一次维保吗？<br>维保日期：' + today +
                '<br>下次维保日期将自动按 ' + (row.maintainCycle || 30) + ' 天周期更新。',
                '维保登记', { dangerouslyUseHTMLString: true, type: 'info' }
            ).then(() => Api.equipment.maintain({ id: row.id, maintainDate: today }))
                .then(res => { this.$message.success(res.msg); this.load(); })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        },
        remove(row) {
            this.$confirm('确定删除设备「' + row.name + '」吗？', '删除确认', { type: 'warning' })
                .then(() => Api.equipment.remove(row.id))
                .then(res => { this.$message.success(res.msg); this.load(); })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        }
    }
});
