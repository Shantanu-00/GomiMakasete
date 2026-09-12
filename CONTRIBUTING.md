# Contributing Guidelines

Thank you for your interest in contributing to **GomiMakasete (ゴミ任せて)**! We welcome contributions, feature requests, bug reports, and enhancements.

## Code of Conduct

This project has adopted the [Amazon Open Source Code of Conduct](CODE_OF_CONDUCT.md). For more information see the Code of Conduct or contact the maintainers with any additional questions or comments.

## Reporting Bugs / Submitting Feedback

- **GitHub Issues:** Check if the issue already exists in the Issues tracker. If not, open a new issue describing the bug, reproduction steps, expected behavior, and environment details (OS, Python version, Node version).
- **Feature Requests:** Open an issue outlining the user persona, use case, and proposed interface.

## Development Workflow

### 1. Prerequisites
- Python 3.10+ (Recommended: 3.11)
- Node.js 20+ (for Next.js frontend)
- [AWS CLI v2 configured](https://docs.aws.amazon.com/cli/) (optional for local mocks)
- Docker (optional for container testing)

### 2. Local Setup
```bash
# 1. Clone repository
git clone https://github.com/your-org/GomiMakasete.git
cd GomiMakasete

# 2. Copy environment template
cp .env.example .env

# 3. Install Python dependencies and pre-commit tools
make install

# 4. Run local agent test suite
make test
```

### 3. Branching & Pull Requests
- Create a feature branch (`git checkout -b feature/my-enhancement` or `fix/issue-description`).
- Ensure all unit and integration tests pass (`make test`).
- Ensure linter and type-checking checks pass (`make lint`).
- Write descriptive commit messages following the Conventional Commits specification.
- Open a Pull Request against `main`.

## Licensing

Every source file in this repository should include the following header:

```python
# Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
```

By contributing to this repository, you agree that your contributions will be licensed under its [Apache-2.0 License](LICENSE).
