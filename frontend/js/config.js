/**
 * 全局配置
 *
 * 关于 baseURL（后端接口地址）：
 *   这里刻意不写死地址，而是根据"当前是怎么访问页面的"自动推导，
 *   因为同一份代码要同时支持两种部署形态：
 *
 *   形态 A —— 本机 / 局域网（前端 9000、后端 8080 分开）
 *     别人用 http://192.168.1.x:9000 打开页面时，接口必须打到 192.168.1.x:8080；
 *     若写死 localhost，对方浏览器会去连他自己电脑的 8080，必然失败。
 *     → 推导结果 http://<当前host>:8080/api
 *
 *   形态 B —— 服务器部署（前端与后端同域，由 Nginx 把 /api 反向代理到后端）
 *     判据是「主机名不是 localhost/127.0.0.1，且走标准 Web 端口 80/443」。
 *     这两个条件同时满足，才说明前面确实有一层反向代理。
 *     好处：可上 HTTPS、不必对外暴露 8080、同源无跨域问题。
 *     → 推导结果 https://域名/api
 *
 *   手动覆盖（在页面里或浏览器控制台先设置即可）：
 *     window.PMS_API_PORT = 9090                          // 后端换了端口(形态 A)
 *     window.PMS_API_BASE = 'http://10.0.0.8:8080/api'    // 直接指定完整地址(任意形态)
 */
(function () {
    var API_PORT = window.PMS_API_PORT || 8080;

    // 以 file:// 方式直接双击打开时没有 hostname，退回家用 localhost。
    // 另外这里必须容忍"没有 location 的运行环境"(例如 Node 里直接 require 本文件做单测),
    // 否则会抛 ReferenceError: location is not defined。
    var loc = (typeof location !== 'undefined') ? location : null;
    var host = 'localhost';
    if (loc && loc.protocol !== 'file:' && loc.hostname) {
        host = loc.hostname;
    }

    // 「部署在真实主机上、且走标准 Web 端口访问」才是同域反代的特征。
    // 本机(localhost / 127.0.0.1)刻意不走同域：开发时前端 9000、后端 8080 是分开的，
    // 而且用 localhost:80 访问并不能说明前面配了反向代理（可能就是直接起了个静态服务）。
    var isLocalHost = host === 'localhost' || host === '127.0.0.1' || host === '::1';
    var isStandardWebPort = !!loc && loc.protocol !== 'file:' &&
        (loc.port === '' || loc.port === '80' || loc.port === '443');

    var autoBase = (isStandardWebPort && !isLocalHost)
        // 形态 B：服务器部署，同域 /api（用 hostname 而非 host，显式 :443/:80 时不会拼出冗余端口）
        ? (loc.protocol + '//' + loc.hostname + '/api')
        // 形态 A：本机 / 局域网，直连后端端口
        : ('http://' + host + ':' + API_PORT + '/api');

    window.AppConfig = {
        /** 后端接口基础地址(与 application.yml 中 context-path 一致) */
        baseURL: window.PMS_API_BASE || autoBase,

        /** 请求超时(毫秒) */
        timeout: 8000,

        /**
         * 演示模式总开关(业务要求: 前端只连真实后端, 不使用内置演示数据)
         *   false(默认) -> 只请求真实后端。后端不可用时直接报错提示,
         *                  绝不悄悄降级为 mock 数据(避免"看着能用其实没落库")。
         *   true        -> 后端不可用时自动降级为内置演示数据。
         *                  仅用于离线演示/自动化测试, 通过代码显式打开。
         */
        allowDemo: false,

        /** 运行时演示标记(由 DemoMode 维护, 请勿手工修改) */
        demo: false,

        /** 项目信息 */
        appName: '物业管理系统',
        community: '阳光家园'
    };

    /**
     * 演示模式开关
     * 当 AppConfig.allowDemo 为 false 时, 本开关一律为"关":
     * enable() 无效、isOn() 恒为 false, 从而保证前端只走真实后端。
     */
    window.DemoMode = {
        /** @returns {boolean} 是否真的切换成功 */
        enable() {
            if (!AppConfig.allowDemo) return false;
            AppConfig.demo = true;
            localStorage.setItem('pms_demo', '1');
            return true;
        },
        disable() {
            AppConfig.demo = false;
            localStorage.removeItem('pms_demo');
        },
        isOn() {
            if (!AppConfig.allowDemo) return false;
            if (AppConfig.demo) return true;
            return localStorage.getItem('pms_demo') === '1';
        },
        sync() {
            AppConfig.demo = AppConfig.allowDemo && localStorage.getItem('pms_demo') === '1';
        }
    };
})();
