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

$mvnCmd = if (Get-Command mvn -ErrorAction SilentlyContinue) {
    "mvn"
} else {
    $found = Get-ChildItem -Recurse -Filter "mvn.cmd" "$HOME\.m2\wrapper" -ErrorAction SilentlyContinue | Select-Object -First 1 -ExpandProperty FullName
    if ($found) { $found } else { "mvn" }
}

& $mvnCmd spring-boot:run
