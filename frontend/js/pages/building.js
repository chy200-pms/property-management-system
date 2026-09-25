/**
 * 楼栋管理
 */
Vue.component('page-building', {
    template: `
    <div>
        <div class="page-head">
            <h3>楼栋管理</h3>
            <div class="desc">维护小区楼栋基础信息与入住情况</div>
            <div class="head-actions">
                <el-tag v-if="!canManage" type="info" size="small">只读</el-tag>
                <el-button size="small" icon="el-icon-s-data" @click="showStat">入住统计</el-button>
                <el-button v-if="canManage" size="small" type="primary" icon="el-icon-plus" @click="openForm()">新增楼栋</el-button>
            </div>
        </div>

        <div class="search-bar">
            <el-input v-model="query.keyword" placeholder="楼栋编号 / 名称 / 管家" prefix-icon="el-icon-search"
                size="small" clearable @keyup.enter.native="reload"></el-input>
            <el-select v-model="query.buildingType" placeholder="楼栋类型" size="small" clearable>
                <el-option label="住宅" value="住宅"></el-option>
                <el-option label="公寓" value="公寓"></el-option>
                <el-option label="别墅" value="别墅"></el-option>
                <el-option label="商铺" value="商铺"></el-option>
            </el-select>
            <el-button size="small" type="primary" icon="el-icon-search" @click="reload">查询</el-button>
            <el-button size="small" icon="el-icon-refresh" @click="reset">重置</el-button>
        </div>

        <el-table :data="rows" v-loading="loading" border stripe size="small" style="width:100%">
            <el-table-column type="index" label="#" width="50" align="center"></el-table-column>
            <el-table-column prop="buildingNo" label="楼栋编号" width="100" align="center"></el-table-column>
            <el-table-column prop="name" label="楼栋名称" min-width="160" show-overflow-tooltip></el-table-column>
            <el-table-column label="类型" width="80" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('buildingType', s.row.buildingType)" size="mini">
                        {{ s.row.buildingType }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="unitCount" label="单元" width="60" align="center"></el-table-column>
            <el-table-column prop="floorCount" label="楼层" width="60" align="center"></el-table-column>
            <el-table-column prop="houseCount" label="房屋数" width="70" align="center"></el-table-column>
            <el-table-column label="入住情况" min-width="150" align="center">
                <template slot-scope="s">
                    <div style="display:flex;align-items:center;gap:8px">
                        <el-progress :percentage="parseRate(s.row.occupancyRate)" :stroke-width="8"
                            :show-text="false" style="flex:1;min-width:60px" color="#2d6cb5"></el-progress>
                        <span style="font-size:12px;color:#606266;white-space:nowrap">{{ s.row.occupancyRate || '-' }}</span>
                    </div>
                </template>
            </el-table-column>
            <el-table-column prop="buildYear" label="建成年份" width="90" align="center"></el-table-column>
            <el-table-column prop="manager" label="楼栋管家" width="90"></el-table-column>
            <el-table-column prop="managerPhone" label="管家电话" width="120"></el-table-column>
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

        <!-- 新增 / 编辑 -->
        <el-dialog :title="form.id ? '编辑楼栋' : '新增楼栋'" :visible.sync="visible" width="620px"
            :close-on-click-modal="false">
            <el-form :model="form" :rules="rules" ref="form" label-width="100px" size="small">
                <el-row :gutter="14">
                    <el-col :span="12">
                        <el-form-item label="楼栋编号" prop="buildingNo">
                            <el-input v-model="form.buildingNo" placeholder="如 7号楼"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="楼栋名称" prop="name">
                            <el-input v-model="form.name" placeholder="如 阳光家园7号楼"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="楼栋类型">
                            <el-select v-model="form.buildingType" style="width:100%">
                                <el-option label="住宅" value="住宅"></el-option>
                                <el-option label="公寓" value="公寓"></el-option>
                                <el-option label="别墅" value="别墅"></el-option>
                                <el-option label="商铺" value="商铺"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="建成年份">
                            <el-input-number v-model="form.buildYear" :min="1980" :max="2030"
                                controls-position="right" style="width:100%"></el-input-number>
                        </el-form-item>
                    </el-col>
                    <el-col :span="8">
                        <el-form-item label="单元数">
                            <el-input-number v-model="form.unitCount" :min="1" :max="20"
                                controls-position="right" style="width:100%"></el-input-number>
                        </el-form-item>
                    </el-col>
                    <el-col :span="8">
                        <el-form-item label="楼层数">
                            <el-input-number v-model="form.floorCount" :min="1" :max="60"
                                controls-position="right" style="width:100%"></el-input-number>
                        </el-form-item>
                    </el-col>
                    <el-col :span="8">
                        <el-form-item label="房屋总数">
                            <el-input-number v-model="form.houseCount" :min="0" :max="999"
                                controls-position="right" style="width:100%"></el-input-number>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="建筑面积">
                            <el-input-number v-model="form.totalArea" :min="0" :precision="2"
                                controls-position="right" style="width:100%"></el-input-number>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="楼栋管家">
                            <el-input v-model="form.manager" placeholder="请输入姓名"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="管家电话">
                            <el-input v-model="form.managerPhone" placeholder="请输入手机号"></el-input>
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

        <!-- 入住统计 -->
        <el-dialog title="楼栋入住情况统计" :visible.sync="statVisible" width="640px">
            <el-table :data="stat" v-loading="statLoading" border size="small">
                <el-table-column prop="buildingNo" label="楼栋" width="100" align="center"></el-table-column>
                <el-table-column prop="totalHouse" label="房屋总数" align="center"></el-table-column>
                <el-table-column prop="occupiedHouse" label="已入住" align="center"></el-table-column>
                <el-table-column prop="emptyHouse" label="空置" align="center"></el-table-column>
                <el-table-column label="入住率" align="center">
                    <template slot-scope="s">
                        <el-tag size="mini" type="primary">
                            {{ s.row.totalHouse ? (s.row.occupiedHouse / s.row.totalHouse * 100).toFixed(1) + '%' : '0%' }}
                        </el-tag>
                    </template>
                </el-table-column>
            </el-table>
        </el-dialog>
    </div>
    `,
    data() {
        return {
            loading: false,
            saving: false,
            statLoading: false,
            rows: [],
            total: 0,
            pageNum: 1,
            pageSize: 10,
            query: { keyword: '', buildingType: '' },
            visible: false,
            statVisible: false,
            stat: [],
            form: {},
            rules: {
                buildingNo: [{ required: true, message: '请输入楼栋编号', trigger: 'blur' }]
            }
        };
    },
    created() {
        this.load();
    },
    methods: {
        parseRate(t) { return parseFloat(String(t || '0').replace('%', '')) || 0; },
        load() {
            this.loading = true;
            Api.building.page(Object.assign({}, this.query, { pageNum: this.pageNum, pageSize: this.pageSize }))
                .then(res => {
                    this.rows = res.data.rows || [];
                    this.total = res.data.total || 0;
                })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.loading = false; });
        },
        reload() {
            this.pageNum = 1;
            this.load();
        },
        reset() {
            this.query = { keyword: '', buildingType: '' };
            this.reload();
        },
        openForm(row) {
            this.form = row ? Object.assign({}, row) : {
                buildingNo: '', name: '', buildingType: '住宅', buildYear: 2020,
                unitCount: 2, floorCount: 6, houseCount: 0, totalArea: 0,
                manager: '', managerPhone: '', remark: ''
            };
            this.visible = true;
            this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate());
        },
        submit() {
            this.$refs.form.validate(valid => {
                if (!valid) return;
                this.saving = true;
                const req = this.form.id ? Api.building.update(this.form) : Api.building.add(this.form);
                req.then(res => {
                    this.$message.success(res.msg);
                    this.visible = false;
                    this.load();
                }).catch(err => this.$message.error(err.message))
                    .finally(() => { this.saving = false; });
            });
        },
        remove(row) {
            this.$confirm('确定删除楼栋「' + row.buildingNo + '」吗？', '删除确认', { type: 'warning' })
                .then(() => Api.building.remove(row.id))
                .then(res => {
                    this.$message.success(res.msg);
                    this.load();
                })
                .catch(err => {
                    if (err && err.message) this.$message.error(err.message);
                });
        },
        showStat() {
            this.statVisible = true;
            this.statLoading = true;
            Api.building.statistics()
                .then(res => { this.stat = res.data || []; })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.statLoading = false; });
        }
    }
});
