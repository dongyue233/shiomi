# 汐见立绘v2正式发布与阅读器接入状态

更新时间：2026-10-01（北京时间）。本文替代此前“角色卡仍为v1.33.51”的进度记录。

## 已完成并核实

- 正式资源提交：`35d9d84e5bae74360afcb1634d45bfb20b004a39`。main中的`assets/sprites/heroines-v2/`包含30张最终PNG和manifest.json、prompts.json、README.md，共33个文件；五位各6张，1024×1536、RGBA透明背景。白羽r13，其余四位r11。
- 阅读器：`dist/reader/v0.10.0/index.js`，blob `6dd7a1f9ad807876f1e4dcd93c4e8711d6f830d0`，资源地址固定到上述正式提交。
- 当前正式角色卡已经更新为`汐见_v1.33.52_五位女角色立绘升级.json`。稳定ID `libfile_a5ab990e7a9c819188da792b08129116`，当前版本17，文件4,888,926字节，更新时间2026-10-01T03:15:27Z。本次读取发现卡已更新，因此没有重复覆盖。
- 已读取并核对卡内character_version、资源配置和阅读器ID。阅读器内容与仓库v0.10.0仅末尾换行不同；未发现`SPRITE_COMMIT_PENDING`。配置为30张资源和reader_version 0.10.0。
- 阅读器保留此前实现的款式选择、跨聊天偏好、别名解析、自定义立绘优先、段落隔离及独立场景CG显示方式。脚本的显示名称仍写v0.9.0，实际内容已是v0.10.0。
- GitHub完整图片包：专用分支`releases/shiomi-heroines-v2`，固定提交`bff3ef7b7aee6b9e602087082e7c97c0ae15faa4`。该提交根目录只包含30张PNG和3份索引说明，全部复用已有blob；已核对33个文件路径及GitHub回执与正式资源一致。没有重新生成或重复上传图片。

## 下载

- [GitHub完整立绘ZIP](https://github.com/dongyue233/shiomi/archive/bff3ef7b7aee6b9e602087082e7c97c0ae15faa4.zip)
- [专用图片包目录](https://github.com/dongyue233/shiomi/tree/releases/shiomi-heroines-v2)
- [main正式资源](https://github.com/dongyue233/shiomi/tree/main/assets/sprites/heroines-v2)
- [最终阅读器代码](https://github.com/dongyue233/shiomi/blob/main/dist/reader/v0.10.0/index.js)

GitHub ZIP由其仓库归档服务生成，解压后有一层GitHub提交目录；里面为同一套33文件。这是可下载的完整资源包，**不是将原ZIP二进制作为blob或release附件上传**。原始49,670,544字节ZIP仍保留于稳定ID`libfile_53920dde22bc8191bdbbe21a618f2350`。当前环境没有本地执行或二进制读取工具，本次通过复用GitHub既有资源完成在线打包替代；未实际下载并解压GitHub归档。

## 保留项与验收边界

本次没有修改角色卡、开场白、世界书、其他脚本或旧资源；main只更新进度文档。专用打包分支不是应用主分支，不要合并到main；它只用于GitHub归档下载。

原草稿此前已通过语法和行为检查，本次只核对正式卡和资源对应关系，没有添加哈希测试或反复测试。尚未进行Tauritavern或手机浏览器视觉验收；没有可调用浏览器及本地执行工具，不能报告该项通过。

完整原始交接及33个blob回执见`docs/handoff/shiomi-handoff-2026-10-01.md`。其中未完成项是原始快照，以本文及当前卡版本为准。
