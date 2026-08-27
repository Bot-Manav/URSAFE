$envFile = "..\.env"
if (Test-Path $envFile) {
    Get-Content $envFile | Where-Object { $_ -match "^[^#]" } | ForEach-Object {
        $name, $value = $_.Split('=', 2)
        Set-Item -Path "Env:\$name" -Value $value
    }
    Write-Host "Loaded environment variables from .env"
} else {
    Write-Warning ".env file not found in the parent directory."
}

mvn spring-boot:run
