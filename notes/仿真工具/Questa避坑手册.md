---
title: 仿真工具 · Questa 避坑手册
category: 仿真工具
tags: [Questa, vlog, vsim, vopt, DPI, 报错]
date: 2026-10-03
order: 0
---

> 本机环境：**QuestaSim 10.7c**（`E:\questasim\win64`，`vlog/vsim/vopt/qverilog` 已在 PATH），
> 自带预编译 UVM **`mtiUvm` = uvm-1.1d**，license 含 `vsimcoverage_c`（有效期至 2036）。
> 本篇全是踩过的坑，按"看到什么报错 → 怎么办"组织。

## 一、跑仿真的标准流程

```bash
vlog -sv -work work tb.sv
vsim -c work.tb -do "run -all; quit -f"        # -c 控制台模式，不弹 GUI
```

跑 UVM 例子（**不要自己编译 UVM 源码**）：

```bash
vlog -sv +incdir+/e/questasim/verilog_src/uvm-1.1d/src tb.sv
vsim -c -L mtiUvm +UVM_TESTNAME=my_test work.tb -do "run -all; quit -f"
```

> `mtiUvm` 映射见 `E:/questasim/modelsim.ini` 第 57 行 `mtiUvm = $MODEL_TECH/../uvm-1.1d`。
> 自己编 uvm_pkg.sv 会卡在 DPI 导出编译（见第五节）。

## 二、编译期坑

| 现象 | 原因 / 解法 |
| --- | --- |
| `vlib-35 Failed to create directory` | 库里**已存在**该目录 → 先 `rm -rf <lib>`，再 `vlib <lib>` 正规创建 |
| 60+ 个 `undefined macro` 连锁出错 | 纯 `` `define `` 文件（如 `param_def.v`）**必须复制到当前目录并加 `+incdir+.`**，否则 `package` 内看不到宏 |
| `vsim-3009 [TSCALE]` + Error loading design | interface/module 没写 `` `timescale `` |
| `vlog-13053 Illegal base specifier in numeric constant` | `` `timescale `` 的反引号打成了单引号 |
| `vlog-13300`/`vlog-13114` … | 带 `ref` 形参的函数/任务**必须 `automatic`**；function phase 里不能放 `#` 延时 |
| 数字基数写错（`8'dA1` / `8'C3` / 丢掉基数） | 基数与数值要匹配，这是新手高频错 |
| `(vlog-2570) Zero-length range with constant bounds. Low-bound and high-bound may be reversed.` | **`inside` / `bins` 里写了降序区间**（如 `{[3:0]}`）。只给 **Warning**，但 `randomize()` 会因此失败、覆盖率仓也会塌掉 → 一律改升序 `{[0:3]}` |
| `(vsim-3971) $cast to type 'class X' from 'class Y' failed` | 语句形式的 `$cast` 失败会**硬报错**；写成 `void'($cast(...))` 则完全静默 |

> **重要**：`vlog` **不报语义错误**——很多问题要到 `vsim` 的 **vopt 阶段**才暴露
> （`vopt-7063` / `vopt-2123` 等）。**"vlog 通过"不等于能跑。**

## 三、运行期坑

| 现象 | 原因 / 解法 |
| --- | --- |
| `(vopt-2122) Invalid format specification '% '` → `vopt-2064 ... code 2` → Error loading design | `$display` 里**裸百分号**，必须写 `%%` |
| 打印全是 `??????` 或乱码 | Questa 控制台编码问题 → **打印标签一律纯 ASCII** |
| `vlog-13067 unexpected non-printable character` | `$display` 字符串里**嵌套了 ASCII 双引号** |
| `vopt-2244 Variable is implicitly static` | 探针里的局部句柄加 `automatic` 修饰 |
| `vopt-7063 Failed to find 'xdisplay'` | 没有 `xdisplay` 这个任务，只有 `$display` 等 |
| SIGSEGV 崩溃 | 多为空句柄访问；崩溃后当前目录会留 `vsim_stacktrace.vstf` + `transcript`，收尾要清 |
| 常量越界访问静默通过 | Questa 对固定尺寸非打包数组的**常量**越界不报错 → 用 `foreach` / `$size()` 自保 |
| **仿真永不结束**（`run -all` 跑不完，只能 Ctrl+C / 超时 kill） | UVM 握手少了一步。最常见是 **driver 忘了 `item_done()`**。实测表现：sequence 只打印 1 次就卡死在 `finish_item`，而 driver 在**空转同一件 item**（因为 `get_next_item` 内部是 `peek`，从不弹出），并狂刷 `Get_next_item called twice without item_done or get in between`；仿真时间仍在走，所以看起来"没死"。详见 [[UVM · driver 与 sequence 的握手]] |

## 四、覆盖率流程（★ 核心坑）

```bash
vlog -work w -sv -cover bsectf xxx.sv
vsim -work w -coverage -c top -do "coverage save -onexit c.ucdb; run -all; quit -f"
vcover report -cvg -details c.ucdb
```

> **★ 根因**：Questa 控制台模式下，TB 里的 **`$finish` 会终止 `-do` 脚本**，
> 所以写在 `run -all` **之后**的 `coverage save` 根本执行不到（不报错，但等于没写）。
> **解法：`coverage save -onexit <file>` 必须写在 `run` 之前。**

细节见 [[SV · 功能覆盖率]]。

## 五、DPI-C 全流程（Windows 实测通过）

需要 C 编译器（本机 **w64devkit 解压在 `E:\Mingwn`**）：

```bash
export PATH="/e/Mingwn/bin:$PATH"

# ① 编译 SV
vlog -sv +incdir+<questa>/verilog_src/uvm-1.1d/src dpi_c_demo.sv

# ② 生成导出包装对象（Questa 自动编译它生成的 exportwrapper.c）
vsim -c -dpiexportobj dpi_export.obj -L mtiUvm tb -do "quit -f"

# ③ 编译 C 动态库 —— 必须链 Questa 的导入库 libmtipli.a
gcc -shared -o dpi_cases.dll dpi_cases.c dpi_export.obj \
    -I<E:/questasim/include> -L<E:/questasim/win64> -lmtipli

# ④ 带 DLL 运行
vsim -c -L mtiUvm -sv_lib dpi_cases tb -do "run -all; quit -f"
```

**三个必须记住的点**：

1. **必须有 C 编译器**，否则 vsim 加载设计报
   `vsim-7019 Can't locate a C/C++ compiler for 'DPI Export Compilation'`
2. **必须链 `-lmtipli`**，它提供 `svGetScope / mti_svExecuteTaskOrFunction / vl_trace_dpi_call` 等符号；
   不链会报 `undefined reference to svGetScope ...`
3. **用绝对路径调 `gcc.exe` 会失败**（`cannot execute 'as'`）——
   gcc 是驱动，靠 PATH 找 `as.exe`/`ld.exe`，**必须把 bin 目录加进 PATH**

**DPI 头号坑**：C 侧要回调 SV 的 **task** 时，import 声明必须是

```systemverilog
import "DPI-C" context task c_main();
```

写成 `function` 会 Fatal：
`vsim-3757 exported task must be called from a context imported *task*`
（纯 function 里不允许调 task），且导出 function 的调用也会报 `vsim-3756`。

**验证 DLL 导出符号**：

```bash
objdump -p dpi_cases.dll | grep -iE "c_main|sv_"
```

## 六、目录与产物规范

- **不往用户个人目录写仿真产物**；编译库、对照文件统一放工作区子目录
- 编译库名目录（`*_lib/`）与 `work/` 是产物，不是源码——建议在编辑器里隐藏
- 崩溃后的 `vsim_stacktrace.vstf` / `transcript` 记得清

## 相关笔记

- [[SV · 功能覆盖率]]
- [[SV · 系统任务与打印]]
- [[仿真工具 · 环境搭建]]
