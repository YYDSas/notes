---
title: 验证工程 · AXI4Lite实战复盘
category: 验证工程
tags: [AXI4Lite, 实战, 复盘, RTLbug, 冒烟测试, 工作量]
date: 2026-10-08
---

> 用模板搭一个 AXI4-Lite 从设备 VIP 的完整过程。
> **6 个 test 全 0 mismatch 0 error，功能覆盖率 88.83%，QuestaSim 10.7c + UVM 1.1d。**
>
> 这一篇的价值不是代码，是**"如果重来我会怎么做"的顺序**。

---

## 一、规模数据

| 项 | 数字 |
| --- | --- |
| 总行数 | 1600 行（8 个 RTL/TB 文件） |
| 照抄骨架 | ~700 行 |
| 按 RTL 填 | ~900 行 |
| test 数 | 6 个（5 个单场景 + 1 个回归） |
| 编译 | Errors: 0, Warnings: 0 |
| 结果 | 全部 0 mismatch / 0 error |
| 功能覆盖率 | 88.83% |

**为什么选 AXI4-Lite 当例子**：它逼出真实工作量 ——
五通道独立握手、AW/W 可乱序到达、WSTRB 字节掩码、两类错误响应。
这些不是空壳能糊过去的。

---

## 二、★★ 我做的最正确的一个决定：先写冒烟测试

**在写任何 UVM 之前**，先写了 20 行纯 SV：

```systemverilog
// sim/axi_smoke.sv —— 不含任何 UVM
initial begin
  @(posedge aresetn);
  axi_write(12'h010, 32'h1234_5678, 4'b1111);  // 写 SCRATCH
  axi_read (12'h010);                // 读回，应该 == 12345678
  axi_read (12'h000);                // 读 ID，应该 == 414c4954
  axi_read (12'hFFF);                // 越界，rresp 应该 == 11
  axi_read (12'h00C);                // 空 FIFO，rresp=10 + DEADC0DE
  $finish;
endtask
```

**它的唯一价值是分清"RTL 错了"还是"VIP 错了"。**

### 回报

RTL 侧抓到 **3 个 bug，全部通过冒烟测试 10 分钟内定位**。
如果直接上 UVM，我会误判成"VIP 写错了"，在 UVM 里绕几小时。

### 三个 RTL bug（都是"读就近几行看不出来"的类型）

**① FIFO 指针宽度写错**

```systemverilog
// ❌ 错
reg [$clog2(FIFO_D)-1:0] fifo_wptr, fifo_rptr;   // 深度 8 时是 3 位，存不下 8
// ✅ 对
reg [$clog2(FIFO_D):0]   fifo_wptr, fifo_rptr;   // 多一位
```

> **隐蔽在哪**：只有深度是 **2 的幂**时才暴露。深度 5 或 7 时一切正常。
> 症状：`full` 永不置位，`count` 算错。

**② READY 依赖组合逻辑**

```systemverilog
// ❌ do_write 是组合逻辑(aw_hs && w_hs)，随标志变化抖动
assign awready = ~do_write;
// ✅ 用显式状态机，所有转移都在时钟沿
localparam [1:0] WR_RECV=0, WR_EXEC=1, WR_WAITB=2;
assign awready = (wr_state == WR_RECV);
```

> 症状：沿上毛刺 → TB 错过握手 → driver 死等 bvalid。

**③ 标志清零与执行写不同拍**

```systemverilog
// ❌ 各通道 else 分支里清标志
if (awvalid && awready) aw_hs <= 1'b1; else if (do_write) aw_hs <= 1'b0;
// ✅ "清标志 + 执行写 + 置 bvalid" 放在同一个状态分支的同一拍
WR_EXEC: begin
  /* 执行写 */ bresp <= ...;
  bvalid <= 1'b1;  aw_hs <= 1'b0;  w_hs <= 1'b0;  wr_state <= WR_WAITB;
end
```

> 原因：`do_write` 组合出的 1 落在同一拍，但赋给 `aw_hs` 的是**下一拍**的值，
> 导致下一拍 `do_write` 已变 0 而 `bvalid` 才刚置位 → 状态脱节。

**这三版改下来花了不少时间** —— 而冒烟测试第一次跑就全对（除了 FIFO 那个），
直接指出问题在 RTL 不在 VIP。

---

## 三、★★★ 7 个"不报错但结果错"的坑

这类是验证环境最危险的 —— 仿真"看起来通过"。

按隐蔽程度排序：

| # | 做了什么 | 症状 | 根因 |
| --- | --- | --- | --- |
| 1 | sequence 直接调 `intf.axi_write()` | `driven: 0 wr / 0 rd, 0 mismatches` | **验证完全空跑**，绕过 driver |
| 2 | `recv_b` 只等 `bvalid` 不等 `bready` | 单场景全绿，regress 死锁 | 握手条件写一半 |
| 3 | monitor 复位期就采集 | 报 5 条激励里没发生的读 | DUT 输出是 X |
| 4 | monitor 采样走 clocking | 12 条 `vsim-8441` + **静默采不到值** | 采了 TB 驱动侧信号 |
| 5 | `fork...join` 汇合多个 forever | 统计全 0，无任何报错 | 永远等不到 |
| 6 | 约束漏 `local::` | 写 addr=0x9 读 addr=0x0 | 恒真约束，**看着像 scoreboard 的错** |
| 7 | 影子模型场景间没重置 | 16 个假 mismatch | **看着像 RTL bug** |

### 最有教育意义的两个

**#6 —— `local::` 缺失**

```systemverilog
req.awaddr == addr;          // ❌ 解析成"item 的 awaddr 和它自己比较"= 恒真
req.awaddr == local::addr;   // ✅
```

**后果**：每次都拿到随机值，且多个 item 之间不关联。
我第一次的报错是 `[SB_NO_REF] read addr without prior write` ——
**第一反应会去查 scoreboard 的模型，而真因在 sequence 的约束里。**

**#7 —— 影子模型脏了**

```
read addr=0x10 exp=0xffffffff got=0x12345678
```

**第一反应会去查 RTL 的寄存器读出逻辑，而真因是模型没重置**：
WSTRB 场景假设"寄存器初值是 0"，但上个场景已经写过它了。

> **判据**：模型和 DUT 对不上时，**先确认两者都复位了**，再怀疑 RTL。

---

## 四、★★★ 最难的一处：复位握手

场景之间要复位 DUT，但 `aresetn` 只有 driver 一个驱动者。
我试了四种方案，三种死锁：

| 方案 | 结果 |
| --- | --- |
| test 直接 `intf.reset_if()` | 和 driver 抢驱动权 → 事务半途丢失 → 死锁 |
| interface 加 `bit rst_req` | `virtual interface` 访问不可靠 → **driver 读不到** |
| driver 加成员变量 `rst_req` | test 置了，但 driver 阻塞在 `get_next_item()` → **没人唤醒** |
| 裸调 `sequencer.start_item()` | 需要 sequence 上下文（grant 机制）→ HDL call sequence 错误 |

**正解：控制命令挂在 item 上，走 sequence 传递。**

```systemverilog
// seq_item 加字段
bit rst_hs;

// reset seq 里发一个 NOP item 作为载体
req.op = AXI_NOP;  req.rst_hs = 1'b1;

// driver 每笔前检查
if (item.rst_hs) begin item.rst_hs = 0; intf.reset_if(); end
```

**为什么 item 是唯一解**：`get_next_item()` 返回 = driver 被唤醒，
命令和唤醒用同一个动作完成。任何"旁路"机制都缺了其中一半。

---

## 五、工作量分布（真实统计）

```
interface       ████████████  30%   ← 协议封装，最花时间
monitor         ████████      25%   ← 事务边界对齐
scoreboard      ██████        20%   ← 参考模型
覆盖率          ████          10%
sequence        ███           10%
其他            ██             5%
```

**如果下次只做一次，我会把更多时间预先投到冒烟测试上** ——
它的投入产出比最高（20 行代码，换来 3 个 RTL bug 的秒级定位）。

---

## 六、★ 覆盖率结果与解读

```
功能覆盖率 88.83%

cp_op       100%  (2/2)
cp_err      100%  (4/4)   ← 三类错误都验到了
cp_strb     100%  (4/4)   ← 四种字节掩码都验到了
cp_bresp    100%  (3/3)
cp_rresp    100%  (3/3)
cp_seg       75%  (3/4)   ← 正常地址段未覆盖
cx_op_seg    50%          ← 部分 cross 组合未覆盖
```

**两个核心 coverpoint 是 `cp_err` 和 `cp_strb`** ——
它们才是 AXI VIP 覆盖率建模的价值所在。
激励里不专门构造错误场景和字节掩码，这两项就会悄悄漏掉，
而它们恰好是 bug 高发区。

**剩下 11% 我选择如实留着**，而不是删掉那些 bin 把数字凑好看。
它是"还有激励没写"的诚实记录。

---

## 七、如果重来的顺序

```
1. 读 RTL，提取 5 样东西
   （端口表 / parameter / 寄存器表 / 握手规则 / 边界与错误）

2. ★★ 写纯 SV 冒烟测试，把 DUT 跑通
   → 出问题时能立刻分清"RTL 错"还是"VIP 错"

3. defines + global_pkg（含 WSTRB 合并这类通用函数）

4. ★ interface：信号表（按"谁驱动"定方向）+ clocking + 协议 task
   → 再跑一次冒烟测试确认 DUT 没被改坏

5. seq_item（驱动侧标 rand，回读侧不标）+ agent_config

6. ★ monitor：采集与派发分离，复位后才启动

7. driver：只有 case 分支调 interface task

8. ★ scoreboard：影子模型 + new() 里预置复位态

9. coverage：按"验证点"建 bins，不是按"信号翻转次数"

10. sequence：5 类场景起手（基本/错误/掩码/流/随机）

11. base_test + 各 test，每场景 reset_dut() + scb.reset_model()
```

**跳过第 2 步的代价**：调试时间翻倍（我实测过）。

---

## 八、相关笔记

- 整体骨架（每天看这个）→ [[验证工程 · 骨架速记]]
- protocol task 怎么封 → [[验证工程 · interface与协议封装]]
- monitor 结构细节 → [[验证工程 · driver与monitor的实现要点]]
- 参考模型 → [[验证工程 · scoreboard参考模型]]
- 复位与场景编排 → [[验证工程 · test与场景编排]]