---
title: 验证工程 · DPI-C 与 Python 脚本
category: 验证工程
tags: [DPI-C, Python, import, export, context, 回归, 覆盖率, 脚本]
date: 2026-10-21
---

> 这篇讲的是一个**边界问题**：哪些活该留在仿真进程里，哪些必须搬出去。
>
> DPI-C 是"往进程里开门"的工具，Python 是"在进程外干活"的工具。
> 两者经常被混为一谈，实际上优先级是反的 —— **能用 Python 在进程外解决的，就不要用 DPI 拉进进程内。**

---

## 一、先分清：这是两件不同的事

| | DPI-C | Python 脚本 |
| --- | --- | --- |
| 本质 | SystemVerilog 与 C/C++ 的**双向调用接口**（LRM 第 35 章） | 一种**进程外的自动化语言** |
| 解决什么 | SV 算不了的（复杂算法、现成 C 库、系统调用）、或 C 要驱动 SV | 批量调度、日志分析、报告生成、数据转换 |
| 用在哪一刻 | **仿真中**，跟着时钟走 | **仿真前后**，与仿真时间无关 |
| 代价 | 每次跨语言调用都要切上下文；编译链变复杂 | 需要额外的进程与文件 I/O |
| 典型误用 | 拿 DPI 算参考模型，每笔事务调一次 | 想在 Python 里"实时控制"波形 |

一句话：**DPI 是加法，Python 是减法。** 新手容易做加法（什么都想接进来），老手一直在做减法（能搬出去的全搬出去）。

---

## 二、DPI-C：SV 与 C 的双向门

### 2.1 四种声明，能力完全不同

| 声明 | 能干什么 | 不能干什么 | 什么时候用 |
| --- | --- | --- | --- |
| `import "DPI-C" function f();` | 收发参数，纯计算 | **碰不到 SV 层次**（不能读 `tb.dut.sig`） | C 侧只做算法 |
| `import "DPI-C" pure function f();` | 同上，且承诺无副作用 | 不能调 PLI、不能碰层次 | 数学函数（仿真器可缓存/重排） |
| `import "DPI-C" context function f();` | 能访问层次、能调 `$display`、能取 scope | 开销大（切上下文） | 需要读 DUT 内部信号 |
| `import "DPI-C" context task t();` | 上面全部 + **能调 SV 的 task** | 同上 | **C 回调 SV task（唯一正确写法）** |
| `export "DPI-C" function g();` | 反过来：让 C 调 SV | 只能导出 function，不能导出 task | 提供回调入口 |

> **★ 实测（QuestaSim 10.7c）**：C 侧要回调 SV 的 **task**，import 必须写成
> `import "DPI-C" context task c_main();`
> 写成普通 `function` 会直接 Fatal：`vsim-3757 exported task must be called from a context imported *task*`。
> 根因是 SV 语法本身：**function 里不允许调 task**，与仿真器无关。

**记忆口诀**：`pure` = 我保证不改任何东西；`context` = 我要摸仿真器的内部；两个都不写 = 我只算数。

### 2.2 类型映射（记这几行就够）

| SV 侧 | C 侧 | 备注 |
| --- | --- | --- |
| `byte / shortint / int / longint` | `char / short / int / long long` | 2-state，按位宽对应 |
| `bit` | `svBit`（`unsigned char`） | 2-state |
| `logic` | `svLogic`（`unsigned char`） | 4-state，X/Z 有专门编码 |
| `real / shortreal` | `double / float` | |
| `string` | `const char *` | **C 侧要拷走，指针只活到调用返回** |
| `chandle` | `void *` | 存 C 的句柄（如 Python 对象指针） |
| packed 数组 / packed struct | `svBitVecVal[]` 或对应位宽整数 | 按"压缩值"传，最省事 |
| `input` open array | `(const T *p, int size)` | 长度单独传一个参数 |
| `output` open array | `(T *p, int size)` | 同上，**调用前必须已分配** |

写接口时的默认选择：**能打包成 packed 就打包**。unpacked 数组和 struct 的映射规则繁琐，跨仿真器差异大，是移植时的雷区。

### 2.3 四步链路（本机实测通过）

```bash
export PATH="/e/Mingwn/bin:$PATH"          # w64devkit，不在 PATH 会报 vsim-7019

# ① 编译 SV
vlog -sv +incdir+<questa>/verilog_src/uvm-1.1d/src dpi_c_demo.sv

# ② 生成导出包装对象（Questa 自动生成并编译 exportwrapper.c）
vsim -c -dpiexportobj dpi_export.obj -L mtiUvm tb -do "quit -f"

# ③ 编 C 动态库 —— 必须链 libmtipli.a
gcc -shared -o dpi_cases.dll dpi_cases.c dpi_export.obj \
    -I<E:/questasim/include> -L<E:/questasim/win64> -lmtipli

# ④ 带库运行（-sv_lib 只写库名，不带 .dll、不带路径）
vsim -c -L mtiUvm -sv_lib dpi_cases tb -do "run -all; quit -f"
```

三个必记点：

1. **必须能找到 C 编译器**，否则 `vsim-7019 Can't locate a C/C++ compiler for 'DPI Export Compilation'`
2. **必须链 `-lmtipli`**，它提供 `svGetScope / mti_svExecuteTaskOrFunction / vl_trace_dpi_call`；不链会 `undefined reference`
3. **gcc 必须走 PATH**，用绝对路径调 `gcc.exe` 会 `cannot execute 'as'` —— gcc 是驱动，靠 PATH 找 `as.exe`/`ld.exe`

命令细节与报错清单见 [[仿真工具 · Questa 避坑手册]] 第五节，这里不重复。

### 2.4 一个最小闭环

```systemverilog
module tb;
  import "DPI-C" function int  c_add(input int a, input int b);
  import "DPI-C" context task c_drive(input int n);   // 要回调 SV task → context task

  export "DPI-C" function sv_show;                     // 给 C 用的回调入口

  function void sv_show(input int v);
    $display("[SV] callback value=%0d", v);
  endfunction

  initial begin
    $display("[SV] 3+4=%0d", c_add(3, 4));
    c_drive(5);
    $finish;
  end
endmodule
```

```c
#include <stdio.h>
#include "svdpi.h"

extern void sv_show(int v);        /* export 出来的 SV 函数，C 侧当普通函数声明 */

int c_add(int a, int b) { return a + b; }

void c_drive(int n) {              /* context task：允许回调 SV */
    int i;
    for (i = 0; i < n; i++) sv_show(i * 10);
}
```

编译后**先验符号再跑**，比事后查崩要快得多：

```bash
objdump -p dpi_cases.dll | grep -iE "c_add|c_drive|sv_"
```

### 2.5 什么时候**不该**用 DPI

这是比"怎么用"更值钱的判断：

- ❌ 参考模型能进程外批量算的 → 别每笔事务跨一次语言边界
- ❌ 只是想在 C 里 `printf` 一下 → 用 `$display`
- ❌ 想用 C 做"实时监控波形" → 该用 assertion 或 monitor
- ✅ 真有现成 C 库（加解密、图像、压缩、浮点算法）→ 值得
- ✅ 需要在 C 侧做文件/网络/系统调用 → 值得
- ✅ 要给已有 C 模型（DPI 是唯一标准接法）→ 值得

---

## 三、Python：三条路，优先级是反的

大多数人第一反应是"把 Python 嵌进仿真"，这恰恰是**投入产出比最低**的一条。

| 路线 | 怎么接 | 延迟 | 调试难度 | 推荐度 |
| --- | --- | --- | --- | --- |
| **A. 嵌入** | SV → DPI-C → `Py_Initialize` → `PyRun_*` | 最低 | 极高（GIL、崩溃无栈） | ⭐ 慎用 |
| **B. 桥接** | C 侧开 socket / 读写文件，与 Python 进程一问一答 | 中 | 中（可单独测） | ⭐⭐ 特定场景 |
| **C. 进程外** | 仿真只产出 log / ucdb，Python 事后处理 | 无（不占仿真时间） | 低（可反复重跑） | ⭐⭐⭐⭐⭐ 主力 |

**判断标准只有一条：这件事需不需要跟着时钟走？**

- 需要 → 留在进程内（SV 或 DPI）
- 不需要 → 搬出去（Python）

按这条标准，**九成的 Python 用途都在路线 C**：回归调度、结果分类、覆盖率统计、报告生成、激励与配置生成。

---

## 四、进程外脚本：四个真正值钱的场景

### 4.1 回归调度 + 种子扫描

随机验证的核心资产是"**可复现的失败**"，而可复现的前提是记录 seed。

```python
#!/usr/bin/env python3
"""并行回归：test × seed，落 log，汇总结果。"""
import re, subprocess
from concurrent.futures import ThreadPoolExecutor
from pathlib import Path

LOG = Path("regress_log"); LOG.mkdir(exist_ok=True)
TESTS = ["smoke_test", "rand_test", "err_test"]
SEEDS = range(1, 21)

def grab(pat, txt, default=-1):
    m = re.search(pat, txt)
    return int(m.group(1)) if m else default

def run_one(job):
    test, seed = job
    cmd = ["vsim", "-c", "-L", "mtiUvm", "-sv_seed", str(seed), "tb_top",
           "-do", f"run_test {test}; run -all; quit -f"]
    try:
        p = subprocess.run(cmd, capture_output=True, text=True,
                           errors="ignore", timeout=900)
        out = p.stdout
        (LOG / f"{test}_s{seed}.log").write_text(out, encoding="utf-8")
        return test, seed, grab(r"UVM_ERROR\s*:\s*(\d+)", out), \
                          grab(r"UVM_FATAL\s*:\s*(\d+)", out)
    except subprocess.TimeoutExpired:
        return test, seed, -2, -2          # -2 标记 TIMEOUT

rows = list(ThreadPoolExecutor(max_workers=8).map(run_one,
            [(t, s) for t in TESTS for s in SEEDS]))

bad = [r for r in rows if r[2] != 0 or r[3] != 0]
print(f"共 {len(rows)} 次，失败 {len(bad)} 次")
for t, s, e, f in bad:
    print(f"  FAIL {t:<12} seed={s:<4} UVM_ERROR={e:<3} UVM_FATAL={f}")
```

两个必须注意的点：

- **工作目录**：`vsim` 从当前目录找 `work` 库，脚本要在编译目录下运行（或用 `-work`/`-L` 指定）
- **并行度**：别超过物理核数；同时 Questa 的 license 数往往比 CPU 先成为瓶颈

### 4.2 结果 triage（最省人力的一个脚本）

回归跑完，真正费时间的是"从 200 份 log 里找出 3 个真问题"。Python 做的事是**分类与去重**，不是判断对错。

```python
PATTERNS = {
    "UVM_FATAL":  r"UVM_FATAL\s*:\s*[1-9]",
    "UVM_ERROR":  r"UVM_ERROR\s*:\s*[1-9]",
    "ASSERT":     r"\[ASSERT\]|Offending",
    "TIMEOUT":    r"\[TIMEOUT\]",
}
# 按 (test, 命中类型) 聚合，只把"同一类型的首个 log 路径"甩给人看
```

**关键设计**：triage 脚本只输出"**哪一类错、第一个例子在哪、共几次**"，不要把 200 份 log 全打出来。人只需要看第一份。

### 4.3 覆盖率：别去解析仿真器的输出格式

`vcover report -cvg -details` 的列格式**随版本变**，用正则硬啃是自找麻烦。

更稳的做法：**让 TB 打印你自己定义的格式**，Python 只解析你定的协议。

```systemverilog
// 在 report_phase 里
$display("COV|%s|%0.2f", "cg_pkt",  cg_pkt.get_coverage());
$display("COV|%s|%0.2f", "cg_addr", cg_addr.get_coverage());
$display("COV|TOTAL|%0.2f", $get_coverage());
```

```python
import re
from pathlib import Path

data = {}
for log in Path("regress_log").glob("*.log"):
    for name, val in re.findall(r"COV\|(\w+)\|([\d.]+)", log.read_text(errors="ignore")):
        data.setdefault(name, []).append(float(val))

for name, vals in data.items():
    print(f"{name:<12} min={min(vals):.2f}  avg={sum(vals)/len(vals):.2f}  n={len(vals)}")
```

好处有三：格式你自己定、可以带时间点（看到收敛曲线而不只是终值）、换仿真器不用改脚本。

多份 ucdb 合并仍用工具本身：

```bash
vcover merge total.ucdb cov_*.ucdb
vcover report -cvg -details total.ucdb
```

覆盖率的口径问题（加权平均、cross 分母、ignore_bins）见 [[SV · 功能覆盖率]]。

### 4.4 从 spec / Excel 生成激励与配置

寄存器有几百个时，手写必错。标准做法：

```
Excel / CSV  →  pandas 读  →  jinja2 渲染  →  .sv / .json / RAL model
```

收益不只是省时间，而是**让"spec 改了"变成一次重跑而不是一次手工同步**。这也是面试里能讲出"我做过什么工具"的素材。

---

## 五、嵌入 Python 的最小骨架（SV → C → Python）

> ⚠️ 本节是**通用做法**，本机未跑通完整用例。嵌入式 Python 的坑比 DPI 本身多一个数量级，除非必须，优先选路线 C。

```systemverilog
import "DPI-C" context function int py_init(input string dir);
import "DPI-C" context function int py_predict(input int a, input int b);
```

```c
#include <Python.h>
#include "svdpi.h"

int py_init(const char *dir) {
    Py_Initialize();
    char buf[512];
    snprintf(buf, sizeof(buf), "import sys; sys.path.insert(0, r'%s')", dir);
    PyRun_SimpleString(buf);
    return 1;
}

int py_predict(int a, int b) {
    PyGILState_STATE g = PyGILState_Ensure();       /* 每次调用都要拿 GIL */
    int ret = -1;
    PyObject *m = PyImport_ImportModule("model");
    if (m) {
        PyObject *r = PyObject_CallMethod(m, "predict", "ii", a, b);
        if (r) { ret = (int)PyLong_AsLong(r); Py_DECREF(r); }
        Py_DECREF(m);
    }
    if (PyErr_Occurred()) PyErr_Print();            /* 不打印就静默失败 */
    PyGILState_Release(g);
    return ret;
}
```

编译时必须链接 Python 库（Windows 上是 `python3xx.lib` + 运行期找 `python3xx.dll`）。

**四条硬规则**：

1. 每次进入都 `PyGILState_Ensure` / `Release`，否则多线程下必崩
2. **不要调 `Py_Finalize()`**（尤其在 `$finish` 前），多数工程直接让进程退出回收
3. Python 回调里**绝不能再回调仿真器** —— GIL 与仿真器线程模型不同，典型死锁源
4. `PyErr_Print()` 是唯一能看到 Python 异常的方式，漏了就是"返回 -1 但不知道为什么"

---

## 六、分工原则

```
仿真进程内  ←  必须跟着时钟走的：driver 时序、monitor 采样、实时 assertion、
               必须逐笔比对的 scoreboard 逻辑
───────────────────────────────────────────────
进程外      ←  其余全部：期望值批量计算、覆盖率统计、日志分类、
               回归调度、报告、激励生成、与 CI/缺陷系统对接
```

一个反直觉的结论：**把参考模型搬到进程外，往往比在 SV 里写更好维护**。
因为 Python 侧可以单独跑、单独测、单独 debug，而 SV 里的模型只能靠重跑仿真来验证。

代价是失去了"实时比对"能力（只能事后比）。折中方案：进程内做**结构检查**（协议合法性、X 传播、位宽），进程外做**数值比对**（期望值）。

---

## 七、避坑指南

**DPI-C 部分**

- [ ] C 要回调 SV **task** → 必须 `import "DPI-C" context task`，写 `function` 必报 `vsim-3757`
- [ ] gcc 必须通过 **PATH** 调用，绝对路径会 `cannot execute 'as'`
- [ ] 链接必须带 `-lmtipli`，否则 `undefined reference to svGetScope`
- [ ] `-sv_lib` 只写库名，**不带 `.dll`、不带 `.exe` 后缀**
- [ ] C 侧拿到的 `const char*` **只活到调用返回**，要留就 `strdup`
- [ ] `output` open array 的长度参数与指针**成对出现**，且内存必须调用前已分配
- [ ] 32/64 位库与 vsim 不匹配 → 加载失败或调用点崩溃，先查位数
- [ ] 跑之前用 `objdump -p x.dll | grep` 确认导出符号真的在

**Python 部分**

- [ ] `$system()` 是**阻塞**调用，会占住仿真时间，别在时序敏感的 phase 里用
- [ ] Windows 路径统一用**正斜杠**，避免转义地狱
- [ ] 相对路径基于**启动 vsim 的目录**，不是 `.do` 文件所在目录
- [ ] 每个 test 必须落 **seed**，否则失败不可复现（等于没跑）
- [ ] 并行数看 license，不只看 CPU
- [ ] 不要 `Py_Finalize()`；每次调用都要 `PyGILState_Ensure`
- [ ] 覆盖率解析**解析自己打印的格式**，不要去啃 `vcover` 的列

---

## 相关笔记

- [[仿真工具 · Questa 避坑手册]] — DPI 四步命令与报错清单（第五节）
- [[验证工程 · 骨架速记]] — 这些工具最终要嵌进的那套骨架
- [[验证工程 · test与场景编排]] — 回归与场景组织，脚本调度的输入
- [[验证工程 · scoreboard参考模型]] — 进程内比对 vs 进程外比对的取舍
- [[SV · 功能覆盖率]] — 覆盖率口径，脚本解析的上游
- [[面试题 · 覆盖率与断言]] — DPI 的概念题答法
