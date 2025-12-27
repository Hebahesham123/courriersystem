# PowerShell Script to Create Users in Supabase
# Run this in PowerShell: .\create-users.ps1

$supabaseUrl = "https://bdquuixqypkmbvvfymvm.supabase.co"

# Get service role key
Write-Host "⚠️  You need your Supabase Service Role Key" -ForegroundColor Yellow
Write-Host "Get it from: Supabase Dashboard → Settings → API → service_role key" -ForegroundColor Cyan
Write-Host ""
$serviceRoleKey = Read-Host "Enter your Supabase Service Role Key"

if ([string]::IsNullOrWhiteSpace($serviceRoleKey)) {
    Write-Host "❌ Service role key is required" -ForegroundColor Red
    exit 1
}

# Users to create
$users = @(
    # Admins
    @{ email = "marina@gmail.com"; password = "marina123!"; role = "admin"; name = "Marina" },
    @{ email = "mariam@gmail.com"; password = "mariam123!"; role = "admin"; name = "Mariam" },
    @{ email = "toka@gmail.com"; password = "toka123!"; role = "admin"; name = "Toka" },
    @{ email = "shrouq@gmail.com"; password = "shrouq123!"; role = "admin"; name = "Shrouq" },
    @{ email = "hagar@gmail.com"; password = "hagar123!"; role = "admin"; name = "Hagar" },
    # Couriers
    @{ email = "ahmed@gmail.com"; password = "ahmed123!"; role = "courier"; name = "Ahmed" },
    @{ email = "mohamed@gmail.com"; password = "mohamed123!"; role = "courier"; name = "Mohamed" },
    @{ email = "salah@gmail.com"; password = "salah123!"; role = "courier"; name = "Salah" },
    @{ email = "emad@gmail.com"; password = "emad123!"; role = "courier"; name = "Emad" },
    @{ email = "test1@gmail.com"; password = "test1123!"; role = "courier"; name = "Test1" },
    @{ email = "test2@gmail.com"; password = "test2123!"; role = "courier"; name = "Test2" }
)

Write-Host ""
Write-Host "🚀 Creating users..." -ForegroundColor Green
Write-Host ""

$created = 0
$skipped = 0
$errors = 0

foreach ($user in $users) {
    try {
        # Create auth user
        $authBody = @{
            email = $user.email
            password = $user.password
            email_confirm = $true
        } | ConvertTo-Json

        $authHeaders = @{
            "apikey" = $serviceRoleKey
            "Authorization" = "Bearer $serviceRoleKey"
            "Content-Type" = "application/json"
        }

        $authResponse = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/admin/users" `
            -Method Post `
            -Headers $authHeaders `
            -Body $authBody `
            -ErrorAction SilentlyContinue

        if ($authResponse -and $authResponse.id) {
            $userId = $authResponse.id

            # Insert into users table
            $userBody = @{
                id = $userId
                email = $user.email
                role = $user.role
                name = $user.name
            } | ConvertTo-Json

            $userHeaders = @{
                "apikey" = $serviceRoleKey
                "Authorization" = "Bearer $serviceRoleKey"
                "Content-Type" = "application/json"
                "Prefer" = "return=minimal"
            }

            $userResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/users" `
                -Method Post `
                -Headers $userHeaders `
                -Body $userBody `
                -ErrorAction SilentlyContinue

            Write-Host "✅ Created $($user.name) ($($user.role)) - $($user.email)" -ForegroundColor Green
            $created++
        } else {
            # User might already exist, try to link
            Write-Host "⚠️  $($user.email) might already exist, attempting to link..." -ForegroundColor Yellow
            
            # Try to get existing user
            $listHeaders = @{
                "apikey" = $serviceRoleKey
                "Authorization" = "Bearer $serviceRoleKey"
            }

            $listResponse = Invoke-RestMethod -Uri "$supabaseUrl/auth/v1/admin/users" `
                -Method Get `
                -Headers $listHeaders `
                -ErrorAction SilentlyContinue

            if ($listResponse -and $listResponse.users) {
                $existingUser = $listResponse.users | Where-Object { $_.email -eq $user.email } | Select-Object -First 1
                
                if ($existingUser) {
                    # Insert into users table
                    $userBody = @{
                        id = $existingUser.id
                        email = $user.email
                        role = $user.role
                        name = $user.name
                    } | ConvertTo-Json

                    $userHeaders = @{
                        "apikey" = $serviceRoleKey
                        "Authorization" = "Bearer $serviceRoleKey"
                        "Content-Type" = "application/json"
                        "Prefer" = "resolution=merge-duplicates"
                    }

                    $userResponse = Invoke-RestMethod -Uri "$supabaseUrl/rest/v1/users" `
                        -Method Post `
                        -Headers $userHeaders `
                        -Body $userBody `
                        -ErrorAction SilentlyContinue

                    Write-Host "✅ Linked $($user.name) ($($user.role)) - $($user.email)" -ForegroundColor Green
                    $skipped++
                } else {
                    Write-Host "❌ Could not find or create $($user.email)" -ForegroundColor Red
                    $errors++
                }
            } else {
                Write-Host "❌ Error creating $($user.email)" -ForegroundColor Red
                $errors++
            }
        }
    } catch {
        $errorMessage = $_.Exception.Message
        if ($errorMessage -like "*already registered*" -or $errorMessage -like "*User already registered*") {
            Write-Host "⚠️  $($user.email) already exists, skipping..." -ForegroundColor Yellow
            $skipped++
        } else {
            Write-Host "❌ Error creating $($user.email): $errorMessage" -ForegroundColor Red
            $errors++
        }
    }
}

Write-Host ""
Write-Host ("=" * 50) -ForegroundColor Cyan
Write-Host "✅ Created: $created" -ForegroundColor Green
Write-Host "⚠️  Skipped (already exists): $skipped" -ForegroundColor Yellow
Write-Host "❌ Errors: $errors" -ForegroundColor Red
Write-Host ("=" * 50) -ForegroundColor Cyan
Write-Host ""
Write-Host "✅ Done!" -ForegroundColor Green

