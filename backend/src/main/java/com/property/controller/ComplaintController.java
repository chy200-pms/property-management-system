package com.property.controller;

import com.property.common.DataScope;
import com.property.common.PageResult;
import com.property.common.Result;
import com.property.config.LoginInterceptor;
import com.property.entity.Complaint;
import com.property.entity.Owner;
import com.property.entity.SysUser;
import com.property.service.ComplaintService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

/**
 * 投诉建议管理 接口
 */
@RestController
@RequestMapping("/complaint")
public class ComplaintController {

    @Autowired
    private ComplaintService complaintService;

    @Autowired
    private DataScope dataScope;

    /** 分页查询 GET /api/complaint/page?status=PENDING&complaintType=NOISE */
    @GetMapping("/page")
    public Result<PageResult<Complaint>> page(Complaint query,
                                              @RequestParam(defaultValue = "1") Integer pageNum,
                                              @RequestParam(defaultValue = "10") Integer pageSize) {
        // 业主只能看自己提交的投诉建议
        if (dataScope.isOwnerRole()) {
            Owner me = dataScope.currentOwnerProfile();
            query.setOwnerId(me.getId());
        }
        return Result.ok(complaintService.page(query, pageNum, pageSize));
    }

    /** 详情 GET /api/complaint/1 */
    @GetMapping("/{id}")
    public Result<Complaint> detail(@PathVariable Long id) {
        Complaint complaint = complaintService.getById(id);
        dataScope.checkOwnerId(complaint.getOwnerId());
        return Result.ok(complaint);
    }

    /** 提交投诉/建议 POST /api/complaint */
    @PostMapping
    public Result<Void> add(@RequestBody Complaint complaint) {
        // 业主提交时强制挂到自己名下
        if (dataScope.isOwnerRole()) {
            Owner me = dataScope.currentOwnerProfile();
            complaint.setOwnerId(me.getId());
            complaint.setOwnerName(me.getName());
        }
        complaintService.save(complaint);
        return Result.ok("已收到您的反馈, 物业会尽快处理", null);
    }

    /** 修改 PUT /api/complaint */
    @PutMapping
    public Result<Void> update(@RequestBody Complaint complaint) {
        dataScope.denyOwnerWrite("修改投诉记录");
        complaintService.update(complaint);
        return Result.ok("已更新", null);
    }

    /** 删除 DELETE /api/complaint/1 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        dataScope.denyOwnerWrite("删除投诉记录");
        complaintService.remove(id);
        return Result.ok("删除成功", null);
    }

    /**
     * 受理并回复
     * POST /api/complaint/reply?id=1&reply=已处理&resolved=true
     */
    @PostMapping("/reply")
    public Result<Map<String, Object>> reply(@RequestParam Long id,
                                             @RequestParam String reply,
                                             @RequestParam(defaultValue = "true") boolean resolved) {
        dataScope.denyOwnerWrite("受理投诉");
        SysUser user = LoginInterceptor.getCurrentUser();
        Map<String, Object> data = complaintService.reply(id,
                user == null ? "物业客服" : user.getRealName(), reply, resolved);
        return Result.ok((String) data.get("message"), data);
    }

    /** 状态统计 GET /api/complaint/statistics/status */
    @GetMapping("/statistics/status")
    public Result<List<Map<String, Object>>> statusStatistics() {
        return Result.ok(complaintService.countGroupByStatus());
    }

    /** 类型统计 GET /api/complaint/statistics/type */
    @GetMapping("/statistics/type")
    public Result<List<Map<String, Object>>> typeStatistics() {
        return Result.ok(complaintService.countGroupByType());
    }
}
