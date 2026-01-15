# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a BAML (Boundary ML) project that uses LLM function calling with structured outputs. BAML is a domain-specific language for defining LLM interactions with type-safe responses.

## Key Commands

```bash
# Install dependencies
pip install baml-py==0.213.0

# Regenerate the Python client after modifying .baml files
baml-cli generate

# Run the BAML playground (requires VSCode extension)
# Use the BAML VSCode extension to test functions interactively
```

## Architecture

### Directory Structure
- `baml_src/` - BAML source files (edit these)
  - `clients.baml` - LLM client configurations (OpenAI, Anthropic, etc.)
  - `generators.baml` - Code generation settings
  - `resume.baml` - Function and type definitions
- `baml_client/` - Auto-generated Python client (do not edit directly)

### How It Works
1. Define types (classes) and functions in `.baml` files
2. Run `baml-cli generate` to create the Python client
3. Import and use: `from baml_client import b`
4. Call functions: `result = b.ExtractResume(resume_text)`

### Client Configuration
LLM clients are defined in `clients.baml`. Environment variables required:
- `OPENAI_API_KEY` - For GPT models
- `ANTHROPIC_API_KEY` - For Claude models

Available clients include round-robin load balancing and fallback strategies.

## Working with BAML

- Always edit `.baml` files in `baml_src/`, never the generated `baml_client/` code
- After any `.baml` changes, run `baml-cli generate` to update the Python client
- The generator is configured for sync client mode (see `generators.baml`)
- Use the BAML VSCode extension for syntax highlighting and interactive testing
