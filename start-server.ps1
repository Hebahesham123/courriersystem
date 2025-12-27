Write-Host "Starting Formspree Integration Server..." -ForegroundColor Green
Write-Host ""
Write-Host "Make sure you have:" -ForegroundColor Yellow
Write-Host "1. Created a .env file with your Supabase credentials" -ForegroundColor Yellow
Write-Host "2. Installed dependencies with: npm install" -ForegroundColor Yellow
Write-Host ""
Write-Host "Starting server on port 3001..." -ForegroundColor Cyan
Write-Host ""

try {
    npm run server
} catch {
    Write-Host "Error starting server: $_" -ForegroundColor Red
    Write-Host "Press any key to continue..." -ForegroundColor Yellow
    $null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")
}
