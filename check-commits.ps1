# Check commits that will be pushed
Write-Host "Checking commits ahead of origin/main..." -ForegroundColor Cyan
Write-Host ""

# Show commits that will be pushed
git log origin/main..HEAD --oneline

Write-Host ""
Write-Host "Checking for secrets in these commits..." -ForegroundColor Yellow
Write-Host ""

# Check each commit for the secret token
$commits = git log origin/main..HEAD --oneline | ForEach-Object { ($_ -split ' ')[0] }

foreach ($commit in $commits) {
    Write-Host "Checking commit: $commit" -ForegroundColor Cyan
    # Check for any Shopify access tokens (generic pattern)
    $hasSecret = git show $commit | Select-String -Pattern "shpat_[a-zA-Z0-9]{20,}"
    if ($hasSecret) {
        Write-Host "  ❌ Found secret in this commit!" -ForegroundColor Red
    } else {
        Write-Host "  ✅ No secrets found" -ForegroundColor Green
    }
}

Write-Host ""
Write-Host "If secrets are found, you need to rewrite that commit." -ForegroundColor Yellow

