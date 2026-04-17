import { defineConfig } from 'vitepress'
import { set_sidebar } from "./theme/sidebar.js";
import dracula from './theme/dracula.json'
import slack from './theme/slack-ochin.json'
import mathjax3 from 'markdown-it-mathjax3';
import { withMermaid } from "vitepress-plugin-mermaid";
import path from 'path'

// GitHub 链接转换插件 - 直接在配置中定义
function markdownItGitHubLink(md) {
  md.core.ruler.push('github-link', (state) => {
    const tokens = state.tokens
    for (let i = 0; i < tokens.length; i++) {
      if (tokens[i].type !== 'paragraph_open') continue
      const nextToken = tokens[i + 1]
      if (!nextToken || nextToken.type !== 'inline') continue
      const children = nextToken.children
      if (!children) continue

      // 遍历 children，找出所有符合条件的 GitHub 链接
      const newChildren = []
      let hasChanges = false

      for (let j = 0; j < children.length; j++) {
        // 检查是否是 link_open 且后面还有两个元素
        if (j + 2 >= children.length) {
          newChildren.push(children[j])
          continue
        }

        const linkOpen = children[j]
        const text = children[j + 1]
        const linkClose = children[j + 2]

        if (linkOpen.type !== 'link_open' || text?.type !== 'text' || linkClose?.type !== 'link_close') {
          newChildren.push(children[j])
          continue
        }

        const hrefAttr = linkOpen.attrs?.find(attr => attr[0] === 'href')
        if (!hrefAttr || !hrefAttr[1].includes('github.com') || text.content.toLowerCase() !== 'github') {
          newChildren.push(children[j])
          continue
        }

        // 转换为 GitHub Card 组件，跳过原始的 link_open/text/link_close
        const href = hrefAttr[1]
        // 添加空格分隔（如果后面还有内容）
        const spaceAfter = j + 3 < children.length ? ' ' : ''
        newChildren.push({
          type: 'html_inline',
          content: `<GitHubCardInline url="${href}" />${spaceAfter}`,
          level: linkOpen.level
        })
        hasChanges = true
        j += 2 // 跳过已经处理的 text 和 link_close
      }

      if (hasChanges) {
        nextToken.children = newChildren
      }
    }
  })
}

// https://vitepress.dev/reference/site-config
export default withMermaid(
  defineConfig({
    head: head(),
    title: "🎈🎈",
    description: "Blog built with VitePress",
    themeConfig: {
      logo: '/logo.gif',
      outline: {
        label: "页面导航",
        level: [2, 6]
      },
      lastUpdated: {
        text: '最后更新于',
        formatOptions: {
          dateStyle: 'short',
          timeStyle: 'medium'
        }
      },
      returnToTopLabel: "回到顶部🚀",
      sidebarMenuLabel: "菜单",
      darkModeSwitchLabel: "主题",
      docFooter: {
        prev: "上一篇",
        next: "下一篇"
      },
      nav: nav(),
      sidebar: sidebar(),
      socialLinks: [
        { icon: 'github', link: 'https://github.com/xiaokexiang' }
      ],
      footer: {
        message: "<a href='https://beian.miit.gov.cn/'>苏ICP备18050258号-1</a>",
        copyright: "Copyright © 2018-2024 xiaokexiang "
      },
      search: search()
    },
    markdown: markdown(),
    mermaid: {
      theme: 'neutral'
    },
    vite: {
      resolve: {
        alias: {
          '@': path.resolve(__dirname, './components') // custom component
        }
      }
    },
    transformHead({ assets }) { // font preload
      const myFontFile = assets.find(file => /font-name\.\w+\.ttf/)
      console.log('123: ', myFontFile)
      if (myFontFile) {
        return [
          [
            'link',
            {
              rel: 'preload',
              href: myFontFile,
              as: 'font',
              type: 'font/ttf',
              crossorigin: ''
            }
          ]
        ]
      }
    }
  })
)

function markdown() {
  return {
    theme: {
      light: slack,
      dark: dracula,
    },
    lineNumbers: true,
    container: {
      tipLabel: '提示',
      warningLabel: '警告',
      dangerLabel: '危险',
      infoLabel: '信息',
      detailsLabel: '详细信息'
    },
    config: (md) => {
      md.use(mathjax3);
      md.use(markdownItGitHubLink);
    },
    mermaid: true
  }
}

function nav() {
  return [
    {
      text: 'Java',
      link: '/docs/java/base/知识零碎',
    },
    {
      text: 'Go',
      link: '/docs/go/程序结构'
    },
    {
      text: '容器与编排',
      link: '/docs/container/Kind',
    },
    {
      text: '中间件',
      link: '/docs/middleware/elasticsearch/前置知识'
    },
    {
      text: '其他',
      items: [
        {
          text: '算法',
          link: '/docs/other/algorithm/时间复杂度'
        },
        {
          text: '瞎折腾',
          link: '/docs/other/照片浏览与备份'
        },
        {
          text: '思维导图',
          link: '/docs/other/xmind/SpringBoot'
        }
      ]
    }
  ]
}

function sidebar() {
  return {
    '/docs/java/': set_sidebar([
      { text: '基础', subPath: '/docs/java/base', collapsed: false },
      { text: '框架', subPath: '/docs/java/frame', },
      { text: '多线程', subPath: '/docs/java/concurrent' },
      { text: '虚拟机', subPath: '/docs/java/jvm' }
    ]),
    '/docs/container': set_sidebar([
      { text: '容器', subPath: '/docs/container', collapsed: false, recursion: false },
      { text: 'Istio', subPath: '/docs/container/istio', collapsed: false, dir_sort: { "实战": 40 } },
      { text: 'Kubernetes', subPath: '/docs/container/kubernetes', collapsed: true, dir_sort: { "Workload": 35, "Service": 40 } },
    ]),
    '/docs/go': set_sidebar([{ text: 'Go', subPath: '/docs/go', collapsed: false }]),
    '/docs/middleware': set_sidebar([
      { text: 'Elasticsearch', subPath: '/docs/middleware/elasticsearch', collapsed: false },
      { text: 'Mysql', subPath: '/docs/middleware/mysql', collapsed: true },
      { text: 'Redis', subPath: '/docs/middleware/redis', collapsed: true, dir_sort: { "基本数据类型": 20 } }
    ]),
    '/docs/other': set_sidebar([
      { text: '瞎折腾', subPath: '/docs/other', collapsed: true, recursion: false },
      { text: '算法', subPath: '/docs/other/algorithm', collapsed: true },
      { text: '思维导图', subPath: '/docs/other/xmind', collapsed: true }
    ])
  }
}

function search() {
  return {
    provider: 'local',
    options: {
      translations: {
        button: {
          buttonText: "搜索文档",
          buttonAriaLabel: "搜索文档",
        },
        modal: {
          noResultsText: "暂无结果",
          resetButtonTitle: "清除查询条件",
          displayDetails: "显示/关闭详情",
          footer: {
            selectText: "选择",
            navigateText: "切换",
            closeText: "关闭"
          }
        }
      }
    }
  }
}

function head() {
  return [
    [
      'script',
      { async: '', src: 'https://www.googletagmanager.com/gtag/js?id=G-LHP6XF8LVH' }
    ],
    [
      'script',
      {},
      `window.dataLayer = window.dataLayer || [];
      function gtag(){dataLayer.push(arguments);}
      gtag('js', new Date());
      gtag('config', 'G-LHP6XF8LVH');`
    ],
    [
      'script',
      {}, `
      var _hmt = _hmt || [];
      (function() {
        var hm = document.createElement("script");
        hm.src = "https://hm.baidu.com/hm.js?24435097f2c98ce4cba6d697dc7bc297";
        var s = document.getElementsByTagName("script")[0]; 
        s.parentNode.insertBefore(hm, s);
      })();
      `
    ],
    [
      'link',
      { rel: 'preconnect', href: 'https://fn.leejay.top:9000', crossorigin: '' }
    ],
  ]
}