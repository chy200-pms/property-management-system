/**
 * 系统用户管理
 */
Vue.component('page-user', {
    template: `
    <div>
        <div class="page-head">
            <h3>系统用户管理</h3>
            <div class="desc">管理后台登录账号、角色与权限</div>
            <div class="head-actions">
                <el-button size="small" type="primary" icon="el-icon-plus" @click="openForm()">新增用户</el-button>
            </div>
        </div>

        <div class="search-bar">
            <el-input v-model="query.keyword" placeholder="账号 / 姓名 / 手机号" prefix-icon="el-icon-search"
                size="small" clearable @keyup.enter.native="load" style="width:220px"></el-input>
            <el-select v-model="query.role" placeholder="角色" size="small" clearable>
                <el-option v-for="o in roleOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
            </el-select>
            <el-button size="small" type="primary" icon="el-icon-search" @click="load">查询</el-button>
            <el-button size="small" icon="el-icon-refresh" @click="reset">重置</el-button>
        </div>

        <el-table :data="rows" v-loading="loading" border stripe size="small" style="width:100%">
            <el-table-column prop="id" label="ID" width="60" align="center"></el-table-column>
            <el-table-column prop="username" label="登录账号" width="140"></el-table-column>
            <el-table-column prop="realName" label="姓名" width="110"></el-table-column>
            <el-table-column prop="phone" label="手机号" width="130"></el-table-column>
            <el-table-column label="角色" width="120" align="center">
                <template slot-scope="s">
                    <el-tag :type="PmsUtils.tag('userRole', s.row.role)" size="mini">
                        {{ PmsUtils.label('userRole', s.row.role) }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="状态" width="90" align="center">
                <template slot-scope="s">
                    <el-tag :type="s.row.status === 1 ? 'success' : 'danger'" size="mini">
                        {{ s.row.status === 1 ? '启用' : '禁用' }}</el-tag>
                </template>
            </el-table-column>
            <el-table-column label="最后登录" width="155" align="center">
                <template slot-scope="s">
                    <span v-if="s.row.lastLogin">{{ PmsUtils.minute(s.row.lastLogin) }}</span>
                    <span v-else class="text-muted">从未登录</span>
                </template>
            </el-table-column>
            <el-table-column label="创建时间" min-width="150" align="center">
                <template slot-scope="s">{{ PmsUtils.minute(s.row.createTime) }}</template>
            </el-table-column>
            <el-table-column label="操作" width="170" align="center" fixed="right">
                <template slot-scope="s">
                    <el-button type="text" size="mini" @click="openForm(s.row)">编辑</el-button>
                    <el-button type="text" size="mini" @click="resetPwd(s.row)">重置密码</el-button>
                    <el-button type="text" size="mini" style="color:#f56c6c"
                        :disabled="s.row.id === 1" @click="remove(s.row)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-dialog :title="form.id ? '编辑用户' : '新增用户'" :visible.sync="visible" width="540px"
            :close-on-click-modal="false">
            <el-form :model="form" :rules="rules" ref="form" label-width="100px" size="small">
                <el-form-item label="登录账号" prop="username">
                    <el-input v-model="form.username" :disabled="!!form.id" placeholder="请输入登录账号"></el-input>
                </el-form-item>
                <el-form-item label="姓名" prop="realName">
                    <el-input v-model="form.realName" placeholder="请输入姓名"></el-input>
                </el-form-item>
                <el-form-item label="手机号">
                    <el-input v-model="form.phone" placeholder="请输入手机号"></el-input>
                </el-form-item>
                <el-form-item label="角色" prop="role">
                    <el-select v-model="form.role" style="width:100%">
                        <el-option v-for="o in roleOptions" :key="o.value" :label="o.label" :value="o.value"></el-option>
                    </el-select>
                </el-form-item>
                <el-form-item label="密码" :prop="form.id ? '' : 'password'">
                    <el-input v-model="form.password" type="password" show-password
                        :placeholder="form.id ? '留空表示不修改密码' : '默认 123456'"></el-input>
                </el-form-item>
                <el-form-item label="状态">
                    <el-switch v-model="form.status" :active-value="1" :inactive-value="0"
                        active-text="启用" inactive-text="禁用"></el-switch>
                </el-form-item>
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
            rows: [],
            query: { keyword: '', role: '' },
            visible: false,
            form: {},
            rules: {
                username: [{ required: true, message: '请输入登录账号', trigger: 'blur' }],
                realName: [{ required: true, message: '请输入姓名', trigger: 'blur' }],
                role: [{ required: true, message: '请选择角色', trigger: 'change' }],
                password: [{ min: 6, message: '密码长度不能少于 6 位', trigger: 'blur' }]
            }
        };
    },
    computed: {
        roleOptions() { return PmsUtils.options('userRole'); }
    },
    created() {
        this.load();
    },
    methods: {
        load() {
            this.loading = true;
            Api.users.list(this.query)
                .then(res => { this.rows = res.data || []; })
                .catch(err => this.$message.error(err.message))
                .finally(() => { this.loading = false; });
        },
        reset() {
            this.query = { keyword: '', role: '' };
            this.load();
        },
        openForm(row) {
            this.form = row ? Object.assign({}, row, { password: '' }) : {
                username: '', realName: '', phone: '', role: 'STAFF',
                password: '123456', status: 1
            };
            this.visible = true;
            this.$nextTick(() => this.$refs.form && this.$refs.form.clearValidate());
        },
        submit() {
            this.$refs.form.validate(valid => {
                if (!valid) return;
                this.saving = true;
                const req = this.form.id ? Api.users.update(this.form) : Api.users.add(this.form);
                req.then(res => {
                    this.$message.success(res.msg);
                    this.visible = false;
                    this.load();
                }).catch(err => this.$message.error(err.message))
                    .finally(() => { this.saving = false; });
            });
        },
        resetPwd(row) {
            this.$prompt('请输入「' + row.realName + '」的新密码', '重置密码', {
                inputValue: '123456',
                inputPattern: /.{6,}/,
                inputErrorMessage: '密码长度不能少于 6 位'
            }).then(({ value }) => Api.users.update({ id: row.id, password: value }))
                .then(() => this.$message.success('密码已重置，请通知该用户及时修改'))
                .catch(() => { });
        },
        remove(row) {
            this.$confirm('确定删除用户「' + row.realName + '」吗？', '删除确认', { type: 'warning' })
                .then(() => Api.users.remove(row.id))
                .then(res => { this.$message.success(res.msg); this.load(); })
                .catch(err => { if (err && err.message) this.$message.error(err.message); });
        }
    }
});
