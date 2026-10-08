---
title: 验证工程 · interface与协议封装
category: 验证工程
tags: [interface, clocking, 协议task, 封装, TB驱动, DUT驱动]
date: 2026-10-08
---

> [[验证工程 · 骨架速记]] 里说 interface 占 30% 工作量。这一篇是它的展开。
> **核心结论：driver 里出现 `@(cb)` 和 `if`，就说明封装失败了。**

---

## 一、★★★ 第一铁律：方向看"谁驱动"，不照抄 RTL 端口

这是 interface 最容易错的地方，而且错了**报错信息完全指不到真正原因**。

### 判据

问自己一个问题：**这个信号是谁产生的？**

| 谁产生 | interface 里写 | 例（AXI4-Lite 从设备） |
| --- | --- | --- |
| TB | `logic` | `awvalid` `awaddr` `wdata` `wstrb` `arvalid` `bready` `rready` |
| DUT | `wire` | `awready` `wready` `bvalid` `bresp` `rvalid` `rdata` |

### 为什么不能照抄 RTL 端口

`rd_en` 在 AXI4-Lite 从设备 RTL 里是**输入**（从设备要读数据），
但对 TB 来说它是 **stimulus**（我要发起一次读）。

> 实测踩过：照抄 RTL 写成 `wire rd_en`，然后 `reset_if()` 里给它赋值 →
> `vlog-2110 Illegal reference to net`。
> 而报错在 interface 里，第一反应会以为是 clocking 写错了。

### 记忆口诀

> **驱动侧一律 `logic`，被采样侧一律 `wire`。**
> 驱动侧 = 我要送出去的；被采样侧 = 我要收回来的。

---

## 二、clocking 块的三条硬规矩

```systemverilog
clocking cb @(posedge aclk);
  default input #1step output #1ns;

  output awvalid;      // ★ 只写信号名
  output awaddr;       //   绝不能写 output [`DATA_W-1:0] awaddr;
  output wvalid;       //   否则 vlog-13069 near "["
  output bready;
  input  awready;      // DUT 驱动
  input  bvalid;
endclocking
```

| 规矩 | 违反后果 |
| --- | --- |
| ★ **绝不能写宽度** | `vlog-13069` |
| ★ **方向必须与顶层声明一致** | 顶层 `logic` + clocking `input` → `vlog-2224 Clocking block input xx not legal for the LHS` |
| ★ **被引用的信号必须先声明** | clocking 在前、声明在后 → `vlog-2143 Unable to find 'xx'` |

`#1step` / `#1ns` 的作用：`output #1ns` 把驱动推迟到 posedge+1ns，消除竞争窗口。
**不要随意改成 0** —— 竞争不一定产生错误结果，但标准不保证顺序。

---

## 三、★★★ 第三铁律：采样时，TB 驱动侧不能走 clocking

这条单独立出来，因为它是**静默失效**的。

```systemverilog
// ❌ 错：monitor 里这样写
if (intf.cb.awvalid && intf.cb.awready)      // awvalid 是 output，不能采样
  → 12 条 vsim-8441 Clocking block output not legal in this context
  → 而且不中断仿真，只是采不到值
  → monitor 一个 item 都不发，scoreboard 统计全 0

// ✅ 对：按方向分开处理
if (intf.awvalid && intf.cb.awready)        // TB 驱动侧直接读接口信号
  m_awaddr <= intf.awaddr;                   //   被采样侧才走 cb
```

**规则复述一遍：**

| 采样什么 | 怎么采 |
| --- | --- |
| TB 驱动的（VALID / ADDR / DATA / STRB / READY 由 TB 发） | 直接读 `intf.xxx` |
| DUT 驱动的（READY / VALID / DATA / RESP 由 DUT 发） | 走 `intf.cb.xxx` |

在 clocking 里声明的 `output`，只能被"驱动"，不能被"读取"。

---

## 四、★★★★ 协议 task：VIP 最值钱的部分

### 为什么必须封在这里

```systemverilog
// ✗ 波形逻辑散在 driver 里
task drive_write(item);
  cb.awaddr <= item.awaddr; cb.awvalid <= 1;
  forever @(cb); if (cb.awready) break;
  cb.awvalid <= 0;
  cb.wdata <= item.wdata;  cb.wstrb <= item.wstrb; cb.wvalid <= 1;
  forever @(cb); if (cb.wready) break;
  cb.wvalid <= 0;
  cb.bready <= 1;
  forever @(cb); if (cb.bvalid) break;
  cb.bready <= 0;
endtask

// ✓ driver 里只剩两行
task drive_item(item);
  intf.axi_write(item.awaddr, item.wdata, item.wstrb, item.bresp);
endtask
```

**收益不只是代码短**：
- 改协议时序只改 interface 一处
- driver 只关心"发什么激励"，不关心"怎么打时序"
- 波形一眼能看懂，方便 debug

### 标准写法（背这个骨架）

```systemverilog
// ---------- 单通道握手 ----------
task automatic send_aw(input bit [`ADDR_W-1:0] addr, input bit [2:0] prot = 3'b000);
  cb.awaddr  <= addr;
  cb.awprot  <= prot;
  cb.awvalid <= 1'b1;
  forever begin
    @(cb);
    if (cb.awready) break;          // ★ 握手条件 = valid && ready
  end
  cb.awvalid <= 1'b0;
endtask

// ---------- 组合事务：driver 只调这三个 ----------
task automatic axi_write(input bit [`ADDR_W-1:0] addr,
                         input bit [`DATA_W-1:0] data,
                         input bit [`STRB_W-1:0] strb,
                         output bit [1:0] resp);
  send_aw(addr);                    // ★ 顺序发，不要 fork...join
  send_w(data, strb);
  recv_b(resp);
endtask

task automatic axi_read(input  bit [`ADDR_W-1:0] addr,
                        output bit [`DATA_W-1:0] data,
                        output bit [1:0]         resp);
  send_ar(addr);
  recv_r(data, resp);
endtask
```

### ★★ `recv_*` 必须等 `valid && ready`，且必须加超时

```systemverilog
task automatic recv_b(output bit [1:0] resp);
  int unsigned guard;
  cb.bready <= 1'b1;
  guard = 0;
  do @(cb);
  while (!(cb.bvalid && bready) && (guard++ < 1000));   // ★ 两个都等

  if (guard >= 1000)
    $display("[STUCK] recv_b timeout @%0t bvalid=%0b awready=%0b", $time, cb.bvalid, cb.awready);
  else
    resp = cb.bresp;
  cb.bready <= 1'b0;
endtask
```

**两个要点：**

| 要点 | 违反的症状 |
| --- | --- |
| 等 `valid && ready` 而不是只看 valid | 单场景全绿，**串进 regress 后死等 bvalid 到看门狗** |
| 加超时保护 | 死等时只有全局看门狗（2ms）兜底，**丢掉全部现场** |

> 超时打印要用纯 ASCII，中文在 Questa 控制台会乱码。
> interface 内部引用信号直接写名字，**不能写 `intf.xxx`**（`intf` 在 interface 内不存在 → `vopt-7063`）。

---

## 五、★★ 多通道事务：`fork...join` 是错的

AXI4-Lite 协议上确实允许 AW/W 任意顺序甚至同时，但：

```systemverilog
// ❌ 实测死锁
task automatic axi_write(...);
  fork
    send_aw(addr);
    send_w(data, strb);
  join
  recv_b(resp);
endtask
```

**症状**：`recv_b` 永久阻塞，仿真挂到看门狗（2ms），拓扑里 `num_last_reqs=1`
（driver 拿到 item 不归还）。

**原因**：两个进程同时操作同一个 clocking block，`output skew` 语义打架。

**正解**：顺序发。这正好匹配大多数从设备的握手模型：

```systemverilog
send_aw(addr);      // RTL: awready = ~busy，先收 AW
send_w(data, strb); //      下一拍 wready 仍有效，收 W
recv_b(resp);       //      两者齐 → DUT 执行写 → bvalid
```

若 DUT 支持真并发（outstanding > 1），再拆成独立 task + 计数器。

---

## 六、复位声明在这里，不要在 tb_top

```systemverilog
// interface 里
logic aresetn = 1'b1;

task automatic reset_if();
  @(cb);
  aresetn <= 1'b0;
  // 把所有 TB 驱动的信号打回空闲态
  awvalid <= 1'b0;  wvalid <= 1'b0;  arvalid <= 1'b0;
  bready  <= 1'b0;  rready  <= 1'b0;
  awaddr  <= '0;   wdata   <= '0;   wstrb <= '0;  araddr <= '0;
  repeat (5) @(cb);
  aresetn <= 1'b1;
  @(cb);
endtask
```

**★ tb_top 里不要再拉一根 `aresetn` 接给 DUT**，否则：
- 两个驱动源
- monitor 无法判断复位何时结束

正确：DUT 接 interface 的，driver 一拨全链路生效。

---

## 七、错误信息速查

| 报错 | 真正原因 |
| --- | --- |
| `vlog-2110 Illegal reference to net` | 给 `wire` 赋了值，方向判错了 |
| `vlog-13069 near "["` | clocking 里写了宽度 |
| `vlog-2143 Unable to find 'xx'` | clocking 引用了尚未声明的信号 |
| `vlog-2224 Clocking block input xx not legal for the LHS` | clocking 方向与顶层不一致 |
| `vsim-8441 Clocking block output not legal` | 采样了 TB 驱动侧（静默失效） |
| `vopt-7063 Failed to find 'intf'` | 在 interface 内部写了 `intf.xxx` |

---

## 八、相关笔记

- 整体顺序 → [[验证工程 · 骨架速记]]
- 协议 task 封装完之后 driver 写成什么样 → [[验证工程 · driver与monitor的实现要点]]
- 复位与场景切换的握手 → [[验证工程 · test与场景编排]]
- 握手机制的原理 → [[UVM · driver 与 sequence 的握手]]
- 更多静默失效实例 → [[错题本 · 索引]]