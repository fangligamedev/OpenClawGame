#!/bin/bash
# CorpSim Skill Installer
# Run: curl -fsSL <url>/install.sh | bash

set -e

echo "🦞 Installing CorpSim Skill..."
echo ""

# Check Node.js
if ! command -v node &> /dev/null; then
    echo "❌ Node.js is required. Please install Node.js 18+ first."
    exit 1
fi

NODE_VERSION=$(node --version | cut -d'v' -f2 | cut -d'.' -f1)
if [ "$NODE_VERSION" -lt 18 ]; then
    echo "❌ Node.js 18+ required. Current: $(node --version)"
    exit 1
fi

# Installation directory
INSTALL_DIR="$HOME/.openclaw/skills/corpsim"
BIN_DIR="$HOME/.local/bin"

echo "📁 Installing to: $INSTALL_DIR"

# Create directories
mkdir -p "$INSTALL_DIR"
mkdir -p "$BIN_DIR"

# Clone or copy skill files
if [ -d ".git" ]; then
    # Development mode - copy from current repo
    echo "📦 Copying from local repo..."
    cp -r corpsim-v3/skill/* "$INSTALL_DIR/"
else
    # Production mode - clone from GitHub
    echo "📦 Downloading from GitHub..."
    git clone --depth 1 --branch feature/corp-simulator-slg \
        https://github.com/fangligamedev/AgentLinkin.git \
        /tmp/corpsim-download 2>/dev/null || true
    
    cp -r /tmp/corpsim-download/corpsim-v3/skill/* "$INSTALL_DIR/"
    rm -rf /tmp/corpsim-download
fi

# Make CLI executable
chmod +x "$INSTALL_DIR/bin/corpsim.js"

# Create symlink
ln -sf "$INSTALL_DIR/bin/corpsim.js" "$BIN_DIR/corpsim"

# Add to PATH if needed
if [[ ":$PATH:" != *":$BIN_DIR:"* ]]; then
    echo ""
    echo "⚠️  Please add $BIN_DIR to your PATH:"
    echo "   export PATH=\"$BIN_DIR:\$PATH\""
    
    # Auto-add to shell profile
    SHELL_NAME=$(basename "$SHELL")
    case "$SHELL_NAME" in
        zsh)
            echo 'export PATH="'$BIN_DIR':$PATH"' >> ~/.zshrc
            echo "✅ Added to ~/.zshrc"
            ;;
        bash)
            echo 'export PATH="'$BIN_DIR':$PATH"' >> ~/.bashrc
            echo "✅ Added to ~/.bashrc"
            ;;
    esac
fi

echo ""
echo "✅ CorpSim Skill installed!"
echo ""
echo "🎮 Quick Start:"
echo "   corpsim list              # List active sessions"
echo "   corpsim create MyCompany  # Create new boardroom"
echo "   corpsim help              # Show all commands"
echo ""
echo "🔧 Configuration:"
echo "   export CORPSIM_URL=<server-url>  # Set server URL"
echo ""
echo "Enjoy! 🚀"
