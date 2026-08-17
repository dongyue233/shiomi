# 汐见远程资源仓库 v0.2

这一版采用单仓库、单地图资源结构。

## 目录

- `manifest.json`：统一资源索引
- `assets/map/shiomi-city.webp`：唯一城市地图底图
- `assets/cg/regions/`：地区 CG
- `assets/cg/characters/`：角色 CG
- `dist/asset-manager/index.js`：资源管理器
- `dist/map/index.js`：地图前端

## 设计原则

地图只保留一张正式底图，不再区分 preview / standard / hd。
CG 按需加载，不在聊天启动时全量预载。
后续新增 CG 只更新 `manifest.json` 与对应图片文件，不需要修改角色卡世界书。

## 预期仓库

建议创建公开仓库：`dongyue233/shiomi`

创建并上传后可使用 jsDelivr：

- manifest: `https://cdn.jsdelivr.net/gh/dongyue233/shiomi@v0.2.0/manifest.json`
- AssetManager: `https://cdn.jsdelivr.net/gh/dongyue233/shiomi@v0.2.0/dist/asset-manager/index.js`
- Map: `https://cdn.jsdelivr.net/gh/dongyue233/shiomi@v0.2.0/dist/map/index.js`

正式角色卡应固定版本 tag，不使用 `main` 或 `latest`。
