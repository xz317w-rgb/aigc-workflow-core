# AIGC Workflow Core

这是一个只包含工作流编排能力的可移植核心，供其他系统接入任务流程、断点续跑、幂等复用、阶段审计和失败阻断。

## 包含内容

- 可配置的顺序工作流状态机
- 每一步保存检查点，支持同一输入恢复执行
- 输入指纹和已完成任务复用
- 操作能力预检，缺少依赖时在执行前阻断
- 不透明操作回执，避免把 Skill 正文写入客户端状态
- 内存存储示例和可替换的持久化接口
- 视频资产工作流的通用阶段定义
- 自动化测试和导出安全检查

## 明确不包含

- 任何 `SKILL.md`、系统提示词、模板正文或内部评估规则
- 无限画布、工作台页面、素材库、账户、账单或管理后台代码
- API 地址、密钥、供应商路由、模型配置或生产部署配置
- 生产环境的 Skill 标识、版本锁、哈希或服务凭据

## 最小使用方式

```js
import {
  MemoryWorkflowStore,
  WorkflowEngine,
  videoAssetWorkflowDefinition,
} from "@aigc-director/workflow-core";

const operations = {
  "requirements.plan": yourRequirementsPlanner,
  "prompt.validate": yourPromptValidator,
  "assets.audit": yourAssetAuditor,
  "characters.resolve": yourCharacterResolver,
  "products.resolve": yourProductResolver,
  "frames.generate": yourFirstFrameGenerator,
  "delivery.audit": yourFinalAuditor,
};

const engine = new WorkflowEngine({
  definition: videoAssetWorkflowDefinition,
  operations,
  store: new MemoryWorkflowStore(),
});

const result = await engine.execute({
  requestId: "partner-request-001",
  brief: "Create a short product video package",
  mode: "full",
  needsCharacter: true,
  needsProduct: true,
});
```

每个操作由接入方自己实现，或映射到获得授权的远程黑盒服务。核心库本身不读取环境变量、不发起网络请求，也不包含任何供应商配置。

## Skill 保护结论

不能把 Skill 原文交付到对方可控制的机器，同时承诺“绝对无法提取”。混淆、加密资源、本地容器或编译产物只能提高提取成本，不能形成可靠保密边界。

推荐把 Skill 保留在权利人控制的服务端：接入方只提交任务和业务素材，收到不透明回执与最终资产引用。仓库中的工作流引擎只负责阶段推进，不接触 Skill 正文。

更多说明见 [架构](docs/ARCHITECTURE.md)、[接入指南](docs/INTEGRATION.md) 和 [知识产权保护](docs/IP-PROTECTION.md)。
