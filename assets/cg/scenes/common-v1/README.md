# 汐见常用场景 CG · common-v1

10个地点、20张新生成PNG原图：10张立绘背景BG、10张独立场景CG。依据用户提供的v1.33.50角色卡世界书与已确认生产清单。角色卡完全未改。

采用内置Imagegen逐张生成；每张实际查看一次，只有明确缺陷定向修正。未运行哈希测试、未频繁抽样。真实尺寸为1672×941；鹤见桥BG为1672×940。近16:9原图，无拉伸、无裁切代替独立CG。

## 用途与接入

- BG：`render_mode: background_with_sprites`，建议`cover`，人物落点为0～1归一化脚部坐标，左上为原点。立绘与融合阴影后续单独叠加。
- 独立CG：`render_mode: standalone`，建议`contain`并隐藏额外立绘；单独观看即可理解场景。
- 手机竖屏使用cover可能丢失两侧。完整CG使用contain或全图查看；object_position只是CSS建议，不能保证不裁切。
- manifest是外置资源索引，不是Tauritavern原生协议；上传这些图片不会让当前阅读器自动支持新地点。后续须按逐段已成立地点和时间映射scene_id，本包未修改读取代码、解锁规则或角色卡。
- 203室与川风庄分开；公众空间与工作人员作业区分开；只画场景及少量普通市民，不默认加入有名角色。

## 地点与原图

| 地点 | BG | 独立CG |
|---|---|---|
| 汐见站·站厅 | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/backgrounds/shiomi_station_hall__day__bg.png) | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/standalone/shiomi_station_hall__day__cg.png) |
| 汐见中央警署·正门 | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/backgrounds/central_police_exterior__day__bg.png) | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/standalone/central_police_exterior__day__cg.png) |
| 汐见中央警署·三楼刑事课办公室 | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/backgrounds/central_police_criminal_office__day__bg.png) | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/standalone/central_police_criminal_office__day__cg.png) |
| 鹤见町·生活巷道 | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/backgrounds/tsurumi_neighborhood__day__bg.png) | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/standalone/tsurumi_neighborhood__day__cg.png) |
| 鹤见桥·汐见川河堤 | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/backgrounds/tsurumi_bridge_riverbank__day__bg.png) | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/standalone/tsurumi_bridge_riverbank__day__cg.png) |
| 鹤见町·临河公寓203室 | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/backgrounds/riverside_apartment_203__day__bg.png) | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/standalone/riverside_apartment_203__day__cg.png) |
| 白鹭商店街·檐棚步行段 | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/backgrounds/shirasagi_shopping_street__day__bg.png) | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/standalone/shirasagi_shopping_street__day__cg.png) |
| 喫茶潮声·营业区 | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/backgrounds/cafe_shiosai__day__bg.png) | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/standalone/cafe_shiosai__day__cg.png) |
| 宵待町·朱灯通夜景 | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/backgrounds/yoimachi_shuto_street__night__bg.png) | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/standalone/yoimachi_shuto_street__night__cg.png) |
| 东港·汐见空艇埠公众候乘厅 | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/backgrounds/east_port_airship_terminal__day__bg.png) | [PNG](https://raw.githubusercontent.com/dongyue233/shiomi/main/assets/cg/scenes/common-v1/standalone/east_port_airship_terminal__day__cg.png) |

## 文件

- backgrounds/：10张BG原图。
- standalone/：10张独立CG原图。
- manifest.json：用途、别名、真实尺寸、光源、落点、显示模式、依据与验收状态。
- prompts.json：实际逐图提示词、工具、参考关系、结果文件和定向修正记录。
- shiomi-common-cg-v1.zip：全部20张原图及本说明、索引、提示词的完整包；压缩包不嵌套自身。

[仓库目录](https://github.com/dongyue233/shiomi/tree/main/assets/cg/scenes/common-v1/)

现有characters、places、regions资源保留；旧图不改名计入本批20张。既有潮声和鹤见町PNG因授权接口仅接收UTF-8文本/二进制解码失败而未能查看，限制已如实记录。

## 完整包发布限制

56.8MB完整ZIP已作为交付附件保存；GitHub Git Blob API拒绝完整ZIP，返回HTTP 422：Sorry, your input was too large to process。当前授权工具未提供Release附件上传能力，因此仓库目录发布20张PNG与三份说明/索引文件，完整ZIP通过本次交付的文件下载入口取得；不提供不存在的仓库ZIP链接。
