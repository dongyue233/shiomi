# 汐见城市地图 UI v2.0.0

本目录是可直接部署到 GitHub 的地图运行包。它保留 v7.0 的地图数据、分级切片、LOD、坐标、路网和兼容 API，只替换前端外壳。

部署路径建议：`dist/map/v2.0.0/`

公开入口：

- 浏览器预览：`index.html`
- 角色卡动态加载：`index.js`

兼容 API：

- `window.ShiomiMap.open()`
- `window.ShiomiMap.close()`
- `window.ShiomiMap.destroy()`
- `window.ShiomiMap.focusNode(id)`
- `window.ShiomiMap.focusRegion(id)`
- `window.ShiomiMap.setLayers(layers)`
- `window.ShiomiMap.setKnownCases(caseIds)`
- `window.ShiomiMap.getState()`
- `window.ShiomiMap.resetDiagnostics()`
- `window.ShiomiMap.getDiagnostics()`

地图通过 Shadow DOM 注入酒馆宿主页面，不使用 iframe。关闭地图时会触发 `shiomi-map:close` 事件。

独立预览页默认允许查看六案位置；角色卡嵌入模式默认不显示任何案件位置，只有通过 `setKnownCases` 或 `open({ knownCases })` 明确传入的案件才可搜索和显示。
