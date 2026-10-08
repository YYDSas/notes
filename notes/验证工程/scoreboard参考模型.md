---
title: 验证工程 · scoreboard参考模型
category: 验证工程
tags: [scoreboard, 影子模型, 参考模型, WSTRB, 复位态, 假mismatch]
date: 2026-10-08
---

> scoreboard 占 20% 工作量，而且是**最容易把自己坑到"误判 RTL 有 bug"**的地方。
> **核心：模型错了不会报错，只会让你以为 RTL 错了。**

---

## 一、双口 scoreboard 模板（照抄）

```systemverilog
// ★ 一个 scoreboard 要接两个 analysis_port，必须自定义 imp 类。
//   展开出的是新类 uvm_analysis_imp_drv，其 write() 调 m_imp.write_drv(t)。
//   而裸 uvm_analysis_imp 的 write() 只调 m_imp.write(t)。
//   用错 → vsim-3567 No field named 'write'。
`uvm_analysis_imp_decl(_drv)      // ← 必须在 class 外、package 作用域
`uvm_analysis_imp_decl(_mntr)

class axi_scoreboard extends uvm_scoreboard;
  `uvm_component_utils(axi_scoreboard)

  // ★ 类型必须是 imp_decl 生成的，不能用裸 uvm_analysis_imp
  uvm_analysis_imp_drv #(axi_seq_item, axi_scoreboard) ap_drv2scb;
  uvm_analysis_imp_mntr#(axi_seq_item, axi_scoreboard) ap_mntr2scb;

  // ★★★ 方法名必须严格是 write_drv / write_mntr
  //   端口对象名（ap_drv2scb）反而可以随便起
  function void write_drv(axi_seq_item t); ... endfunction
  function void write_mntr(axi_seq_item t); ... endfunction
```

**三条一起记：**
1. `*_imp_decl` 必须在 **class 外**（package 作用域）
2. 它展开的是**新类** `uvm_analysis_imp_drv`，不是改 `uvm_analysis_imp`
3. 方法名**严格**是 `write_drv` / `write_mntr`

---

## 二、★★★ 影子模型必须在 `new()` 里预置复位态

这是最容易漏的一行：

```systemverilog
function new(string name = "axi_scoreboard");
  super.new(name, parent);
  ap_drv2scb = new("ap_drv2scb", this);
  ap_mntr2scb = new("ap_mntr2scb", this);

  // ★★★ 这一段不能少 ★★★
  //   复位后的寄存器值必须在模型里预置，
  //   否则"复位后直接读"会全部报 "read without prior write"，
  //   而这恰恰是最常见的第一个用例。
  mirror[REG_CTRL]    = 32'h0;
  mirror[REG_SCRATCH] = 32'h0;
  mirror[REG_SCR2]    = 32'h0;
endfunction
```

**常见误区**：只把"写过"的寄存器放进去。

> 影子模型要镜像 DUT 的**复位态**，而不只是运行到的那部分。
> DUT 复位后寄存器有确定值，模型里也必须有。

---

## 三、★★★ 场景之间必须重置模型（假 mismatch 的头号来源）

实测踩过：

```
regress 报 16 个 mismatch:
  read addr=0x10 exp=0xffffffff got=0x12345678
```

第一反应是"DUT 有 bug"。实际是：
WSTRB 场景假设"寄存器初值是 0"，但上个场景已经写过它了，
**而 DUT 也确实保留着那个值** —— 是模型脏了。

```systemverilog
virtual function void reset_model();
  mirror.delete();
  fifo_shadow.delete();
  cmp_cnt = 0;  err_cnt = 0;  wr_cnt = 0;  rd_cnt = 0;
  // 复位态重新预置
  mirror[REG_CTRL]    = 32'h0;
  mirror[REG_SCRATCH] = 32'h0;
  mirror[REG_SCR2]    = 32'h0;
endfunction
```

**在 test 里，每次场景开始都调：**

```systemverilog
task run_seq_chain(uvm_sequence_base seq);
  reset_dut();              // 让 DUT 复位
  env_i.scb.reset_model();  // ★ 影子模型也要复位
  start_seq(seq);
  #(500ns);
endtask
```

> **判据**：如果 DUT 和模型对不上，**先问"我有没有把两者都复位"**，
> 再怀疑 RTL。顺序反了会白查几小时。

---

## 四、★★ 三个必须建模到位的点

| 点 | 写错的后果 |
| --- | --- |
| **WSTRB 参与期望值** | 部分字节写误报 mismatch，且**随机出现**（取决于数据组合） |
| **只读寄存器不更新模型** | 写 RO 后模型变了、DUT 没变 → 必报 mismatch |
| **错误响应要建模** | 越界 / 空 FIFO 的期望值算不出来 |

### WSTRB 合并函数（AXI 家族通用，抄过去就能用）

```systemverilog
function automatic bit [`DATA_W-1:0] apply_strb(
    bit [`DATA_W-1:0] old_val,
    bit [`DATA_W-1:0] new_val,
    bit [`STRB_W-1:0] strb);
  bit [`DATA_W-1:0] res;
  res = old_val;                          // ★ 先取旧值
  for (int i = 0; i < `STRB_W; i++)
    if (strb[i])
      res[i*8 +: 8] = new_val[i*8 +: 8];   // 只覆盖使能的字节
  return res;
endfunction
```

**为什么不能漏**：AXI4-Lite 的写数据带字节掩码，
新值**不是**直接等于 `wdata`，而是按字节合并。
漏了 WSTRB → 模型算错、DUT 是对的 → 表现为"随机地"报 mismatch。

### 影子模型的三种形态（按 RTL 选）

| RTL 特征 | 模型形态 |
| --- | --- |
| 寄存器组 | 关联数组 `mirror[addr]` |
| 数据流（FIFO/流水线） | 队列 `queue[$]` 存每一拍的期望 |
| 复杂算法 | 纯 SV 参考模块，输出即期望 |

可以组合使用（AXI 例：寄存器用 `mirror`，REG_FIFO 用 `fifo_shadow[$]`）。

---

## 五、★ 读未初始化寄存器是 warning 不是 error

```systemverilog
if (!mirror.exists(t.araddr)) begin
  `uvm_warning("SB_NO_INIT",
    $sformatf("read addr=0x%0h without prior write (expect reset value 0), id=%0d",
              t.araddr, t.tr_id))
  // ★ 只在"不是复位值 0"时才算错
  if (t.rdata !== '0)
    report_err($sformatf("read uninit addr=0x%0h should be 0 got 0x%0h",
                         t.araddr, t.rdata));
end
```

**为什么不能报 error**：DUT 返回复位值 0 是**合法行为**。
报 error 会让随机激励满屏假警报，反而**掩盖真问题**。

> 判断标准：模型只对"它能确定的"下断言。确定不了的用 warning 提示。

---

## 六、scoreboard 侧的信息必须写在 item 里

```
激励 / 期望 / 实际 三者放在同一条记录里
```

```systemverilog
class axi_seq_item extends uvm_sequence_item;
  rand bit [`ADDR_W-1:0] awaddr;    // 激励
  rand bit [`DATA_W-1:0] wdata;     // 激励
  bit [`DATA_W-1:0]      rdata;     // 实际（DUT 回读）
  bit [`DATA_W-1:0]      exp_data;  // 期望（模型算出）
  int unsigned           tr_id;     // 对齐用
endclass
```

**为什么要放在 item 里而不是 scoreboard 内部**：debug 时一个 `%s` 就能打印全貌：

```systemverilog
function string convert2string();
  return $sformatf("op=%0s addr=0x%0h wdata=0x%0h wstrb=%0b exp=0x%0h rdata=0x%0h id=%0d",
                   op.name(), awaddr, wdata, wstrb, exp_data, rdata, tr_id);
endfunction
```

出错时一眼看清"激励是什么、期望是多少、实际是多少"。

---

## 七、★★ env_config 里嵌套 config 必须 new

```systemverilog
class axi_env_config extends uvm_object;
  axi_agent_config axi_agnt_cfg;
  bit has_scoreboard = 1;

  function new(string name = "axi_env_config");
    super.new(name);
    // ★★★ 这一行不能少 ★★★
    //   只声明不 new 的话它保持 null；
    //   test 里写 env_cfg.axi_agnt_cfg.is_active = ...
    //   就是在解引用空句柄 → SIGSEGV，
    //   而栈顶显示在 uvm_config_db::get 里，完全指不到真正原因。
    //   ★ 用 new() 不用 type_id::create —— uvm_object 不走工厂。
    axi_agnt_cfg = axi_agent_config::new("axi_agnt_cfg");
  endfunction
endclass
```

**这是全模板最容易漏的一行。** 症状是 SIGSEGV 但栈顶误导。

---

## 八、report_phase 要给出可判断的统计

```systemverilog
virtual function void report_phase(uvm_phase phase);
  `uvm_info("SB_SUMMARY",
    $sformatf("driven: %0d wr / %0d rd, compared %0d items, %0d mismatches, shadow depth %0d",
              wr_cnt, rd_cnt, cmp_cnt, err_cnt, fifo_shadow.size()), UVM_NONE)
  if (err_cnt != 0)
    `uvm_error("SB_FAIL", $sformatf("%0d mismatches found", err_cnt))
  super.report_phase(phase);
endfunction
```

**必须能一眼看出三件事：**
1. 激励发出去了吗（`driven`）
2. 采到东西了吗（`compared`）
3. 对得上吗（`mismatches`）

> `driven` 或 `compared` 是 0 → 验证空跑，别急着看 pass。详见
> [[验证工程 · driver与monitor的实现要点]]。

---

## 九、相关笔记

- 整体顺序 → [[验证工程 · 骨架速记]]
- item 怎么定义 → [[验证工程 · driver与monitor的实现要点]]
- 双口 imp_decl 的原理 → [[UVM · TLM 通信]]
- 端口怎么连 → [[验证工程 · test与场景编排]]