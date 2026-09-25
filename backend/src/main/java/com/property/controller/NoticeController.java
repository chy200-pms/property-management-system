package com.property.controller;

import com.property.common.DataScope;
import com.property.common.PageResult;
import com.property.common.Result;
import com.property.entity.Notice;
import com.property.service.NoticeService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.web.bind.annotation.*;

/**
 * 通知公告管理 接口
 * <p>公告面向全体住户, 查看开放; 发布/修改/删除仅 ADMIN/STAFF 可执行。
 */
@RestController
@RequestMapping("/notice")
public class NoticeController {

    @Autowired
    private NoticeService noticeService;

    @Autowired
    private DataScope dataScope;

    /** 分页查询 GET /api/notice/page?noticeType=URGENT */
    @GetMapping("/page")
    public Result<PageResult<Notice>> page(Notice query,
                                           @RequestParam(defaultValue = "1") Integer pageNum,
                                           @RequestParam(defaultValue = "10") Integer pageSize) {
        return Result.ok(noticeService.page(query, pageNum, pageSize));
    }

    /** 不分页查询(用于下拉选择/首页展示) GET /api/notice/list */
    @GetMapping("/list")
    public Result<java.util.List<Notice>> list(Notice query) {
        return Result.ok(noticeService.list(query));
    }

    /** 详情(阅读量+1) GET /api/notice/1 */
    @GetMapping("/{id}")
    public Result<Notice> detail(@PathVariable Long id) {
        return Result.ok(noticeService.read(id));
    }

    /** 发布公告 POST /api/notice */
    @PostMapping
    public Result<Void> add(@RequestBody Notice notice) {
        dataScope.requireStaff("发布公告");
        noticeService.save(notice);
        return Result.ok("公告发布成功", null);
    }

    /** 修改 PUT /api/notice */
    @PutMapping
    public Result<Void> update(@RequestBody Notice notice) {
        dataScope.requireStaff("修改公告");
        noticeService.update(notice);
        return Result.ok("公告已更新", null);
    }

    /** 删除 DELETE /api/notice/1 */
    @DeleteMapping("/{id}")
    public Result<Void> delete(@PathVariable Long id) {
        dataScope.requireStaff("删除公告");
        noticeService.remove(id);
        return Result.ok("删除成功", null);
    }
}
