package com.property.common;

import com.property.config.LoginInterceptor;
import com.property.entity.Owner;
import com.property.entity.SysUser;
import com.property.mapper.OwnerMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Component;

/**
 * 数据权限范围
 * <p>
 * 角色为 OWNER(业主)的登录账号, 只能查看/操作自己房间相关的数据;
 * 管理员与物业人员不受限制。
 * <p>
 * 关联方式: 登录账号 sys_user.phone ↔ 人员档案 owner.phone,
 * 由档案得到 ownerId / houseId, 作为各模块查询的强制过滤条件。
 * <p>
 * 写操作口径(重要):
 * <ul>
 *   <li><b>管理类写操作</b>(楼栋/设备/收费标准/公告/车位/账单... 由物业维护的数据)
 *       —— 只允许 ADMIN / STAFF, 统一调用 {@link #requireStaff(String)}。
 *       这里刻意用<b>白名单</b>而不是"只拦业主", 将来新增角色(如租户账号)也不会漏网。</li>
 *   <li><b>本人的事务</b>(报修、投诉、访客登记, 以及修改自己的档案)
 *       —— 业主可写, 但必须落在自己身上, 用 {@link #checkOwnerId(Long)} 校验归属。</li>
 * </ul>
 */
@Component
public class DataScope {

    /** 内部人员角色: 可执行管理类写操作 */
    private static final java.util.Set<String> STAFF_ROLES = java.util.Set.of("ADMIN", "STAFF");

    @Autowired
    private OwnerMapper ownerMapper;

    /** 当前登录用户是否为业主(需要数据隔离) */
    public boolean isOwnerRole() {
        SysUser user = LoginInterceptor.getCurrentUser();
        return user != null && "OWNER".equals(user.getRole());
    }

    /**
     * 当前登录用户是否为内部人员(管理员 / 物业员工)。
     * <p>未登录一定返回 false, 因此本方法同时充当"已登录且是内部人员"的判断。
     */
    public boolean isStaffRole() {
        SysUser user = LoginInterceptor.getCurrentUser();
        return user != null && user.getRole() != null && STAFF_ROLES.contains(user.getRole());
    }

    /**
     * 解析当前业主账号对应的人员档案。
     * 非业主角色返回 null; 业主账号未关联到档案时抛业务异常。
     */
    public Owner currentOwnerProfile() {
        SysUser user = LoginInterceptor.getCurrentUser();
        if (user == null || !"OWNER".equals(user.getRole())) {
            return null;
        }
        if (user.getPhone() == null || user.getPhone().isEmpty()) {
            throw new BusinessException("当前业主账号未登记手机号, 无法关联房间信息, 请联系物业");
        }
        Owner owner = ownerMapper.selectByPhone(user.getPhone());
        if (owner == null || owner.getHouseId() == null) {
            throw new BusinessException("当前账号未关联到房间档案, 请联系物业录入人员信息");
        }
        return owner;
    }

    /**
     * 校验某条记录是否属于当前业主(按 ownerId 比对)。
     * 非业主角色直接放行; 业主角色下记录不属于自己时抛业务异常。
     */
    public void checkOwnerId(Long recordOwnerId) {
        if (!isOwnerRole()) {
            return;
        }
        Owner me = currentOwnerProfile();
        if (recordOwnerId == null || !recordOwnerId.equals(me.getId())) {
            throw new BusinessException("无权查看他人的信息");
        }
    }

    /** 校验房屋是否属于当前业主 */
    public void checkHouseId(Long recordHouseId) {
        if (!isOwnerRole()) {
            return;
        }
        Owner me = currentOwnerProfile();
        if (recordHouseId == null || !recordHouseId.equals(me.getHouseId())) {
            throw new BusinessException("无权查看其他房间的信息");
        }
    }

    /**
     * 要求当前账号具备内部人员身份(管理员 / 物业员工), 否则拒绝。
     * <p>所有"管理类写操作"的入口都必须先过这一关, 包括新增/修改/删除与各类办理动作。
     *
     * @param action 被拒绝时提示的操作名, 例如 "修改楼栋信息"
     */
    public void requireStaff(String action) {
        if (!isStaffRole()) {
            throw new BusinessException("当前账号无权" + action + ", 如需办理请联系物业");
        }
    }

    /**
     * 业主角色下禁止执行管理类写操作。
     * <p>与 {@link #requireStaff(String)} 同义, 保留旧方法名以兼容既有调用点;
     * 实际拦截范围已放宽为"非 ADMIN/STAFF 一律拒绝", 不再只针对业主。
     */
    public void denyOwnerWrite(String action) {
        requireStaff(action);
    }

    /** 当前登录用户 ID(未登录返回 null) */
    public Long currentUserId() {
        SysUser user = LoginInterceptor.getCurrentUser();
        return user == null ? null : user.getId();
    }
}
