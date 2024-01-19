import path from 'node:path';
import fs from 'node:fs';
import matter from 'gray-matter';


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

function getList(params, path1, pathname, recursion) {
    // 存放结果
    const res = [];
    // 开始遍历params
    for (let file of params) {
        // 拼接目录
        const dir = path.join(path1, file);
        // 判断是否是文件夹
        const isDir = isDirectory(dir);
        if (recursion && isDir) {
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
            // 读取文件内容
            const filePath = path.join(path1, file);
            const content = fs.readFileSync(filePath, 'utf-8');

            const frontmatter = matter(content)
            const { sort = 100, publish = true } = frontmatter.data
            if (publish) {
                res.push({
                    text: name,
                    link: `${pathname}/${name}`,
                    sort,
                });
            }

        }
    }
    // 对name做一下处理，把后缀删除
    res.map((item) => {
        item.text = item.text.replace(/\.md$/, '');
    });
    // 对结果按照 sort 字段排序
    res.sort((a, b) => a.sort - b.sort);
    return res;
}


export const set_sidebar = (arr) => {
    const res = [];
    for (const item of arr) {
        const { subPath, text, collapsed = true, recursion = true } = item;
        if (!isDirectory(path.join(DIR_PATH, subPath))) {
            continue;
        }
        const files = fs.readdirSync(path.join(DIR_PATH, subPath));
        const items = getList(files, path.join(DIR_PATH, subPath), subPath, recursion); // recursion: 是否需要递归读取文件夹下的文件夹
        res.push({ text, collapsed: collapsed, items });
    }
    return res;
};
