---
title: UVM · TLM 通信
category: UVM
tags: [TLM, port, export, imp, analysis_port, mailbox, fifo]
date: 2026-10-03
order: 4
---

> 组件之间怎么传数据？从 `mailbox` 到 `TLM port` 的改造，是 UVM 入门到中阶的关键一跃。

## 一、为什么要把 mailbox 换成 TLM port

**改造前**（组件直接连 mailbox）：

```systemverilog
// env.connect_phase
chnl_agts[i].monitor.mon_mb = chker.chnl_mbs[i];   // 直接赋值对方内部句柄
```

**改造后**（组件之间只认端口）：

```systemverilog
// monitor 里
uvm_blocking_put_port #(mon_data_t) mon_bp_port;
mon_bp_port.put(m);            // 只管交出去，不知道谁收

// checker 里
uvm_blocking_put_imp #(mon_data_t, mcdf_checker) chnl0_imp;

// env.connect_phase
chnl_agts[i].monitor.mon_bp_port.connect(chker.chnl_mbs_imp[i]);
```

> **关键洞察**：TLM 化**不是消灭 mailbox**，而是把 mailbox 从
> "跨组件连接机制"**降级为"组件内部私有缓存"**。
> 改造后 checker 内部仍用 `chnl_mbs[0]`，但**外部组件不再直接摸它**；
> monitor 与下游彻底解耦。

## 二、命名规律

```
uvm_<blocking | nonblocking | 空>_<put | get | peek | get_peek | transport>_<port | export | imp>
```

| 端口 | 调用的方法 | 说明 |
| --- | --- | --- |
| `uvm_blocking_put_port` | `put()` | 阻塞，有空间才返回 |
| `uvm_nonblocking_put_port` | `try_put()` | 非阻塞，返回成功/失败 |
| `uvm_blocking_get_port` | `get()` | 取走并移除 |
| `uvm_blocking_get_peek_port` | `peek()` + `get()` | 先看后取 |
| `uvm_blocking_transport_port` | `transport()` | 一发一收 |
| `uvm_analysis_port` | `write()` | **一对多广播** |

## 三、用法四步

```systemverilog
class chnl_monitor extends uvm_component;
  // ① 类里声明 port
  uvm_blocking_put_port #(mon_data_t) mon_bp_port;

  function new(string name, uvm_component parent);
    super.new(name, parent);
    mon_bp_port = new("mon_bp_port", this);   // ② new 里实例化（带 parent）
  endfunction

  task run_phase(uvm_phase phase);
    mon_bp_port.put(m);                        // ③ 用 port 替代 mailbox.put
  endtask
endclass
// ④ connect_phase 里 port.connect(imp)
```

| 步骤 | 要点 |
| --- | --- |
| ① 声明 | 类型参数 = 数据类型 |
| ② new | `new("name", this)`——**port 是 component，要 parent** |
| ③ 使用 | 用 `port.put(t)` 替换 `mailbox.put(t)` |
| ④ 连接 | `上游_port.connect(下游_imp)` |

## 四、连接规则（重要）

```
port  ──→  export  ──→  imp          ✅ 合法链
port  ──→  imp                       ✅
export ──→ imp                       ✅
port  ──→  port                      ❌ 非法（UVM 在 connect/resolve 阶段报错）
```

- **调用方（上游）去 connect 被调方（下游）**
- **链的末端必须是 imp**——imp 是真正实现方法的那一端
- 一个 put/get port **只能连一个 imp**；要广播请用 `uvm_analysis_port`

## 五、`*_imp_decl` 宏：一个 checker 收多路数据

checker 要收 5 路数据（chnl0/1/2 + fmt + reg），如果都叫 `put()` 就**无法区分**：

```systemverilog
`uvm_blocking_put_imp_decl(_chnl0)
`uvm_blocking_put_imp_decl(_chnl1)
`uvm_blocking_put_imp_decl(_fmt)

class mcdf_checker extends uvm_component;
  uvm_blocking_put_imp #(mon_data_t, mcdf_checker, "_chnl0") chnl0_imp;
  // 方法名变成 put_chnl0() / put_chnl1() / put_fmt()
  task put_chnl0(mon_data_t m); ... endtask
endclass
```

> 宏生成的是**带后缀的 imp 类**，方法名随之变成 `put_chnl0()`。
> **imp 方法名由「端口类型 + 宏后缀」共同决定，对不上会在编译期报"抽象方法未实现"。**

## 六、`uvm_tlm_fifo`：自带端口的 mailbox

- `uvm_tlm_fifo #(T)` = 一个带 TLM 端口的 mailbox
- 对外暴露 `put_export` / `get_peek_export` / `blocking_get_export` 等
- 用它可以直接替换裸 `mailbox`，还自带 size / used / is_full 等查询

```systemverilog
// refmod 侧
uvm_blocking_get_peek_port #(mon_data_t) in_port;
// 因为它需要先 peek 看长度字段算包长，再循环 get 逐条取走
```

## 七、避坑清单

| 坑 | 后果 / 正确做法 |
| --- | --- |
| port 在 `connect_phase` 之后才 new | 连接失败 → **必须在 `new()` 或 `build_phase` 里创建** |
| 一个 put/get port 连多个 imp | 非法；要广播用 `uvm_analysis_port` |
| `port.connect(port)` | 非法；中间要有 export 或末端 imp |
| imp 方法名对不上 | 编译期报抽象方法未实现 |
| 把 `peek` 当 `get` | **peek 不移除**，看到不等于取走 |
| 宏后缀忘了加 | 多路数据互相覆盖，只跑到一路 |

## 相关笔记

- [[UVM · 组件与工厂]]
- [[UVM · 序列与 sequencer]]
- [[UVM · 相位与域]]
