/* 自测题库 —— 由笔记内容整理，每题对应一篇笔记。
   字段：id / note(笔记路径，用于跳回原文) / title / cat / q(题干) / a(答案要点) */
window.QUIZ_QUESTIONS = [
 {
  "id": "svmap-1",
  "note": "notes/SystemVerilog/知识地图.md",
  "title": "SV · 知识地图",
  "cat": "SystemVerilog",
  "q": "判断\"代码里有几个对象\"最可靠的方法是什么？（列出哪些写法不产生对象）",
  "a": "数 new() 执行了几次 —— 调了几次 new 就有几个对象。\n不产生对象的写法：① 只声明句柄（Transaction t;）② 句柄赋值 t2 = t1;（只是复制门牌号）③ push_back 进队列（存的是句柄）④ 句柄数组 new[5]（只分配 5 个空槽，槽里是 null）。"
 },
 {
  "id": "svmap-2",
  "note": "notes/SystemVerilog/知识地图.md",
  "title": "SV · 知识地图",
  "cat": "SystemVerilog",
  "q": "遇到\"看着对但结果是错的\"这类问题，笔记里建议先问自己哪一个判断题？为什么？",
  "a": "先问\"这是句柄还是对象\"。\n因为绝大多数 SV 陷阱都出在这个区分上：句柄复制 vs 对象复制、共享 vs 独立、静态类型 vs 实际类型。"
 },
 {
  "id": "svmap-3",
  "note": "notes/SystemVerilog/知识地图.md",
  "title": "SV · 知识地图",
  "cat": "SystemVerilog",
  "q": "概念拿不准时，本机有什么条件可以当场确认？写出标准命令。",
  "a": "本机装了 QuestaSim，任何行为都可以实测，不要靠记忆或二手资料：\n  vlog -sv x.sv\n  vsim -c -do \"run -all; quit -f\" <顶层模块名>\n（UVM 例子用 vsim -c -L mtiUvm +UVM_TESTNAME=<test> <top>）"
 },
 {
  "id": "svclass-1",
  "note": "notes/SystemVerilog/类与对象基础.md",
  "title": "SV · 类与对象基础",
  "cat": "SystemVerilog",
  "q": "SV 函数参数默认按值传递。为什么下面这段外面拿不到新对象？正确写法是什么？\nfunction void create(Transaction tr); tr = new(); endfunction\nTransaction t;\ncreate(t);\nt.addr = 10;",
  "a": "因为默认传的是【句柄的副本】。执行过程：\n① 传参时 tr 拿到 t 的副本（此时都是 null）\n② tr = new() 只让局部变量 tr 指向新对象，外部 t 不受影响\n③ 函数返回后 tr 销毁，新对象失去引用成为垃圾\n④ 外部 t 从头到尾都是 null → t.addr 空指针访问\n正确写法：function automatic void create(ref Transaction tr);\n必须加 ref；且带 ref 形参的函数/任务【必须声明为 automatic】（否则 vlog-13300）。"
 },
 {
  "id": "svclass-2",
  "note": "notes/SystemVerilog/类与对象基础.md",
  "title": "SV · 类与对象基础",
  "cat": "SystemVerilog",
  "q": "下面循环结束后 fifo[0] / fifo[1] / fifo[2] 各是多少？为什么？要保存 3 个不同状态怎么改？\nt = new();\nfor (int i = 0; i < 3; i++) begin\n  t.addr = i << 2;\n  fifo.push_back(t);\nend",
  "a": "全是 8。\npush_back 存的是【句柄】不是快照，三次压入的是同一个对象；循环结束后该对象 addr 停在 2<<2 = 8。\n改法：把 new() 挪进循环 —— 每次 new 出一个新对象再压入，这样 3 个元素分别是 0、4、8。"
 },
 {
  "id": "svclass-3",
  "note": "notes/SystemVerilog/类与对象基础.md",
  "title": "SV · 类与对象基础",
  "cat": "SystemVerilog",
  "q": "类里 logic [31:0] addr = 'h10;，构造函数 new(int a = 3, int d = 5) 里写了 addr = a;。\n调用 new(10) 之后 addr / a / d 各是多少？",
  "a": "addr = 10、a = 10、d = 5。\n规则：声明处的初始化【先执行】（addr = 'h10 = 十进制 16），构造函数体【后执行】并覆盖它（addr = a = 10）。\na 被外部传入的 10 覆盖了默认值 3；d 没传，用默认值 5。\n易混点：'h10 是十六进制 = 16，传入的 10 是十进制 = 10。"
 },
 {
  "id": "svencap-1",
  "note": "notes/SystemVerilog/封装-local-protected.md",
  "title": "SV · 封装 local / protected",
  "cat": "SystemVerilog",
  "q": "local 和 protected 的分界线在哪？各自谁能访问？用一句口诀记。",
  "a": "protected：本类 ✅、子类 ✅、类外部 ❌\nlocal    ：本类 ✅、子类 ❌、类外部 ❌\n分界线就是【子类】：protected 允许子类，local 连子类都拒绝。\n口诀：local 是\"亲儿子都不给看\"，protected 是\"亲儿子可以看\"。"
 },
 {
  "id": "svencap-2",
  "note": "notes/SystemVerilog/封装-local-protected.md",
  "title": "SV · 封装 local / protected",
  "cat": "SystemVerilog",
  "q": "clock 类里 is_summer / nclock 都是 local，get_clock() 和 set_summer() 是 public。\nck.get_clock() → 6；ck.set_summer(1)；ck.get_clock() → 7；那么 ck.nclock 呢？",
  "a": "编译报错：Illegal access to local member nclock（vlog-8688）。\n注意陷阱：set_summer(1) 调用本身【合法】，确实把 is_summer 改成了 1，所以第二次 get_clock() 才返回 7。\n但题目若让你【直接访问 ck.nclock】，就撞上 local 的限制 —— 这就是考点。"
 },
 {
  "id": "svencap-3",
  "note": "notes/SystemVerilog/封装-local-protected.md",
  "title": "SV · 封装 local / protected",
  "cat": "SystemVerilog",
  "q": "为什么需要封装？列三条理由。",
  "a": "① 隐藏实现细节：外部只能通过 get_clock() / set_summer() 交互，不能乱改内部状态\n② 可维护：内部算法改了（比如夏天改成 +2），外部调用代码一行都不用动\n③ 防误用：避免外部代码绕过校验直接写字段"
 },
 {
  "id": "svinherit-1",
  "note": "notes/SystemVerilog/继承与virtual方法.md",
  "title": "SV · 继承与 virtual 方法",
  "cat": "SystemVerilog",
  "q": "super.clone(ct) 里的 super 到底是什么？应该怎么读它？",
  "a": "super 是「父类版本的方法」，不是句柄、不指向任何对象。\n读作\"调用【父类版本的】clone 方法\"，是【静态绑定】，不受多态影响。\n错误读法：\"父类句柄调 clone\"。"
 },
 {
  "id": "svinherit-2",
  "note": "notes/SystemVerilog/继承与virtual方法.md",
  "title": "SV · 继承与 virtual 方法",
  "cat": "SystemVerilog",
  "q": "t2 = t1.clone() 这次调用里，clone 内部一共执行了几次 new()？t1 和 t2 是同一个对象吗？",
  "a": "1 次。t1.clone() 没传参数，用的默认值 null → 子类 clone 里走 ct = new() 分支，造出新对象。\n不是同一个对象：t2 是 clone 出来的新对象（t1 是原对象）。\n父类 clone 被调用时收到的是 ct（非 null），所以【不再 new】。"
 },
 {
  "id": "svinherit-3",
  "note": "notes/SystemVerilog/继承与virtual方法.md",
  "title": "SV · 继承与 virtual 方法",
  "cat": "SystemVerilog",
  "q": "clone 里写 c.data = this.data;（data 是动态数组），这是深拷贝还是浅拷贝？要深拷贝怎么写？",
  "a": "浅拷贝。data 是动态数组，赋的是【句柄】，新对象和源对象共享同一块数组内存。\n深拷贝：c.data = new[this.data.size()](this.data);"
 },
 {
  "id": "svcast-1",
  "note": "notes/SystemVerilog/类型转换与cast.md",
  "title": "SV · 类型转换与 $cast",
  "cat": "SystemVerilog",
  "q": "用一句话说 $cast 到底做了什么？它【不】做什么？",
  "a": "做两件事：① 运行时类型检查 ② 给同一个对象【再加一个句柄】。\n不做的：不创建对象、不复制数据、不改变对象的实际类型。\n它的定位是\"给同一个对象换一个更具体的句柄\"。"
 },
 {
  "id": "svcast-2",
  "note": "notes/SystemVerilog/类型转换与cast.md",
  "title": "SV · 类型转换与 $cast",
  "cat": "SystemVerilog",
  "q": "$cast 的两个反直觉行为：源句柄是 null 时返回什么？类型不匹配失败时目标句柄会怎样？",
  "a": "① 源为 null 时返回 1（\"成功\"），目标句柄被赋为 null —— 不报错不警告，等你调方法才崩。\n② 类型不匹配时返回 0，且【目标句柄保持原值】，不会被置成 null。\n推论：绝不能依赖\"失败后目标会变 null\"来兜底，必须判返回值。最危险的形态是循环里复用同一个目标句柄 —— 某轮失败后它还保留着上一轮成功的对象，访问到的是错误对象，不报空指针、数据静默错乱。"
 },
 {
  "id": "svcast-3",
  "note": "notes/SystemVerilog/类型转换与cast.md",
  "title": "SV · 类型转换与 $cast",
  "cat": "SystemVerilog",
  "q": "enum 和 int 互转：哪个方向必须用 $cast？$cast 检查的是区间还是成员？函数形式和语句形式越界时行为差在哪？",
  "a": "enum → int：【不需要】转换，直接赋值（同族子类型天然合法）。\nint → enum：【必须】$cast（这才是 $cast 存在的核心理由）。\n检查的是「这个值是不是枚举成员」，【不是】区间 —— 枚举值可以不连续（如 {A=0, B=10}），$cast 只认成员。\n函数形式 ok = $cast(val, cor); 越界返回 0，静默；语句形式 $cast(val, cor); 越界【硬报错】vsim-3971。\n报错原文格式是「to type X from Y」：X 是【目标】（第一个参数），Y 是【源】—— 方向最容易读反。"
 },
 {
  "id": "svwidth-1",
  "note": "notes/SystemVerilog/数据类型与位宽.md",
  "title": "SV · 数据类型与位宽",
  "cat": "SystemVerilog",
  "q": "bit [3:0][7:0] arry [2:0]; 的 $bits / $size / $dimensions 各是多少？哪边是打包维度？",
  "a": "$bits = 96、$size = 3、$dimensions = 2。\n变量名【左边】是打包维度 [3:0][7:0]（4×8 = 32 bit），【右边】是非打包维度 [2:0]（3 个元素）。\n所以：$size(arry) = 3（第一维 = 非打包维度），$size(arry,2) = 4，$bits(arry[0][0]) = 8。"
 },
 {
  "id": "svwidth-2",
  "note": "notes/SystemVerilog/数据类型与位宽.md",
  "title": "SV · 数据类型与位宽",
  "cat": "SystemVerilog",
  "q": "bit [3:0][7:0] arry [1:0]; arry[0] = 16'hFF; 之后 arry[0] 是多少？会报警告吗？",
  "a": "arry[0] = 32'h0000_00FF，高位【零扩展】。\n不会报警告（实测 Warnings: 0）—— 扩展和截断【两个方向都静默】。\n想要满字节 FF 要写 32'hFFFF_FFFF 或 {4{8'hFF}}；16'hFFFF 只会得到 0000ffff。"
 },
 {
  "id": "svwidth-3",
  "note": "notes/SystemVerilog/数据类型与位宽.md",
  "title": "SV · 数据类型与位宽",
  "cat": "SystemVerilog",
  "q": "重复拼接 {n{expr}} 的两条硬约束是什么？{4{4'hFF}} 得到多少位、值是多少？",
  "a": "规则：内层复制 n 份，位宽 = 内层位宽 × n（自决定，不被上下文撑宽）。\n两条硬约束（都实测报错）：\n① 内层字面量必须【定宽】—— {4{'hFF}} 里 'hFF 是 unsized（按 32 位算）→ 结果 128 位并报 vopt-2121 Illegal concatenation of an unsized constant\n② 重复次数必须是【常量】—— {n{4'hF}}（n 是变量）→ vlog-8303 Repetition multiplier must be constant\n{4{4'hFF}}：内层 4'hFF 先被截成 4'b1111，重复 4 次 = 16'hFFFF（同时报 vlog-2600 Redundant digits）。\n易混：{4{4'h1}} = 16'h1111（不是 ffff）；{16{1'b1}} = 16'hFFFF。"
 },
 {
  "id": "svarray-1",
  "note": "notes/SystemVerilog/数组与队列.md",
  "title": "SV · 数组与队列",
  "cat": "SystemVerilog",
  "q": "动态数组 byte a[]; 和队列 byte q[$]; 在\"要不要 new\"上有什么区别？\n句柄数组 packet ps[] = new[5]; 之后，一共创建了几个对象？",
  "a": "动态数组【必须】a = new[n] 才有元素；队列【声明即创建】，是\"空但可用\"的状态，直接 push_back / size()。\n句柄数组 new[5] 之后：【0 个对象】。new[5] 只分配 5 个【句柄槽】，槽里全是 null，不会替每个元素调构造函数。\n要有对象还得逐个 ps[i] = new();"
 },
 {
  "id": "svarray-2",
  "note": "notes/SystemVerilog/数组与队列.md",
  "title": "SV · 数组与队列",
  "cat": "SystemVerilog",
  "q": "ps = new[8](ps); 和 ps = new[8]; 的区别是什么？",
  "a": "带括号的第二个参数是【源数组】：新建 8 个，前 5 个复制旧内容，新增 3 个为 null —— 语义是\"新建更大的、把老的拷进来\"。\n不带源参数的 new[8] 是【全新分配】，老元素全部丢失。"
 },
 {
  "id": "svarray-3",
  "note": "notes/SystemVerilog/数组与队列.md",
  "title": "SV · 数组与队列",
  "cat": "SystemVerilog",
  "q": "packet comp [2]; 和 packet comp2 [0:2]; 的 $size 和合法下标分别是多少？\n另外 Questa 对固定尺寸非打包数组的常量越界访问是什么行为？",
  "a": "comp[2]：单个数字 = 元素【个数】→ $size = 2，合法下标 0、1\ncomp2[0:2]：范围写法 = 下标【范围】→ $size = 3，合法下标 0、1、2\nQuesta 对固定尺寸非打包数组的【常量】越界访问【不报错】（声明 comp[2] 却访问 comp[2]：编译 0 错 0 警、运行静默通过）。\n所以 off-by-one 不会自己暴露 —— 写遍历一律用 foreach，或先 $size() 自保。"
 },
 {
  "id": "svrand-1",
  "note": "notes/SystemVerilog/随机约束.md",
  "title": "SV · 随机约束",
  "cat": "SystemVerilog",
  "q": "p.randomize() 返回 0（失败）时，rand 变量会变成什么？你打算怎么测出这个结论？",
  "a": "失败时 rand 变量【保持原值不变】，不会清零。\n测法：必须先给哨兵值（比如先设 length = 777）或先成功随一次 —— 因为对象 new() 后 rand 本来就是 0，用 0 根本区分不了\"清零\"和\"保持\"。\n结论要点：LRM 未强制规定失败后的取值（实现相关），所以【绝不能依赖失败后的值，必须判断 randomize() 的返回值】。"
 },
 {
  "id": "svrand-2",
  "note": "notes/SystemVerilog/随机约束.md",
  "title": "SV · 随机约束",
  "cat": "SystemVerilog",
  "q": "inside {3,5} 和 inside {[3:5]} 有什么区别？\n如果类内写 da.size() inside {[3:5]}，inline 写 da.size() inside {3,5}，最终 size 能取哪些值？",
  "a": "{3,5} 是【枚举集合】，只有 3 和 5 两个成员；{[3:5]} 是【区间】，含 3、4、5。\ninline 约束与类内约束是【求交】→ 最终 size ∈ {3, 5}，【长度 4 不可能】。\n别把 {3,5} 口头读成\"3 到 5\"；看到 inside 先逐字符确认是花括号枚举还是方括号区间。\n联动：foreach(da[i]) da[i] < da[i+1]; 展开的条数 = size()-1，由随机结果反推，不是固定的（size=3 时 2 条，size=5 时 4 条）。"
 },
 {
  "id": "svrand-3",
  "note": "notes/SystemVerilog/随机约束.md",
  "title": "SV · 随机约束",
  "cat": "SystemVerilog",
  "q": "rand bit [7:0] payload[]; 【漏掉】payload.size() 约束会怎样？\nsolve ... before ...; 有什么语法限制？",
  "a": "漏掉 size 约束时 randomize() 返回 1（成功！）但 size = 0 —— 无 error、无 warning，静默失败；cg.sample() 调 0 次，功能覆盖率 0%。\n两条必记：① 动态数组的 size 必须显式约束 ② 约束了 size ≠ 约束了元素，逐元素要用 foreach(payload[i])。\nsolve ... before ...; 【只能写变量名】，写表达式（如 payload.size()）报 vlog-13022。正确做法是加辅助变量：\n  rand int pkt_len;\n  constraint c { solve pkt_len before fsm_state; payload.size() == pkt_len; }"
 },
 {
  "id": "svclock-1",
  "note": "notes/SystemVerilog/时钟与竞争.md",
  "title": "SV · 时钟与竞争",
  "cat": "SystemVerilog",
  "q": "什么是竞争窗口？用时间戳把实测现象描述出来。",
  "a": "TB 在 posedge 驱动、监视器在【同一时刻】采样读值 → 同一时刻既读到旧值又写入新值：\n  [25000] posedge | plain_if.sig = 0     ← 监视器读到旧值 0\n  [25000] TB (plain): drove sig=1        ← TB 在同一时刻写入 1\n谁先谁后由仿真器调度决定，【标准不保证顺序】。这就是经典 race condition。\n基本时序纪律：数据在 negedge 改，采样在 posedge 等 —— 让驱动和采样天然错开半个周期。"
 },
 {
  "id": "svclock-2",
  "note": "notes/SystemVerilog/时钟与竞争.md",
  "title": "SV · 时钟与竞争",
  "cat": "SystemVerilog",
  "q": "clocking block 怎么消除竞争？output #1ns 和 input #1ns 各自的语义是什么？",
  "a": "output #1ns：驱动【推迟】到采样点之后 1ns 才生效\ninput #1ns ：采样取的是【1ns 之前】的稳定值\n实测：改用 output #1ns 后，驱动落到 posedge+1ns，无人竞争。\n它的价值：把\"什么时候驱动、什么时候采样\"从【运行期运气】变成【接口里的规格】—— 这也是 UVM 里 interface 内建 drv_ck / mon_ck 的原因。"
 },
 {
  "id": "svclock-3",
  "note": "notes/SystemVerilog/时钟与竞争.md",
  "title": "SV · 时钟与竞争",
  "cat": "SystemVerilog",
  "q": "实测发现：用了 clocking 和不用 clocking，sum 都是 60。这说明什么？正确的教学口径是什么？",
  "a": "说明这次竞争【碰巧】没有导致错误结果（Questa 在 -O0/-O3/-O5 下调度一致）。\n正确口径：「竞争没出错」不等于「没有竞争」。\nSV 标准不保证顺序，clocking 的价值是【从结构上确定顺序，而不是依赖运气】—— 换工具、换版本、换优化级别都可能翻车。"
 },
 {
  "id": "svcov-1",
  "note": "notes/SystemVerilog/功能覆盖率.md",
  "title": "SV · 功能覆盖率",
  "cat": "SystemVerilog",
  "q": "单个 covergroup 的分数怎么算？$get_coverage() 怎么算？报告里的 \"32/95 仓\" 是总分吗？",
  "a": "单个 coverpoint / cross：命中仓 ÷ 该项总仓数（default / illegal_bins 不计入分母）\n单个 covergroup：它各项（coverpoint + cross）百分比的【加权平均】（默认权重 1）\n$get_coverage()：所有 covergroup 分数的【算术平均】（每个 CG 等权，与仓数无关）\n不是。32/95 只是\"命中仓数/总仓数\"（= 33.68%），而 TOTAL 是 66.52% —— 一个 64 仓的 cross 和一个 3 仓的 coverpoint 在总分里权重相同。"
 },
 {
  "id": "svcov-2",
  "note": "notes/SystemVerilog/功能覆盖率.md",
  "title": "SV · 功能覆盖率",
  "cat": "SystemVerilog",
  "q": "MCDF basic test 总分 53.47% 是怎么算出来的？\n为什么 cg_mcdf_reg_write_read 的分数就等于它那个 cross 的分数（12/18）？",
  "a": "53.47 = (66.67 + 41.67 + 66.67 + 25 + 87.5 + 33.33) / 6 —— 6 个 covergroup 等权平均。\n原因是那三个 covergroup 把 addr / cmd / wdata / rdata 这些\"只为喂 cross\"的 coverpoint 全设了 type_option.weight = 0\n→ 这些项被【从评分里剔除】，于是 covergroup 分数就等于主 cross 的分数。\n（没设 weight 的 cg_formatter_length 就是 (100 + 75)/2 = 87.5。）\n实用推论：想让某个 coverpoint\"只统计不拉分\"，给它 type_option.weight = 0。"
 },
 {
  "id": "svcov-3",
  "note": "notes/SystemVerilog/功能覆盖率.md",
  "title": "SV · 功能覆盖率",
  "cat": "SystemVerilog",
  "q": "Questa 覆盖率\"跑不出来\"的头号根因是什么？写出正确流程，并说明为什么 save 要写在 run 之前。",
  "a": "根因：控制台模式下 TB 里的 $finish 会【终止 -do 脚本】，所以写在 run -all【之后】的 coverage save / report 根本执行不到 —— 命令不报错，但等于没写。\n正确流程：\n  vlog -work w -sv -cover bsectf xxx.sv\n  vsim -work w -coverage -c top -do \"coverage save -onexit c.ucdb; run -all; quit -f\"\n  vcover report -cvg -details c.ucdb\n因为 -onexit 是【退出钩子】，提前登记才能在 $finish 之后仍然写盘。vlog 和 vsim 必须【同时】带覆盖率选项。\n（另一种解法：TB 无 $finish 时可用限时 run，如 -do \"run 200ns; coverage save c.ucdb; quit -f\"。）"
 },
 {
  "id": "svprint-1",
  "note": "notes/SystemVerilog/系统任务与打印.md",
  "title": "SV · 系统任务与打印",
  "cat": "SystemVerilog",
  "q": "想打印一行 \"sum = 100%\" 该怎么写？直接写 % 会怎样？",
  "a": "必须写 %%（即 \"sum = 100%%\"）。\n裸百分号会报 (vopt-2122) Invalid format specification，并连锁 vopt-2064 back-end code generation terminated with code 2 → Error loading design。\n另一个方向：参数多于格式符时 Questa 按默认十进制补打，属实现行为、不可移植；而漏给参数的 %d 会报 vopt-2123（硬报错）。"
 },
 {
  "id": "svprint-2",
  "note": "notes/SystemVerilog/系统任务与打印.md",
  "title": "SV · 系统任务与打印",
  "cat": "SystemVerilog",
  "q": "为什么探针脚本的打印标签必须是纯 ASCII？还有哪个字符在 $display 字符串里不能出现？",
  "a": "因为 Questa 控制台会把 $display 里的中文显示成 ?????? 或乱码（编码问题）。写 [PHASE] start 而不是 [相位] 开始。\n另一个：字符串里【不能嵌套 ASCII 双引号】，会直接编译报错 vlog-13067 unexpected non-printable character。\n（顺带：没有 xdisplay 这个任务，只有 $display / $write / $strobe / $monitor，漏写 $ 会报 vopt-7063 Failed to find。）"
 },
 {
  "id": "svprint-3",
  "note": "notes/SystemVerilog/系统任务与打印.md",
  "title": "SV · 系统任务与打印",
  "cat": "SystemVerilog",
  "q": "$timeformat(unit_number, ...) 的 unit_number 是什么含义？\n默认 ps 下 2.234ns 打印成 2234，怎么让它显示成 2.234ns？为什么 $time 打不出小数？",
  "a": "unit_number = 【log10(秒)】：-12 = ps、-9 = ns、-6 = us、-3 = ms、0 = s。\n$timeformat(-9, 3, \"ns\", 0) → 输出 2.234ns。\n小数部分【只有 $realtime 有】：同一时刻 $time 打印 2000.00ps（整数 2ns 再换算），$realtime 打印 2234.00ps。\n另外 %t 按 timescale 的【精度】渲染：1ns/1ps 下 1ns 打印成 @1000；想显示成 @1ns 就设 $timeformat(-9, 0, \"ns\", 0) 或把 timescale 写成 1ns/1ns。"
 },
 {
  "id": "errindex-1",
  "note": "notes/SV错题本/索引.md",
  "title": "错题本 · 索引",
  "cat": "SV错题本",
  "q": "代码书写类和结构理解类的区别是什么？哪个更危险？",
  "a": "代码书写类：手滑/疏忽，特点重复率高、修起来快，【编译器能抓出来】。\n结构理解类：概念理解偏了，看着对其实错，【编译器抓不出来】。\n一句话：书写类让你编译不过，理解类让你编译通过但结果是错的 —— 后者更危险。"
 },
 {
  "id": "errindex-2",
  "note": "notes/SV错题本/索引.md",
  "title": "错题本 · 索引",
  "cat": "SV错题本",
  "q": "\"编译通过但返回值是 0\"最可能是什么书写错误？为什么说它最阴？",
  "a": "有返回值的函数【漏写 return】。\n最阴是因为：编译无警告、运行不报错，就是值不对 —— 调用方拿到 0 还以为是对的。\n要点：取值函数就 return，别在里面 $display。\"取值\"和\"打印\"是两个职责。"
 },
 {
  "id": "errindex-3",
  "note": "notes/SV错题本/索引.md",
  "title": "错题本 · 索引",
  "cat": "SV错题本",
  "q": "写完代码后的自问清单里，关于 virtual 和 push_back 各有一条什么？",
  "a": "virtual：我检查的是【基类】还是子类？—— 虚特性从基类继承，关键在基类写没写 virtual。\npush_back：我当\"拷值\"了吗？—— 它存的是【句柄】，改对象后队列里看到的就是新值。"
 },
 {
  "id": "errcode-1",
  "note": "notes/SV错题本/代码书写类错误.md",
  "title": "错题本 · 代码书写类",
  "cat": "SV错题本",
  "q": "最高频的分号类错误是哪两类？各报什么错？",
  "a": "① function / task 的【头部行】（含参数列表）漏分号 —— 报 near \"xxx\": syntax error, expecting ';'（比如后面跟 this 时会报 unexpected SystemVerilog keyword 'this'）\n② 函数调用 / 赋值语句漏分号\n③（同类）一行多个语句只写了第一个分号，如 int a, b, c 少了结尾的分号"
 },
 {
  "id": "errcode-2",
  "note": "notes/SV错题本/代码书写类错误.md",
  "title": "错题本 · 代码书写类",
  "cat": "SV错题本",
  "q": "begin...end 里把声明写在语句之后会报什么？哪种拼写错误\"最难发现\"、为什么？",
  "a": "报 Illegal declaration after the statement ... Declarations must precede statements（所有声明必须在所有语句之前，和 C 的老标准一样；每个嵌套块各自遵守）。\n最难发现的是【形参名拼错】（如 naem 写成 name）：\n编译器不报错，因为 naem 是个合法标识符，只是函数体里用到的是【成员】name，变成自己给自己赋值 —— 逻辑错了但一路静默。\n防御：形参故意用不同名字（name_i / n），或者写函数体时回头看一眼形参名。"
 },
 {
  "id": "errcode-3",
  "note": "notes/SV错题本/代码书写类错误.md",
  "title": "错题本 · 代码书写类",
  "cat": "SV错题本",
  "q": "写 covergroup 时哪个是\"静默失败\"？另外列出 covergroup 相关的其他高频书写坑。",
  "a": "静默失败：covergroup 忘 new() 或忘 sample() → 【覆盖率恒 0 且不报错】（0% 和\"真没覆盖到\"在报告里长得一样）。看到某个 covergroup 全 0，第一件事是确认它到底有没有被采样。\n其他坑：\n· covergroup 体里写变量声明/语句 → 编译不过（体里只放 coverpoint / cross / 选项）；值要先算好存进成员变量\n· coverpoint 引用了不属于本类的字段 → 编译不过，只有\"本作用域能看到的变量\"才可覆盖\n· 全角冒号 ：、全角括号 → 编译不过，报错位置常看着没问题\n· bins 区间漏方括号：{1:3} 不是区间，应写 {[1:3]}\n· new() 嵌在 function/task 里 → new() 只能属于类\n· randomize 裸调用、约束里用 = 而不是 ==（应写 p.randomize() with { pkt_type == TYPE_IP; ... }）"
 },
 {
  "id": "errstruct-1",
  "note": "notes/SV错题本/结构理解类错误.md",
  "title": "错题本 · 结构理解类",
  "cat": "SV错题本",
  "q": "for (int i = 1; i <= 4; i++) wd = new(i); 之后有几个对象？\n题目问\"当前占用\"和\"累计分配\"，答案一样吗？",
  "a": "不一样，这就是坑所在：\n· 当前占用（display 那一刻）：只有【1 个】对象存活 —— 只算 new(4) 那一个\n· 累计分配（整个执行期间）：【4 个】都算\n关键机制：wd = new(i) 是【句柄重指向】，不是累加。重新赋值后前一个对象失去唯一引用 → 成为垃圾等 GC。\n反证：把每个新对象都 push_back 进队列（保留引用），4 个就都能存活 —— 说明\"消失\"不是因为 new 没生效，而是失去了唯一引用。"
 },
 {
  "id": "errstruct-2",
  "note": "notes/SV错题本/结构理解类错误.md",
  "title": "错题本 · 结构理解类",
  "cat": "SV错题本",
  "q": "子类构造函数为什么必须先 super.new(...)？忘了会怎样？",
  "a": "因为要先把【父类那部分成员】初始化好，再初始化自己的成员。\n忘了调，父类成员就是默认值（string 是空串、int 是 0），后面打印出来是空的。\n（注意区分：super 是\"父类版本的方法\"，不是句柄。super.new(...) 就是调用父类的构造函数实现。）"
 },
 {
  "id": "errstruct-3",
  "note": "notes/SV错题本/结构理解类错误.md",
  "title": "错题本 · 结构理解类",
  "cat": "SV错题本",
  "q": "\"子类重写方法时必须写 virtual，不写就失效\" —— 这句话对吗？两组对照实验的结论是什么？",
  "a": "不对。【关键在基类】。\n· 基类有 virtual，子类去掉 virtual → 输出完全不变（虚性会自动继承）\n· 基类去掉 virtual，子类写 virtual → 【多态失效】，父类句柄永远调父类方法\n所以：基类声明了 virtual，子类同签名方法自动就是 virtual，写不写都行（写上更清晰）。\n这正是 UVM factory 能工作的前提：基类方法必须 virtual，父类句柄才能自动调到子类实现。"
 },
 {
  "id": "uvmmap-1",
  "note": "notes/UVM/知识地图.md",
  "title": "UVM · 知识地图",
  "cat": "UVM",
  "q": "九个公共相位按顺序列出来。其中哪些能消耗时间？为什么？",
  "a": "build → connect → end_of_elaboration → start_of_simulation → run → extract → check → report → final\n只有 run_phase（以及 12 个 runtime 子相位：pre_reset/reset/.../post_shutdown）是 task，可以消耗时间。\n其余八个都是 function，【零耗时】—— 所以日志里 @0 会出现一片打印，那是 function phase 在时间 0 内走完。\n查法：uvm_component.svh 里 extern virtual function|task void xxx_phase(uvm_phase phase)。"
 },
 {
  "id": "uvmmap-2",
  "note": "notes/UVM/知识地图.md",
  "title": "UVM · 知识地图",
  "cat": "UVM",
  "q": "本机怎么跑一个 UVM 例子？为什么不用自己编译 UVM 源码？",
  "a": "vlog -sv +incdir+/e/questasim/verilog_src/uvm-1.1d/src xxx.sv\n  vsim -c -L mtiUvm +UVM_TESTNAME=<test> <top> -do \"run -all; quit -f\"\n因为 Questa 自带【预编译 UVM 库 mtiUvm】（= uvm-1.1d）。映射见 E:/questasim/modelsim.ini 第 57 行。\n自己编 uvm_pkg.sv 会卡在 DPI 导出编译那一步。"
 },
 {
  "id": "uvmmap-3",
  "note": "notes/UVM/知识地图.md",
  "title": "UVM · 知识地图",
  "cat": "UVM",
  "q": "build_phase / connect_phase / run_phase 里，组件之间的执行顺序分别是什么？同一 phase 内能依赖\"谁先跑\"吗？",
  "a": "build_phase：【自顶向下】（父先子后）—— 因为父组件要先建好才能给孩子当 parent\nconnect_phase / end_of_elaboration_phase：【自底向上】（子先父后）\nrun_phase：【并发】，所有组件都在 @0 开跑\n同一 phase 内不同组件的调度顺序【不确定】（实测 START 打印顺序和创建顺序不一致）→ 代码不能依赖\"谁先跑\"。"
 },
 {
  "id": "uvmphase-1",
  "note": "notes/UVM/相位与域.md",
  "title": "UVM · 相位与域",
  "cat": "UVM",
  "q": "\"九个公共相位\"和\"runtime 子相位\"是什么关系？两条时间线在哪一点并行？",
  "a": "九个公共相位是【串行老链】；UVM 在 run 的位置【并行】挂了第二条链（reset → configure → main → shutdown，装在名为 uvm_sched 的 schedule 里）。\n两条链都在 @0 同时开工，日志只是按时间合并打印。\n源码根据（uvm_domain.svh）：m_common_domain.add(domain, .with_phase(m_common_domain.find(uvm_run_phase::get())));\n\"域（domain）\"这个词只在讲 jump 时才需要提。\n另外：链内串行（前面相位占的时间原样推后同链所有后续相位），链间并行。"
 },
 {
  "id": "uvmphase-2",
  "note": "notes/UVM/相位与域.md",
  "title": "UVM · 相位与域",
  "cat": "UVM",
  "q": "phase.jump() 的参数是什么？它是 function 还是 task？\n\"只让 comp[0] 调 jump\"，为什么 test 也跟着跳了？",
  "a": "参数是【目标相位的对象句柄】，如 uvm_reset_phase::get()（取单例），【不是字符串名】。\n它是 function（非阻塞）—— 调用即返回，实际切换发生在当前相位结束（objection 掉光）时。\n因为相位对象是【全局单例】（uvm_main_phase::get() 不属于任何单个组件），而 jump 是【域级】操作：uvm_domain::jump() 会遍历本域所有活跃相位。\n推论：① 统一复位本就是设计意图 ② \"只让 comp[0] 调\"只是避免重复发起 ③ 想让组件不参与跳转只能 set_domain() 放到另一个域 —— 只写 run_phase 的组件会掉队。"
 },
 {
  "id": "uvmphase-3",
  "note": "notes/UVM/相位与域.md",
  "title": "UVM · 相位与域",
  "cat": "UVM",
  "q": "自定义 sequencer 覆盖 run_phase 时忘了写 super.run_phase(phase) 会怎样？为什么？",
  "a": "default_sequence 不会启动。\n因为 uvm_sequencer_base::run_phase 的实现是：\n  super.run_phase(phase);\n  start_default_sequence();\nsuper 的职责就是【调用父类版本】，而 uvm_component::run_phase 内部还会调用旧式名 run()。\n（这是\"最需要记住的一条\"：uvm_component 的相位方法不是空壳。）"
 },
 {
  "id": "uvmcomp-1",
  "note": "notes/UVM/组件与工厂.md",
  "title": "UVM · 组件与工厂",
  "cat": "UVM",
  "q": "base_c 被 override 成 x_c 之后，get_name() / get_type_name() / T::type_name 各返回什么？\nget_type_name() 返回 \"<unknown>\" 说明什么？",
  "a": "get_name() → 实例名（c1 / c2，各自不同）\nget_type_name() → override 后的【实际类名】x_c（是 `uvm_*_utils 宏生成的虚函数）\nT::type_name → 静态变量，返回 base_c（注意：不带括号）\n返回 \"<unknown>\" 说明【忘写 `uvm_*_utils 注册宏】—— 这是极好的排错线索。\n另外 get_object_type() 返回工厂代理 wrapper：c1.get_object_type().get_type_name() 也是 x_c。\nget_type_name() 是验证\"工厂 override 是否生效\"最快的手段。"
 },
 {
  "id": "uvmcomp-2",
  "note": "notes/UVM/组件与工厂.md",
  "title": "UVM · 组件与工厂",
  "cat": "UVM",
  "q": "override 必须在什么时候设置才能生效？命令行 +uvm_set_type_override 的优先级如何？推荐放在哪？",
  "a": "必须在【任何组件 create 之前】设置 —— override 是\"查表时刻\"的规则，create 时查一次表。\n推荐位置：test 的 build_phase 开头（build 自顶向下，test 先于 env）。\n命令行 +uvm_set_type_override=A,B 在 build_phase 之前生效（日志 [UVM_CMDLINE_PROC]），【优先级最低】，会被代码里的 override 替换掉。\n补充：已创建的实例不受后续 override 影响，但工厂表会被替换，之后新建的组件会用新规则。"
 },
 {
  "id": "uvmcomp-3",
  "note": "notes/UVM/组件与工厂.md",
  "title": "UVM · 组件与工厂",
  "cat": "UVM",
  "q": "uvm_object 和 uvm_component 的核心区别是什么？为什么说 port / export / imp 是\"有层次的组件\"？",
  "a": "uvm_object：无层次，构造是 new(string name=\"\")，生命周期用完即弃 —— 典型如 sequence / sequence_item / config。\nuvm_component：有 name / parent，构造是 new(string name, uvm_component parent)，随仿真一直存活 —— 典型如 driver / monitor / agent / env / test。顶层 test 固定叫 uvm_test_top。\n因为 uvm_port_base（所有 port / export / imp 的基类）【继承自 uvm_component】，所以它的构造是 new(\"name\", this)（this 是 parent）—— port 是组件，不是普通对象。"
 },
 {
  "id": "uvmseq-1",
  "note": "notes/UVM/序列与sequencer.md",
  "title": "UVM · 序列与 sequencer",
  "cat": "UVM",
  "q": "run_test() 无参数时 test 名从哪来？如果命令行和参数都没给，会发生什么？",
  "a": "从命令行 +UVM_TESTNAME 取，且【命令行覆盖参数】；给了多个只取第一个并报 MULTTST 警告。\n都没给 → 不创建任何 test；若此时组件数为 0 → UVM_FATAL [NOCOMP] \"No components instantiated...\"。\ntest 的实例名固定为 uvm_test_top（factory.create_component_by_name(test_name, \"\", \"uvm_test_top\", null)）。\n另外：test 已存在还再调一次 run_test → UVM_FATAL [TTINST]。"
 },
 {
  "id": "uvmseq-2",
  "note": "notes/UVM/序列与sequencer.md",
  "title": "UVM · 序列与 sequencer",
  "cat": "UVM",
  "q": "顶层 sequence 调 start() 后依次执行哪些方法？\n为什么子 sequence（用 `uvm_do 系列）的 pre_body / post_body 不会被调用？",
  "a": "顶层（parent == null）：pre_start → pre_body → body → post_body → post_start（pre/post_body 需要 call_pre_post == 1）\n子 sequence：sub_seq.pre_start → parent_seq.pre_do(0) → parent_req.mid_do(sub_seq) → body → parent_seq.post_do(sub_seq) → sub_seq.post_start\n因为 `uvm_do 系列宏会自动把 call_pre_post 设为 0 —— 这是常见困惑点。\n其他细节：parent == null 时优先级默认 100，否则继承 parent 的优先级；start() 里还会 clear_response_queue()、注册到 sequencer、set_sequence_id(-1) 等。"
 },
 {
  "id": "uvmseq-3",
  "note": "notes/UVM/序列与sequencer.md",
  "title": "UVM · 序列与 sequencer",
  "cat": "UVM",
  "q": "m_sequencer 和 p_sequencer 有什么区别？\n用它解释\"为什么基类句柄访问不到子类 sequencer 的成员\"。",
  "a": "m_sequencer：uvm_sequence_base 的成员，类型是【基类】uvm_sequencer_base（start 时被赋值）\np_sequencer：由 `uvm_declare_p_sequencer(T) 宏生成的【具体类型】句柄，由 $cast 而来\n和 SV 的 cast 完全同理：句柄的【静态类型】决定能访问哪些成员，基类句柄看不到子类专有成员。\n宏的真实展开是在 m_set_p_sequencer() 里做 `if(!$cast(p_sequencer, m_sequencer)) `uvm_fatal(\"DCLPSQ\", ...)` —— 由 start() 过程调用。\n⚠️ 若 sequence 被挂到了类型不对的 sequencer 上，这里会直接 UVM_FATAL。"
 },
 {
  "id": "uvmtlm-1",
  "note": "notes/UVM/TLM通信.md",
  "title": "UVM · TLM 通信",
  "cat": "UVM",
  "q": "把 mailbox 换成 TLM port，核心洞察是什么？（mailbox 到底\"去哪了\"）",
  "a": "不是【消灭】mailbox，而是把它从\"跨组件连接机制\"【降级为组件内部私有缓存】。\n改造后 checker 内部仍用 chnl_mbs[0]，但外部组件不再直接摸它；monitor 只管 mon_bp_port.put(m) 交出去，不知道谁收 —— 与下游彻底解耦。\n对比：改造前 env.connect_phase 里写 chnl_agts[i].monitor.mon_mb = chker.chnl_mbs[i];（直接赋值对方内部句柄）。"
 },
 {
  "id": "uvmtlm-2",
  "note": "notes/UVM/TLM通信.md",
  "title": "UVM · TLM 通信",
  "cat": "UVM",
  "q": "port / export / imp 的合法连接链是什么？哪种连接非法？\n一个 put port 能连多个 imp 吗？要广播用什么？",
  "a": "合法：port → export → imp ✅、port → imp ✅、export → imp ✅\n非法：port → port ❌（UVM 在 connect / resolve 阶段报错）\n规则：调用方（上游）去 connect 被调方（下游）；【链的末端必须是 imp】—— imp 是真正实现方法的那一端。\n一个 put/get port 只能连【一个】imp；要广播用 uvm_analysis_port（write 是一对多）。\n命令规律：uvm_<blocking | nonblocking | 空>_<put | get | peek | get_peek | transport>_<port | export | imp>"
 },
 {
  "id": "uvmtlm-3",
  "note": "notes/UVM/TLM通信.md",
  "title": "UVM · TLM 通信",
  "cat": "UVM",
  "q": "一个 checker 要收 5 路数据，为什么方法都叫 put() 不行？`*_imp_decl 宏做了什么？\nport 必须在什么时候 new？",
  "a": "方法名都叫 put() 就【无法区分】是哪一路数据。\n`uvm_blocking_put_imp_decl(_chnl0) 宏生成【带后缀的 imp 类】，方法名随之变成 put_chnl0()：类里声明 uvm_blocking_put_imp #(mon_data_t, mcdf_checker, \"_chnl0\") chnl0_imp; 并实现 task put_chnl0(...)。\nimp 方法名由「端口类型 + 宏后缀」共同决定，对不上会在编译期报\"抽象方法未实现\"。\nport 必须在 new()（或 build_phase）里创建 —— 在 connect_phase 之后才 new 会导致连接失败。"
 },
 {
  "id": "uvmreport-1",
  "note": "notes/UVM/报告机制.md",
  "title": "UVM · 报告机制",
  "cat": "UVM",
  "q": "severity override 会影响子组件吗？实验结果是什么？想影响整棵树怎么办？",
  "a": "不会 —— severity override 【不递归，也不被子组件继承】（与创建先后无关）。\n实测（组件树 uvm_test_top → c1 → c2）：只对 test 设 override，test 自己的 WARNING 降级为 INFO 了，但 3 个子组件的 6 条警告【仍全部是 WARNING】。\n想影响整棵树，必须自己递归遍历（用 get_report_handler() + get_children(kids)），或直接用自带的 _hier 版本。\n（UVM 自己的 _hier 实现就是\"先作用于自己 + foreach(m_children[c]) 递归\"。）"
 },
 {
  "id": "uvmreport-2",
  "note": "notes/UVM/报告机制.md",
  "title": "UVM · 报告机制",
  "cat": "UVM",
  "q": "_hier 家族里唯独【没有】哪个？只想\"消音\"不想降级时该用什么？",
  "a": "三类都有递归版本：verbosity → set_report_verbosity_level_hier；action → set_report_severity_id_action_hier；file → set_report_severity_id_file_hier。\n唯独【没有 set_report_severity_id_override_hier】。\n只想消音就用自带的 set_report_severity_id_action_hier(UVM_WARNING, \"RUN\", UVM_NO_ACTION)，不必手写递归。\n建议调用位置：end_of_elaboration_phase（组件树已建完）。"
 },
 {
  "id": "uvmreport-3",
  "note": "notes/UVM/报告机制.md",
  "title": "UVM · 报告机制",
  "cat": "UVM",
  "q": "消息 ID 该用 get_type_name() 还是 get_name()？为什么？访问 m_children 有什么风险？",
  "a": "用 get_type_name() —— 显示 [name_test]，能【按\"类\"聚合统计】（UVM 官方惯例）；get_name() 是按实例分组（显示 [uvm_test_top]）。\n大平台里消息成千上万，只有按类聚合才统计得动。\n访问权限暗礁：m_rh（report handler）是 public；【m_children 是 protected】。\n所以 children[i].m_rh 合法，但直接 h.m_children[i] 是踩边界写法 —— Questa 10.7c 接受，VCS/Xcelium 可能拒绝。稳妥用公开 API：c.get_report_handler() + h.get_children(kids)。\n另外写递归时必踩：块内【声明必须在任何语句之前】（Illegal declaration after the statement）。"
 },
 {
  "id": "toolpit-1",
  "note": "notes/仿真工具/Questa避坑手册.md",
  "title": "仿真工具 · Questa 避坑手册",
  "cat": "仿真工具",
  "q": "跑仿真的标准流程是什么？为什么说\"vlog 通过不等于能跑\"？",
  "a": "vlog -sv -work work tb.sv\n  vsim -c work.tb -do \"run -all; quit -f\"      （-c 控制台模式，不弹 GUI）\n因为 vlog 【不报语义错误】—— 很多问题要到 vsim 的 vopt 阶段才暴露（vopt-7063 Failed to find / vopt-2123 Missing argument for format specification 等）。\nUVM 例子：vlog -sv +incdir+/e/questasim/verilog_src/uvm-1.1d/src tb.sv → vsim -c -L mtiUvm +UVM_TESTNAME=my_test work.tb -do \"run -all; quit -f\"。"
 },
 {
  "id": "toolpit-2",
  "note": "notes/仿真工具/Questa避坑手册.md",
  "title": "仿真工具 · Questa 避坑手册",
  "cat": "仿真工具",
  "q": "DPI-C 全流程的四步命令是什么？\"三个必须记住的点\"是哪三个？",
  "a": "export PATH=\"/e/Mingwn/bin:$PATH\"\n  ① vlog -sv +incdir+<questa>/verilog_src/uvm-1.1d/src dpi_c_demo.sv\n  ② vsim -c -dpiexportobj dpi_export.obj -L mtiUvm tb -do \"quit -f\"\n  ③ gcc -shared -o dpi_cases.dll dpi_cases.c dpi_export.obj -I<E:/questasim/include> -L<E:/questasim/win64> -lmtipli\n  ④ vsim -c -L mtiUvm -sv_lib dpi_cases tb -do \"run -all; quit -f\"\n三点：\n① 必须有 C 编译器，否则 vsim 加载设计报 vsim-7019 Can't locate a C/C++ compiler for 'DPI Export Compilation'\n② 【必须链 -lmtipli】，它提供 svGetScope / mti_svExecuteTaskOrFunction / vl_trace_dpi_call 等符号，不链报 undefined reference to svGetScope\n③ 用绝对路径调 gcc.exe 会失败（cannot execute 'as'）—— gcc 是驱动，靠 PATH 找 as.exe / ld.exe，【必须把 bin 目录加进 PATH】"
 },
 {
  "id": "toolpit-3",
  "note": "notes/仿真工具/Questa避坑手册.md",
  "title": "仿真工具 · Questa 避坑手册",
  "cat": "仿真工具",
  "q": "DPI 的头号坑是什么？\n另外：库里已存在目录报 vlib-35、60+ 个 undefined macro 连锁报错，分别怎么解？",
  "a": "头号坑：C 侧要回调 SV 的 task 时，import 声明必须是\n  import \"DPI-C\" context task c_main();\n写成 function 会 Fatal：vsim-3757 exported task must be called from a context imported *task*（纯 function 里不允许调 task），且导出 function 的调用报 vsim-3756。\nvlib-35 Failed to create directory：库里【已存在】该目录 → 先 rm -rf <lib>，再 vlib <lib> 正规创建。\n60+ undefined macro：纯 `define 文件（如 param_def.v）必须【复制到当前目录并加 +incdir+.】，否则 package 内看不到宏。\n（另外还有：vsim-3009 [TSCALE] = interface/module 没写 `timescale；vlog-13053 = `timescale 的反引号打成了单引号。）"
 },
 {
  "id": "toolenv-1",
  "note": "notes/仿真工具/环境搭建.md",
  "title": "仿真工具 · 环境搭建",
  "cat": "仿真工具",
  "q": "Tagbar 装了却看不到大纲，真实根因是什么？怎么修？",
  "a": "根因：C:\\\\Program Files\\\\Vim\\\\_vimrc 里有一条【更早注册】的\n  autocmd BufRead,BufNewFile *.sv,*.svh setfiletype verilog\n而 setfiletype 【只在 filetype 为空时生效】→ .sv 的 filetype 实际是 verilog，\n于是 g:tagbar_type_systemverilog 永远匹配不上，ctags 被强制走 Verilog 解析器 —— class / package 全出不来。\n修法：在 gvimrc_svuvm.vim 里用【强制的 set filetype=systemverilog】（不能用 setfiletype），因为它比 _vimrc 后加载。\n附带两条：① 必须显式配 g:tagbar_ctags_bin='E:/Mingwn/bin/ctags.exe'（Mingwn 不在系统 PATH，从资源管理器启动的 gvim 找不到 ctags → 侧栏空窗）\n② kinds 字母要用 uctags 的简写：C class | K package | I interface | m module | f function | t task（旧配置里 c:class / p:package / i:interface / e:typedef 全错）。"
 },
 {
  "id": "toolenv-2",
  "note": "notes/仿真工具/环境搭建.md",
  "title": "仿真工具 · 环境搭建",
  "cat": "仿真工具",
  "q": "slang / vscode-slang 是什么？它的能力边界在哪？",
  "a": "slang：Mike Popoloski（HRT）写的 SystemVerilog 前端库（MIT），含 CLI 可编译 + lint 整个 SV 工程；是 CHIPS Alliance sv-tests 唯一全通过的开放前端。\nslang-server：HRT「Surge」项目的 SV LSP 语言服务器；VS Code 客户端是扩展 vscode-slang（publisher Hudson-River-Trading，会自动下载二进制，无需 license）。\n能力：实时 lint、跳转定义/引用/补全、inlay hints、按 .f 文件列表与 top elaborate 后浏览层次树、与波形查看器互跳。\n边界（要讲清）：① 它是【SV 语言层面】工具，UVM 靠\"UVM 也是纯 SV 类库\"才能跳转\n② 【没有】DVT 那种 UVM 方法论视图（Sequence/Component 层次、工厂关系图）\n③ 用前【必须配好 .f / +define+ / +incdir+】，否则 UVM 宏解析不了"
 },
 {
  "id": "toolenv-3",
  "note": "notes/仿真工具/环境搭建.md",
  "title": "仿真工具 · 环境搭建",
  "cat": "仿真工具",
  "q": "Vim 的 $HOME 在哪？为什么容易找错？主配置和启用方式是什么？",
  "a": "$HOME = C:\\\\Users\\\\86150\\\\AppData\\\\Roaming\\\\SPB_Data（SPB_Data 环境变量导致），【不是】C:\\\\Users\\\\86150。\n所以用户级 vimfiles 在 SPB_Data\\\\vimfiles\\\\，主配置是 gvimrc_svuvm.vim。\n启用方式：需在 C:\\\\Program Files\\\\Vim\\\\_vimrc 末尾手动加 source 行（该文件需要管理员权限）。\n插件 9 个（verilog_systemverilog.vim / systemverilog.vim / nerdtree / tagbar / vim-airline(+themes) / auto-pairs / vim-commentary / gruvbox）装在 SPB_Data\\\\vimfiles\\\\plugged\\\\。\nVim 无头调试技巧：-u NONE -c \"...\" 下 echo 无输出，改用 -c \"execute 'redir! > file'\" 或写独立脚本用 writefile()。"
 },
 {
  "id": "toolmake-1",
  "note": "notes/仿真工具/Questa命令行与Makefile.md",
  "title": "仿真工具 · Questa 命令行与 Makefile",
  "cat": "仿真工具",
  "q": "vsim -c top -do \"coverage save -onexit c.ucdb; run -all; quit -f\" 这一条命令里叠了几种语言？\n-do 引号里那串是什么语言？",
  "a": "三种：\n① Shell（Git Bash）—— cd、rm -rf、printf ... > r.do、管道\n② 工具命令行选项 —— -work / -sv / -cover bsectf / -coverage / -c / -do，由 vlog / vsim 自己解析\n③ Tcl —— -do 引号里的内容，由 vsim 内嵌的 Tcl 解释器执行\n所以 coverage save -onexit c.ucdb; run -all; quit -f 【是 Tcl】（分号是 Tcl 的命令分隔符，-onexit 是 Questa 命令的选项）。\n（工程化时还有第四层：Makefile 由 make 程序解释。）\nTcl 要点：{ } = 原样字符串（不替换变量）；[ ] = 命令替换。"
 },
 {
  "id": "toolmake-2",
  "note": "notes/仿真工具/Questa命令行与Makefile.md",
  "title": "仿真工具 · Questa 命令行与 Makefile",
  "cat": "仿真工具",
  "q": "TB 里带 $finish 的情况下，想拿到\"跑到 50ns 时的覆盖率快照\"，命令怎么写？为什么能行？",
  "a": "用【限时 run】：\n  -do \"run 50ns; coverage save partA.ucdb; quit -f\"\n因为没跑到 $finish，-do 就会继续往下执行 —— 所以 run 之后的命令能生效。\n对比：跑到底（run -all）时 $finish 会终止 -do 脚本，那时必须用 coverage save -onexit <file> 写在 run 之前。\n（\"跑到某阶段看快照\"就是这个套路。）"
 },
 {
  "id": "toolmake-3",
  "note": "notes/仿真工具/Questa命令行与Makefile.md",
  "title": "仿真工具 · Questa 命令行与 Makefile",
  "cat": "仿真工具",
  "q": "Makefile 的三个坑是什么？\"学 Makefile 最有效的单一技巧\"是什么？",
  "a": "三个坑：\n① 命令行缩进【必须是 TAB】—— 用空格会报 missing separator；自检：awk '/^\\t/' Makefile\n② 【行尾注释会吃掉空格】—— VAR = value   # 注释 会让变量值里带上那串空格（make -n 能看见），拼出来的命令到处是多余空格 → 注释单独放一行\n③ 伪目标没声明 .PHONY —— 目录里恰好有同名文件时目标\"不执行\"\n最有效技巧：【make -n】只打印不执行 —— 想确认自己写对了没，用它当透视镜。\n另外 ?= 是\"没定义才赋值\"（所以命令行传入优先级最高），:= 立即展开，= 延迟展开。\n（覆盖率命令的关键顺序：save 必须在 run 之前 —— 同样是 $finish 吃 -do 那个坑。）"
 },
 {
  "id": "errsilent-1",
  "note": "notes/SV错题本/静默失败类错误.md",
  "title": "错题本 · 静默失败类",
  "cat": "SV错题本",
  "q": "randomize() 失败（返回 0）时，rand 变量的值会变成什么？为什么这个现象特别容易被误判？怎么才能测准？",
  "a": "【保持原值不变，不清零】。\n误判的根源：对象 new() 之后 rand 变量本来就是 0 —— 0 分不清\"被清零\"和\"根本没动\"。\n实测（哨兵值法）：先 p.length = 999，再制造约束冲突 → randomize() 返回 0，但 length 仍是 999。\n所以：① 测这类问题必须先用哨兵值（或先成功随一次）；② 绝不能依赖失败后的取值，只能判返回值。\n同类还有两个：get 失败时变量保持默认值、$cast 失败时目标句柄保持原值（而源为 null 时反而返回 1）。"
 },
 {
  "id": "errsilent-2",
  "note": "notes/SV错题本/静默失败类错误.md",
  "title": "错题本 · 静默失败类",
  "cat": "SV错题本",
  "q": "config_db 的 get 取不到值时会出现什么现象？怎么把这种\"看不见的失败\"变成看得见的？日志要怎么写才算有证据力？",
  "a": "现象：get 返回 0，目标变量【保持默认值】，不报错 —— 看起来像\"取到了，值本来就是默认那个\"。\n三条对策：\n① 判返回值：if (!uvm_config_db#(int)::get(this,\"\",\"cfg_val\",cfg_val)) `uvm_error(\"CFG\",\"cfg_val not found\")\n② 日志里打【值】，不是固定字符串：`uvm_info(\"BUILD\", $sformatf(\"cfg_val = %0d\", cfg_val), UVM_LOW)\n③ 验收标准写成可核对的数字（\"打印出 cfg_val = 42\"），而不是\"有没有那条消息\"。\n取不到的常见原因：set/get 拼出的作用域字符串不一致（实例名 vs 类名）、field_name 写错。"
 },
 {
  "id": "errsilent-3",
  "note": "notes/SV错题本/静默失败类错误.md",
  "title": "错题本 · 静默失败类",
  "cat": "SV错题本",
  "q": "覆盖率报告里某个 covergroup 显示 0.00%，有哪两种完全不同的成因？看到全 0 时第一件事该做什么？",
  "a": "两种成因：\n① 【压根没被采样】：漏 new()、漏 sample()、或者承载它的组件根本没被创建；\n② 【真的没覆盖到】：这次激励打不到那些 bin。\n报告本身不区分二者 —— 所以看到全 0，第一件事是【先确认它有没有被采样】，再谈覆盖够不够。\n区分手段：看日志里有没有采样痕迹；做破坏性实验（把 sample() 注释掉再跑一遍对比）。\n注意两种\"空\"不一样：漏 new() 又去 sample() 是空句柄操作（通常报错/崩），真正【静默】的是\"没人调用 sample()\"或\"组件从未被创建\"。\n另外：rand 动态数组不约束 size 时 randomize() 返回 1 但 size=0，会让长度相关的 bin 全 0 —— 同样是静默失败。"
 },
 {
  "id": "errcode-4",
  "note": "notes/SV错题本/代码书写类错误.md",
  "title": "错题本 · 代码书写类",
  "cat": "SV错题本",
  "q": "默写 UVM 环境时最容易漏的那类\"框架级\"书写错有哪些？（骨架、factory 创建、宏参数、objection 各说一条）",
  "a": "① 骨架不配对：class 没有 endclass、module 没有 endmodule → 后面的类被当成嵌套类，报错位置莫名其妙。五对括号（package/class/covergroup/module/begin）写完立刻配对。\n② factory 创建写成作用域解析的样子：my_com::creat::type_id::(\"my_com\",this) ❌ → 正确三层记法：类名::type_id::create(\"实例名\", parent)。\n③ `uvm_info 少参数：宏要【三个】参数（ID, MSG, VERBOSITY），少参数时编译器报的是宏实参个数问题，不会提示\"你少了消息字符串\"。\n④ objection 当成独立函数：raise_objection(this) ❌ → phase.raise_objection(this) ✅，并与 drop_objection 配对。\n（另：SV 不支持函数重载，同类里同名函数写两遍就是重复定义；运行命令里的顶层名要与模块名一致。）"
 },
 {
  "id": "errstruct-4",
  "note": "notes/SV错题本/结构理解类错误.md",
  "title": "错题本 · 结构理解类",
  "cat": "SV错题本",
  "q": "uvm_config_db 的 set 和 get 要\"三个寻址参数一致\"，这里的\"名字\"到底指什么？类名和实例名分别决定什么？",
  "a": "指的是【实例名】—— create(\"m_comp\", parent) 的第一个参数，它决定组件在层次树里叫什么（uvm_test_top.m_comp）。\n对照：\n· 类名（class my_comp）→ 创建出来是哪【种】对象，也是 factory override 的靶子；\n· 实例名（create 的第 1 个参数）→ 它在层次树里的【位置/名字】；\n· 句柄变量名（my_comp m_comp;）→ 只是你在代码里引用它用的名字，不影响路径。\nconfig_db 拼作用域用的是实例名：set(this,\"m_comp\",…) 在 my_test 里 → \"uvm_test_top.m_comp\"；get(this,\"\",…) 在 my_comp 里 → inst_name 为空 ⇒ 取自己全名 → 同样一串 ✅。\n若两边不一致 → get 静默失败、变量保持默认值。\n另外：前三个参数是\"给谁\"，第四个参数才是\"给什么\"—— 只盯寻址一致，容易忘了检查值本身对不对。"
 }
];
