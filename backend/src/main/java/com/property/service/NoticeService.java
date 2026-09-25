package com.property.service;

import com.property.common.BaseService;
import com.property.common.BusinessException;
import com.property.entity.Notice;
import com.property.mapper.NoticeMapper;
import org.springframework.stereotype.Service;

import java.util.Date;

/**
 * 通知公告 业务
 */
@Service
public class NoticeService extends BaseService<NoticeMapper, Notice> {

    @Override
    public int save(Notice entity) {
        if (entity.getTitle() == null || entity.getTitle().trim().isEmpty()) {
            throw new BusinessException("请填写公告标题");
        }
        if (entity.getContent() == null || entity.getContent().trim().isEmpty()) {
            throw new BusinessException("请填写公告内容");
        }
        if (entity.getNoticeType() == null) {
            entity.setNoticeType("NOTIFY");
        }
        if (entity.getPublishTime() == null) {
            entity.setPublishTime(new Date());
        }
        if (entity.getTopFlag() == null) {
            entity.setTopFlag(0);
        }
        if (entity.getStatus() == null) {
            entity.setStatus(1);
        }
        if (entity.getViewCount() == null) {
            entity.setViewCount(0);
        }
        return baseMapper.insert(entity);
    }

    /** 阅读公告(阅读量+1) */
    public Notice read(Long id) {
        Notice notice = baseMapper.selectById(id);
        if (notice == null) {
            throw new BusinessException("公告不存在");
        }
        baseMapper.increaseViewCount(id);
        notice.setViewCount((notice.getViewCount() == null ? 0 : notice.getViewCount()) + 1);
        return notice;
    }
}
