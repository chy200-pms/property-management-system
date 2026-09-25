package com.property.controller;

import com.property.common.BusinessException;
import com.property.common.DataScope;
import com.property.common.PageResult;
import com.property.common.Result;
import com.property.entity.Owner;
import com.property.service.OwnerService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 人员信息管理 接口(业主 / 租户 / 家庭成员)
 */
@RestController
@RequestMapping("/owner")
public class OwnerController {

    @Autowired
    private OwnerService ownerService;

    @Autowired
    private DataScope dataScope;

    /** 分页查询 GET /api/owner/page */
    @GetMapping("/page")
    public Result<PageResult<Owner>> page(Owner query,
                                          @RequestParam(defaultValue = "1") Integer pageNum,
                                          @RequestParam(defaultValue = "10") Integer pageSize) {
        // 业主只能看自己(及同房间家人)的档案
        if (dataScope.isOwnerRole()) {
            Owner me = dataScope.currentOwnerProfile();
            query.setHouseId(me.getHouseId());
        }
        return Result.ok(ownerService.page(query, pageNum, pageSize));
    }

    /** 全部人员 GET /api/owner/list */
    @GetMapping("/list")
    public Result<List<Owner>> list(Owner query) {
        if (dataScope.isOwnerRole()) {
            Owner me = dataScope.currentOwnerProfile();
            query.setHouseId(me.getHouseId());
        }
        return Result.ok(ownerService.list(query));
    }

    /** 详情 GET /api/owner/1 */
    @GetMapping("/{id}")
    public Result<Owner> detail(@PathVariable Long id) {
        Owner owner = ownerService.getById(id);
        dataScope.checkHouseId(owner.getHouseId());
        return Result.ok(owner);
    }

    /** 录入人员信息 POST /api/owner */
    @PostMapping
    public Result<Void> add(@RequestBody Owner owner) {
        dataScope.denyOwnerWrite("录入人员信息");
        ownerService.save(owner);
        return Result.ok("人员信息录入成功", null);
    }

    /**
     * 修改 PUT /api/owner
     * <p>
     * 分两种口径(看登录的是什么账号):
     * <ul>
     *   <li>物业(ADMIN/STAFF): 可修改任意人员的档案;</li>
     *   <li>业主(OWNER): <b>只能修改自己那一条</b>, 且仅限姓名/性别/电话/车牌/紧急联系人
     *       等联系方式类字段。所属房屋、人员类型、身份证号等关键字段会被忽略,
     *       否则业主可以把自己挪到别人房间或改变身份, 绕过数据隔离。</li>
     * </ul>
     */
    @PutMapping
    public Result<Void> update(@RequestBody Owner owner) {
        if (dataScope.isOwnerRole()) {
            Owner me = dataScope.currentOwnerProfile();
            if (owner.getId() == null || !owner.getId().equals(me.getId())) {
                throw new BusinessException("只能修改自己的信息, 如需变更他人档案请联系物业");
            }
            ownerService.updateSelf(owner, me, dataScope.currentUserId());
            return Result.ok("个人信息已更新", null);
        }
        dataScope.requireStaff("修改人员信息");
        ownerService.update(owner);
        return Result.ok("人员信息已更新", null);
    }

    /** 删除 DELETE /api/owner/1 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        dataScope.denyOwnerWrite("删除人员信息");
        ownerService.remove(id);
        return Result.ok("删除成功", null);
    }

    /** 按人员类型统计 GET /api/owner/statistics */
    @GetMapping("/statistics")
    public Result<List<Map<String, Object>>> statistics() {
        return Result.ok(ownerService.countGroupByType());
    }
}
