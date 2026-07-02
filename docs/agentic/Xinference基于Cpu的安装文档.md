# Xinference CPU 环境安装部署指南

![Xinference CPU 环境安装部署指南](https://image.leejay.top/2026/07/xinference.png)

## 环境信息

| 项目 | 值 |
|---|---|
| 操作系统 | Ubuntu 24.04.3 LTS (x86_64) |
| 内核 | 6.8.0-111-generic |
| Python | 3.12.3 |
| 机器 | Mac Mini (192.168.1.100) |
| 安装路径 | `/opt/xinference/venv` |
| pip 源 | 清华镜像 `https://pypi.tuna.tsinghua.edu.cn/simple` |
| HF 镜像 | `https://hf-mirror.com` |
| 完整依赖 | `requirements-cpu.txt`（401 个包） |

## 关键依赖版本约束

| 包 | 版本 | 约束原因 |
|---|---|---|
| transformers | **4.46.3** | ⚠️ 不能升级到 5.x，5.x 删除了 HybridCache |
| peft | **0.17.1** | ⚠️ 不能升级到 0.18+，xinference 要求 <=0.17.1 |
| torch | 2.6.0+cpu | 必须从 CPU 源安装 |
| torchvision | 0.21.0+cpu | 必须和 torch 版本匹配 |
| torchaudio | 2.6.0+cpu | 必须和 torch 版本匹配 |

## 安装步骤

### 1. 创建虚拟环境

```bash
sudo mkdir -p /opt/xinference
sudo chown $USER:$USER /opt/xinference
cd /opt/xinference
python3 -m venv venv
source venv/bin/activate
```

### 2. 配置 pip 镜像源（国内加速）

```bash
pip config set global.index-url https://pypi.tuna.tsinghua.edu.cn/simple
pip config set install.trusted-host pypi.tuna.tsinghua.edu.cn
```

### 3. 安装 CPU 版 PyTorch

```bash
pip install torch==2.6.0+cpu torchvision==0.21.0+cpu torchaudio==2.6.0+cpu \
  --index-url https://download.pytorch.org/whl/cpu
```

> ⚠️ 必须用 `--index-url` 指定 CPU 源，否则会安装 CUDA 版本（~2GB）。

### 4. 安装 xinference

```bash
pip install xinference
```

### 5. 修复依赖冲突

```bash
# transformers 必须是 4.46.x（5.x 删除了 HybridCache）
pip install transformers==4.46.3

# peft 必须是 0.17.1（xinference 要求 <=0.17.1）
pip install peft==0.17.1

# 安装 sentence_transformers（embedding 引擎）
pip install sentence_transformers

# 验证导入
python -c "from sentence_transformers import SentenceTransformer; print('OK')"
python -c "from transformers import HybridCache; print('OK')"
```

### 6. 设置环境变量

```bash
# 写入 bashrc 持久化
echo 'export HF_ENDPOINT=https://hf-mirror.com' >> ~/.bashrc
echo 'export XINFERENCE_DISABLE_MODEL_ISOLATION=1' >> ~/.bashrc
source ~/.bashrc
```

| 环境变量 | 作用 |
|---|---|
| `HF_ENDPOINT=https://hf-mirror.com` | HuggingFace 国内镜像，模型下载加速 |
| `XINFERENCE_DISABLE_MODEL_ISOLATION=1` | 禁用模型虚拟环境隔离，使用主 venv 的包 |

### 7. 下载模型（可选，也可通过 xinference 自动下载）

```bash
pip install huggingface_hub
HF_ENDPOINT=https://hf-mirror.com huggingface-cli download BAAI/bge-large-zh-v1.5 --local-dir /opt/models/bge-large-zh-v1.5
```

## 启动服务

```bash
cd /opt/xinference
source venv/bin/activate
HF_ENDPOINT=https://hf-mirror.com XINFERENCE_DISABLE_MODEL_ISOLATION=1 xinference-local
```

- Web UI 地址：`http://localhost:9997`
- 监听所有 IP：`xinference-local --host 0.0.0.0 --port 9997`

## 启动模型

### 命令行方式

```bash
# Embedding 模型
xinference-local launch --model-name bge-large-zh-v1.5 --model-type embedding

# Reranker 模型
xinference-local launch --model-name bge-reranker-v2-m3 --model-type rerank
```

### Web UI 方式

1. 打开 `http://localhost:9997`
2. 启动模型 → 选择模型类型（嵌入模型/重排序模型）
3. 选择引擎：embedding 用 `sentence_transformers`，reranker 用 `llama.cpp`（gguf 格式）或 `transformers`
4. 设备选 `CPU`
5. 点击 Launch

### 查看运行中的模型

```bash
xinference-local list
```

## 常用模型推荐

### Embedding 模型（向量化）

| 模型 | 参数量 | 最大长度 | 适用场景 |
|---|---|---|---|
| bge-large-zh-v1.5 | 326M | 512 tokens | 中文为主，轻量快速 |
| bge-m3 | 568M | 8192 tokens | 多语言，长文本，支持混合检索 |
| Qwen3-Embedding-0.6B | 600M | 8192 tokens | 轻量，CPU 友好 |

### Reranker 模型（重排序）

| 模型 | 说明 |
|---|---|
| bge-reranker-v2-m3 | 多语言，和 bge-m3 配套 |
| Qwen3-Reranker-0.6B | 轻量，CPU 友好，建议选 Q8_0 量化 |

### 推荐组合

- **运维文档 RAG**：bge-large-zh-v1.5（embedding）+ bge-reranker-v2-m3（reranker）
- **轻量方案**：Qwen3-Embedding-0.6B + Qwen3-Reranker-0.6B（Q8_0）

## 踩坑记录

### 1. torch/torchvision 版本不匹配

**现象**：`RuntimeError: operator torchvision::nms does not exist`

**原因**：torch 和 torchvision 版本不兼容

**解决**：
```bash
pip uninstall torch torchvision torchaudio -y
pip install torch==2.6.0+cpu torchvision==0.21.0+cpu torchaudio==2.6.0+cpu \
  --index-url https://download.pytorch.org/whl/cpu
```

### 2. transformers 5.x 删除了 HybridCache

**现象**：`ImportError: cannot import name 'HybridCache' from 'transformers'`

**原因**：transformers 5.x 删除了 HybridCache，而 peft 0.17.1 依赖它

**解决**：
```bash
pip install transformers==4.46.3
```

### 3. peft 版本与 xinference 不兼容

**现象**：`xinference 2.11.0 requires peft<=0.17.1`

**解决**：
```bash
pip install peft==0.17.1
```

### 4. 模型虚拟环境隔离导致包找不到

**现象**：`Failed to import module 'SentenceTransformer'`

**原因**：xinference 给每个模型创建独立虚拟环境，主 venv 的包找不到

**解决**：启动时加 `XINFERENCE_DISABLE_MODEL_ISOLATION=1`

### 5. Web UI 启动模型报 ServerClosed

**现象**：`xoscar.errors.ServerClosed: Remote server unixsocket closed`

**原因**：xinference 主进程启动时未设置必要的环境变量

**解决**：确保 xinference 启动时带 `HF_ENDPOINT` 和 `XINFERENCE_DISABLE_MODEL_ISOLATION`
