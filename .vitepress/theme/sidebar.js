import path from 'node:path';
import fs from 'node:fs';

// 文件根目录
const DIR_PATH = path.resolve();
// 白名单,过滤不是文章的文件和文件夹
const WHITE_LIST = [
    'index.md',
    '.vitepress',
    'node_modules',
    '.idea',
    'assets',
];

// 判断是否是文件夹
const isDirectory = (path) => fs.existsSync(path) && fs.lstatSync(path).isDirectory();

// 取差值
const intersections = (arr1, arr2) =>
    Array.from(new Set(arr1.filter((item) => !new Set(arr2).has(item))));

// 把方法导出直接使用
function getList(params, path1, pathname) {
    // 存放结果
    const res = [];
    // 开始遍历params
    for (let file of params) {
        // 拼接目录
        const dir = path.join(path1, file);
        // 判断是否是文件夹
        const isDir = isDirectory(dir);
        if (isDir) {
            // 如果是文件夹,读取之后作为下一次递归参数
            const files = fs.readdirSync(dir);
            res.push({
                text: file,
                collapsible: true,
                items: getList(files, dir, `${pathname}/${file}`),
            });
        } else {
            // 获取名字
            const name = path.basename(file);
            // 排除非 md 文件
            const suffix = path.extname(name);
            if (suffix !== '.md') {
                continue;
            }
            res.push({
                text: name,
                link: `${pathname}/${name}`,
            });
        }
    }
    // 对name做一下处理，把后缀删除
    res.map((item) => {
        item.text = item.text.replace(/\.md$/, '');
    });
    return res;
}

export const set_sidebar = (map) => {
    const res = [];

    for (const key in map) {
        const text = map[key];
        if (!isDirectory(path.join(DIR_PATH, key))) {
            console.error(`Directory '${key}' does not exist.`);
            continue;
        }
        const files = fs.readdirSync(path.join(DIR_PATH, key));
        const items = getList(files, path.join(DIR_PATH, key), key);
        res.push({ text, collapsed: false, items });
    }
    return res;
};
