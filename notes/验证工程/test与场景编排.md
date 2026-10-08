---
title: 验证工程 · test与场景编排
category: 验证工程
tags: [test, sequence, 场景, objection, 复位握手, 回归]
date: 2026-10-08
---

> test 层看着最简单，但**新手最容易在这里卡死**。
> **核心：`run_phase` 是阻塞 task，`super.run_phase()` 会让自己死等自己。**

---

## 一、★★★ 第一坑：`super.run_phase()` 不能调

```systemverilog
virtual task run_phase(uvm_phase phase);
  axi_reg_rw_seq seq;

  // ❌ 绝对不要写
  // super.run_phase(phase);
  //
  // 症状: 仿真在 Time: 0 就 $finish，
  //        一条 [SEQ] 日志都没有，
  //        driver 报 "0 items driven" —— 看起来像"激励没跑起来"
  //
  // 原因: run_phase 是阻塞 task，它内部要等所有子进程跑完才返回。
  //       test 自己就是 run_phase 的执行者之一，
  //       在开头调 super.run_phase(phase) = 自己死等自己。

  // ✅ 正确: 一般直接不写(uvm_test 的默认实现是空的)
  //         建议显式 raise/drop objection，让 test 的存活意图明确
  phase.raise_objection(this);

  wait_reset_done();
  start_seq(seq);

  phase.drop_objection(this);
endtask
```

> ★ **对比记忆**：`super.build_phase()` 要放**最后**，
> `super.run_phase()` **根本不要写**。这两个是不同的坑，别混。

---

## 二、激励场景怎么分类

一个合格的功能验证要有 **5 类场景**。数量按"RTL 有几个需单独验的功能点"决定，通常 5~15 个。

| 类别 | 验什么 | 为什么容易漏 |
| --- | --- | --- |
| **基本读写** | 每个可读写寄存器能写能读回 | 一般不会漏 |
| **边界与错误** | 写只读 / 越界 / 空 FIFO | ★ 不专门构造就悄悄漏掉 |
| **字节掩码** | 部分字节写 | ★★ 最典型的 bug 源 |
| 连续流 | 深度、状态位、顺序 | 容易只测单个 |
| 随机压测 | corner case | ★ 才能抓到定向场景抓不到的 |

**一个实用判据**：RTL 里凡是 `if (err) / if (illegal)` 的分支，
都必须有对应的激励打到它。可以用覆盖率 `ignore_bins` 检查有没有漏。

---

## 三、★★ base_seq：把"怎么发事务"藏起来

```systemverilog
class axi_base_seq extends uvm_sequence#(axi_seq_item);
  `uvm_object_utils(axi_base_seq)

  axi_agent_config   cfg;
  virtual axi_if     intf;

  // ★★★ 公共动作：派生 seq 只写"要验什么"，不碰协议细节
  task do_write(bit [`ADDR_W-1:0] addr,
                bit [`DATA_W-1:0] data,
                bit [`STRB_W-1:0] strb,
                output bit [1:0] resp);
    axi_seq_item req;
    req = axi_seq_item::type_id::create("wr_req");
    start_item(req);
    if (!req.randomize() with {
          req.op     == AXI_WRITE;
          req.awaddr == local::addr;      // ★★★ local:: 必须加
          req.wdata  == local::data;
          req.wstrb  == local::strb;
        })
      `uvm_error("RNDFLD", "randomize() failed")
    finish_item(req);
    resp = req.bresp;
  endtask

  task do_read(bit [`ADDR_W-1:0] addr,
               output bit [`DATA_W-1:0] data,
               output bit [1:0] resp);
    // ... 同理
  endtask

  // ★ 必须有 body（即使空实现），否则启动时报 task body not found
  virtual task body();
    `uvm_info("SEQ", "base seq placeholder", UVM_LOW)
  endtask
endclass
```

### ★★★ `local::` 前缀不是可选的

```systemverilog
req.awaddr == addr;          // ❌ 解析成"item 字段和它自己比较" = 恒真约束
req.awaddr == local::addr;   // ✅ 引用外层变量
```

**实测后果**：写入 addr=0x9，紧接着读回 addr=0x0，
scoreboard 报 `read without prior write` ——
**看起来像 scoreboard 写错了，其实是约束写错了。**

### ★ sequence 不许直接调 interface

```systemverilog
// ❌ 实测: 整个验证空跑，且不报任何错
task do_write_read(addr, data, strb, ...);
  intf.axi_write(addr, data, strb, r1);   // 绕过 driver
  intf.axi_read (addr, d, r1);
endtask
// → SB_SUMMARY driven: 0 wr / 0 rd, compared 0 items, 0 mismatches

// ✅ 走 sequencer → driver
task do_write_read(addr, data, strb, ...);
  do_write(addr, data, strb, b1);
  do_read (addr, d, r1);
endtask
```

**原则：「激励由谁发出」永远只有一个答案。**

---

## 四、★★ 场景之间必须有握手，不能只靠 `#(delay)`

```systemverilog
task run_seq_chain(uvm_sequence_base seq);
  reset_dut();              // ① DUT 复位
  env_i.scb.reset_model();  // ② 影子模型也要复位 ★
  start_seq(seq);           // ③ 跑场景
  #(500ns);                 // ④ 等 DUT 把所有响应收完
endtask
```

**为什么不能只靠延时**：`#(1us)` 只保证"过了一段时间"，
**不保证 driver 已经 `item_done()`**。

> 实测症状：5 个场景**单跑全绿**，串进 regress 立刻死锁。
> 拓扑里 `num_last_reqs=1`（driver 拿了 item 不归还）。

**500ns 怎么定的**：AXI 单笔事务最长 ~6 拍 = 60ns，
给 10 倍余量。任何配置下都够。

---

## 五、★★★ 复位只有一个驱动者

**test 绝不能自己拉 `intf.aresetn`。**

两边抢驱动权 → 事务在半途丢失 → driver 的 `recv_b` 永远等不到 → 死锁到看门狗。

### 但也不能"置请求然后等"

实测踩了三个坑：

| 方案 | 为什么失败 |
| --- | --- |
| test 直接 `intf.reset_if()` | 和 driver 抢驱动权 → 死锁 |
| interface 加 `bit rst_req` | `virtual interface` 访问非 clocking 成员不可靠，**driver 读不到** |
| driver 加成员变量 `rst_req` | test 置了，但 driver **阻塞在 `get_next_item()`**，没人唤醒 |
| 裸调 `sequencer.start_item()` | 需要 sequence 上下文（grant 机制），裸调报 HDL call sequence 错误 |

### ✓ 正解：走一个 sequence 传控制命令

```systemverilog
// base_seq 里加一个专用 seq
class axi_reset_seq extends axi_base_seq;
  `uvm_object_utils(axi_reset_seq)

  virtual task body();
    axi_seq_item req = axi_seq_item::type_id::create("rst_item");
    start_item(req);
    req.op     = AXI_NOP;     // NOP 不产生总线事务
    req.rst_hs = 1'b1;        // 控制字段挂在 item 上
    finish_item(req);
  endtask
endclass

// base_test 里
task reset_dut();
  axi_reset_seq rst = axi_reset_seq::type_id::create("rst_seq");
  rst.cfg  = env_cfg.axi_agnt_cfg;
  rst.intf = env_cfg.axi_agnt_cfg.intf;
  start_seq(rst);
  // 等复位确实完成
  wait (env_cfg.axi_agnt_cfg.intf.aresetn === 1'b1);
  repeat (5) @(env_cfg.axi_agnt_cfg.intf.cb);
endtask
```

**item 是唯一"既能唤醒 driver、又能让 driver 看见"的通道。**

---

## 六、一个 test 一个场景，回归写法

```systemverilog
class axi_rw_test extends axi_base_test;
  `uvm_component_utils(axi_rw_test)

  virtual task run_phase(uvm_phase phase);
    phase.raise_objection(this);
    run_seq(axi_reg_rw_seq::type_id::create("seq"));
    phase.drop_objection(this);
  endtask
endclass

// 回归 test：串多个场景
class axi_regress_test extends axi_base_test;
  virtual task run_phase(uvm_phase phase);
    phase.raise_objection(this);
    run_seq_chain(axi_reg_rw_seq::type_id::create("s1"));
    run_seq_chain(axi_err_seq::type_id::create("s2"));
    run_seq_chain(axi_wstrb_seq::type_id::create("s3"));
    run_seq_chain(axi_fifo_seq::type_id::create("s4"));
    run_seq_chain(axi_random_seq::type_id::create("s5"));
    phase.drop_objection(this);
  endtask
endclass
```

> **回归 test 里每个场景都要 `run_seq_chain`**（内部含 DUT + 模型双复位），
> 不能用 `start_seq` + `#(delay)`。

---

## 七、跑法速查

```bash
# 编译（功能覆盖率必须 -cover bsectf 编译期插桩）
vlog -sv -L mtiUvm +incdir+/e/questasim/verilog_src/uvm-1.1d/src \
     -cover bsectf -f tb_filelist.f -work work

# 跑单个 test
vsim -c -L mtiUvm -coverage work.tb_top +UVM_TESTNAME=axi_rw_test \
     -do "coverage save -onexit ../log/cov.ucdb; run -all; quit -f"

# ★ coverage save 必须写在 run 之前
#   TB 里的 $finish 会终止整个 -do 脚本，写在 run 后面的执行不到

# 看覆盖率
vcover report -cvg -details ../log/cov.ucdb
```

---

## 八、相关笔记

- 整体顺序 → [[验证工程 · 骨架速记]]
- 复位为什么这么绕 → [[验证工程 · driver与monitor的实现要点]] 第一节
- 模型为什么也要复位 → [[验证工程 · scoreboard参考模型]]
- sequence 机制 → [[UVM · 序列与 sequencer]]
- 相位与 objection → [[UVM · 相位与域]]