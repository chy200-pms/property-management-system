/**
 * 角色权限 mixin
 * <p>
 * 给所有页面组件统一提供两个 computed, 让"能不能看到管理按钮"与后端
 * DataScope.requireStaff() 的口径完全一致:
 * <ul>
 *   <li>{@code canManage}  —— 当前账号是否具备物业管理权限(ADMIN / STAFF)。
 *       业主登录时, 所有管理类页面的新增/编辑/删除按钮一律隐藏。</li>
 *   <li>{@code ownerAccount} —— 当前账号是否为业主(OWNER), 用于只读提示与
 *       "编辑我的信息"这类自助入口。</li>
 * </ul>
 * <b>加载顺序很关键</b>: 本文件必须在 js/pages/*.js 之前引入。
 * Vue 2 的 {@code Vue.component()} 会立即把"当时已存在的全局 mixin"合并进组件选项,
 * 若在页面组件之后注册 mixin, 已注册的组件不会拿到这些 computed。
 * <p>
 * 权限判断始终以后端为准, 这里只是"不显示按了也会被拒的按钮", 属于体验层;
 * 真正的拦截在 backend 的 DataScope 与 LoginInterceptor。
 */
(function () {
    if (typeof Vue === 'undefined') {
        return; // 非浏览器环境(如 Node 下静态扫描)直接跳过
    }

    /** 内部人员角色, 与后端 DataScope.STAFF_ROLES 保持一致 */
    var STAFF_ROLES = ['ADMIN', 'STAFF'];

    function currentRole(vm) {
        var root = vm && vm.$root ? vm.$root : null;
        return root && root.user ? root.user.role : null;
    }

    Vue.mixin({
        computed: {
            /** 是否可执行物业管理操作(管理员 / 物业员工) */
            canManage: function () {
                var role = currentRole(this);
                return STAFF_ROLES.indexOf(role) >= 0;
            },
            /** 当前登录的是否为业主账号 */
            ownerAccount: function () {
                return currentRole(this) === 'OWNER';
            }
        }
    });
})();
