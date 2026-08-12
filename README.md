# ChessGod

An extensively configurable chess bot extension for chess.com

---
---

## Disclaimers and Terms of Use

### Educational Purpose & Fair Play

This project was developed strictly for learning and educational purposes. The author does not condone, encourage, or promote cheating in online gaming. Instead, this project is intended as a learning tool to help users analyze gameplay patterns and improve their chess skills.

### Platform Risk Notice

Using automated tools on third-party platforms may violate their rules. Engaging in non-fair play or failing to use this extension wisely **will likely result in your Chess.com account being temporarily suspended or permanently banned**. You are entirely responsible for how you deploy this tool and for complying with the Chess.com Fair Play Policy.

### Warranty & Liability Waiver

The code and content in this repository are provided "as is" without any warranties or guarantees of any kind. Use this software completely at your own risk. The author is not liable for any damages, financial losses, loss of data, or account actions arising from the use or misuse of this repository.

---
---

## Table of Contents

- [Features](#features)
- [How to Use](#how-to-use)
- [Running Locally](#running-locally)
- [Roadmap](#roadmap)
- [License](#license)
- [Credits](#credits)

## Features

- Human-like play
- Opening variety
- Adjustable skill-level
- Fast and local
- Customization

## How to Use

## Running Locally

### 1. Clone the repository

```bash
git clone https://github.com/calasicio/chessgod.git
```

### 2. Install dependencies

```bash
npm install
```

### 3. Build the extension

```bash
npm run build
```

### 4. Package the built codebase

```bash
npm run ext-build
```

### 5. Use the extension

The file should now be available in `./web-ext-artifacts/chessgod-x.x.x.zip`.
You can now add that into the Firefox.

## Roadmap

- [ ] Core engine integration
- [ ] Human-like move selection
- [ ] Opening book support
- [ ] Release?
- [ ] Skill-level customization panel
- [ ] Calibration against real player data

## License

Licensed under PolyForm Noncommercial 1.0.0.

You can fork, modify, and redistribute this freely for non-commercial
purposes. You just can't sell it, paywall it, or bundle it into a paid
product/service. See [LICENSE](./LICENSE.md) for full terms.

## Credits

- [Calasicio](https://github.com/calasicio)
