package com.property.controller;

import com.property.common.DataScope;
import com.property.common.PageResult;
import com.property.common.Result;
import com.property.entity.Owner;
import com.property.entity.Visitor;
import com.property.service.VisitorService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

/**
 * 访客登记管理 接口
 */
@RestController
@RequestMapping("/visitor")
public class VisitorController {

    @Autowired
    private VisitorService visitorService;

    @Autowired
    private DataScope dataScope;

    /** 分页查询 GET /api/visitor/page?status=IN */
    @GetMapping("/page")
    public Result<PageResult<Visitor>> page(Visitor query,
                                            @RequestParam(defaultValue = "1") Integer pageNum,
                                            @RequestParam(defaultValue = "10") Integer pageSize) {
        // 业主只能看拜访自己家的访客
        if (dataScope.isOwnerRole()) {
            Owner me = dataScope.currentOwnerProfile();
            query.setVisitOwnerId(me.getId());
        }
        return Result.ok(visitorService.page(query, pageNum, pageSize));
    }

    /** 详情 GET /api/visitor/1 */
    @GetMapping("/{id}")
    public Result<Visitor> detail(@PathVariable Long id) {
        Visitor visitor = visitorService.getById(id);
        dataScope.checkOwnerId(visitor.getVisitOwnerId());
        return Result.ok(visitor);
    }

    /** 登记访客 POST /api/visitor */
    @PostMapping
    public Result<Void> add(@RequestBody Visitor visitor) {
        // 业主登记访客时, 强制登记为拜访自己家
        if (dataScope.isOwnerRole()) {
            Owner me = dataScope.currentOwnerProfile();
            visitor.setVisitOwnerId(me.getId());
            visitor.setVisitOwner(me.getName());
        }
        visitorService.save(visitor);
        return Result.ok("访客登记成功", null);
    }

    /** 修改 PUT /api/visitor */
    @PutMapping
    public Result<Void> update(@RequestBody Visitor visitor) {
        dataScope.denyOwnerWrite("修改访客记录");
        visitorService.update(visitor);
        return Result.ok("已更新", null);
    }

    /** 删除 DELETE /api/visitor/1 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        dataScope.denyOwnerWrite("删除访客记录");
        visitorService.remove(id);
        return Result.ok("删除成功", null);
    }

    /**
     * 访客离开登记
     * POST /api/visitor/leave?id=1
     */
    @PostMapping("/leave")
    public Result<Map<String, Object>> leave(@RequestParam Long id) {
        // 业主可以登记拜访自己家的访客离开
        dataScope.checkOwnerId(visitorService.getById(id).getVisitOwnerId());
        Map<String, Object> data = visitorService.leave(id);
        return Result.ok((String) data.get("message"), data);
    }
}
