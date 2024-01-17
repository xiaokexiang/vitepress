import { defineConfig } from 'vitepress'
import { set_sidebar } from "./theme/sidebar.js";
import dracula from './theme/dracula.json'
import slack from './theme/slack-ochin.json'

// https://vitepress.dev/reference/site-config
export default defineConfig({
  head: [
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
  ],
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
})

function markdown() {
  return {
    theme: {
      light: slack,
      dark: dracula,
    },
    lineNumbers: true,
  }
}

function nav() {
  return [
    {
      text: 'Java',
      link: '/docs/java/base/grpc快速入门',
    }]
}

function sidebar() {
  return {
    '/docs/java/': set_sidebar({ '/docs/java/base': '基础', '/docs/java/concurrent': '多线程' }),
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
