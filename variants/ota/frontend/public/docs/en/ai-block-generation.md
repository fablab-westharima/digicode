# Using AI Block Generation

**Last updated:** 2026-04-22

DigiCode's AI block generation feature lets you automatically generate Blockly blocks from natural language prompts.

---

## 1. Overview

This feature uses a BYOK (Bring Your Own Key) model — you use your own AI API key to generate blocks.

| Item | Details |
|------|---------|
| **Model** | BYOK (use your own API key) |
| **Supported providers** | OpenAI / Claude (Anthropic) / Google Gemini / Custom (OpenAI-compatible) |
| **Required plan** | Lite / Pro / Enterprise (student accounts excluded) |
| **API key storage** | Browser localStorage (local to your device) |
| **Data sent to DigiCo** | None (prompts and results go directly from your browser to the provider) |

> **Note:** Your API key is stored in browser localStorage. Be cautious when sharing a device with other accounts.

---

## 2. Initial Setup

1. Open the account menu in the sidebar
2. Click **"AI Settings"** (shown just below "Change Password")
   - Only visible for Lite / Pro / Enterprise plans
3. Select your provider (OpenAI / Claude / Gemini / Custom)
4. Enter your API key for the selected provider
   - See the provider's official website for how to obtain a key (link available in the dialog)
5. Enter a model name (leave blank to use the default model)
6. Click **"Save"**

> **Deleting your API key:** If an API key is already entered, a "Delete API Key" link appears in the dialog. One click deletes and saves.

---

## 3. How to Use

1. Find the **"AI Block Generation"** widget at the bottom of the sidebar on the Editor page
2. Type your prompt in the input field (e.g., `Blink the LED on pin 13 every second`)
3. Click the **"Generate"** button, or press `Ctrl+Enter` (Mac: `Cmd+Enter`)
4. The generated blocks will be added to your workspace

> **Tip:** Generated blocks are **appended** to existing blocks — existing blocks are not removed. To start fresh, manually clear the workspace before generating.

---

## 4. Choosing a Provider

Model names, pricing, and rate limits change frequently — refer to the official documentation for current details.

| Provider | Free tier | Ease of setup | Cost | Get API key |
|---|---|---|---|---|
| **OpenAI** | Mostly no (initial credits in some cases) | Credit card required | Medium | [platform.openai.com/api-keys](https://platform.openai.com/api-keys) |
| **Claude (Anthropic)** | No (paid plan required) | Credit card required | Medium | [console.anthropic.com/settings/keys](https://console.anthropic.com/settings/keys) |
| **Google Gemini** | Yes, on some models | Google account (instant) | Low to free | [aistudio.google.com/apikey](https://aistudio.google.com/apikey) |
| **Custom (Ollama, etc.)** | — (local server) | Local server required | Free (electricity only) | — |

---

## 5. Tips for Better Prompts

**More specific prompts produce better results.**

| Vague | Specific |
|---|---|
| "Send temperature sensor value" | "Send DHT11 temperature and humidity via MQTT" |
| "Move forward" | "Move forward for 2 seconds then stop" |
| "Measure distance" | "Measure distance with HC-SR04 ultrasonic sensor and print to serial" |

- **Use mode vocabulary**: for `robots_wheel`, use terms like "forward", "turn right"; for `homeassistant`, use "MQTT publish", "WiFi connect"
- **Any language works**: prompts in English, Japanese, Chinese, Spanish, etc. are all supported

---

## 6. Troubleshooting

| Symptom | Cause / Fix |
|---|---|
| **Network error (possible CORS)** | Your API key may be invalid or expired. Re-enter a valid key in AI Settings |
| **429 error (rate limit)** | You have hit the request limit or exhausted your free tier. Check your provider's dashboard |
| **404 error (model not found)** | The model name may be deprecated or changed. Check the provider's official docs for a valid model name |
| **No blocks appear after generation** | Generation failed after 3 retry attempts. Try rewriting the prompt more specifically |
| **"API key not set" error** | Enter and save your API key in AI Settings first |

---

## 7. Known Limitations (MVP)

The current AI block generation is an initial release (MVP). Improvements are planned for future updates.

- **Append-only mode**: Generated blocks are added to existing blocks, not replaced. Clear the workspace manually to start over
- **WiFi/BLE blocks not available in robot modes**: `robots_wheel` / `robots_humanoid` / `robots_transform` modes do not include WiFi or BLE categories. Switch to `all_blocks` or `generic` mode to use WiFi/BLE with generation
- **Single-shot generation**: Each prompt generates once. The AI does not remember previous generations (conversational mode not yet implemented)

---

## 8. Privacy & Security

- **API key storage**: Stored in plain text in browser localStorage. There is a risk of exposure via XSS. We do not recommend using this feature on a shared device
- **Data flow**: Prompts and generated results are sent directly from your browser to the AI provider. DigiCo LLC's servers are not involved
- **Billing**: Usage charges are billed directly to your provider account. DigiCo LLC has no involvement in billing
