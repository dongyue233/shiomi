> **2026-10-01最新状态：资源已发布，正式角色卡已为v1.33.52。** 当前卡稳定ID的版本17已核对，阅读器内容与仓库v0.10.0一致（仅末尾换行不同），无占位提交值。30张PNG及3份索引说明无需重传。GitHub完整ZIP通过专用打包分支复用已有blob提供下载；原ZIP二进制未作为附件上传。接续先读[最新发布与接入状态](shiomi-publication-2026-10-01.md)。以下保留原交接快照。

# 汐见项目交接：五位女角色立绘升级与阅读器接入

交接时间：2026-10-01，北京时间约10:55。用户要求总结并创建交接文档，准备开启新会话。停止当前制作/发布，接续时以本文和已保存文件为依据。不要重复建 skill、重复生成或重复上传已经完成的资源。

## 一、真实进度

| 工作 | 状态 |
| --- | --- |
| 常用场景20张CG/BG | 已生成、查看并发布；原资源提交为 `821aa457d1966d574152e4b9ad95fb086be945e0` |
| 场景阅读器接入卡 v1.33.51 | 已保存；阅读器v0.9.0；未进行实际Tauritavern浏览器视觉验收 |
| 五位女角色立绘 | 30张真实新PNG，5位各6张；实际1024×1536，RGBA透明背景；逐图已实际查看 |
| 最新白羽 | r13，依据IMG_0334/0330；用户在新基准后说“继续”；其余五张已沿用该基准生成 |
| 完整立绘ZIP | 已保存，49,670,544字节，30张PNG + manifest.json + prompts.json + README.md |
| GitHub二进制上传 | 33个文件的blob上传全部完成，有真实SHA回执，见本文附录 |
| GitHub正式立绘发布 | **尚未创建tree、commit或更新branch**；blob成功不等于目录已经发布 |
| ZIP上传GitHub | **还没有尝试**；不要虚构GitHub ZIP或release下载链接 |
| 立绘阅读器接入 | 脚本与草稿已写好，语法/路由/段落隔离及保留项检查通过；含占位提交值，尚未最终发布/替换卡 |

本文创建前再次确认：仓库`dongyue233/shiomi`，默认分支`main`，push权限可用；head为`821aa457d1966d574152e4b9ad95fb086be945e0`，tree为`d0b8fbeddf543ef052ab1460c16424a9a41c2e19`。**本文本身会形成新的文档提交，后续必须重新读取最新head/tree，不能继续用上述旧值构造最终提交。**

执行环境在最后上传完成后报错：exec-server websocket连接超时。随后`tools.exec_command`不可用，functions.store旧状态也已丢失；但现有workspace文件仍可通过文件上传服务保存。所有关键文件已另行保留。不得将当前执行环境故障说成图片生成失败。

## 二、用户约束与最新画风

- 中文沟通；实际生成，不能只给提示词/计划；默认内置Imagegen，一次一张，不擅自切需API密钥的CLI。
- 脸和五官要参考图的二次元绘画，皮肤、头发、衣料真实细腻；保持角色身份，不能用泛化美少女替换。
- 正脸、头部竖直、眼线水平；正常头颈、腰臀、上身与腿的比例，避免细长颈、过小头、勒腰、大胯和夸张长腿。
- 澪的发型：自然偏侧分、侧扫层次刘海，高马尾扎在后脑上部；**不是M型对称刘海，不是头顶丸子/发环**。
- 白羽以IMG_0334.png和IMG_0330.png为准确五官/脸型：银白长发自然侧分，细长玫瑰棕眼、略沉上眼睑、小而克制的鼻嘴、清冷安静神情；**所有白羽立绘都不需要麦克风或线缆**。
- 动作自然，肩肘腕放松，重心合理；不要摊手式表演姿势、夸张叉腰、交叉膝或刻意拗身。
- “一遍过，禁止频繁测试，禁止哈希测试代码”：每张实际查看一次，只对清晰缺陷定向修正。没有编写/运行哈希测试。GitHub返回的SHA是正常上传回执，不是自行计算的测试哈希。
- 旧角色/地点/区域/场景资源全部保留。不修改开场白、世界书业务内容、相册解锁逻辑或其他无关脚本；新图片不内嵌卡。
- 已授权GitHub仓库`dongyue233/shiomi`。正式资源放新目录`assets/sprites/heroines-v2/`，基于最新树统一提交，非强推，不删旧文件。
- 不宣称外置manifest会让旧阅读器自动支持；不宣称已做真实浏览器/手机端视觉验收。
- r8及以前和白羽r11/r12均不是本批最终资产。**禁止把rejected/superseded/recalibration图片打包计数。**

## 三、可持久恢复的文件索引

在新会话使用文件工具按以下稳定ID读取/物化；若当前版本已变化，重新读取元数据后再写。文件名同样可用于检索。

| 文件 | 稳定ID | 版本/真实大小 |
| --- | --- | --- |
| shiomi-sprites-v2-progress.tar | `libfile_65ffdfa538f4819191d31023385220ad` | **v9**；164,352,000字节；含完整生产计划、实际提示词、30张最终图、参考、历史拒绝版本及逐图记录 |
| shiomi-heroines-sprites-v2.zip | `libfile_53920dde22bc8191bdbbe21a618f2350` | 新文件；49,670,544字节；只含最终30PNG与3份索引/说明 |
| shiomi-sprite-upload-receipts.json | `libfile_f327e979c2ec81918b65bd788e0d186f` | 新文件；4,617字节；33个真实blob回执，可直接用于create_tree |
| shiomi-integrate-sprites.py | `libfile_f49b43ddf408819192c6401d85aad954` | 新文件；6,452字节；接入生成器，参数为正式发布commit SHA |
| shiomi-reader-sprites-pending.js | `libfile_e5eeeb51ec3c8191b379592127d04768` | 新文件；136,444字节；已通过检查，但含`SPRITE_COMMIT_PENDING` |
| 汐见_v1.33.51_场景CG阅读器接入.json | `libfile_a5ab990e7a9c819188da792b08129116` | **v16**；4,875,120字节；正式当前卡，后续按同一ID替换 |
| shiomi-common-cg-v1.zip | `libfile_40afbd63c1b881919b1696bfb21a7809` | v1；56,802,562字节；已完成的场景资源完整包 |

白羽参考已实际下载查看并收入tar的references；用户上传附件ID：
- IMG_0334.png：`file_00000000e5848209bffaba20569d094d`；对应稳定文件`libfile_bd2adc4fca648191b48e78cca7bf0288`。
- IMG_0330.png：`file_00000000db9c82068da25a72f27da78c`；对应稳定文件`libfile_e6dce52195288191a672494bc5f764a7`。
如果是本会话上传附件，按附件方式读取，缺失路径使用download_file；不要因提示中的upload路径不存在就说没有看到参考。

## 四、项目路径与恢复要点

旧workspace根：`/workspace/scratch/329cd0d9ea3a`；新环境路径可变化，不要假设/root绝对路径仍在。

tar内顶层是`sprites-v2/`。原项目根：
`/root/shiomi-projects/sprites-v2/`

关键内容：
- `production-plan.json`、`progress.json`、`prompts.json`：逐图真实记录。
- `assets/<character>/<variant>.png`：最终30张，其他四位r11，白羽r13。
- `references/`：原身份参考、用户所有新风格图及白羽两张参考。
- `record_result.py`：记录实际提示词/引用/尺寸/透明度/修正记录。
- `checkpoint.py`：完整生产进度tar。
- `superseded/`：历史拒绝版本；不发布。
- `production.py`：旧提示词生成器，**不要执行，会覆盖当前r13计划**。

旧scratch：
- `sprite-upgrade/heroines-v2/`：最终待发布33文件。
- `sprite-upgrade/upload-receipts.json`：33回执。
- `sprite-upgrade/integrate_sprites.py`：接入生成器，已单独保存。
- `reader-integration/reader-integrated.js`：正式v1.33.51的阅读器JS。
- `reader-integration/reader-sprites-integrated.js`：含占位SHA的草稿。
- `delivery/shiomi-heroines-sprites-v2.zip`：最终完整包。
- `delivery/汐见_v1.33.52_五位女角色立绘升级.json`：**草稿**，约4,888,223字节，含占位SHA，不能作为完成版交付。
- `sprite-upgrade/rejected-r12-package.zip`：旧拒绝包，不计入最终。

若只恢复正式旧卡，可从卡中提取reader JS到生成器需要的位置。阅读器位于：
`data.extensions.tavern_helper.scripts[0].scripts[10]`，
ID `67950aef-e4bb-41bf-ab84-1ab65140a398`。
生成器原始根路径写死旧workspace，迁移后调整路径，保持内容逻辑。

## 五、最终30张清单

每个角色三套服装、每套两种表情/动作。以下是PNG文件名stem；完整id为`角色id__stem`。

| 角色 | id | 六张 |
| --- | --- | --- |
| 水城澪 | mio | work_neutral, work_focused, daily_amused, daily_annoyed, outing_bright, outing_shy |
| 藤崎绫乃 | ayano | duty_neutral, duty_concerned, daily_playful, daily_pout, outing_happy, outing_shy |
| 望月千鹤 | chizuru | kimono_welcome, kimono_firm, cooking_warm, cooking_tired, offduty_soft, offduty_shy |
| 星野美羽 | miyu | school_cheerful, school_surprised, street_excited, street_annoyed, outing_radiant, outing_shy |
| 御影白羽 | shiraha | stage_poised, stage_confident, daily_reserved, daily_unimpressed, outing_relaxed, outing_shy |

白羽最终r13以正脸针织私服基准延展，其余五张已完成；默认显示`daily_reserved`。其他四位默认第一张。
manifest含角色别名、服装、表情、真实尺寸、透明背景、contain/object_position、脚部锚点、光源与实际文件大小。未制作WebP，不必补做。

## 六、阅读器草稿的最终行为

- 5位各6种可选立绘；“设置 → 立绘角色 → 服装与表情”。
- 手动选择按卡avatar/name持久保存，跨新聊天沿用；本次内存fallback支持localStorage保存失败。
- “随段落／默认”读取本段明确的`shiomi-vn`注释`sprites`字段，否则默认。名字支持别名解析，款式只使用已知registry，不接受任意URL。
- metadata只影响紧接段落，不根据提到人名或情绪猜角色/服装；原对白姓名规则与在场限制继续使用。
- 自定义导入立绘优先，原`shiomi_portraits_v1`保留；当前卡其中有西园寺美流/佐佐木柚香两项，不删除。
- 完整PNG按contain、底部位置显示；独立场景CG继续隐藏另加立绘。
- 新图片外置URL最终应固定到正式GitHub提交SHA。
- 已通过一次node语法检查，以及真实函数的默认/别名/手动优先/非法URL拒绝/段落隔离检查。开场白、世界书、其他脚本、自定义立绘的结构保持检查通过。
- 尚无真实Tauritavern/手机浏览器画面验收。
- 草稿现在主要使用jsDelivr；可考虑增加raw.githubusercontent.com一次fallback解决刚提交后的CDN缓存，但这只是未实施的建议，不是已经完成的功能。
- 保存的生成器执行方式：`python integrate_sprites.py <正式commit SHA>`；不能用占位符发布。

## 七、新会话接续顺序

1. 读取本文；恢复ZIP、v9生产tar、33回执、接入生成器和当前正式v16卡。**不要重新生成图、不要重复上传33个blob。**
2. 重新读仓库默认分支、最新head/tree及现有目录。本文的文档提交会改变head。保留当前树和旧assets/cg/characters、places、regions、scenes。
3. 尝试上传完整真实ZIP到同一新目录。如果超过实际服务限制，再发现并尝试已授权release附件能力；此前没有暴露附件上传工具。仍失败就报告真实错误并交付已保存完整包，不造链接。当前立绘ZIP尚未尝试，不能套用旧场景ZIP失败结论。
4. 使用33回执（加ZIP回执若成功）create_tree，base_tree_sha用最新树；create_commit，parent用最新head；update_ref(force=false)。如分支推进，重读后基于最新树处理，不强推。
5. 确认GitHub提交成功及新目录文件实际存在；此后才声称“已发布”。预期无ZIP为33文件，有ZIP为34文件。
6. 用正式commit SHA重新生成最终v1.33.52卡；移除全部`SPRITE_COMMIT_PENDING`。保留开场白/世界书/相册/其他脚本/custom portraits；不重做已通过检查，只有真实改动/问题才补必要检查。
7. 重新读当前卡版本元数据，按同一稳定ID替换。当前已验证v16，expected_current_version应以临写前读取值为准。
8. 最终交付30张数量、实际尺寸、正式更新卡、确认存在的仓库资源目录、完整ZIP链接，并如实说明未做实际浏览器视觉验收及任何ZIP服务限制。

已完成的场景目录：
https://github.com/dongyue233/shiomi/tree/main/assets/cg/scenes/common-v1

待发布的立绘路径：
`assets/sprites/heroines-v2/`。当前尚不能把其URL当作已存在下载目录交付。

## 附录：33个真实blob回执

下面是工具返回的GitHub SHA，不是测试计算的哈希。可直接作为create_tree的tree_elements。文档/分支状态更新不会改变这些blob字节。

```json
[
  {
    "path": "assets/sprites/heroines-v2/ayano/daily_playful.png",
    "mode": "100644",
    "type": "blob",
    "sha": "25b3a133db260e3d0213bd4ef73db9ce2c762e5f"
  },
  {
    "path": "assets/sprites/heroines-v2/ayano/daily_pout.png",
    "mode": "100644",
    "type": "blob",
    "sha": "984948dc7d4d0047de396041f8a2cdd2504347fc"
  },
  {
    "path": "assets/sprites/heroines-v2/ayano/duty_concerned.png",
    "mode": "100644",
    "type": "blob",
    "sha": "b7fe4fdbc2b7729661e1052fea17b58be401d343"
  },
  {
    "path": "assets/sprites/heroines-v2/ayano/duty_neutral.png",
    "mode": "100644",
    "type": "blob",
    "sha": "119516a75c1ce9e65fb064f9905775e9866cbc58"
  },
  {
    "path": "assets/sprites/heroines-v2/ayano/outing_happy.png",
    "mode": "100644",
    "type": "blob",
    "sha": "a01264d08089218bfa7c73c26fc032b478e31cf0"
  },
  {
    "path": "assets/sprites/heroines-v2/ayano/outing_shy.png",
    "mode": "100644",
    "type": "blob",
    "sha": "0e2e6a25904a55382963e9843b34bfed06a39212"
  },
  {
    "path": "assets/sprites/heroines-v2/README.md",
    "mode": "100644",
    "type": "blob",
    "sha": "f4c7b6154ca4944085e60b56504a164ccf2f1d82"
  },
  {
    "path": "assets/sprites/heroines-v2/chizuru/cooking_tired.png",
    "mode": "100644",
    "type": "blob",
    "sha": "68d586e0607a2abb4567981fe8dbabfa7b610478"
  },
  {
    "path": "assets/sprites/heroines-v2/chizuru/cooking_warm.png",
    "mode": "100644",
    "type": "blob",
    "sha": "33cec3ab3bdbddcfb04b2465d3b43bc9ba08fdc7"
  },
  {
    "path": "assets/sprites/heroines-v2/chizuru/kimono_firm.png",
    "mode": "100644",
    "type": "blob",
    "sha": "b3039b5927bf1728fc55e910e9d5136db70d5823"
  },
  {
    "path": "assets/sprites/heroines-v2/chizuru/kimono_welcome.png",
    "mode": "100644",
    "type": "blob",
    "sha": "8d36c646d08ee062b6a75a5dc768293ed43a4b51"
  },
  {
    "path": "assets/sprites/heroines-v2/chizuru/offduty_shy.png",
    "mode": "100644",
    "type": "blob",
    "sha": "612dd6a2178f04968defd75feedd354baff3afc9"
  },
  {
    "path": "assets/sprites/heroines-v2/chizuru/offduty_soft.png",
    "mode": "100644",
    "type": "blob",
    "sha": "3b657cea3bc34d18e9528b6868df9db8911357d9"
  },
  {
    "path": "assets/sprites/heroines-v2/manifest.json",
    "mode": "100644",
    "type": "blob",
    "sha": "02d1210f9393afe81e32bbabca81d8f73e15950e"
  },
  {
    "path": "assets/sprites/heroines-v2/mio/daily_amused.png",
    "mode": "100644",
    "type": "blob",
    "sha": "b84c274f85349ff8a9b3e89ca20abf30a08f6419"
  },
  {
    "path": "assets/sprites/heroines-v2/mio/daily_annoyed.png",
    "mode": "100644",
    "type": "blob",
    "sha": "cbf9ca36d451624f92ca0d710488b002c09544ac"
  },
  {
    "path": "assets/sprites/heroines-v2/mio/outing_bright.png",
    "mode": "100644",
    "type": "blob",
    "sha": "47e398e0ac132a9e38fe23ff63b4a05045a4f022"
  },
  {
    "path": "assets/sprites/heroines-v2/mio/outing_shy.png",
    "mode": "100644",
    "type": "blob",
    "sha": "bea81aaaeaa274e051ee57d0534541c9295a1e1d"
  },
  {
    "path": "assets/sprites/heroines-v2/mio/work_focused.png",
    "mode": "100644",
    "type": "blob",
    "sha": "9b80fb2f3d4a18a4bd0e50a4f16fc981aaa5f9fd"
  },
  {
    "path": "assets/sprites/heroines-v2/mio/work_neutral.png",
    "mode": "100644",
    "type": "blob",
    "sha": "41bda4e5c4c13cce12019398a2f036d4586065d7"
  },
  {
    "path": "assets/sprites/heroines-v2/miyu/outing_radiant.png",
    "mode": "100644",
    "type": "blob",
    "sha": "dae490a1552842b58c7372986306840c851d8aa4"
  },
  {
    "path": "assets/sprites/heroines-v2/miyu/outing_shy.png",
    "mode": "100644",
    "type": "blob",
    "sha": "d52efa27ded4db74cd03f9b29c8ce6af29846e93"
  },
  {
    "path": "assets/sprites/heroines-v2/miyu/school_cheerful.png",
    "mode": "100644",
    "type": "blob",
    "sha": "e7c2c8786867c4cb3ac9776ce13d726bbc419416"
  },
  {
    "path": "assets/sprites/heroines-v2/miyu/school_surprised.png",
    "mode": "100644",
    "type": "blob",
    "sha": "f2f17a4cc0bc236044ed860046abc468c88b9ae4"
  },
  {
    "path": "assets/sprites/heroines-v2/miyu/street_annoyed.png",
    "mode": "100644",
    "type": "blob",
    "sha": "61047de21ccd166f421d42fe623341c46109a01c"
  },
  {
    "path": "assets/sprites/heroines-v2/miyu/street_excited.png",
    "mode": "100644",
    "type": "blob",
    "sha": "afc84d131b1642d47ee00782b43a917ef1d5628c"
  },
  {
    "path": "assets/sprites/heroines-v2/prompts.json",
    "mode": "100644",
    "type": "blob",
    "sha": "a2f3c111507e1bbc882c0f875526f9ebc7ff9ee0"
  },
  {
    "path": "assets/sprites/heroines-v2/shiraha/daily_reserved.png",
    "mode": "100644",
    "type": "blob",
    "sha": "c1b8d50141e90a510ab49ef76500a7498fefcdd2"
  },
  {
    "path": "assets/sprites/heroines-v2/shiraha/daily_unimpressed.png",
    "mode": "100644",
    "type": "blob",
    "sha": "240ab40dca87b0eba2a6655451be0436497d797d"
  },
  {
    "path": "assets/sprites/heroines-v2/shiraha/outing_relaxed.png",
    "mode": "100644",
    "type": "blob",
    "sha": "8abbd74e7b6efed52250c509bcf221bccc85f887"
  },
  {
    "path": "assets/sprites/heroines-v2/shiraha/outing_shy.png",
    "mode": "100644",
    "type": "blob",
    "sha": "7d25e848fea035f64d41ce6ad36fb5d595a1c940"
  },
  {
    "path": "assets/sprites/heroines-v2/shiraha/stage_confident.png",
    "mode": "100644",
    "type": "blob",
    "sha": "629b5757fcac60ddf7b7c8cf53373f7e4fd6b038"
  },
  {
    "path": "assets/sprites/heroines-v2/shiraha/stage_poised.png",
    "mode": "100644",
    "type": "blob",
    "sha": "af8a0769e5f34770336e86d5b0a91b11393000f5"
  }
]
```
