// 校验 notes-site：① NOTES 索引的文件都存在 ② 所有 [[双链]] 都能解析
const fs = require('fs');
const path = require('path');
const ROOT = 'E:/mynotes/notes-site';
const html = fs.readFileSync(path.join(ROOT, 'index.html'), 'utf8');

const m = html.match(/const NOTES = \[([\s\S]*?)\n\];/);
if (!m) { console.error('NOTES 数组没找到'); process.exit(1); }
const NOTES = eval('[' + m[1] + ']');

function normTitle(s) {
  return String(s).replace(/\s+/g, '').replace(/[\/\-_]+/g, '-').toLowerCase();
}

let bad = 0;
console.log('索引条目: ' + NOTES.length);
NOTES.forEach(n => {
  const p = path.join(ROOT, n.file);
  if (!fs.existsSync(p)) { console.error('  [缺失] ' + n.file); bad++; }
  else {
    // front-matter 里的 title 必须和索引 title 一致
    const txt = fs.readFileSync(p, 'utf8');
    const t = (txt.match(/^title:\s*(.+)$/m) || [])[1];
    if (!t) { console.error('  [无 title] ' + n.file); bad++; }
    else if (normTitle('·' + t) !== normTitle('·' + n.title)) {
      console.error('  [标题不一致] 索引="' + n.title + '"  文件="' + t.trim() + '"  (' + n.file + ')'); bad++;
    }
    // category 一致
    const c = (txt.match(/^category:\s*(.+)$/m) || [])[1];
    if (c && c.trim() !== n.cat) { console.error('  [分类不一致] ' + n.file + ' 索引=' + n.cat + ' 文件=' + c.trim()); bad++; }
  }
});

const byTitle = {};
NOTES.forEach(n => { byTitle[normTitle(n.title)] = n.file; });

let links = 0;
const files = NOTES.map(n => path.join(ROOT, n.file));
files.forEach(f => {
  let txt = fs.readFileSync(f, 'utf8');
  txt = txt.split(/(```[\s\S]*?```|`[^`]*`)/).filter((_, i) => i % 2 === 0).join('');
  const re = /\[\[([^\[\]|]+)(?:\|([^\[\]]+))?\]\]/g;
  let mm;
  while ((mm = re.exec(txt))) {
    links++;
    const key = normTitle(mm[1]);
    if (!byTitle[key]) { console.error('  [死链] ' + path.relative(ROOT, f) + '  ->  [[' + mm[1] + ']]'); bad++; }
  }
});
console.log('双链总数: ' + links);
console.log(bad === 0 ? 'RESULT: OK  0 问题' : 'RESULT: 发现 ' + bad + ' 个问题');
