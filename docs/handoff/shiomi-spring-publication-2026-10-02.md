# 春季通过版立绘与角色卡发布

角色卡 v1.33.58 基于正式 v1.33.57 更新，阅读器为 v0.10.5。立绘资源提交：`0b8aab77629c56c5bcff2ea140cf128c5ee3e81b`。

五位角色（水城澪、藤崎绫乃、望月千鹤、星野美羽、御影白羽）各六种表情，共30张透明PNG，统一动画赛璐璐画风，春季外出服。默认平静。白羽在本地制作记录中也使用 baiyu；仓库沿用 shiraha 身份ID。

美羽、白羽、绫乃采用最后通过的版本；澪与千鹤沿用原形象，仅应用最后的指定表情修正。被放弃的澪新设计不在发布包中。

路径：`assets/sprites/heroines-spring-v3/`；完整压缩包：`shiomi-spring-approved-30.zip`。每张PNG保留生成后的原始像素和透明通道。

角色卡与阅读器实际配置已改用新资源，资源URL固定到上述提交。历史 heroines-v2 路径保留作版本档案；不再是这张新卡的默认资源。旧保存的款式ID及旧段落标注会按表情映射到新立绘。

JSON与PNG角色卡同步提供，位于 `character-cards/v1.33.58/`，当前入口是 `character-cards/latest.json` 与 `character-cards/latest.png`。

本次检查：30张PNG的数量及透明通道、五人六表情路由和旧ID兼容、阅读器JavaScript语法、角色卡JSON结构，以及开场白、世界书、其他脚本、自定义立绘未变。未进行真实Tauritavern浏览器视觉验收。
