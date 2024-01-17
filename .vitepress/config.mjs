import { defineConfig } from 'vitepress'
import { set_sidebar } from "./theme/sidebar.js";
import dracula from './theme/dracula.json'
import slack from './theme/slack-ochin.json'
import mathjax3 from 'markdown-it-mathjax3';
import { withMermaid } from "vitepress-plugin-mermaid";

// https://vitepress.dev/reference/site-config
export default withMermaid(
  defineConfig({
    head: head(),
    title: "🎈🎈",
    description: "Blog built with VitePress",
    themeConfig: {
      logo: '/logo.gif',
      outline: {
        label: "文章目录📝",
        level: [2, 6]
      },
      lastUpdated: {
        text: '最后更新于',
        formatOptions: {
          dateStyle: 'short',
          timeStyle: 'medium'
        }
      },
      returnToTopLabel: "回到首页",
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
          link: '/docs/other/raspberrypi'
        },
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
      { text: 'Kubernetes', subPath: '/docs/container/kubernetes', collapsed: true },
      { text: 'Istio', subPath: '/docs/container/istio', collapsed: true },
    ]),
    '/docs/go': set_sidebar([{ text: 'Go', subPath: '/docs/go', collapsed: false }]),
    '/docs/middleware': set_sidebar([
      { text: 'Elasticsearch', subPath: '/docs/middleware/elasticsearch', collapsed: false },
      { text: 'Mysql', subPath: '/docs/middleware/mysql', collapsed: true },
      { text: 'Redis', subPath: '/docs/middleware/redis', collapsed: true }
    ]),
    '/docs/other': set_sidebar([
      { text: '瞎折腾', subPath: '/docs/other', collapsed: true ,recursion: false},
      { text: '算法', subPath: '/docs/other/algorithm', collapsed: true }
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
    ]
  ]
}