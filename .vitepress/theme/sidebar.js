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

function getList(params, path1, pathname, recursion, parentDirSort = {}) {
    const folders = [];
    const files = [];

    for (let file of params) {
        const dir = path.join(path1, file);
        const isDir = isDirectory(dir);

        if (recursion && isDir) {
            const dirSort = parentDirSort[file] || 0; // 使用传入参数的 dir_sort 进行排序
            folders.push({
                text: file,
                collapsible: true,
                items: getList(fs.readdirSync(dir), dir, `${pathname}/${file}`, recursion, parentDirSort),
                sort: dirSort,
            });
        } else {
            const name = path.basename(file);
            const suffix = path.extname(name);

            if (suffix === '.md') {
                const filePath = path.join(path1, file);
                const content = fs.readFileSync(filePath, 'utf-8');
                const frontmatter = matter(content);
                const { sort = 100, publish = true } = frontmatter.data;

                if (publish) {
                    files.push({
                        text: name.replace(/\.md$/, ''),
                        link: `${pathname}/${name}`,
                        sort,
                    });
                }
            }
        }
    }

    const allItems = folders.concat(files);
    allItems.sort((a, b) => a.sort- b.sort); // 合并排序文件夹和文件的 sort 字段

    return allItems;
}

export const set_sidebar = (arr) => {
    const res = [];
    for (const item of arr) {
        const { subPath, text, collapsed = true, recursion = true, dir_sort } = item;
        if (!isDirectory(path.join(DIR_PATH, subPath))) {
            continue;
        }
        const files = fs.readdirSync(path.join(DIR_PATH, subPath));
        const items = getList(files, path.join(DIR_PATH, subPath), subPath, recursion, dir_sort);
        res.push({ text, collapsed: collapsed, items });
    }
    return res;
};