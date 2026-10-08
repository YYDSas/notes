---
title: 面试题 · UVM 平台与组件
category: 基础面试题目
tags: [uvm, component, object, factory, agent, monitor, is_active]
date: 2026-10-08
---

# 面试题 · UVM 平台与组件

> 汇总自《UVM面试题》《IC验证面试之UVM》《UVM面试 1-65》《面试总结（扫描版）》中 UVM 部分的前 10~12 题。
> 答法统一：**先给结论，再给"为什么这样设计"**，最后补一句面试官爱追问的边界条件。

## 1. 什么是 UVM？它的优势是什么？

**UVM（Universal Verification Methodology）** 是一个标准化的验证方法学，用 SystemVerilog 写成类库，把验证里可复用、标准化的部分固化下来。

优势：

- **重用性**：环境、组件、VIP 可跨项目复用
- **VIP 即插即用**：agent 化封装
- **通用性**：不依赖特定仿真器
- **支持 CDV**（Coverage Driven Verification）
- **支持 CRV**（Constraint Random Verification）

延伸：UVM 以 SV 为基础，**不支持 SystemVerilog 的工具也不支持 UVM**。

## 2. `uvm_component` 和 `uvm_object` 有什么区别？

| | `uvm_component` | `uvm_object` |
| --- | --- | --- |
| 生存期 | `build_phase` 之后一直存在到仿真结束 | 由 component 产生，传递给另一个 component 后即消失 |
| 层次 | `new` 时指定 `parent`，形成树形结构 | 无层次 |
| 相位 | 有 phase 机制，自动被调用 | 无 phase 机制 |
| 连接 | 通过 interface 连 DUT，或通过 TLM port 连其他 component | 不连任何组件 |
| 配置 | 有 `uvm_field_*` 自动化 | 同样有 |

**哪些是 component**：`driver`、`monitor`、`sequencer`、`agent`、`scoreboard`、`reference model`、`test`、`env`、`phase`。

**哪些是 object**：`item`/`transaction`、`sequence`、`config`、`map`、`field`、`reg`。

`component` 继承自 `object`，多出来的那两点就是：**parent 参数带来的树形结构** + **phase 自动执行**。

## 3. 一个 UVM 验证环境由哪些组件组成？

- **Driver**：向 sequencer 索要 item，并把 item 驱动到 DUT 端口上。
- **Monitor**：收集 DUT 输出信号，交给后续组件（scoreboard / reference model / coverage）。
- **Sequencer**：把 sequence 发来的 item 传给 driver。
- **Agent**：把 driver + monitor + sequencer 封装在一起。存在的意义是**可重用性**。
- **Reference model**：完成与 DUT 相同的功能，作为期望值来源。
- **Scoreboard**：比较参考模型与 DUT 的输出，判断 DUT 是否正确。
- **Env**：一个"特大容器"，把所有 agent、scoreboard 等包含进去。
- **Virtual sequence / virtual sequencer**：面向多个 sequencer 的调度层。

```plain
uvm_test_top
└── uvm_env_top (env_test)
    ├── test_case0
    ├── i_agt   (agent: i_drv + i_mon + i_sqr)
    ├── mon_agent
    └── v_agt
```

## 4. 为什么需要 monitor？直接让 driver 发给 scoreboard 不行吗？

两条理由：

1. **协议理解分工**：大型项目里 driver 按协议发数据、monitor 按同一协议收数据。若两者由不同人实现，可以大幅减少任一方对协议理解的错误。
2. **代码复用**：agent 被集成时，某些场景只需要监测不需要激励（比如挂在输出端口上）。通过配置 `is_active = UVM_PASSIVE`，只例化 monitor 即可。

## 5. 什么是 ACTIVE / PASSIVE agent？怎么配置？

- `UVM_ACTIVE`：agent 在其操作的接口上**产生激励**，会构建 driver 和 sequencer。
- `UVM_PASSIVE`：只监视接口，**不构建** driver 和 sequencer。

`uvm_agent` 有一个 `uvm_active_passive_enum is_active` 成员，默认 `UVM_ACTIVE`。在 env 里例化 agent 时用 `set_config_int()` 改：

```systemverilog
// env 的 build_phase
agt1 = agent::type_id::create("agt1", this);
agt1.is_active = UVM_PASSIVE;

// agent 的 build_phase
function void build_phase(uvm_phase phase);
  super.build_phase(phase);
  if (is_active == UVM_ACTIVE) begin
    drv = driver::type_id::create("drv", this);
    sqr = sequencer::type_id::create("sqr", this);
  end
  mon = monitor::type_id::create("mon", this);   // 无论 active/passive 都要
endfunction
```

**为什么必须"配置写在创建之前"**：确保被配置的变量在子一级组件创建之前就被设好，否则 `is_active` 读到的还是默认值。这就是"配置为什么要放在对象创建之前"的答案。

## 6. 为什么必须在 `build_phase` 例化 component？可以在 `new()` 里吗？

**可以，但会出问题。**

`build_phase` 是 **top-down**：高层 env 的 `build_phase` 先跑，高层配置好之后低层才能建。所以低层 `agent` 在自己的 `build_phase` 里能直接 `get()` 到上层设的 `is_active`。

如果在 `agent` 的 `new()` 里例化 driver/monitor，`new()` 是在 `agent::type_id::create()` 那一刻就被调用的，此时 env 的 `build_phase` 还没给 `is_active` 赋值 → 读到的 `is_active` 是默认值，配置失效。补救办法是改用 `config_db` 提前 `set`，再在 `new()` 里 `get`：

```systemverilog
// env.build_phase
uvm_config_db#(uvm_active_passive_enum)::set(this, "agt1", "is_active", UVM_PASSIVE);
agt1 = agent::type_id::create("agt1", this);

// agent.new()
function new(string name, uvm_component parent);
  super.new(name, parent);
  uvm_config_db#(uvm_active_passive_enum)::get(this, "", "is_active", is_active);
  if (is_active == UVM_ACTIVE) begin
    drv = driver::type_id::create("drv", this);
    sqr = sequencer::type_id::create("sqr", this);
  end
  mon = monitor::type_id::create("mon", this);
endfunction
```

**规律**：`component` 一般在 `build_phase` 例化；`object` 可以在任何 phase 里例化。

## 7. `get_name()` 和 `get_full_name()` 有什么区别？

- `get_name()`：返回对象名，由 `new` 构造时或 `set_name()` 给的名字。
- `get_full_name()`：返回完整层次路径。对 component 打印日志非常有用。

对没有层次的 sequence 或配置对象，`get_full_name()` 和 `get_name()` 打印相同。

> 实际验证：`uvm_top` 的 `m_name` 是**空串**，所以 `uvm_top.get_full_name()` 返回 `""`，不是 `"uvm_top"`。这一点在做 config_db 路径拼接时容易踩。

## 8. `uvm_root` 是什么？`uvm_test` 的父类是什么？

`uvm_root` 是所有 UVM 组件的**隐式顶层**和 phase 控制器。用户不直接实例化它——UVM 自动创建一个实例，通过全局变量 `uvm_top` 访问。

`uvm_test` 是用户实现的顶层类，**没有显式父类**；但 UVM 把 `uvm_top` 指定为 test 类的父类。

## 9. UVM 的优势与劣势？

**优势**：UVM 是一个框架，流程规范。写的时候不用过多考虑语言实现问题，可以把精力放在场景设计上。

**劣势**：

- UVM 是十几年前 developed 的，对现在十几亿/百亿门级电路没有特别优化，超大型设计仿真比较吃力。
- 理论上硬件行为是并行的，但仿真器在计算机上串行执行，只是"表现出并行"。门数多时计算特别慢。

## 10. UVM 仿真怎么启动和结束？

**启动两种方法**：

1. 导入 `uvm_pkg` 时会自动创建 `uvm_root` 的实例 `uvm_top`，通过 `uvm_top` 调用 `run_test()`。不传参数时默认跑名字为 `uvm_test_top` 的类。
2. 在 top 模块里调 `run_test()`，命令行加 `+UVM_TESTNAME=test1`，启动指定测试用例。

```systemverilog
initial begin
  run_test();          // 或 run_test("test1")
end
```

**结束**：run_phase 阶段所有 objection 都 drop 后，UVM 结束仿真，最终调用 `$finish` 关闭整个验证平台。

**超时兜底**：

```systemverilog
initial begin
  set_global_timeout(1000ns);   // 设 uvm_top.phase_timeout
end
```

如果 run_phase 在超时前没结束，仿真停止并报错。代码挂死、仿真时间还在走但进度停滞时，用这个兜底。

## 相关笔记

- [[UVM · 组件与工厂]] — factory 注册与 override 的完整机制
- [[UVM · 序列与 sequencer]]
- [[面试题 · factory 与配置机制]] — `config_db` / `field_automation` / `new` vs `create`
- [[UVM · 报告机制]] — `get_name` / 打印层级

## 避坑指南

- [ ] `component` 和 `object` 的分类别记混：`phase`、`reg`、`map` 是 object，不是 component
- [ ] `is_active` 必须在 `build_phase` 之前设好，否则 agent 读到默认值
- [ ] `uvm_top.get_full_name()` 是空串，不是 `"uvm_top"`
- [ ] 回答"为什么必须有 monitor"时，两条理由要都说到：分工 + 复用