---
title: SV · force 与侵入式赋值
category: SystemVerilog
tags: [force, release, 侵入式赋值, freeze, deposit, 调试]
date: 2026-10-07
order: 11
---

> 书里把它叫"**侵入式赋值**"（《芯片验证调试手册》§4.2.3）：
> **从 TB 侧跨层次强行驱动设计内部的信号，把设计自己的驱动完全盖住**。
> 本页的语义全部在本机 QuestaSim 10.7c 实测过。

## 一、它长什么样

设计里某个实例自己在一个劲儿地递增值，TB 却把它**整体接管**：

```systemverilog
// 设计：rkv_mod 自己每 5ns 让 out_p0 加 1（0、1、2、3…）
// TB  ：接口里的 d0 造出 1、2、4、8 的序列
always_comb begin
  force top.m0.out_p0 = intf.d0;   // ← 跨层次、强行驱动设计内部信号
  force top.m1.out_p0 = intf.d1;
end
```

实测输出（`ts_sim/force_invasive2.sv`）：

```
@0:   m0 out_p0 = 'h1   m1 in_p0 = 'h1
@5:   都是 'h2
@10:  都是 'h4
@15:  都是 'h8
```

设计本来要打 **0、1、2、3…**，实际全是 **1、2、4、8** → **设计侧驱动被完全盖住**。

- 而且 m0.out_p0 就是 m1.in_p0（同一根线），force 一处就"顺带"改了 m1 的输入
  —— 这就是"侵入"的传染效果
- 书上的原代码 `task drive(ref logic [3:0] d)` 在本机 **编不过**：
  `vlog-13300 ... with ref argument ... must be automatic` → **加 `automatic` 即可**

## 二、force 的语义：过程性连续赋值

`force lhs = expr;` **不是"快照一次"**，而是**持续**驱动：

```systemverilog
initial #1 force sig = src;     // 全程只执行这一次
// 实测：t=17 时 sig 已经跟着 src 涨到 3
```

| 要点 | 说明 |
| --- | --- |
| 学名 | **procedural continuous assignment**（过程性连续赋值） |
| 右侧变化 | **自动跟随**，不用重新执行 force |
| 驱动权 | force 期间由 TB 独占，**设计所有驱动都被无视** |
| 归还 | 只有 `release` 才把驱动权还回去 |

**推论（实测）**：把 force 放进 `always_comb`，和"只执行一次"，**输出逐行一致**
——`always_comb` 不是必需的，只是写法习惯（`ts_sim/force_initial_variant.sv`）。

## 三、三种"灌值"方式的区别

| 手段 | 驱动权 | 说明 |
| --- | --- | --- |
| `force lhs = expr;` | **长期占用** | 右侧变化自动跟随，直到 `release` |
| VCS 命令 `force -freeze` | 长期占用 | 等价于"永不 release" |
| VCS 命令 `force -deposit` | **只灌一次** | 之后设计仍可驱动它 |

> ⚠️ 书里那个例子**没有 release** → 设计永远拿不回驱动权（最坏情形）。

## 四、为什么要用它

- **系统验证**：上游模块还没做完、想注入错误场景、把 VIP 的激励直接接到设计内部某个点
- 又**不改 RTL、不重新编译** → 跨层次"接管"是唯一手段
- 右侧表达式可以是 SV 变量/接口信号（能表达时序与组合逻辑）——
  这点比 Tcl 命令的 `force`（只能灌常量）灵活得多（书的原话）

## 五、⚠️ 避坑

- [ ] force 期间设计逻辑"沉默" → **协议检查、覆盖率、时序关系全部失真**，别长期挂着跑回归
- [ ] 调试完**必须 `release`**，否则后面所有用例都被污染
- [ ] 跨层次路径名（`top.m0.out_p0`）依赖层次结构，改名/工具优化后易失效；
      工程里建议配合 `bind` 或统一的层次引用管理
- [ ] 对**时钟、复位**这类信号 force 要格外小心（可能造出物理上不可能的时序）
- [ ] 带 `ref` 形参的子程序必须 `automatic`（书上的代码就栽在这一条）

> 实测文件：`ts_sim/force_invasive2.sv`（书上的代码 + `automatic` 修正）、
> `force_initial_variant.sv`（force 只执行一次）、`force_semantics.sv`（跟随实验）

## 相关笔记

- [[仿真工具 · Questa 避坑手册]]
- [[SV · 数据类型与位宽]]
- [[UVM · 组件与工厂]]
