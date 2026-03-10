# Light

只保留两个核心模块的独立前端：

- `Inspiration / 灵感`
- `Data / 数据`

## 当前能力

- 灵感卡片记录、分类、归档
- Firebase + Yjs 多端同步
- 数据导入、导出、本地自动备份
- 灵感数据统计与趋势图

## 开发

```bash
npm install
npm run dev
```

## 部署

```bash
npm run deploy:main
```

部署脚本会先生成 sitemap、再构建、最后部署到 Cloudflare Pages 的 `main` 分支。
