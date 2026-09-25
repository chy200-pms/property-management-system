package com.property.service;

import com.property.common.BaseService;
import com.property.common.BusinessException;
import com.property.entity.House;
import com.property.entity.Owner;
import com.property.entity.SysUser;
import com.property.mapper.HouseMapper;
import com.property.mapper.OwnerMapper;
import com.property.mapper.SysUserMapper;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;

/**
 * 人员信息(业主/租户/家庭成员)管理 业务
 */
@Service
public class OwnerService extends BaseService<OwnerMapper, Owner> {

    @Autowired
    private HouseMapper houseMapper;

    @Autowired
    private SysUserMapper sysUserMapper;

    @Override
    public int save(Owner entity) {
        if (entity.getName() == null || entity.getName().trim().isEmpty()) {
            throw new BusinessException("姓名不能为空");
        }
        if (entity.getPhone() == null || entity.getPhone().trim().isEmpty()) {
            throw new BusinessException("联系电话不能为空");
        }
        int rows = baseMapper.insert(entity);
        // 业主/租户登记后, 自动同步房屋的业主与状态
        syncHouse(entity);
        return rows;
    }

    @Override
    public int update(Owner entity) {
        int rows = baseMapper.updateById(entity);
        if (entity.getHouseId() != null || entity.getPersonType() != null) {
            Owner full = baseMapper.selectById(entity.getId());
            if (full != null) {
                syncHouse(full);
            }
        }
        return rows;
    }

    /** 同步房屋业主/状态: 业主 -> 自住, 租户 -> 出租 */
    private void syncHouse(Owner owner) {
        if (owner.getHouseId() == null) {
            return;
        }
        House house = houseMapper.selectById(owner.getHouseId());
        if (house == null) {
            return;
        }
        House update = new House();
        update.setId(owner.getHouseId());
        if ("OWNER".equals(owner.getPersonType())) {
            update.setOwnerId(owner.getId());
            update.setStatus("OCCUPIED");
        } else if ("TENANT".equals(owner.getPersonType())) {
            update.setOwnerId(owner.getId());
            update.setStatus("RENTED");
        } else {
            return;
        }
        houseMapper.updateById(update);
    }

    /**
     * 业主自助更新自己的档案。
     * <p>
     * 只接受"联系方式"类字段: 姓名、性别、电话、车牌、紧急联系人、家庭人口、备注。
     * 其余字段(所属房屋 house_id、人员类型 person_type、身份证号 id_card、
     * 入住日期 move_in_date、在住状态 status)一律忽略 ——
     * 否则业主可以把自己的档案挪到别人房间, 或把身份改成业主/租户,
     * 进而绕过 {@link com.property.common.DataScope} 的数据隔离。
     * <p>
     * 手机号是「登录账号 sys_user ↔ 人员档案 owner」的关联键, 变更时必须同步
     * sys_user.phone, 否则下次登录将关联不到档案、看不到自己的数据。
     *
     * @param input  前端提交的表单
     * @param me     当前登录账号对应的档案(由 DataScope.currentOwnerProfile() 解析)
     * @param userId 当前登录账号 ID
     */
    @Transactional(rollbackFor = Exception.class)
    public int updateSelf(Owner input, Owner me, Long userId) {
        String name = trimToNull(input.getName());
        String phone = trimToNull(input.getPhone());
        if (name == null) {
            throw new BusinessException("姓名不能为空");
        }
        if (phone == null) {
            throw new BusinessException("联系电话不能为空");
        }

        // 换号前先做双重唯一性校验, 避免档案与账号互相指向不同的房
        if (!phone.equals(me.getPhone())) {
            Owner existed = baseMapper.selectByPhone(phone);
            if (existed != null && !existed.getId().equals(me.getId())) {
                throw new BusinessException("该手机号已登记在其他住户档案上, 请更换");
            }
            if (userId != null) {
                if (sysUserMapper.countByPhoneExcluding(phone, userId) > 0) {
                    throw new BusinessException("该手机号已被其他登录账号使用, 请更换");
                }
                SysUser account = new SysUser();
                account.setId(userId);
                account.setPhone(phone);
                sysUserMapper.updateById(account);
            }
        }

        Owner patch = new Owner();
        patch.setId(me.getId());
        patch.setName(name);
        patch.setPhone(phone);
        patch.setGender(trimToNull(input.getGender()));
        patch.setFamilyCount(input.getFamilyCount());
        // 可清空字段: 传空串表示清除, 传 null 表示不修改
        patch.setCarPlate(trimOrKeep(input.getCarPlate()));
        patch.setEmergencyName(trimOrKeep(input.getEmergencyName()));
        patch.setEmergencyPhone(trimOrKeep(input.getEmergencyPhone()));
        patch.setRemark(input.getRemark());
        return baseMapper.updateById(patch);
    }

    /** 去掉首尾空白; 空白字符串视为「未填写」(不修改) */
    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }

    /** 去掉首尾空白, 但保留空串语义(用于允许被清空的字段) */
    private static String trimOrKeep(String s) {
        return s == null ? null : s.trim();
    }

    /** 按人员类型统计 */
    public List<Map<String, Object>> countGroupByType() {
        return baseMapper.countGroupByType();
    }
}
