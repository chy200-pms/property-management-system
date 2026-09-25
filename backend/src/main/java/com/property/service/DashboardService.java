package com.property.service;

import com.property.common.DataScope;
import com.property.entity.*;
import com.property.mapper.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.math.BigDecimal;
import java.math.RoundingMode;
import java.text.SimpleDateFormat;
import java.util.*;
import java.util.Calendar;

/**
 * 首页数据看板 业务
 * <p>
 * 汇总各模块的关键指标与图表数据。
 */
@Service
public class DashboardService {

    @Autowired
    private BuildingMapper buildingMapper;

    @Autowired
    private HouseMapper houseMapper;

    @Autowired
    private OwnerMapper ownerMapper;

    @Autowired
    private ParkingSpaceMapper parkingSpaceMapper;

    @Autowired
    private FeeBillMapper feeBillMapper;

    @Autowired
    private FeePaymentMapper feePaymentMapper;

    @Autowired
    private TempParkingMapper tempParkingMapper;

    @Autowired
    private RepairOrderMapper repairOrderMapper;

    @Autowired
    private ComplaintMapper complaintMapper;

    @Autowired
    private EquipmentMapper equipmentMapper;

    @Autowired
    private VisitorMapper visitorMapper;

    @Autowired
    private DataScope dataScope;

    /**
     * 首页概览指标
     * <p>
     * 业主角色只统计自己房间相关数据(房屋/家人/车位/账单/报修/投诉),
     * 避免把全小区的收费与人员汇总暴露给业主; 管理员与物业人员看全量。
     */
    public Map<String, Object> overview() {
        if (dataScope.isOwnerRole()) {
            try {
                return ownerOverview(dataScope.currentOwnerProfile());
            } catch (RuntimeException e) {
                // 账号未关联房间档案时降级为空的自有数据, 不影响看板渲染
                return emptyOverview();
            }
        }
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("scope", "ALL");

        // ---------- 房屋与人员 ----------
        long buildingCount = buildingMapper.countByQuery(new Building());
        long houseCount = houseMapper.countByQuery(new House());
        House occupiedQ = new House();
        occupiedQ.setStatus("OCCUPIED");
        long occupiedCount = houseMapper.countByQuery(occupiedQ);
        House rentedQ = new House();
        rentedQ.setStatus("RENTED");
        long rentedCount = houseMapper.countByQuery(rentedQ);
        House emptyQ = new House();
        emptyQ.setStatus("EMPTY");
        long emptyCount = houseMapper.countByQuery(emptyQ);

        long ownerTotal = ownerMapper.countByQuery(new Owner());
        Owner oq = new Owner();
        oq.setPersonType("OWNER");
        long ownerCount = ownerMapper.countByQuery(oq);
        Owner tq = new Owner();
        tq.setPersonType("TENANT");
        long tenantCount = ownerMapper.countByQuery(tq);

        data.put("buildingCount", buildingCount);
        data.put("houseCount", houseCount);
        data.put("occupiedCount", occupiedCount + rentedCount);
        data.put("emptyCount", emptyCount);
        data.put("occupancyRate", rate(occupiedCount + rentedCount, houseCount));
        data.put("ownerTotal", ownerTotal);
        data.put("ownerCount", ownerCount);
        data.put("tenantCount", tenantCount);

        // ---------- 车位 ----------
        long parkingTotal = parkingSpaceMapper.countByQuery(new ParkingSpace());
        ParkingSpace freeQ = new ParkingSpace();
        freeQ.setStatus("FREE");
        long parkingFree = parkingSpaceMapper.countByQuery(freeQ);
        long parkingUsed = parkingTotal - parkingFree;
        data.put("parkingTotal", parkingTotal);
        data.put("parkingUsed", parkingUsed);
        data.put("parkingFree", parkingFree);
        data.put("parkingUsedRate", rate(parkingUsed, parkingTotal));

        // ---------- 收费 ----------
        BigDecimal unpaid = nvl(feeBillMapper.sumUnpaidAmount());
        BigDecimal todayIncome = nvl(feePaymentMapper.sumTodayAmount());

        // 本月(当前账期)应收/实收
        String currentPeriod = currentPeriod();
        FeeBill curQ = new FeeBill();
        curQ.setPeriod(currentPeriod);
        List<FeeBill> curBills = feeBillMapper.selectList(curQ, null, null);
        BigDecimal monthReceivable = BigDecimal.ZERO;
        BigDecimal monthReceived = BigDecimal.ZERO;
        for (FeeBill b : curBills) {
            monthReceivable = monthReceivable.add(nvl(b.getAmount()));
            monthReceived = monthReceived.add(nvl(b.getPaidAmount()));
        }
        data.put("currentPeriod", currentPeriod);
        data.put("monthReceivable", monthReceivable.setScale(2, RoundingMode.HALF_UP));
        data.put("monthReceived", monthReceived.setScale(2, RoundingMode.HALF_UP));
        data.put("monthCollectRate", rate(monthReceived, monthReceivable));
        data.put("unpaidAmount", unpaid.setScale(2, RoundingMode.HALF_UP));
        data.put("todayIncome", todayIncome.setScale(2, RoundingMode.HALF_UP));
        data.put("tempParkingIncome", nvl(tempParkingMapper.sumTodayFee()).setScale(2, RoundingMode.HALF_UP));
        data.put("tempParkingInCount", (long) tempParkingMapper.listInParking().size());

        // ---------- 工单与投诉 ----------
        long repairTotal = repairOrderMapper.countByQuery(new RepairOrder());
        RepairOrder pendingR = new RepairOrder();
        pendingR.setStatus("PENDING");
        long repairPending = repairOrderMapper.countByQuery(pendingR);
        RepairOrder processingR = new RepairOrder();
        processingR.setStatus("PROCESSING");
        long repairProcessing = repairOrderMapper.countByQuery(processingR);
        RepairOrder finishedR = new RepairOrder();
        finishedR.setStatus("FINISHED");
        long repairFinished = repairOrderMapper.countByQuery(finishedR);
        RepairOrder assignedR = new RepairOrder();
        assignedR.setStatus("ASSIGNED");
        long repairAssigned = repairOrderMapper.countByQuery(assignedR);

        data.put("repairTotal", repairTotal);
        data.put("repairPending", repairPending);
        data.put("repairAssigned", repairAssigned);
        data.put("repairProcessing", repairProcessing);
        data.put("repairFinished", repairFinished);
        data.put("repairUnfinished", repairPending + repairAssigned + repairProcessing);
        data.put("repairAvgRating", nvl(repairOrderMapper.avgRating()));

        long complaintTotal = complaintMapper.countByQuery(new Complaint());
        Complaint pendingC = new Complaint();
        pendingC.setStatus("PENDING");
        long complaintPending = complaintMapper.countByQuery(pendingC);
        data.put("complaintTotal", complaintTotal);
        data.put("complaintPending", complaintPending);

        // ---------- 设备 ----------
        long equipmentTotal = equipmentMapper.countByQuery(new Equipment());
        Equipment repairEq = new Equipment();
        repairEq.setStatus("REPAIR");
        long equipmentRepair = equipmentMapper.countByQuery(repairEq);
        data.put("equipmentTotal", equipmentTotal);
        data.put("equipmentRepair", equipmentRepair);

        return data;
    }

    /**
     * 图表数据: 收费趋势 / 房屋状态 / 报修类型 / 车位使用
     */
    public Map<String, Object> charts() {
        if (dataScope.isOwnerRole()) {
            try {
                return ownerCharts(dataScope.currentOwnerProfile());
            } catch (RuntimeException e) {
                return new LinkedHashMap<>();
            }
        }
        Map<String, Object> charts = new LinkedHashMap<>();
        charts.put("feeTrend", feePaymentMapper.sumGroupByMonth());
        charts.put("houseStatus", houseMapper.countGroupByStatus());
        charts.put("repairTypes", repairOrderMapper.countGroupByType());
        charts.put("parkingTypes", parkingSpaceMapper.countGroupByType());
        charts.put("payMethods", feePaymentMapper.sumGroupByMethod());
        charts.put("billPeriods", feeBillMapper.sumGroupByPeriod());
        charts.put("buildingHouse", buildingMapper.countHouseByBuilding());
        return charts;
    }

    /**
     * 待办事项列表(首页提醒)
     */
    public List<Map<String, Object>> todos() {
        if (dataScope.isOwnerRole()) {
            try {
                return ownerTodos(dataScope.currentOwnerProfile());
            } catch (RuntimeException e) {
                return new ArrayList<>();
            }
        }
        List<Map<String, Object>> list = new ArrayList<>();

        RepairOrder urgent = new RepairOrder();
        urgent.setUrgency("URGENT");
        long urgentCount = repairOrderMapper.countByQuery(urgent);
        if (urgentCount > 0) {
            list.add(todo("urgent", "紧急报修工单", urgentCount + " 条紧急工单待处理", "/repair"));
        }
        RepairOrder pending = new RepairOrder();
        pending.setStatus("PENDING");
        long pendingCount = repairOrderMapper.countByQuery(pending);
        if (pendingCount > 0) {
            list.add(todo("warning", "待受理工单", pendingCount + " 条报修工单待派单", "/repair"));
        }
        Complaint cp = new Complaint();
        cp.setStatus("PENDING");
        long cpCount = complaintMapper.countByQuery(cp);
        if (cpCount > 0) {
            list.add(todo("warning", "待处理投诉", cpCount + " 条投诉建议待处理", "/complaint"));
        }
        Equipment eq = new Equipment();
        eq.setStatus("REPAIR");
        long eqCount = equipmentMapper.countByQuery(eq);
        if (eqCount > 0) {
            list.add(todo("info", "设备维修中", eqCount + " 台设备处于维修状态", "/equipment"));
        }
        long inParking = tempParkingMapper.listInParking().size();
        if (inParking > 0) {
            list.add(todo("info", "在场临停车辆", inParking + " 辆临时车辆仍在场", "/tempParking"));
        }
        BigDecimal unpaid = nvl(feeBillMapper.sumUnpaidAmount());
        if (unpaid.compareTo(BigDecimal.ZERO) > 0) {
            list.add(todo("danger", "欠费待催缴", "累计欠费 " + unpaid.setScale(2, RoundingMode.HALF_UP) + " 元", "/feeBill"));
        }
        return list;
    }

    /**
     * 数据大屏 聚合数据
     * <p>
     * 与首页看板共用 overview/charts/todos(两者内部已按角色分层), 再补充大屏特有的维度。
     * <p>
     * 权限: 大屏特有的明细维度(报修状态/账单状态/投诉类型/人员构成/设备状态/临停)
     * <b>仅对管理员与物业人员下发</b>。业主只拿到与自己房间相关的数据,
     * 避免通过统计接口反推全小区经营数据。
     */
    public Map<String, Object> screen() {
        boolean owner = dataScope.isOwnerRole();

        Map<String, Object> data = new LinkedHashMap<>();
        data.put("scope", owner ? "SELF" : "ALL");
        data.put("community", "阳光家园");
        data.put("serverTime", new SimpleDateFormat("yyyy-MM-dd HH:mm:ss").format(new Date()));

        // 与首页看板同源, 保证口径完全一致
        data.put("overview", overview());
        data.put("charts", charts());
        data.put("todos", todos());

        if (owner) {
            return data;
        }

        // ---------- 以下为管理侧专属维度 ----------
        data.put("buildingHouse", buildingMapper.countHouseByBuilding());
        data.put("repairStatus", repairOrderMapper.countGroupByStatus());
        data.put("billStatus", feeBillMapper.countGroupByStatus());
        data.put("billPeriods", feeBillMapper.sumGroupByPeriod());
        data.put("complaintTypes", complaintMapper.countGroupByType());
        data.put("complaintStatus", complaintMapper.countGroupByStatus());
        data.put("personTypes", personTypePairs());
        data.put("equipmentStatus", equipmentStatusPairs());
        data.put("tempParkingTypes", tempParkingMapper.countGroupByParkType());
        return data;
    }

    /** 人员构成(业主/租户/家属分开计) */
    private List<Map<String, Object>> personTypePairs() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (String t : new String[]{"OWNER", "TENANT", "FAMILY"}) {
            Owner q = new Owner();
            q.setPersonType(t);
            out.add(pair(t, ownerMapper.countByQuery(q)));
        }
        return out;
    }

    /** 设备状态分布(公共设施, 不含个人信息) */
    private List<Map<String, Object>> equipmentStatusPairs() {
        List<Map<String, Object>> out = new ArrayList<>();
        for (String s : new String[]{"NORMAL", "REPAIR", "SCRAPPED"}) {
            Equipment q = new Equipment();
            q.setStatus(s);
            out.add(pair(s, equipmentMapper.countByQuery(q)));
        }
        return out;
    }

    // ==================================================================

    // ==================================================================
    //  业主视角: 只统计自己房间的数据
    // ==================================================================

    private Map<String, Object> emptyOverview() {
        Map<String, Object> d = new LinkedHashMap<>();
        d.put("scope", "SELF");
        for (String k : new String[]{"buildingCount", "houseCount", "occupiedCount", "emptyCount",
                "ownerTotal", "ownerCount", "tenantCount", "parkingTotal", "parkingUsed", "parkingFree",
                "repairTotal", "repairPending", "repairAssigned", "repairProcessing", "repairFinished",
                "repairUnfinished", "complaintTotal", "complaintPending"}) {
            d.put(k, 0L);
        }
        d.put("occupancyRate", "0%");
        d.put("parkingUsedRate", "0%");
        d.put("monthCollectRate", "0%");
        d.put("currentPeriod", currentPeriod());
        for (String k : new String[]{"monthReceivable", "monthReceived", "unpaidAmount", "todayIncome",
                "tempParkingIncome", "repairAvgRating"}) {
            d.put(k, BigDecimal.ZERO);
        }
        d.put("tempParkingInCount", 0L);
        return d;
    }

    /** 业主看板: 与自己房间相关的全部指标 */
    private Map<String, Object> ownerOverview(Owner me) {
        Map<String, Object> data = new LinkedHashMap<>();
        data.put("scope", "SELF");

        House hq = new House();
        hq.setId(me.getHouseId());
        List<House> houses = houseMapper.selectList(hq, null, null);
        House house = houses.isEmpty() ? null : houses.get(0);
        boolean occupied = house != null
                && ("OCCUPIED".equals(house.getStatus()) || "RENTED".equals(house.getStatus()));

        data.put("buildingCount", house == null ? 0L : 1L);
        data.put("houseCount", house == null ? 0L : 1L);
        data.put("occupiedCount", occupied ? 1L : 0L);
        data.put("emptyCount", house != null && "EMPTY".equals(house.getStatus()) ? 1L : 0L);
        data.put("occupancyRate", rate(occupied ? 1 : 0, house == null ? 0 : 1));

        // 家庭成员(同房屋内的人员档案)
        Owner famQ = new Owner();
        famQ.setHouseId(me.getHouseId());
        List<Owner> family = ownerMapper.selectList(famQ, null, null);
        long ownerCnt = 0, tenantCnt = 0;
        for (Owner o : family) {
            if ("TENANT".equals(o.getPersonType())) {
                tenantCnt++;
            } else if ("OWNER".equals(o.getPersonType())) {
                ownerCnt++;
            }
        }
        data.put("ownerTotal", (long) family.size());
        data.put("ownerCount", ownerCnt);
        data.put("tenantCount", tenantCnt);

        // 我的车位
        ParkingSpace pq = new ParkingSpace();
        pq.setOwnerId(me.getId());
        long myParking = parkingSpaceMapper.countByQuery(pq);
        data.put("parkingTotal", myParking);
        data.put("parkingUsed", myParking);
        data.put("parkingFree", 0L);
        data.put("parkingUsedRate", myParking > 0 ? "100%" : "0%");

        // 我的费用
        String currentPeriod = currentPeriod();
        FeeBill periodQ = new FeeBill();
        periodQ.setOwnerId(me.getId());
        periodQ.setPeriod(currentPeriod);
        BigDecimal receivable = BigDecimal.ZERO, received = BigDecimal.ZERO;
        for (FeeBill b : feeBillMapper.selectList(periodQ, null, null)) {
            receivable = receivable.add(nvl(b.getAmount()));
            received = received.add(nvl(b.getPaidAmount()));
        }
        // 我的欠费: 名下所有账单未缴部分
        FeeBill allQ = new FeeBill();
        allQ.setOwnerId(me.getId());
        BigDecimal unpaid = BigDecimal.ZERO;
        for (FeeBill b : feeBillMapper.selectList(allQ, null, null)) {
            BigDecimal left = nvl(b.getAmount()).subtract(nvl(b.getPaidAmount()));
            if (left.compareTo(BigDecimal.ZERO) > 0) {
                unpaid = unpaid.add(left);
            }
        }
        FeePayment payQ = new FeePayment();
        payQ.setOwnerId(me.getId());
        payQ.setBeginDate(todayStart());
        BigDecimal todayPaid = BigDecimal.ZERO;
        for (FeePayment p : feePaymentMapper.selectList(payQ, null, null)) {
            todayPaid = todayPaid.add(nvl(p.getAmount()));
        }
        data.put("currentPeriod", currentPeriod);
        data.put("monthReceivable", receivable.setScale(2, RoundingMode.HALF_UP));
        data.put("monthReceived", received.setScale(2, RoundingMode.HALF_UP));
        data.put("monthCollectRate", rate(received, receivable));
        data.put("unpaidAmount", unpaid.setScale(2, RoundingMode.HALF_UP));
        data.put("todayIncome", todayPaid.setScale(2, RoundingMode.HALF_UP));
        data.put("tempParkingIncome", BigDecimal.ZERO.setScale(2, RoundingMode.HALF_UP));

        // 我的报修
        RepairOrder rq = new RepairOrder();
        rq.setOwnerId(me.getId());
        List<RepairOrder> myRepairs = repairOrderMapper.selectList(rq, null, null);
        long rTotal = myRepairs.size(), rPending = 0, rAssigned = 0, rProcessing = 0, rFinished = 0;
        int ratingSum = 0, ratingCnt = 0;
        for (RepairOrder r : myRepairs) {
            String s = r.getStatus();
            if ("PENDING".equals(s)) rPending++;
            else if ("ASSIGNED".equals(s)) rAssigned++;
            else if ("PROCESSING".equals(s)) rProcessing++;
            else if ("FINISHED".equals(s) || "CLOSED".equals(s)) rFinished++;
            if (r.getRating() != null && r.getRating() > 0) {
                ratingSum += r.getRating();
                ratingCnt++;
            }
        }
        data.put("repairTotal", rTotal);
        data.put("repairPending", rPending);
        data.put("repairAssigned", rAssigned);
        data.put("repairProcessing", rProcessing);
        data.put("repairFinished", rFinished);
        data.put("repairUnfinished", rPending + rAssigned + rProcessing);
        data.put("repairAvgRating", ratingCnt == 0 ? BigDecimal.ZERO
                : BigDecimal.valueOf(ratingSum).divide(BigDecimal.valueOf(ratingCnt), 1, RoundingMode.HALF_UP));

        // 我的投诉
        Complaint cq = new Complaint();
        cq.setOwnerId(me.getId());
        List<Complaint> myComplaints = complaintMapper.selectList(cq, null, null);
        long cPending = 0;
        for (Complaint c : myComplaints) {
            if ("PENDING".equals(c.getStatus())) cPending++;
        }
        data.put("complaintTotal", (long) myComplaints.size());
        data.put("complaintPending", cPending);

        // 小区公共设备(非个人信息, 属公共设施信息)
        data.put("equipmentTotal", equipmentMapper.countByQuery(new Equipment()));
        Equipment repairEq = new Equipment();
        repairEq.setStatus("REPAIR");
        data.put("equipmentRepair", equipmentMapper.countByQuery(repairEq));

        // 拜访我的访客在场数量
        Visitor vq = new Visitor();
        vq.setVisitOwnerId(me.getId());
        vq.setStatus("IN");
        data.put("tempParkingInCount", visitorMapper.countByQuery(vq));

        return data;
    }

    /** 业主图表: 全部围绕自己房间 */
    private Map<String, Object> ownerCharts(Owner me) {
        Map<String, Object> charts = new LinkedHashMap<>();

        House hq = new House();
        hq.setId(me.getHouseId());
        List<House> houses = houseMapper.selectList(hq, null, null);
        if (!houses.isEmpty()) {
            House h = houses.get(0);
            charts.put("houseStatus", Collections.singletonList(
                    pair(String.valueOf(h.getStatus()), 1)));
        } else {
            charts.put("houseStatus", new ArrayList<>());
        }

        // 我的报修类型分布
        RepairOrder rq = new RepairOrder();
        rq.setOwnerId(me.getId());
        charts.put("repairTypes", groupCount(repairOrderMapper.selectList(rq, null, null), "repairType"));

        // 我的车位类型分布
        ParkingSpace pq = new ParkingSpace();
        pq.setOwnerId(me.getId());
        charts.put("parkingTypes", groupCount(parkingSpaceMapper.selectList(pq, null, null), "spaceType"));

        // 我的缴费方式分布 / 按月趋势
        FeePayment payQ = new FeePayment();
        payQ.setOwnerId(me.getId());
        List<FeePayment> pays = feePaymentMapper.selectList(payQ, null, null);
        Map<String, BigDecimal> byMethod = new LinkedHashMap<>();
        Map<String, BigDecimal> byMonth = new LinkedHashMap<>();
        for (FeePayment p : pays) {
            String m = p.getPayMethod() == null ? "其他" : p.getPayMethod();
            byMethod.put(m, nvl(byMethod.get(m)).add(nvl(p.getAmount())));
            String month = p.getPayTime() == null ? "未知" : monthOf(p.getPayTime());
            byMonth.put(month, nvl(byMonth.get(month)).add(nvl(p.getAmount())));
        }
        charts.put("payMethods", toPairs(byMethod));
        charts.put("feeTrend", toPairs(byMonth));

        // 我的账单按账期汇总
        FeeBill bq = new FeeBill();
        bq.setOwnerId(me.getId());
        Map<String, BigDecimal> byPeriod = new LinkedHashMap<>();
        for (FeeBill b : feeBillMapper.selectList(bq, null, null)) {
            byPeriod.put(b.getPeriod(), nvl(byPeriod.get(b.getPeriod())).add(nvl(b.getAmount())));
        }
        charts.put("billPeriods", toPairs(byPeriod));

        return charts;
    }

    /** 业主待办: 只提醒与自己相关的事项 */
    private List<Map<String, Object>> ownerTodos(Owner me) {
        List<Map<String, Object>> list = new ArrayList<>();

        FeeBill allQ = new FeeBill();
        allQ.setOwnerId(me.getId());
        BigDecimal unpaid = BigDecimal.ZERO;
        for (FeeBill b : feeBillMapper.selectList(allQ, null, null)) {
            BigDecimal left = nvl(b.getAmount()).subtract(nvl(b.getPaidAmount()));
            if (left.compareTo(BigDecimal.ZERO) > 0) {
                unpaid = unpaid.add(left);
            }
        }
        if (unpaid.compareTo(BigDecimal.ZERO) > 0) {
            list.add(todo("danger", "待缴费用",
                    "我有 " + unpaid.setScale(2, RoundingMode.HALF_UP) + " 元费用待缴纳", "/feeBill"));
        }

        RepairOrder rq = new RepairOrder();
        rq.setOwnerId(me.getId());
        int doing = 0;
        for (RepairOrder r : repairOrderMapper.selectList(rq, null, null)) {
            String s = r.getStatus();
            if ("PENDING".equals(s) || "ASSIGNED".equals(s) || "PROCESSING".equals(s)) {
                doing++;
            }
        }
        if (doing > 0) {
            list.add(todo("warning", "报修进行中", doing + " 条报修工单正在处理", "/repair"));
        }

        Complaint cq = new Complaint();
        cq.setOwnerId(me.getId());
        for (Complaint c : complaintMapper.selectList(cq, null, null)) {
            if ("PENDING".equals(c.getStatus())) {
                list.add(todo("info", "投诉处理中", "我的投诉建议正在处理", "/complaint"));
                break;
            }
        }

        Visitor vq = new Visitor();
        vq.setVisitOwnerId(me.getId());
        vq.setStatus("IN");
        long in = visitorMapper.countByQuery(vq);
        if (in > 0) {
            list.add(todo("info", "访客在场", in + " 位访客登记为在场", "/visitor"));
        }
        return list;
    }

    // ==================================================================

    private Map<String, Object> pair(String name, Object value) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("name", name);
        m.put("value", value);
        return m;
    }

    /** 按实体属性分组计数(避免为业主视角新增一堆 Mapper) */
    private List<Map<String, Object>> groupCount(List<?> list, String field) {
        Map<String, Integer> cnt = new LinkedHashMap<>();
        for (Object o : list) {
            Object v;
            try {
                String getter = "get" + Character.toUpperCase(field.charAt(0)) + field.substring(1);
                v = o.getClass().getMethod(getter).invoke(o);
            } catch (Exception e) {
                v = null;
            }
            String key = v == null ? "其他" : String.valueOf(v);
            cnt.put(key, cnt.getOrDefault(key, 0) + 1);
        }
        List<Map<String, Object>> out = new ArrayList<>();
        cnt.forEach((k, v) -> out.add(pair(k, v)));
        return out;
    }

    private List<Map<String, Object>> toPairs(Map<String, BigDecimal> map) {
        List<Map<String, Object>> out = new ArrayList<>();
        map.forEach((k, v) -> out.add(pair(k, v.setScale(2, RoundingMode.HALF_UP))));
        return out;
    }

    private String monthOf(Date d) {
        Calendar c = Calendar.getInstance();
        c.setTime(d);
        return String.format("%d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1);
    }

    private Date todayStart() {
        Calendar c = Calendar.getInstance();
        c.set(Calendar.HOUR_OF_DAY, 0);
        c.set(Calendar.MINUTE, 0);
        c.set(Calendar.SECOND, 0);
        c.set(Calendar.MILLISECOND, 0);
        return c.getTime();
    }

    private Map<String, Object> todo(String level, String title, String desc, String path) {
        Map<String, Object> m = new LinkedHashMap<>();
        m.put("level", level);
        m.put("title", title);
        m.put("desc", desc);
        m.put("path", path);
        return m;
    }

    private BigDecimal nvl(BigDecimal v) {
        return v == null ? BigDecimal.ZERO : v;
    }

    /** 计算百分比, 返回带 % 的字符串 */
    private String rate(long part, long total) {
        if (total <= 0) {
            return "0%";
        }
        BigDecimal r = BigDecimal.valueOf(part)
                .multiply(BigDecimal.valueOf(100))
                .divide(BigDecimal.valueOf(total), 1, RoundingMode.HALF_UP);
        return r + "%";
    }

    private String rate(BigDecimal part, BigDecimal total) {
        if (total == null || total.compareTo(BigDecimal.ZERO) <= 0) {
            return "0%";
        }
        BigDecimal r = part.multiply(BigDecimal.valueOf(100)).divide(total, 1, RoundingMode.HALF_UP);
        return r + "%";
    }

    private String currentPeriod() {
        Calendar c = Calendar.getInstance();
        return String.format("%d-%02d", c.get(Calendar.YEAR), c.get(Calendar.MONTH) + 1);
    }
}
