---
title: 面试题 · UVM 相位与 objection
category: 基础面试题目
tags: [phase, objection, domain, drain_time, timeout, jump, 仿真控制]
date: 2026-10-08
---

# 面试题 · 相位、objection 与仿真控制

> 汇总自《UVM面试 1-65》第 3~6、51~55、59 题，《UVM面试题》Q4/Q5/Q8，《面试总结》22~25、44、48。

## 1. 为什么需要 phase 机制？phase 有什么区别？

基于 module 的验证平台里，所有 module 静态地存在于层次结构中；而基于 class 的验证平台需要**管理不同对象的创建和其方法的执行**。

phase 让验证平台有一致的执行流程。测试执行可分为四类任务：**配置 → 创建组件 → 运行激励 → 测试检查结束**。

**分类**（按是否消耗仿真时间）：

- **function phase**：不消耗时间，非阻塞。如 `build_phase`、`connect_phase`、`end_of_elaboration`、`extract`、`check`、`report`、`final`。
- **task phase**：消耗时间。如 `run_phase` 及其 12 个子 phase、`start_of_simulation`、`start_of_simulation`。

UVM 共 **9 个 + 12 个**相位。9 个顺序执行；`run_phase` 与 12 个小 phase **并行运行**。

## 2. 哪些 phase 是 top-down、bottom-up、parallel？

- **`build_phase`：top-down**（自上而下）
- **`run_phase` 等 task phase：parallel**
- **其余 function phase：bottom-up**（自下而上）

**为什么 build 是 top-down**：低层组件要在高层组件的 `build_phase` 里被例化。如果高层的 `build_phase` 之前就执行 driver 的 `build_phase`，那时 driver 还没被例化，调用它的 `build_phase` 会报错。

**为什么 connect 是 bottom-up**：它要在 `build_phase` 之后完成组件之间 TLM 连接，先把底层的端口准备好。

**兄弟关系的 component 的相同 phase** 之间按**字典序**执行。

## 3. UVM 的 phase 列表

```plain
1) Build phase（3 个子 phase，都在 uvm_component 里作为 virtual 方法实现）
   build_phase() → connect_phase() → end_of_elaboration()

2) Run time phase（消耗时间，测试执行的主要地方）
   start_of_simulation()
   run_phase()
     └ 12 个子 phase：
        pre_reset → reset → post_reset
        pre_configure → configure → post_configure
        pre_main → main → post_main
        pre_shutdown → shutdown → post_shutdown

3) Clean up phase（收集并报告测试结果与统计信息）
   extract() → check() → report() → final()
```

## 4. `run_phase` 和 `main_phase` 是什么关系？

两者都是 **task phase，且并行运行**。后者称为"动态运行的 phase"。

区别：

- 12 个小 phase 中**有一个**（比如 `main_phase`）提起了 objection，那么 `run_phase` 里**不需要**挂 objection 也能执行其中的代码；但 `run_phase` 的运行时间**被动地受**那个提起 objection 的小 phase 控制。
- 反过来，如果只在 `run_phase` 里挂了 objection 而 `main_phase` 没挂，那么 **`main_phase` 中的操作不会执行**。

`main_phase` 里执行耗费时间的语句，主要实现各组件功能：driver 的 `main_phase` 按时序驱动 DUT，scoreboard 的 `main_phase` 负责比较数据。

## 5. domain 是什么概念？

domain 用来组织不同组件、实现**独立运行**。

默认情况下 9 个 phase 属于 `common_domain`，12 个小 phase 属于 `uvm_domain`。例如有两个 driver 类，默认两个 driver 的 `main_phase` 必须**同时执行**；如果说它们属于不同 domain，就能独立运行。

> **关键限制：domain 只对 12 个小 phase 有效。**

## 6. objection 是什么？用在哪里？

`uvm_objection` 类提供了在多个 component 和 sequence 之间**共享计数器**的方法。每个 component/sequence 可以异步地 raise 和 drop objection，增减计数值。当计数从非零变为零时，称为 **"all dropped" 条件**。

**用在哪**：最常用于 phase 机制中协调每个 run-time phase 的结束。

```systemverilog
task main_phase(uvm_phase phase);
  phase.raise_objection(this);
  my_test_sequence.start(my_sequencer);
  phase.drop_objection(this);
endtask
```

## 7. objection 机制的运行规则？

进入某一 phase 时，UVM 收集此 phase 提出的所有 objection，并实时监测是否已全部撤销：

- **都撤销了** → 关闭此 phase；所有 phase 执行完毕后调 `$finish` 关闭整个平台。
- **一个都没提起** → **直接跳到下一个 phase**。

**`raise_objection` 的位置要求**：必须在 `main_phase` 中**第一个消耗仿真时间的语句之前**。

```systemverilog
phase.raise_objection(this);   // ✓ 在前
$display("...");               // $display 不消耗时间
@(posedge clk);                // 这个之后才开始消耗时间
```

`$display` 不消耗仿真时间，`@(posedge clk)` 才消耗。

可以把 `drop_objection` 理解成 `$finish` 的替代者，只不过之前必须先 `raise`。

## 8. `set_drain_time` 为什么需要？什么时候用？

DUT 处理数据需要时间。如果 sequence 发完最后一个 transaction 就 `drop_objection`，那么 t 时刻之后 DUT 输出的包**将无法接收**。

`set_drain_time` 解决这个：UVM 在 `main_phase` 检测到所有 objection 被撤销后，会**检查有没有设置 drain_time**，若有则**延迟 drain_time 后再进入 `post_main_phase`**。

## 9. `set_timeout` 和 `set_global_timeout` 有什么区别？

都是超时兜底。

- **`set_global_timeout(timeout)`**：把 `uvm_top.phase_timeout` 变量设为超时值。若 `run()` phase 在该超时值前没结束，仿真停止并报错。

```systemverilog
module test;
  initial begin
    set_global_timeout(1000ns);
  end
  initial begin
    run_test();
  end
endmodule
```

- **`set_timeout(...)`**：用于代码运行仿真出现**锁死**状态时——仿真时间在消耗但仿真进度停滞。超出设定时间则给出一条 `uvm_fatal` 提示并退出仿真。

## 10. UVM 里仿真怎么结束？

1. run 阶段执行实际仿真，每个组件开始时 raise objection 并保留到完成自身行为。
2. 所有组件都 drop objection → run 阶段完成。
3. 然后所有组件的 `check()` 阶段执行。
4. 最后测试结束。

这是正常结束方式。但若某些组件因设计或测试平台错误而挂住，用**仿真超时（timeout）**也可以控制结束。

## 11. `phase_ready_to_end()` 有什么用途？

`phase_ready_to_end(uvm_phase phase)` 是 component 类中的**回调（callback）**方法，在该 phase 的**所有 objection 都被 drop 之后**调用。

组件可以用它定义 phase 即将结束时需要执行的功能。比如某个组件希望在 objection drop 后把 phase 结束延迟到满足某个条件，就用这个回调实现。

## 12. phase 之间怎么跳转？

用 `phase.jump()`。

## 13. 什么时候用 `phase_ready_to_end` 而不是直接在 `main_phase` 里 delay？

直接在 `main_phase` 里 `raise/drop` 配 delay 会让整个平台干等。正确做法：

- 在 `main_phase` 里 raise objection，**立刻 drop**；
- 用 `phase_ready_to_end()` 里做最后的收尾/检查，等价于"零延时收尾"；
- 需要真正等时间时用 `set_drain_time`。

## 相关笔记

- [[UVM · 相位与域]] — phase 跳转的工程写法
- [[面试题 · UVM 序列与仲裁]] — `set_drain_time` 与 sequence 的配合
- [[面试题 · UVM 平台与组件]] — `set_global_timeout` 兜底

## 避坑指南

- [ ] 只有 9 个 phase 顺序执行；`run_phase` 与 12 个子 phase 是**并行**的
- [ ] `build_phase` top-down（因为要按高层配置建低层），`connect_phase` bottom-up
- [ ] `domain` **只对 12 个小 phase 有效**，对 9 个大 phase 无效
- [ ] `raise_objection` 必须在第一个**消耗仿真时间**的语句之前
- [ ] 一个 objection 都不 raise → **直接跳过该 phase**，不是死等