---
title: 仿真工具 · Verilog config 与库绑定
category: 仿真工具
tags: [config, liblist, 库绑定, partition, 编译加速, 同名模块]
date: 2026-10-07
order: 3
---

> 一直以为"一个 DUT + 一个 TB"就够了，直到书里出现 `config cfg1; ... endconfig`
> （《芯片验证调试手册》p.226）。它**不属于 TB、也不属于 UVM** ——
> 是 Verilog 语言自带的**库绑定**机制，只在**编译/链接期**决定
> "每个实例的模块从哪个库取"。本页实测均在本机 QuestaSim 10.7c。

## 一、它解决什么问题

当**同一个模块名有多份实现**、且分散在不同库里时，工具凭什么决定用哪一份？

```systemverilog
module m1;
  m2 m2_inst();      // m2 到底是哪个 m2？
endmodule
```

- `work` 库：`m2` 的**真实版**（打印 `This is m2`）
- `tblib` 库：`m2` 的**同名空壳版**（打印 `This is dummy m2`）
- 两个版本**模块名相同、对外接口一致** —— 这是能换的前提

> ✅ 只要能明确"用哪一个"，就能做到**源码一行不改**地切换实现。

## 二、config 的三个子句

```systemverilog
config cfg2;                                  // ① 配置单元（本身也被编进库）
  design work.top;                            // ② 管辖的顶层设计：库名.单元名
  default liblist work;                       // ③ 默认库搜索列表（顺序=优先级）
  instance top.m1_inst.m2_inst liblist tblib; // ④ 特例：某实例改从 tblib 找
endconfig
```

| 子句 | 管什么 |
| --- | --- |
| `design <lib>.<unit>` | **管谁**：这份配置适用的顶层设计 |
| `default liblist <lib...>` | **默认去哪找**：多库时按顺序搜；`-lib` 可排除某库 |
| `instance <层次路径> liblist <lib...>` | **特例**：按实例路径覆盖默认 |
| `cell <模块名> liblist <lib...>` | 按**模块类型**覆盖（本例未用） |
| `use lib.cell:config` | 引用某个已编译单元的配置（进阶） |

> 只写 `design` + `default liblist` 的配置，作用就是"**把整棵树固定在一个库**"。

## 三、实测：同一份编译结果，两种绑定

```bash
vlib work && vlib tblib
vlog -sv -work work  m2.sv m1.sv top.sv config.sv
vlog -sv -work tblib m2_dummy.sv

vsim -c cfg1 -do "run -all; quit -f"     # → This is m2
vsim -c cfg2 -do "run -all; quit -f"     # → This is dummy m2
```

- **Questa**：直接把 **config 名当顶层**跑（`vsim -c cfg1`）
- **VCS**：编译期选顶层（`vcs ... -top cfg1`）→ 产出不同的 simv
  → 这正是书上那句"**要指定不同的链接目标（仿真可执行对象）**"

## 四、和 UVM factory 的对照（最好理解的入口）

| | 换什么 | 什么时候 |
| --- | --- | --- |
| **UVM factory override** | 验证**组件**的实现 | 运行期（create 时查表） |
| **Verilog config** | 设计**模块**的实现（从哪个库取） | 编译 / 链接期 |

> 同一思路的两个层次：TB 侧用 factory，设计侧用 config。见 [[UVM · 组件与工厂]]。

## 五、附：编译加速手段（也是"为什么要把用例搬到 C"的背景）

- VCS 的 **partition compile / parallel compile**：把设计切成若干"分区"
  （`partcomp.config` 里按 `package` / `instance` / `cell` 声明边界），只重编受影响的分区，
  多分区还可并行编译；命令行样例：
  `-partcomp -fastpartcomp=j4 -optconfigfile+partcomp.config`
- 但它救不了 **UVM 用例迭代**：改 test / sequence 仍要重编整块 SV
- → 于是有了书 §4.1.7 的建议：**把 sequence 包成 task、导出 DPI-C**，
  用例改在 C 侧，SV 平台只编一次
  （完整流程见 [[仿真工具 · Questa 避坑手册]] 的 DPI-C 一节）

## 六、注意

- [ ] 两份实现**模块名必须相同、端口/参数必须兼容**，否则链接时报端口不匹配
- [ ] config 是**编译/链接期**机制，运行时改不了
- [ ] 库要先 `vlib` 建好并把源码编进去，config 才有东西可选
- [ ] 单个模块的小工程只有一份源码 → **一辈子用不到 config**

## 相关笔记

- [[UVM · 组件与工厂]]
- [[仿真工具 · Questa 避坑手册]]
- [[仿真工具 · Questa 命令行与 Makefile]]
