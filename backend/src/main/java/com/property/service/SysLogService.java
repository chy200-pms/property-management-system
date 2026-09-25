package com.property.service;

import com.property.common.PageResult;
import com.property.entity.SysLog;
import com.property.mapper.SysLogMapper;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Service;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

/**
 * 操作日志业务
 */
@Slf4j
@Service
public class SysLogService {

    @Autowired
    private SysLogMapper sysLogMapper;

    /** 日志保留天数, 超过则自动清理 */
    @Value("${security.oplog.keep-days:30}")
    private int keepDays;

    /**
     * 落库一条操作日志。
     * <p>写日志失败(如字段超长)不能影响主业务, 因此这里吞掉异常只打警告。
     */
    public void record(SysLog sysLog) {
        try {
            sysLogMapper.insert(sysLog);
        } catch (Exception e) {
            log.warn("写操作日志失败: {}", e.getMessage());
        }
    }

    /** 分页查询 */
    public PageResult<SysLog> page(String keyword, String module, String role, Integer status,
                                   String startTime, String endTime, Integer pageNum, Integer pageSize) {
        int num = (pageNum == null || pageNum < 1) ? 1 : pageNum;
        int size = (pageSize == null || pageSize < 1) ? 20 : Math.min(pageSize, 200);
        long total = sysLogMapper.countPage(keyword, module, role, status, startTime, endTime);
        List<SysLog> rows = total == 0 ? new ArrayList<>()
                : sysLogMapper.selectPage(keyword, module, role, status, startTime, endTime,
                (num - 1) * size, size);
        return new PageResult<>(total, rows, num, size);
    }

    /** 按 ID 查详情 */
    public SysLog getById(Long id) {
        SysLog row = sysLogMapper.selectById(id);
        if (row == null) {
            throw new com.property.common.BusinessException("日志记录不存在或已被清理");
        }
        return row;
    }

    /** 概览统计: 总量 / 今日 / 失败 / 模块分布 / 近 7 天趋势 */
    public Map<String, Object> statistics() {
        Map<String, Object> data = new LinkedHashMap<>();
        long total = sysLogMapper.countPage(null, null, null, null, null, null);
        data.put("total", total);
        data.put("today", sysLogMapper.countToday());
        data.put("byModule", sysLogMapper.countGroupByModule());
        data.put("byDay", sysLogMapper.countGroupByDay(6));
        long fail = 0;
        for (Map<String, Object> row : sysLogMapper.countGroupByStatus()) {
            Object st = row.get("status");
            if (st != null && ((Number) st).intValue() == 0) {
                fail = ((Number) row.get("value")).longValue();
            }
        }
        data.put("failCount", fail);
        return data;
    }

    /** 每天凌晨清理过期日志 */
    @Scheduled(cron = "0 30 3 * * ?")
    public void cleanExpired() {
        int removed = sysLogMapper.deleteOlderThan(keepDays);
        if (removed > 0) {
            log.info("已清理 {} 天前的操作日志 {} 条", keepDays, removed);
        }
    }
}
