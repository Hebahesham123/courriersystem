# PowerShell script to fix secrets in git history
# Run this in PowerShell: .\fix-secrets.ps1

Write-Host "🔒 Fixing secrets in git history..." -ForegroundColor Yellow
Write-Host ""

# Check if git is available
try {
    $gitVersion = git --version
    Write-Host "✅ Git found: $gitVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Git is not in PATH. Please install Git or add it to PATH." -ForegroundColor Red
    Write-Host ""
    Write-Host "You can:" -ForegroundColor Yellow
    Write-Host "1. Install Git for Windows: https://git-scm.com/download/win" -ForegroundColor Cyan
    Write-Host "2. Or use GitHub Desktop" -ForegroundColor Cyan
    Write-Host "3. Or allow the secret temporarily on GitHub" -ForegroundColor Cyan
    exit 1
}

Write-Host ""
Write-Host "⚠️  This will rewrite git history!" -ForegroundColor Yellow
Write-Host "Make sure you have a backup or are okay with force pushing." -ForegroundColor Yellow
Write-Host ""

$confirm = Read-Host "Continue? (y/N)"
if ($confirm -ne "y" -and $confirm -ne "Y") {
    Write-Host "Cancelled." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Step 1: Staging fixed files..." -ForegroundColor Cyan
git add DEBUG_SECRETS_ISSUE.md VERIFY_SECRETS_SETUP.md supabase/functions/shopify-sync/index.ts FIX_GITHUB_SECRETS_BLOCK.md

Write-Host ""
Write-Host "Step 2: Checking commit history..." -ForegroundColor Cyan
git log --oneline -5

Write-Host ""
Write-Host "Step 3: You need to manually edit the commit with secrets." -ForegroundColor Yellow
Write-Host ""
Write-Host "Run these commands manually:" -ForegroundColor Cyan
Write-Host ""
Write-Host "  # Find the commit with secrets (usually the one mentioned in error)" -ForegroundColor White
Write-Host "  git log --oneline" -ForegroundColor White
Write-Host ""
Write-Host "  # Start interactive rebase from before that commit" -ForegroundColor White
Write-Host "  git rebase -i <commit-before-problematic-commit>" -ForegroundColor White
Write-Host ""
Write-Host "  # In the editor, change 'pick' to 'edit' for the problematic commit" -ForegroundColor White
Write-Host "  # Save and close" -ForegroundColor White
Write-Host ""
Write-Host "  # Amend the commit" -ForegroundColor White
Write-Host "  git commit --amend --no-edit" -ForegroundColor White
Write-Host ""
Write-Host "  # Continue rebase" -ForegroundColor White
Write-Host "  git rebase --continue" -ForegroundColor White
Write-Host ""
Write-Host "  # Force push" -ForegroundColor White
Write-Host "  git push --force" -ForegroundColor White
Write-Host ""
Write-Host "OR use the simpler method:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  # Allow the secret on GitHub (not recommended but easier)" -ForegroundColor White
Write-Host "  # Visit: https://github.com/Hebahesham123/courrier2026/security/secret-scanning/unblock-secret/36qP0XUZO7pRephMrwKjDijlS8x" -ForegroundColor White
Write-Host "  # Click 'Allow secret'" -ForegroundColor White
Write-Host "  # Then: git push" -ForegroundColor White
Write-Host ""

