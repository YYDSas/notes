---
title: 验证工程 · driver与monitor的实现要点
category: 验证工程
tags: [driver, monitor, 采集, 派发, 握手, 死锁]
date: 2026-10-08
---

> [[验证工程 · 骨架速记]] 里 driver 最简单、monitor 最难。这一篇讲清两者。
> **核心：driver 只有 4 行骨架不变，monitor 必须"采集与派发分离"。**

---

## 一、driver：只有 4 行是死的

```systemverilog
virtual task run_phase(uvm_phase phase);
  axi_seq_item item;
  super.run_phase(phase);

  intf.reset_if();                       // 复位：每个 agent 一份

  // ★★★ 这四行是骨架，任何 VIP 都一样 ★★★
  forever begin
    seq_item_port.get_next_item(item);
    drive_item(item);                    // ← 唯一要动脑的地方
    drv2scb.write(item);
    seq_item_port.item_done();
  end
endtask
```

### ★ `drive_item` 有多短，取决于你在 interface 里封了多少

```systemverilog
// ✓ 封装到位：只有 case 分支
virtual task drive_item(axi_seq_item item);
  item.classify();
  case (item.op)
    AXI_WRITE: intf.axi_write(item.awaddr, item.wdata, item.wstrb, item.bresp);
    AXI_READ : intf.axi_read (item.araddr,  item.rdata, item.rresp);
    default  : ;      // NOP（复位请求）到这，什么都不做
  endcase
  drv_cnt++;
endtask
```

> **自检**：如果 driver 里出现 `@(cb)` 或 `if (!cb.xxx_ready)`，
> 说明封装失败了 —— 波形逻辑应该回 interface。

### ★★ 驱动侧的可扩展点：控制命令走 item

需要在事务之间做点事（复位、force、配置 DUT），**命令要挂在 item 上**：

```systemverilog
// seq_item 里加控制字段
bit rst_hs;        // 复位请求

// driver 里每笔前检查
if (item.rst_hs == 1'b1) begin
  rst_hs_log(item.tr_id);
  item.rst_hs = 1'b0;
  intf.reset_if();
end
```

**为什么不能走"旁路"？** 实测两种都死锁：

| 旁路方案 | 为什么失败 |
| --- | --- |
| interface 里加 `bit rst_req` | `virtual interface` 访问非 clocking 成员行为不可靠，**driver 读不到** |
| driver 加成员变量 `rst_req` | test 置了，但 driver **阻塞在 `get_next_item()`**，没人唤醒它 |

**item 是唯一"既能唤醒 driver、又能让 driver 看见"的通道** —— 因为 `get_next_item()` 返回就意味着 driver 被唤醒了。

---

## 二、monitor：★★★ 必须"采集与派发分离"

### 为什么

AXI 有 5 个**独立握手的通道**，不存在一个统一的"事务边界"可以一把抓。
我第一版写成 `fork ... join` 汇合 4 个 forever 进程：

```systemverilog
// ❌ 编译能过、仿真不报错、monitor 一个 item 都不发
forever begin
  collect_item(item);
  ap.write(item);
endtask

task collect_item(output item);
  fork
    collect_write(item);
    collect_read(item);
    record_aw();
    record_ar();
  join          // ← 4 个都是 forever，永远等不到
endtask
```

**症状**：`SB_SUMMARY driven: 0 wr / 0 rd, compared 0 items, 0 mismatches`。
**最难查的一类"假通过"** —— 不报 fatal、不中断、统计全是 0。

### ✓ 正确结构：4 个采集进程 + 1 个派发进程

```systemverilog
virtual task run_phase(uvm_phase phase);
  super.run_phase(phase);

  // ★★ 复位期间绝对不能采集 ★★
  //   复位后 DUT 输出是 X，这时采会得到一堆假 mismatch。
  //   实测症状: 激励里根本没读过 REG_ID，
  //   却报 5 条 "read REG_ID got=0x0" —— 全是复位期的幽灵事务。
  wait (intf.cb.aresetn === 1'b1);

  fork
    record_aw();      // AW/W 握手 -> 缓存
    record_ar();      // AR 握手   -> 缓存
    collect_write();  // AW+W 齐 + B 响应 -> 入队
    collect_read();   // AR 握手 + R 响应 -> 入队
    dispatch();       // ★ 唯一调用 ap.write 的地方
  join
endtask
```

**关键设计：只有 `dispatch()` 一个进程碰 `ap.write`**。
采集进程只管往队列塞 item，派发进程只管取出来发出去。

---

## 三、monitor 的三个必错点

### 必错点 1：采样方向错了（静默失效）

```systemverilog
// ❌ TB 驱动侧走 cb → 12 条 vsim-8441 + 采不到值
if (intf.cb.awvalid && intf.cb.awready)

// ✅ 按方向分开
if (intf.awvalid && intf.cb.awready)      // TB 侧直接读
  m_awaddr <= intf.awaddr;                // cb 侧只用 awready
```

详见 [[验证工程 · interface与协议封装]] 第三节。

### 必错点 2：写事务不等 B 就入队

```systemverilog
// ❌ 拿不到 bresp，scoreboard 无法判断这次写是否成功
protected task collect_write();
  forever begin
    wait (m_aw_seen && m_w_seen);
    item = ...;  item.bresp = ???;        // 没有 bresp
    wr_queue.push_back(item);             // ← 提前入队
  end
endtask

// ✅ 等 B 响应，拿到 bresp 才能确定结果
protected task collect_write();
  axi_seq_item item;
  forever begin
    wait (m_aw_seen && m_w_seen);
    do @(posedge intf.cb);
    while (!(intf.cb.bvalid && bready));  // ★ 必须等
    item = axi_seq_item::type_id::create("write_item");
    item.op    = AXI_WRITE;
    item.awaddr= m_awaddr;
    item.wdata = m_wdata;
    item.wstrb = m_wstrb;
    item.bresp = intf.cb.bresp;
    item.tr_start_time = $time;
    m_aw_seen = 1'b0;  m_w_seen = 1'b0;
    wr_queue.push_back(item);
  end
endtask
```

**原因**：AXI 的写响应 `BRESP` 才是"这次写成功没有"的唯一信息。
不等 B → 拿不到 SLVERR/DECERR → scoreboard 误判。

### 必错点 3：AW 和 W 的到达顺序不确定

AXI4-Lite 允许 AW/W **任意顺序甚至同时**。必须各用独立标志缓存：

```systemverilog
protected task record_aw();
  forever begin
    @(posedge intf.cb);
    if (intf.awvalid && intf.cb.awready) begin
      m_awaddr <= intf.awaddr;
      m_aw_seen <= 1'b1;
    end
    if (intf.wvalid && intf.cb.wready) begin
      m_wdata  <= intf.wdata;
      m_w_seen <= 1'b1;
    end
  end
endtask
```

---

## 四、dispatch：唯一发 item 的地方

```systemverilog
protected axi_seq_item wr_queue[$];
protected axi_seq_item rd_queue[$];

protected task dispatch();
  axi_seq_item it;
  forever begin
    wait (wr_queue.size() > 0 || rd_queue.size() > 0);

    if (wr_queue.size() > 0) it = wr_queue.pop_front();
    else                     it = rd_queue.pop_front();

    it.tr_id = tr_id_cnt++;      // 全环境单调递增，scoreboard 靠它对齐
    it.classify();               // 填覆盖率用的分类字段
    ap.write(it);                // -> scoreboard
    mntr2cov.write(it);          // -> coverage
  end
endtask
```

**要点：**
| 为什么 | 说明 |
| --- | --- |
| 只在 dispatch 里 `ap.write` | 保证所有 item 走同一条出口，tr_id 不会乱 |
| `tr_id` 在这里统一分配 | monitor 和 driver 各自计数会对不上 |
| 优先取写队列 | AXI 写响应先完成，符合实际时序 |

---

## 五、monitor vs driver 分工速查

| | driver | monitor |
| --- | --- | --- |
| 时钟沿 | `@(intf.cb)` | 同 |
| 采样值 | `cb.sig <= v`（驱动） | `intf.sig` 或 `intf.cb.sig`（按方向） |
| 驱动信号 | 合法 | **绝对非法** |
| 复位 | `intf.reset_if()` | **绝对不调** |
| 进程结构 | 1 个 forever | 4 采集 + 1 派发 |

---

## 六、★ 每次跑完先看这一行

```systemverilog
`uvm_info("SB_SUMMARY",
  $sformatf("driven: %0d wr / %0d rd, compared %0d items, %0d mismatches",
            wr_cnt, rd_cnt, cmp_cnt, err_cnt), UVM_NONE)
```

| 看到什么 | 说明什么 |
| --- | --- |
| `driven: 0 wr / 0 rd` | **验证空跑**，先查 driver 有没有收到 item |
| `compared` 远小于激励数 | monitor 没采到，检查采集条件 |
| `mismatches > 0` | 才轮到怀疑 RTL / 模型 |

**养成习惯**：看到 `0 mismatches` 不要立刻放心，**先确认 `driven` 和 `compared` 不是 0。**

---

## 七、相关笔记

- 整体顺序 → [[验证工程 · 骨架速记]]
- 协议 task 怎么封 → [[验证工程 · interface与协议封装]]
- 拿到 item 之后怎么建模比对 → [[验证工程 · scoreboard参考模型]]
- 握手机制原理 → [[UVM · driver 与 sequence 的握手]]
- TLM 端口怎么连 → [[UVM · TLM 通信]]