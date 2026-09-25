/**
 * 车位管理(小区内 + 小区外临街)
 */
Vue.component('page-parking', {
    template: `
    <div>
        <div class="page-head">
            <h3>车位管理</h3>
            <div class="desc">管理小区内部车位与小区外临街车位的分配、租赁与收费</div>
            <div class="head-actions">
                <el-radio-group v-model="viewMode" size="small">
                    <el-radio-button label="table">列表视图</el-radio-button>
                    <el-radio-button label="grid">车位图</el-radio-button>
                </el-radio-group>
                <el-tag v-if="!canManage" type="info" size="small">只读</el-tag>
                <el-button v-if="canManage" size="small" type="primary" icon="el-icon-plus" @click="openForm()">新增车位</el-button>
            </div>
        </div>

        <div class="search-bar">
            <el-input v-model="query.keyword" placeholder="车位编号 / 车牌 / 使用人" prefix-icon="el-icon-search"
                size="small" clearable @keyup.enter.native="reload"></el-input>
            <el-select v-model="query.spaceType" placeholder="车位类型" size="small" clearable>
                <el-option v-for="o in typeOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-select v-model="query.status" placeholder="使用状态" size="small" clearable>
                <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-button size="small" type="primary" icon="el-icon-search" @click="reload">查询</el-button>
            <el-button size="small" icon="el-icon-refresh" @click="reset">重置</el-button>
        </div>

        <!-- 列表视图 -->
        <el-table v-if="viewMode==='table'" :data="rows" v-loading="loading" border stripe size="small"
            style="width:100%">
            <el-table-column prop="spaceNo" label="车位编号" width="110" align="center"></el-table-column>
            <el-table-column prop="areaName" label="所属区域" min-width="150" show-overflow-tooltip></el-table-column>
            <el-table-column label="类型" width="110" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('spaceType', s.row.spaceType)" size="mini">
                        {{ PmsUtils.label('spaceType', s.row.spaceType) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="spaceSize" label="规格" width="80" align="center"></el-table-column>
            <el-table-column label="月租金" width="100" align="right">
                <template slot-scope="s"><span class="money">{{ PmsUtils.money(s.row.monthFee) }}</span></template>
            </el-table-column>
            <el-table-column label="状态" width="80" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('spaceStatus', s.row.status)" size="mini">
                        {{ PmsUtils.label('spaceStatus', s.row.status) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="ownerName" label="使用人" width="100">
                <template slot-scope="s">
                    <span v-if="s.row.ownerName">{{ s.row.ownerName }}</span>
                    <span v-else class="text-muted">-</span>
                </template>
            </el-table-column>
            <el-table-column prop="carPlate" label="绑定车牌" width="110" align="center">
                <template slot-scope="s">
                    <el-tag v-if="s.row.carPlate" size="mini" type="info">{{ s.row.carPlate }}</el-tag>
                    <span v-else class="text-muted">-</span>
                </template>
            </el-table-column>
            <el-table-column label="租赁起止" width="190" align="center">
                <template slot-scope="s">
                    <span v-if="s.row.startDate" style="font-size:12px">
                        {{ PmsUtils.day(s.row.startDate) }} ~ {{ PmsUtils.day(s.row.endDate) }}</span>
                    <span v-else class="text-muted">-</span>
                </template>
            </el-table-column>
            <el-table-column v-if="canManage" label="操作" width="200" align="center" fixed="right">
                <template slot-scope="s">
                    <el-button v-if="s.row.status==='FREE'" type="text" size="mini"
                        @click="openAllocate(s.row)">分配</el-button>
                    <el-button v-else type="text" size="mini" style="color:#e6a23c"
                        @click="release(s.row)">退租</el-button>
                    <el-button type="text" size="mini" @click="openForm(s.row)">编辑</el-button>
                    <el-button type="text" size="mini" style="color:#f56c6c" @click="remove(s.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <!-- 车位图视图 -->
        <div v-else v-loading="loading">
            <div v-for="group in grouped" :key="group.name" style="margin-bottom:18px">
                <div style="font-size:13px;font-weight:600;color:#303133;margin-bottom:10px">
                    {{ group.label }}
                    <span class="text-muted" style="font-weight:400;font-size:12px;margin-left:8px">
                        共 {{ group.items.length }} 个 · 空闲 {{ group.freeCount }} 个</span>
                </div>
                <div class="parking-grid">
                    <div class="parking-cell" v-for="p in group.items" :key="p.id"
                        :class="p.status === 'FREE' ? 'free' : (p.status === 'RENTED' ? 'rented' : 'sold')"
                        @click="cellClick(p)">
                        <div class="no">{{ p.spaceNo }}</div>
                        <div>{{ PmsUtils.label('spaceStatus', p.status) }}</div>
                        <div style="font-size:11px;color:#909399;margin-top:3px">{{ p.carPlate || '—' }}</div>
                    </div>
                </div>
            </div>
        </div>

        <el-pagination v-if="viewMode==='table'" class="pagination" background
            layout="total, sizes, prev, pager, next, jumper" :current-page.sync="pageNum"
            :page-size.sync="pageSize" :page-sizes="[10,20,50,100]" :total="total"
            @current-change="load" @size-change="load"></el-pagination>

        <!-- 新增/编辑车位 -->
        <el-dialog :title="form.id ? '编辑车位' : '新增车位'" :visible.sync="visible" width="600px"
            :close-on-click-modal="false">
            <el-form :model="form" :rules="rules" ref="form" label-width="100px" size="small">
                <el-row :gutter="14">
                    <el-col :span="12">
                        <el-form-item label="车位编号" prop="spaceNo">
                            <el-input v-model="form.spaceNo" placeholder="如 B1-001 / WJ-001"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="车位类型" prop="spaceType">
                            <el-select v-model="form.spaceType" style="width:100%">
                                <el-option v-for="o in typeOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="所属区域" prop="areaName">
                            <el-input v-model="form.areaName" placeholder="如 地下一层A区"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="车位规格">
                            <el-select v-model="form.spaceSize" style="width:100%">
                                <el-option label="标准" value="标准"></el-option>
                                <el-option label="子母" value="子母"></el-option>
                                <el-option label="微型" value="微型"></el-option>
                                <el-option label="充电桩" value="充电桩"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="月租金">
                            <el-input-number v-model="form.monthFee" :min="0" :precision="2"
                                controls-position="right" style="width:100%"></el-input-number>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="使用状态">
                            <el-select v-model="form.status" style="width:100%" :disabled="!!form.ownerId">
                                <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="24">
                        <el-form-item label="位置描述">
                            <el-input v-model="form.location" placeholder="如 地下一层A区 001号位"></el-input>
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

        <!-- 分配车位 -->
        <el-dialog title="分配车位" :visible.sync="allocVisible" width="520px">
            <el-form :model="allocForm" label-width="110px" size="small">
                <el-form-item label="车位">
                    <el-input :value="allocForm.spaceNo + '（' + allocForm.areaName + '）'" disabled></el-input>
                </el-form-item>
                <el-form-item label="使用人" prop="">
                    <el-select v-model="allocForm.ownerId" filterable placeholder="请选择住户" style="width:100%"
                        @change="onOwnerChange">
                        <el-option v-for="o in owners" :key="o.id"
                            :label="o.name + ' · ' + (o.houseNo || '')" :value="o.id"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="绑定车牌">
                    <el-input v-model="allocForm.carPlate" placeholder="如 京A12345"></el-input>
                </el-form-item>
                <el-form-item label="分配方式">
                    <el-radio-group v-model="allocForm.status">
                        <el-radio label="RENTED">租赁</el-radio>
                        <el-radio label="SOLD">出售(产权)</el-radio>
                    </el-radio-group>
                </el-form-item>
                <el-form-item label="租赁期限">
                    <el-date-picker v-model="allocRange" type="daterange" value-format="yyyy-MM-dd"
                        range-separator="至" start-placeholder="开始日期" end-placeholder="结束日期"
                        style="width:100%"></el-date-picker>
                </el-form-item>
                <el-alert type="info" :closable="false" show-icon
                    title="分配后该车位状态将变更为已租/已售，并按月生成车位管理费账单。"></el-alert>
            </el-form>
            <div slot="footer">
                <el-button @click="allocVisible = false" size="small">取 消</el-button>
                <el-button type="primary" size="small" @click="submitAllocate">确认分配</el-button>
            </div>
        </el-dialog>
    </div>
    `,
    data() {
        return {
            loading: false, saving: false,
            viewMode: 'table',
            rows: [], allRows: [], total: 0, pageNum: 1, pageSize: 10,
            query: { keyword: '', spaceType: '', status: '' },
            owners: [],
            visible: false, allocVisible: false,
            allocRange: [],
            form: {}, allocForm: {},
            rules: {
                spaceNo: [{ required: true, message: '请输入车位编号', trigger: 'blur' }],
                spaceType: [{ required: true, message: '请选择车位类型', trigger: 'change' }],
                areaName: [{ required: true, message: '请输入所属区域', trigger: 'blur' }]
            }
        };
    },
    computed: {
        typeOptions() { return PmsUtils.options('spaceType'); },
        statusOptions() { return PmsUtils.options('spaceStatus'); },
        grouped() {
            const map = {};
            this.allRows.forEach(p => {
                if (!map[p.spaceType]) map[p.spaceType] = [];
                map[p.spaceType].push(p);
            });
            return Object.keys(map).map(k => ({
                name: k,
                label: PmsUtils.label('spaceType', k),
                items: map[k],
                freeCount: map[k].filter(x => x.status === 'FREE').length
            }));
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
            const params = Object.assign({}, this.query);
            // 车位图需要全量数据
            Api.parking.list(params).then(res => { this.allRows = res.data || []; });
            Api.parking.page(Object.assign({}, params, { pageNum: this.pageNum, pageSize: this.pageSize }))
                .then(res => {
                    this.rows = res.data.rows || [];
                    this.total = res.data.total || 0;
                })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.loading = false; });
        },
        reload() { this.pageNum = 1; this.load(); },
        reset() {
            this.query = { keyword: '', spaceType: '', status: '' };
            this.reload();
        },
        openForm(row) {
            this.form = row ? Object.assign({}, row) : {
                spaceNo: '', spaceType: 'UNDERGROUND', areaName: '地下一层A区',
                spaceSize: '标准', monthFee: 300, status: 'FREE', location: '', remark: ''
            };
            this.visible = true;
            this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate());
        },
        submit() {
            this.$refs.form.validate(valid => {
                if (!valid) return;
                this.saving = true;
                const req = this.form.id ? Api.parking.update(this.form) : Api.parking.add(this.form);
                req.then(res => {
                    this.$message.success(res.msg);
                    this.visible = false;
                    this.load();
                }).catch(err => this.$message.error(err.message))
                    .finally(() => { this.saving = false; });
            });
        },
        remove(row) {
            this.$confirm('确定删除车位「' + row.spaceNo + '」吗？', '删除确认', { type: 'warning' })
                .then(() => Api.parking.remove(row.id))
                .then(res => { this.$message.success(res.msg); this.load(); })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        },
        openAllocate(row) {
            this.allocForm = {
                id: row.id, spaceNo: row.spaceNo, areaName: row.areaName,
                monthFee: row.monthFee, ownerId: null, carPlate: '', status: 'RENTED'
            };
            this.allocRange = ['2026-09-16', '2027-09-15'];
            this.allocVisible = true;
        },
        onOwnerChange(id) {
            const o = this.owners.find(x => x.id === id);
            if (o && o.carPlate && !this.allocForm.carPlate) {
                this.allocForm.carPlate = o.carPlate;
            }
        },
        submitAllocate() {
            const f = this.allocForm;
            if (!f.ownerId) return this.$message.warning('请选择使用人');
            Api.parking._request('post', '/parking/allocate', {
                params: {
                    id: f.id, ownerId: f.ownerId, carPlate: f.carPlate,
                    status: f.status,
                    startDate: this.allocRange[0], endDate: this.allocRange[1]
                }
            }).then(res => {
                this.$message.success(res.msg);
                this.allocVisible = false;
                this.load();
            }).catch(err => this.$message.error(err.message));
        },
        release(row) {
            this.$confirm('确定释放车位「' + row.spaceNo + '」吗？释放后将变为空闲状态，不再生成管理费账单。',
                '退租确认', { type: 'warning' })
                .then(() => Api.parking._request('post', '/parking/release', { params: { id: row.id } }))
                .then(res => { this.$message.success(res.msg); this.load(); })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        },
        cellClick(p) {
            if (p.status === 'FREE') {
                this.openAllocate(p);
            } else {
                this.$alert(
                    '<div style="line-height:2">' +
                    '<b>车位编号：</b>' + p.spaceNo + '<br>' +
                    '<b>所属区域：</b>' + p.areaName + '<br>' +
                    '<b>使用人：</b>' + (p.ownerName || '-') + '<br>' +
                    '<b>绑定车牌：</b>' + (p.carPlate || '-') + '<br>' +
                    '<b>月租金：</b>' + PmsUtils.money(p.monthFee) + '<br>' +
                    '<b>租赁期限：</b>' + (p.startDate ? PmsUtils.day(p.startDate) + ' ~ ' + PmsUtils.day(p.endDate) : '-') +
                    '</div>', '车位详情', { dangerouslyUseHTMLString: true, confirmButtonText: '关闭' });
            }
        }
    }
});
