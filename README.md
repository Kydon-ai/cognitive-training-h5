# Mind Garden · 原生 H5 Web

纯 HTML、CSS 和原生 JavaScript 实现，不依赖 Vue、Vite、npm 或其他前端框架。页面结构和样式与 `cognitive-training-vue` 保持一致，并响应式适配桌面和窄屏浏览器。

支持通过 Go API 查询任务列表、查看详情、新建、编辑和删除任务。浏览器仅保存接口地址、用户 ID 和 Token 配置；任务数据保存在 Go 服务中。

## 启动

先在 `go_services` 目录启动 Go 服务：

```powershell
$env:HTTP_ADDR = ":8080"
go run ./cmd/server
```

然后将本目录作为静态站点运行，例如使用 VS Code Live Server（默认端口 5500），或：

```powershell
python -m http.server 5500
```

在浏览器打开 `http://localhost:5500`。页面默认使用 `http://127.0.0.1:8080`、用户 ID `user-123` 和测试 Token `apifox-test`；右上角“接口配置”可修改这些值。

Go 服务默认允许本地 H5 来源 `http://localhost:5500` 和 `http://127.0.0.1:5500`。生产环境应设置 `COGNITIVE_API_ALLOWED_ORIGINS` 为前端站点的完整 Origin，并配置 `COGNITIVE_API_TOKEN`。
