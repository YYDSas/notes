---
title: 仿真工具 · Questa 命令行与 Makefile
category: 仿真工具
tags: [Questa, 命令行, Tcl, do文件, Makefile, 脚本]
date: 2026-10-04
order: 2
---

> 每次敲同样一长串 `vlog` / `vsim` 命令，早晚会想把它们收进脚本。
> 本篇把"到底有几种语言混在一起"讲清楚，并给一份**实测可用**的 Makefile 模板。

## 一、先分清三层语言（最容易懵的地方）

同一条命令行里其实叠了 **三种不同语言**：

| 层 | 例子 | 谁来解释 |
| --- | --- | --- |
| **Shell**（Git Bash） | `cd`、`rm -rf work`、`printf ... > r.do`、`\| grep` | bash |
| **工具命令行选项** | `-work work`、`-sv`、`-cover bsectf`、`-coverage`、`-c`、`-do` | vlog / vsim 自己的参数解析 |
| **Tcl 脚本**（do 文件 / `-do "..."`） | `coverage save -onexit c.ucdb;`、`run -all;`、`quit -f` | vsim 内嵌的 **Tcl 解释器** |
| （工程化）Makefile | `cov: comp` + TAB 缩进的命令 | make 程序 |

所以 `coverage save -onexit pc.ucdb; run -all; quit -f` 这一串**是 Tcl**（分号是 Tcl 的命令分隔符，`-onexit` 是 Questa 命令的选项）；
而 `printf` 是 **bash** 在"生成"一个 Tcl 文件（`r.do`）。

## 二、do 文件 = Tcl 脚本

```tcl
# 注释（必须出现在命令位置）
set top tb                     ;# 赋值，取值写 $top
puts "top = $top"              ;# 打印（Tcl 版 $display）
foreach ch {0 1 2} { puts "ch $ch" }
if {[expr {$i > 2}]} { puts big } else { puts small }
```

- 一行一条命令，也可以用 `;` 分隔多条
- `{ }` = 原样字符串（不替换变量）；`[ ]` = 命令替换（把命令输出嵌进来）
- 开 GUI 加波形的 `wave.do`、分阶段跑的 `run.do` **都是 Tcl**

常用的 Questa 内建命令（在 vsim 里敲 `help`、`help coverage` 可查全部）：

| 命令 | 用途 |
| --- | --- |
| `run -all` / `run 100ns` | 跑到底 / 跑指定时间 |
| `quit -f` | 退出（`-f` 不弹确认） |
| `coverage save -onexit x.ucdb` | 注册"退出时保存覆盖率"（见下一节） |
| `coverage save x.ucdb` | 立即保存 |
| `do wave.do` | 执行另一个 do 文件 |
| `add wave` / `restart -f` / `force` / `when` | 波形与激励控制 |
| `onerror {resume}` | 出错继续（写 do 文件时常用） |
| `transcript file x.log` | 记录控制台输出 |

## 三、覆盖率命令的关键顺序（坑）

```bash
vlog -work w -sv -cover bsectf xxx.sv          # ① 编译期插桩（必须）
vsim -work w -coverage -c top \
     -do "coverage save -onexit c.ucdb; run -all; quit -f"   # ② save 必须在 run 之前
vcover report -cvg -details c.ucdb             # ③ 出报告
```

**为什么 `coverage save` 要写在 `run` 之前**：控制台模式下 TB 里的 `$finish` 会**终止 `-do` 脚本**，
写在 `run` 之后的保存命令根本执行不到（不报错、但等于没写）。`-onexit` 是退出钩子，提前登记就能生效。

> 详见 [[SV · 功能覆盖率]] 第六节（含"TB 无 `$finish`"的另一种解法）。

**想看"跑到某阶段"的快照**（TB 有 `$finish` 也能用）：用限时 `run` ——
`-do "run 50ns; coverage save partA.ucdb; quit -f"`（没跑到 `$finish`，`-do` 就继续往下执行）。

## 四、一键脚本骨架（bash）

```bash
#!/usr/bin/env bash
set -u
Q=/e/questasim/win64
rm -rf work *.ucdb transcript vsim_stacktrace.vstf
"$Q/vlog" -work work -sv -cover bsectf x.sv                     # 看最后一行 Errors: 0
"$Q/vsim" -work work -coverage -c top -do "coverage save -onexit c.ucdb; run -all; quit -f"
"$Q/vcover" report -cvg -details c.ucdb
```

要点：① 先清 work（`vlog` 遇到已存在的库会报 `vlib-35`）；② 编译失败要立刻停，别浪费一轮仿真。

## 五、Makefile 模板（实测可用）

```make
QUESTA  ?= /e/questasim/win64
VLOG    ?= $(QUESTA)/vlog
VSIM    ?= $(QUESTA)/vsim
VCOVER  ?= $(QUESTA)/vcover

SRC     ?= packet_cov.sv      # 源文件，多个用空格分隔
TOP     ?= packet_cov         # 顶层 module 名
W       ?= work               # 编译库目录
UCDB    ?= pc.ucdb            # 覆盖率数据库
COVER   ?= bsectf
RUNARG  ?= -all

VLOG_OPTS ?= -sv -work $(W) -cover $(COVER)
VSIM_OPTS ?= -work $(W) -coverage -c $(TOP)

.PHONY: all comp run cov report partA gui clean help
all: cov

comp:
	$(VLOG) $(VLOG_OPTS) $(SRC)

run:
	$(VSIM) -work $(W) -c $(TOP) -do "run $(RUNARG); quit -f"

cov: comp
	$(VSIM) $(VSIM_OPTS) -do "coverage save -onexit $(UCDB); run $(RUNARG); quit -f"

report:
	$(VCOVER) report -cvg -details $(UCDB)

partA: comp
	$(VSIM) $(VSIM_OPTS) -do "run 50ns; coverage save partA.ucdb; quit -f"
	$(VCOVER) report -cvg -details partA.ucdb

clean:
	rm -rf $(W) *.ucdb *.wlf transcript vsim_stacktrace.vstf
```

用法（**命令行变量可以覆盖 makefile 里的默认值**，这是它最爽的地方）：

```bash
make cov                                        # 跑默认工程
make cov SRC=xxx.sv TOP=my_tb UCDB=my.ucdb      # 换个工程，一行搞定
make -n cov                                     # ★ 只看它打算执行什么，不真的跑
make clean
```

## 六、Makefile 的三个坑

| 坑 | 现象 | 解法 |
| --- | --- | --- |
| **缩进必须是 TAB** | 命令前用空格 → `missing separator` | 用 `awk '/^\t/' Makefile` 自检 |
| **行尾注释会吃掉空格** | `VAR = value   # 注释` → 变量值里**带上那串空格**（`make -n` 能看见），拼出来的命令到处是多余空格 | **注释单独放一行** |
| 伪目标没声明 | 目录里恰好有同名文件时，目标"不执行" | 写 `.PHONY: comp run cov ...` |

> `?=` 表示"没定义才赋值"，所以命令行传入的值优先级最高；`:=` 是立即展开、`=` 是延迟展开。

## 七、学习路径（最短）

1. **先用再改**：改 Makefile 顶部的 `?=` 变量，先把流水线跑通。
2. **`make -n` 当透视镜**：想确认自己写对了没，`make -n` 只打印不执行 —— 学 Makefile 最有效的单一技巧。
3. **出现第二次重复就抽变量**：同一串开关敲第二遍，就该抽成 `VLOG_OPTS` / `VSIM_OPTS`。
4. **Tcl 从 do 文件入手**：先改时间点和保存点，需要循环/条件了再学 `set` / `foreach` / `if`。
5. 想系统看：GNU Make Manual（免费官方）+ Questa 手册的 "Tcl scripting" 章节。

## 相关笔记

- [[仿真工具 · Questa 避坑手册]]
- [[SV · 功能覆盖率]]
- [[仿真工具 · 环境搭建]]
