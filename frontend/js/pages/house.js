/**
 * 房屋管理
 */
Vue.component('page-house', {
    template: `
    <div>
        <div class="page-head">
            <h3>房屋管理</h3>
            <div class="desc">管理小区房屋档案、面积、户型与入住状态</div>
            <div class="head-actions">
                <el-button size="small" icon="el-icon-s-data" @click="showStat">户型统计</el-button>
                <el-tag v-if="!canManage" type="info" size="small">只读</el-tag>
                <el-button v-if="canManage" size="small" type="primary" icon="el-icon-plus" @click="openForm()">新增房屋</el-button>
            </div>
        </div>

        <div class="search-bar">
            <el-input v-model="query.keyword" placeholder="房屋编号 / 业主姓名 / 电话" prefix-icon="el-icon-search"
                size="small" clearable @keyup.enter.native="reload"></el-input>
            <el-select v-model="query.buildingId" placeholder="所属楼栋" size="small" clearable>
                <el-option v-for="b in buildings" :key="b.id" :label="b.buildingNo" :value="b.id"></el-option>
            </el-select>
            <el-select v-model="query.status" placeholder="房屋状态" size="small" clearable>
                <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-button size="small" type="primary" icon="el-icon-search" @click="reload">查询</el-button>
            <el-button size="small" icon="el-icon-refresh" @click="reset">重置</el-button>
        </div>

        <el-table :data="rows" v-loading="loading" border stripe size="small" style="width:100%">
            <el-table-column prop="houseNo" label="房屋编号" min-width="160" show-overflow-tooltip></el-table-column>
            <el-table-column label="状态" width="85" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('houseStatus', s.row.status)" size="mini">
                        {{ PmsUtils.label('houseStatus', s.row.status) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="houseType" label="户型" width="100" align="center"></el-table-column>
            <el-table-column label="面积" width="95" align="center">
                <template slot-scope="s">{{ s.row.area }} ㎡</template>
            </el-table-column>
            <el-table-column prop="orientation" label="朝向" width="90" align="center"></el-table-column>
            <el-table-column prop="decoration" label="装修" width="70" align="center"></el-table-column>
            <el-table-column prop="ownerName" label="业主/住户" width="100"></el-table-column>
            <el-table-column prop="ownerPhone" label="联系电话" width="120"></el-table-column>
            <el-table-column v-if="canManage" label="操作" width="180" align="center" fixed="right">
                <template slot-scope="s">
                    <el-button type="text" size="mini" @click="openForm(s.row)">编辑</el-button>
                    <el-button type="text" size="mini" @click="bindOwner(s.row)">绑定住户</el-button>
                    <el-button type="text" size="mini" style="color:#f56c6c" @click="remove(s.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-pagination class="pagination" background layout="total, sizes, prev, pager, next, jumper"
            :current-page.sync="pageNum" :page-size.sync="pageSize" :page-sizes="[10,20,50,100]"
            :total="total" @current-change="load" @size-change="load"></el-pagination>

        <!-- 新增/编辑 -->
        <el-dialog :title="form.id ? '编辑房屋' : '新增房屋'" :visible.sync="visible" width="620px"
            :close-on-click-modal="false">
            <el-form :model="form" :rules="rules" ref="form" label-width="100px" size="small">
                <el-row :gutter="14">
                    <el-col :span="12">
                        <el-form-item label="所属楼栋" prop="buildingId">
                            <el-select v-model="form.buildingId" style="width:100%" @change="autoHouseNo">
                                <el-option v-for="b in buildings" :key="b.id" :label="b.name" :value="b.id"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="房屋编号" prop="houseNo">
                            <el-input v-model="form.houseNo" placeholder="如 1号楼1单元101"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="8">
                        <el-form-item label="单元号">
                            <el-input-number v-model="form.unitNo" :min="1" :max="20" controls-position="right"
                                style="width:100%" @change="autoHouseNo"></el-input-number>
                        </el-form-item>
                    </el-col>
                    <el-col :span="8">
                        <el-form-item label="楼层">
                            <el-input-number v-model="form.floorNo" :min="1" :max="60" controls-position="right"
                                style="width:100%" @change="autoHouseNo"></el-input-number>
                        </el-form-item>
                    </el-col>
                    <el-col :span="8">
                        <el-form-item label="房号">
                            <el-input v-model="form.roomNo" placeholder="101" @change="autoHouseNo"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="建筑面积">
                            <el-input-number v-model="form.area" :min="0" :precision="2" controls-position="right"
                                style="width:100%"></el-input-number>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="户型">
                            <el-select v-model="form.houseType" style="width:100%" allow-create filterable>
                                <el-option label="一室一厅" value="一室一厅"></el-option>
                                <el-option label="两室一厅" value="两室一厅"></el-option>
                                <el-option label="两室两厅" value="两室两厅"></el-option>
                                <el-option label="三室一厅" value="三室一厅"></el-option>
                                <el-option label="三室两厅" value="三室两厅"></el-option>
                                <el-option label="四室两厅" value="四室两厅"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="朝向">
                            <el-select v-model="form.orientation" style="width:100%">
                                <el-option label="南" value="南"></el-option>
                                <el-option label="北" value="北"></el-option>
                                <el-option label="东" value="东"></el-option>
                                <el-option label="西" value="西"></el-option>
                                <el-option label="东南" value="东南"></el-option>
                                <el-option label="西南" value="西南"></el-option>
                                <el-option label="南北通透" value="南北通透"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="装修情况">
                            <el-select v-model="form.decoration" style="width:100%">
                                <el-option label="毛坯" value="毛坯"></el-option>
                                <el-option label="简装" value="简装"></el-option>
                                <el-option label="精装" value="精装"></el-option>
                                <el-option label="豪装" value="豪装"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="房屋状态">
                            <el-select v-model="form.status" style="width:100%">
                                <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
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
                <el-button @click="visible = false" size="small">取 消</el-button>
                <el-button type="primary" size="small" :loading="saving" @click="submit">保 存</el-button>
            </div>
        </el-dialog>

        <!-- 绑定住户 -->
        <el-dialog title="绑定住户 / 变更入住状态" :visible.sync="bindVisible" width="480px">
            <el-form label-width="100px" size="small">
                <el-form-item label="房屋">
                    <el-input :value="bindForm.houseNo" disabled></el-input>
                </el-form-item>
                <el-form-item label="选择住户">
                    <el-select v-model="bindForm.ownerId" filterable clearable placeholder="请选择住户(可留空解除绑定)"
                        style="width:100%">
                        <el-option v-for="o in owners" :key="o.id"
                            :label="o.name + ' · ' + PmsUtils.label('personType', o.personType) + (o.houseNo ? ' · ' + o.houseNo : '')"
                            :value="o.id"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="入住状态">
                    <el-select v-model="bindForm.status" style="width:100%">
                        <el-option v-for="o in statusOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
                    </el-select>
                </el-form-item>
            </el-form>
            <div slot="footer">
                <el-button @click="bindVisible = false" size="small">取 消</el-button>
                <el-button type="primary" size="small" @click="submitBind">确 定</el-button>
            </div>
        </el-dialog>

        <!-- 户型统计 -->
        <el-dialog title="户型分布统计" :visible.sync="statVisible" width="560px">
            <el-table :data="stat" v-loading="statLoading" border size="small">
                <el-table-column prop="name" label="户型"></el-table-column>
                <el-table-column prop="value" label="套数" width="120" align="center"></el-table-column>
                <el-table-column label="占比" align="center">
                    <template slot-scope="s">
                        <el-tag size="mini" type="primary">
                            {{ statTotal ? (s.row.value / statTotal * 100).toFixed(1) + '%' : '0%' }}</el-tag>
                    </template>
                </el-table-column>
            </el-table>
        </el-dialog>
    </div>
    `,
    data() {
        return {
            loading: false, saving: false, statLoading: false,
            rows: [], total: 0, pageNum: 1, pageSize: 10,
            query: { keyword: '', buildingId: null, status: '' },
            buildings: [], owners: [],
            visible: false, bindVisible: false, statVisible: false,
            stat: [], statTotal: 0,
            form: {}, bindForm: {},
            rules: {
                buildingId: [{ required: true, message: '请选择所属楼栋', trigger: 'change' }],
                houseNo: [{ required: true, message: '请输入房屋编号', trigger: 'blur' }]
            }
        };
    },
    computed: {
        statusOptions() { return PmsUtils.options('houseStatus'); }
    },
    created() {
        Api.building.list().then(res => { this.buildings = res.data || []; });
        Api.owner.list().then(res => { this.owners = (res.data || []).filter(o => PmsUtils.isMainPerson(o.personType)); });
        this.load();
    },
    methods: {
        load() {
            this.loading = true;
            Api.house.page(Object.assign({}, this.query, { pageNum: this.pageNum, pageSize: this.pageSize }))
                .then(res => {
                    this.rows = res.data.rows || [];
                    this.total = res.data.total || 0;
                })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.loading = false; });
        },
        reload() { this.pageNum = 1; this.load(); },
        reset() {
            this.query = { keyword: '', buildingId: null, status: '' };
            this.reload();
        },
        autoHouseNo() {
            if (this.form.id) return;
            const b = this.buildings.find(x => x.id === this.form.buildingId);
            if (!b) return;
            const num = String(b.buildingNo).replace('号楼', '');
            if (this.form.unitNo && this.form.roomNo) {
                this.form.houseNo = num + '号楼' + this.form.unitNo + '单元' + this.form.roomNo;
            }
        },
        openForm(row) {
            this.form = row ? Object.assign({}, row) : {
                buildingId: null, houseNo: '', unitNo: 1, floorNo: 1, roomNo: '101',
                area: 100, houseType: '两室一厅', orientation: '南', decoration: '精装',
                status: 'EMPTY', ownerId: null, remark: ''
            };
            this.visible = true;
            this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate());
        },
        submit() {
            this.$refs.form.validate(valid => {
                if (!valid) return;
                this.saving = true;
                const req = this.form.id ? Api.house.update(this.form) : Api.house.add(this.form);
                req.then(res => {
                    this.$message.success(res.msg);
                    this.visible = false;
                    this.load();
                }).catch(err => this.$message.error(err.message))
                    .finally(() => { this.saving = false; });
            });
        },
        remove(row) {
            this.$confirm('确定删除房屋「' + row.houseNo + '」吗？', '删除确认', { type: 'warning' })
                .then(() => Api.house.remove(row.id))
                .then(res => { this.$message.success(res.msg); this.load(); })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        },
        bindOwner(row) {
            this.bindForm = {
                id: row.id,
                houseNo: row.houseNo,
                ownerId: row.ownerId || null,
                status: row.status || 'OCCUPIED'
            };
            this.bindVisible = true;
        },
        submitBind() {
            const p = this.bindForm;
            Api.house._request('post', '/house/checkIn', {
                params: { id: p.id, ownerId: p.ownerId || undefined, status: p.status }
            }).then(res => {
                this.$message.success(res.msg);
                this.bindVisible = false;
                this.load();
            }).catch(err => this.$message.error(err.message));
        },
        showStat() {
            this.statVisible = true;
            this.statLoading = true;
            Api.house._request('get', '/house/statistics/type')
                .then(res => {
                    this.stat = res.data || [];
                    this.statTotal = this.stat.reduce((s, x) => s + x.value, 0);
                })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.statLoading = false; });
        }
    }
});
