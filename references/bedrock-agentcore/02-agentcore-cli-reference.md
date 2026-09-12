# Amazon Bedrock AgentCore CLI: Complete Command & Flag Reference

> **Package**: `@aws/agentcore` (npm global package)  
> **Source**: Official AWS Developer Guide (`agentcore-cli-reference.md`)  
> **Prerequisites**: Node.js 20+ and npm

---

## 1. Installation & Crucial Setup Notes

```bash
# 1. Install globally
npm install -g @aws/agentcore

# 2. Verify installation
agentcore --version
```

> [!WARNING]
> **Windows PATH Shadowing Issue**:  
> If `agentcore --version` outputs a Python error instead of a version string, an older Python CLI is shadowing the npm executable. This happens if the deprecated `bedrock-agentcore-starter-toolkit` was installed via `pip`.  
> Fix by running:
> ```bash
> pip uninstall bedrock-agentcore-starter-toolkit
> ```
> Then restart your terminal shell.

---

## 2. Project Directory Structure

Running `agentcore create` scaffolds an official project layout:

```text
myproject/
├── agentcore/
│   ├── agentcore.json      # Resource specifications, memory links, runtime policies
│   └── aws-targets.json    # Target AWS regions, ARNs, and qualifiers
├── app/
│   └── MyAgent/
│       ├── main.py         # Entrypoint (Strands agent + BedrockAgentCoreApp)
│       ├── pyproject.toml  # Python project dependencies
│       └── model/          # Local prompts and model configs
└── package.json            # CLI metadata and scripts
```

---

## 3. Core CLI Commands

### 1. `agentcore create`
Scaffolds a new project interactively or via CLI flags.

```bash
# Non-interactive command for Strands + Bedrock (Recommended):
agentcore create \
  --project-name GomiMakasete \
  --name GomiAgent \
  --language Python \
  --framework Strands \
  --model-provider Bedrock \
  --memory shortTerm \
  --build CodeZip
```

#### Key Flags for `agentcore create`:
- `--project-name <name>`: Alphanumeric project identifier (max 23 chars).
- `--name <name>`: Agent resource name.
- `--language <Python|TypeScript>`: Target programming language.
- `--framework <Strands|LangChain_LangGraph|GoogleADK|OpenAIAgents|VercelAI>`: Agent framework. Use `Strands` for AWS-native model-driven architecture.
- `--model-provider <Bedrock|Anthropic|OpenAI|Gemini>`: Default LLM backend.
- `--build <CodeZip|Container>`:
  - `CodeZip` (Default): Packages application into a zip and uploads to S3. **Requires no Docker**.
  - `Container`: Builds an ARM64 OCI container image and pushes to ECR.
- `--memory <none|shortTerm|longAndShortTerm>`: Memory configuration.
- `--protocol <HTTP|MCP|A2A|AGUI>`: Service protocol (Default: `HTTP`).
- `--network-mode <PUBLIC|VPC>`: Network isolation mode.
- `--idle-timeout <seconds>`: Idle session timeout (60 to 28,800 seconds).
- `--max-lifetime <seconds>`: Maximum microVM lifetime (60 to 28,800 seconds).
- `--defaults`: Quick-start a managed harness project with default parameters.

---

### 2. `agentcore dev`
Starts a local development server on port 8080 that emulates the AgentCore Runtime environment.

```bash
cd GomiMakasete
agentcore dev
```
- Listens for `/invocations` (POST) and `/ping` (GET).
- Hot-reloads code changes in `app/`.
- Routes model requests using local AWS credentials.

---

### 3. `agentcore deploy`
Packages your code, generates CloudFormation/CDK assets, and provisions resources in AWS Bedrock AgentCore.

```bash
agentcore deploy
```
- For `CodeZip`: Compiles dependencies with `uv` or `npm`, zips source, uploads to S3, updates AgentCore Runtime.
- For `Container`: Builds `linux/arm64` container, logs into Amazon ECR, pushes image, updates Runtime definition.

---

### 4. `agentcore invoke`
Sends prompts to your locally running or cloud-deployed agent directly from the command line.

```bash
# Interactive conversation mode
agentcore invoke

# One-shot invocation with JSON payload
agentcore invoke --payload '{"prompt": "Where do I throw away broken batteries?"}'
```

---

### 5. Maintenance Commands
```bash
# Check status of deployed resources
agentcore status

# View CloudWatch logs
agentcore logs --tail

# Update CLI to latest release
agentcore update
```
