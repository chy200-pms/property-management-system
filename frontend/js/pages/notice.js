/**
 * 通知公告管理
 */
Vue.component('page-notice', {
    template: `
    <div>
        <div class="page-head">
            <h3>通知公告</h3>
            <div class="desc">发布小区通知、社区活动、紧急公告与停水停电提醒</div>
            <div class="head-actions">
                <el-tag v-if="!canManage" type="info" size="small">只读</el-tag>
                <el-button v-if="canManage" size="small" type="primary" icon="el-icon-plus" @click="openForm()">发布公告</el-button>
            </div>
        </div>

        <div class="search-bar">
            <el-input v-model="query.keyword" placeholder="标题 / 内容 / 发布人" prefix-icon="el-icon-search"
                size="small" clearable @keyup.enter.native="reload" style="width:230px"></el-input>
            <el-select v-model="query.noticeType" placeholder="公告类型" size="small" clearable>
                <el-option v-for="o in typeOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-button size="small" type="primary" icon="el-icon-search" @click="reload">查询</el-button>
            <el-button size="small" icon="el-icon-refresh" @click="reset">重置</el-button>
        </div>

        <el-table :data="rows" v-loading="loading" border stripe size="small" style="width:100%">
            <el-table-column label="标题" min-width="240" show-overflow-tooltip>
                <template slot-scope="s">
                    <el-tag v-if="s.row.topFlag === 1" type="danger" size="mini" effect="plain"
                        style="margin-right:6px">置顶</el-tag>
                    <a style="color:#2d6cb5;cursor:pointer" @click="showDetail(s.row)">{{ s.row.title }}</a>
                </template>
            </el-table-column>
            <el-table-column label="类型" width="105" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('noticeType', s.row.noticeType)" size="mini">
                        {{ PmsUtils.label('noticeType', s.row.noticeType) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column prop="publisher" label="发布人" width="120"></el-table-column>
            <el-table-column label="发布时间" width="150" align="center">
                <template slot-scope="s">{{ PmsUtils.minute(s.row.publishTime) }}</template>
            </el-table-column>
            <el-table-column label="阅读量" width="90" align="center">
                <template slot-scope="s">
                    <i class="el-icon-view" style="color:#909399;margin-right:4px"></i>{{ s.row.viewCount || 0 }}
                </template>
            </el-table-column>
            <el-table-column label="状态" width="85" align="center">
                <template slot-scope="s">
                    <el-tag :type="s.row.status === 1 ? 'success' : 'info'" size="mini">
                        {{ s.row.status === 1 ? '已发布' : '草稿' }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column v-if="canManage" label="操作" width="150" align="center" fixed="right">
                <template slot-scope="s">
                    <el-button type="text" size="mini" @click="showDetail(s.row)">查看</el-button>
                    <el-button type="text" size="mini" @click="openForm(s.row)">编辑</el-button>
                    <el-button type="text" size="mini" style="color:#f56c6c" @click="remove(s.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-pagination class="pagination" background layout="total, sizes, prev, pager, next, jumper"
            :current-page.sync="pageNum" :page-size.sync="pageSize" :page-sizes="[10,20,50]"
            :total="total" @current-change="load" @size-change="load"></el-pagination>

        <!-- 发布 / 编辑 -->
        <el-dialog :title="form.id ? '编辑公告' : '发布公告'" :visible.sync="visible" width="680px"
            :close-on-click-modal="false">
            <el-form :model="form" :rules="rules" ref="form" label-width="90px" size="small">
                <el-row :gutter="14">
                    <el-col :span="16">
                        <el-form-item label="公告标题" prop="title">
                            <el-input v-model="form.title" placeholder="请输入公告标题"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="8">
                        <el-form-item label="公告类型">
                            <el-select v-model="form.noticeType" style="width:100%">
                                <el-option v-for="o in typeOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
                            </el-select>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="发布人">
                            <el-input v-model="form.publisher" placeholder="如 物业服务中心"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="发布时间">
                            <el-date-picker v-model="form.publishTime" type="datetime" value-format="yyyy-MM-dd HH:mm:ss"
                                placeholder="默认当前时间" style="width:100%"></el-date-picker>
                        </el-form-item>
                    </el-col>
                    <el-col :span="24">
                        <el-form-item label="公告内容" prop="content">
                            <el-input v-model="form.content" type="textarea" :rows="8"
                                placeholder="请输入公告正文内容"></el-input>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="是否置顶">
                            <el-switch v-model="form.topFlag" :active-value="1" :inactive-value="0"></el-switch>
                        </el-form-item>
                    </el-col>
                    <el-col :span="12">
                        <el-form-item label="发布状态">
                            <el-switch v-model="form.status" :active-value="1" :inactive-value="0"
                                active-text="发布" inactive-text="存草稿"></el-switch>
                        </el-form-item>
                    </el-col>
                </el-row>
            </el-form>
            <div slot="footer">
                <el-button @click="visible = false" size="small">取 消</el-button>
                <el-button type="primary" size="small" :loading="saving" @click="submit">确 定</el-button>
            </div>
        </el-dialog>

        <!-- 查看详情 -->
        <el-dialog :title="current && current.title" :visible.sync="detailVisible" width="680px">
            <div v-if="current">
                <div style="display:flex;align-items:center;gap:10px;padding-bottom:14px;border-bottom:1px solid #ebeef5">
                    <el-tag :type="PmsUtils.tag('noticeType', current.noticeType)" size="small">
                        {{ PmsUtils.label('noticeType', current.noticeType) }}</el-tag>
                    <span class="text-muted" style="font-size:12px">{{ current.publisher }}</span>
                    <span class="text-muted" style="font-size:12px">发布于 {{ current.publishTime }}</span>
                    <span class="text-muted" style="font-size:12px;margin-left:auto">
                        <i class="el-icon-view"></i> {{ current.viewCount || 0 }} 次阅读</span>
                </div>
                <div class="notice-content" style="margin-top:18px">{{ current.content }}</div>
            </div>
            <div slot="footer">
                <el-button type="primary" size="small" @click="detailVisible = false">关 闭</el-button>
            </div>
        </el-dialog>
    </div>
    `,
    data() {
        return {
            loading: false, saving: false,
            rows: [], total: 0, pageNum: 1, pageSize: 10,
            query: { keyword: '', noticeType: '' },
            visible: false, detailVisible: false,
            form: {}, current: null,
            rules: {
                title: [{ required: true, message: '请输入公告标题', trigger: 'blur' }],
                content: [{ required: true, message: '请输入公告内容', trigger: 'blur' }]
            }
        };
    },
    computed: {
        typeOptions() { return PmsUtils.options('noticeType'); }
    },
    created() {
        this.load();
    },
    methods: {
        load() {
            this.loading = true;
            Api.notice.page(Object.assign({}, this.query, { pageNum: this.pageNum, pageSize: this.pageSize }))
                .then(res => {
                    this.rows = res.data.rows || [];
                    this.total = res.data.total || 0;
                })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.loading = false; });
        },
        reload() { this.pageNum = 1; this.load(); },
        reset() {
            this.query = { keyword: '', noticeType: '' };
            this.reload();
        },
        openForm(row) {
            const now = new Date();
            const pad = n => String(n).padStart(2, '0');
            const nowStr = now.getFullYear() + '-' + pad(now.getMonth() + 1) + '-' + pad(now.getDate()) +
                ' ' + pad(now.getHours()) + ':' + pad(now.getMinutes()) + ':00';
            this.form = row ? Object.assign({}, row) : {
                title: '', content: '', noticeType: 'NOTIFY',
                publisher: '物业服务中心', publishTime: nowStr, topFlag: 0, status: 1
            };
            this.visible = true;
            this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate());
        },
        submit() {
            this.$refs.form.validate(valid => {
                if (!valid) return;
                this.saving = true;
                const req = this.form.id ? Api.notice.update(this.form) : Api.notice.add(this.form);
                req.then(res => {
                    this.$message.success(res.msg);
                    this.visible = false;
                    this.load();
                }).catch(err => this.$message.error(err.message))
                    .finally(() => { this.saving = false; });
            });
        },
        showDetail(row) {
            // 先用列表数据即时展示，再请求详情(阅读量+1)后回填
            this.current = row;
            this.detailVisible = true;
            Api.notice.detail(row.id).then(res => {
                if (res.data) {
                    this.current = res.data;
                    const idx = this.rows.findIndex(x => x.id === row.id);
                    if (idx >= 0) this.$set(this.rows, idx, this.current);
                }
            }).catch(() => { /* 演示模式下失败则保持列表数据 */ });
        },
        remove(row) {
            this.$confirm('确定删除公告「' + row.title + '」吗？', '删除确认', { type: 'warning' })
                .then(() => Api.notice.remove(row.id))
                .then(res => { this.$message.success(res.msg); this.load(); })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        }
    }
});
