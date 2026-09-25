package com.property.mapper;

import com.property.entity.SysUser;
import org.apache.ibatis.annotations.Delete;
import org.apache.ibatis.annotations.Insert;
import org.apache.ibatis.annotations.Mapper;
import org.apache.ibatis.annotations.Options;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Select;
import org.apache.ibatis.annotations.Update;

import java.util.Date;
import java.util.List;

/**
 * 系统用户 Mapper
 * <p>
 * 此处演示 MyBatis 注解式写法(与 XML 方式并存), 适合简单 SQL。
 */
@Mapper
public interface SysUserMapper {

    /** 按账号查询(登录用) */
    @Select("SELECT * FROM sys_user WHERE username = #{username} LIMIT 1")
    SysUser selectByUsername(@Param("username") String username);

    @Select("SELECT * FROM sys_user WHERE id = #{id}")
    SysUser selectById(@Param("id") Long id);

    /**
     * 按 ID 查询「会话用」用户信息 —— 刻意不查 password 列。
     * <p>每个请求都要按令牌里的用户ID回查最新角色/状态(改角色、禁用要立刻生效),
     * 因此这条 SQL 会频繁执行: 少取一列, 也保证密码哈希不会在内存里到处流转。
     */
    @Select("""
            SELECT id, username, real_name, phone, role, avatar, status,
                   token_version, last_login, create_time
            FROM sys_user WHERE id = #{id}
            """)
    SysUser selectForSession(@Param("id") Long id);

    /**
     * 令牌版本 +1: 使该账号所有已签发的令牌立即失效。
     * <p>修改密码、禁用账号时调用。
     */
    @Update("UPDATE sys_user SET token_version = token_version + 1 WHERE id = #{id}")
    int bumpTokenVersion(@Param("id") Long id);

    /** 用户列表(支持关键字与角色过滤) */
    @Select("""
            <script>
            SELECT id, username, real_name, phone, role, avatar, status, last_login, create_time
            FROM sys_user
            <where>
              <if test="keyword != null and keyword != ''">
                AND (username LIKE CONCAT('%', #{keyword}, '%')
                     OR real_name LIKE CONCAT('%', #{keyword}, '%')
                     OR phone LIKE CONCAT('%', #{keyword}, '%'))
              </if>
              <if test="role != null and role != ''">AND role = #{role}</if>
            </where>
            ORDER BY id
            </script>
            """)
    List<SysUser> selectList(@Param("keyword") String keyword, @Param("role") String role);

    @Update("UPDATE sys_user SET last_login = #{lastLogin} WHERE id = #{id}")
    int updateLastLogin(@Param("id") Long id, @Param("lastLogin") Date lastLogin);

    /** 单独更新密码(入参必须已是 BCrypt 密文) */
    @Update("UPDATE sys_user SET password = #{password} WHERE id = #{id}")
    int updatePassword(@Param("id") Long id, @Param("password") String password);

    @Select("SELECT COUNT(*) FROM sys_user")
    long countAll();

    /**
     * 统计除某个账号外、还占用同一手机号的账号数。
     * <p>
     * 手机号是「登录账号 sys_user ↔ 人员档案 owner」的关联键(见 DataScope),
     * 若一个号码被多个账号占用, 会静默命中同一条档案, 导致看到别人房间的数据,
     * 因此新增/修改账号时用本方法做唯一性兜底。
     */
    @Select("SELECT COUNT(*) FROM sys_user WHERE phone = #{phone} AND (#{id} IS NULL OR id <> #{id})")
    long countByPhoneExcluding(@Param("phone") String phone, @Param("id") Long id);

    @Select("""
            <script>
            INSERT INTO sys_user (username, password, real_name, phone, role, status)
            VALUES (#{username}, #{password}, #{realName}, #{phone}, #{role}, #{status})
            </script>
            """)
    @org.apache.ibatis.annotations.Options(useGeneratedKeys = true, keyProperty = "id")
    int insert(SysUser user);

    @Update("""
            <script>
            UPDATE sys_user
            <set>
              <if test="realName != null">real_name = #{realName},</if>
              <if test="phone != null">phone = #{phone},</if>
              <if test="role != null">role = #{role},</if>
              <if test="status != null">status = #{status},</if>
              <if test="password != null and password != ''">password = #{password},</if>
            </set>
            WHERE id = #{id}
            </script>
            """)
    int updateById(SysUser user);

    @Update("DELETE FROM sys_user WHERE id = #{id}")
    int deleteById(@Param("id") Long id);
}
